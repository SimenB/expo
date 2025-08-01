import { getConfig } from '@expo/config';
import type { Platform } from '@expo/config';
import { SerialAsset } from '@expo/metro-config/build/serializer/serializerAssets';
import assert from 'assert';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import { type PlatformMetadata, createMetadataJson } from './createMetadataJson';
import { exportAssetsAsync } from './exportAssets';
import {
  addDomBundleToMetadataAsync,
  exportDomComponentAsync,
  transformNativeBundleForMd5Filename,
  transformDomEntryForMd5Filename,
} from './exportDomComponents';
import { assertEngineMismatchAsync, isEnableHermesManaged } from './exportHermes';
import { exportApiRoutesStandaloneAsync, exportFromServerAsync } from './exportStaticAsync';
import { getVirtualFaviconAssetsAsync } from './favicon';
import { getPublicExpoManifestAsync } from './getPublicExpoManifest';
import { copyPublicFolderAsync } from './publicFolder';
import { Options } from './resolveOptions';
import {
  ExportAssetMap,
  BundleOutput,
  getFilesFromSerialAssets,
  persistMetroFilesAsync,
  BundleAssetWithFileHashes,
} from './saveAssets';
import { createAssetMap } from './writeContents';
import * as Log from '../log';
import { WebSupportProjectPrerequisite } from '../start/doctor/web/WebSupportProjectPrerequisite';
import { DevServerManager } from '../start/server/DevServerManager';
import { MetroBundlerDevServer } from '../start/server/metro/MetroBundlerDevServer';
import { getRouterDirectoryModuleIdWithManifest } from '../start/server/metro/router';
import { serializeHtmlWithAssets } from '../start/server/metro/serializeHtml';
import { getEntryWithServerRoot } from '../start/server/middleware/ManifestMiddleware';
import { getBaseUrlFromExpoConfig } from '../start/server/middleware/metroOptions';
import { createTemplateHtmlFromExpoConfigAsync } from '../start/server/webTemplate';
import { env } from '../utils/env';
import { CommandError } from '../utils/errors';
import { setNodeEnv } from '../utils/nodeEnv';

export async function exportAppAsync(
  projectRoot: string,
  {
    platforms,
    outputDir,
    clear,
    dev,
    dumpAssetmap,
    sourceMaps,
    minify,
    bytecode,
    maxWorkers,
    skipSSG,
  }: Pick<
    Options,
    | 'dumpAssetmap'
    | 'sourceMaps'
    | 'dev'
    | 'clear'
    | 'outputDir'
    | 'platforms'
    | 'minify'
    | 'bytecode'
    | 'maxWorkers'
    | 'skipSSG'
  >
): Promise<void> {
  // Force the environment during export and do not allow overriding it.
  const environment = dev ? 'development' : 'production';
  process.env.NODE_ENV = environment;
  setNodeEnv(environment);

  require('@expo/env').load(projectRoot);

  const projectConfig = getConfig(projectRoot);
  const exp = await getPublicExpoManifestAsync(projectRoot, {
    // Web doesn't require validation.
    skipValidation: platforms.length === 1 && platforms[0] === 'web',
  });

  if (platforms.includes('web')) {
    await new WebSupportProjectPrerequisite(projectRoot).assertAsync();
  }

  const useServerRendering = ['static', 'server'].includes(exp.web?.output ?? '');

  if (skipSSG && exp.web?.output !== 'server') {
    throw new CommandError('--no-ssg can only be used with `web.output: server`');
  }

  const baseUrl = getBaseUrlFromExpoConfig(exp);

  if (!bytecode && (platforms.includes('ios') || platforms.includes('android'))) {
    Log.warn(
      `Bytecode makes the app startup faster, disabling bytecode is highly discouraged and should only be used for debugging purposes.`
    );
  }

  // Print out logs
  if (baseUrl) {
    Log.log();
    Log.log(chalk.gray`Using (experimental) base path: ${baseUrl}`);
    // Warn if not using an absolute path.
    if (!baseUrl.startsWith('/')) {
      Log.log(
        chalk.yellow`  Base path does not start with a slash. Requests will not be absolute.`
      );
    }
  }

  const mode = dev ? 'development' : 'production';
  const publicPath = path.resolve(projectRoot, env.EXPO_PUBLIC_FOLDER);
  const outputPath = path.resolve(projectRoot, outputDir);

  // Write the JS bundles to disk, and get the bundle file names (this could change with async chunk loading support).

  const files: ExportAssetMap = new Map();

  const devServerManager = await DevServerManager.startMetroAsync(projectRoot, {
    minify,
    mode,
    port: 8081,
    isExporting: true,
    location: {},
    resetDevServer: clear,
    maxWorkers,
  });

  const devServer = devServerManager.getDefaultDevServer();
  assert(devServer instanceof MetroBundlerDevServer);

  const bundles: Partial<Record<Platform, BundleOutput>> = {};
  const domComponentAssetsMetadata: Partial<Record<Platform, PlatformMetadata['assets']>> = {};

  const spaPlatforms =
    // TODO: Support server and static rendering for server component exports.
    useServerRendering && !devServer.isReactServerComponentsEnabled
      ? platforms.filter((platform) => platform !== 'web')
      : platforms;

  try {
    if (devServer.isReactServerComponentsEnabled) {
      // In RSC mode, we only need these to be in the client dir.
      // TODO: Merge back with other copy after we add SSR.
      try {
        await copyPublicFolderAsync(publicPath, path.join(outputPath, 'client'));
      } catch (error) {
        Log.error('Failed to copy public directory to dist directory');
        throw error;
      }
    } else {
      // NOTE(kitten): The public folder is currently always copied, regardless of targetDomain
      // split. Hence, there's another separate `copyPublicFolderAsync` call below for `web`
      await copyPublicFolderAsync(publicPath, outputPath);
    }

    let templateHtml: string | undefined;
    // Can be empty during web-only SSG.
    if (spaPlatforms.length) {
      await Promise.all(
        spaPlatforms.map(async (platform) => {
          // Assert early so the user doesn't have to wait until bundling is complete to find out that
          // Hermes won't be available.
          const isHermes = isEnableHermesManaged(exp, platform);
          if (isHermes) {
            await assertEngineMismatchAsync(projectRoot, exp, platform);
          }

          let bundle: {
            artifacts: SerialAsset[];
            assets: readonly BundleAssetWithFileHashes[];
            files?: ExportAssetMap;
          };

          try {
            // Run metro bundler and create the JS bundles/source maps.
            bundle = await devServer.nativeExportBundleAsync(
              exp,
              {
                platform,
                splitChunks:
                  !env.EXPO_NO_BUNDLE_SPLITTING &&
                  ((devServer.isReactServerComponentsEnabled && !bytecode) || platform === 'web'),
                mainModuleName: getEntryWithServerRoot(projectRoot, {
                  platform,
                  pkg: projectConfig.pkg,
                }),
                mode: dev ? 'development' : 'production',
                engine: isHermes ? 'hermes' : undefined,
                serializerIncludeMaps: sourceMaps,
                bytecode: bytecode && isHermes,
                reactCompiler: !!exp.experiments?.reactCompiler,
              },
              files
            );
          } catch (error) {
            Log.log('');
            if (error instanceof Error) {
              Log.exception(error);
            } else {
              Log.error('Failed to bundle the app');
              Log.log(error as any);
            }
            process.exit(1);
          }

          bundles[platform] = bundle;

          getFilesFromSerialAssets(bundle.artifacts, {
            includeSourceMaps: sourceMaps,
            files,
            isServerHosted: devServer.isReactServerComponentsEnabled,
          });

          // TODO: Remove duplicates...
          const expoDomComponentReferences = bundle.artifacts
            .map((artifact) =>
              Array.isArray(artifact.metadata.expoDomComponentReferences)
                ? artifact.metadata.expoDomComponentReferences
                : []
            )
            .flat();
          await Promise.all(
            // TODO: Make a version of this which uses `this.metro.getBundler().buildGraphForEntries([])` to bundle all the DOM components at once.
            expoDomComponentReferences.map(async (filePath) => {
              const { bundle: platformDomComponentsBundle, htmlOutputName } =
                await exportDomComponentAsync({
                  filePath,
                  projectRoot,
                  dev,
                  devServer,
                  isHermes,
                  includeSourceMaps: sourceMaps,
                  exp,
                  files,
                  useMd5Filename: true,
                });

              // Merge the assets from the DOM component into the output assets.
              // @ts-expect-error: mutate assets
              bundle.assets.push(...platformDomComponentsBundle.assets);

              transformNativeBundleForMd5Filename({
                domComponentReference: filePath,
                nativeBundle: bundle,
                files,
                htmlOutputName,
              });
              domComponentAssetsMetadata[platform] = [
                ...(domComponentAssetsMetadata[platform] || []),
                ...(await addDomBundleToMetadataAsync(platformDomComponentsBundle)),
                ...transformDomEntryForMd5Filename({
                  files,
                  htmlOutputName,
                }),
              ];
            })
          );

          if (platform === 'web') {
            // TODO: Unify with exportStaticAsync
            // TODO: Maybe move to the serializer.
            let html = await serializeHtmlWithAssets({
              isExporting: true,
              resources: bundle.artifacts,
              template: await createTemplateHtmlFromExpoConfigAsync(projectRoot, {
                scripts: [],
                cssLinks: [],
                exp: projectConfig.exp,
              }),
              baseUrl,
            });

            // Add the favicon assets to the HTML.
            const modifyHtml = await getVirtualFaviconAssetsAsync(projectRoot, {
              outputDir,
              baseUrl,
              files,
              exp: projectConfig.exp,
            });
            if (modifyHtml) {
              html = modifyHtml(html);
            }

            // HACK: This is used for adding SSR shims in React Server Components.
            templateHtml = html;

            // Generate SPA-styled HTML file.
            // If web exists, then write the template HTML file.
            files.set('index.html', {
              contents: html,
              targetDomain: devServer.isReactServerComponentsEnabled ? 'server' : 'client',
            });
          }
        })
      );

      if (devServer.isReactServerComponentsEnabled) {
        const isWeb = platforms.includes('web');

        await exportApiRoutesStandaloneAsync(devServer, {
          files,
          platform: 'web',
          apiRoutesOnly: !isWeb,
          templateHtml,
        });
      }

      // TODO: Use same asset system across platforms again.
      const { assets, embeddedHashSet } = await exportAssetsAsync(projectRoot, {
        files,
        exp,
        outputDir: outputPath,
        bundles,
        baseUrl,
      });

      if (dumpAssetmap) {
        Log.log('Creating asset map');
        files.set('assetmap.json', { contents: JSON.stringify(createAssetMap({ assets })) });
      }

      const targetDomain = devServer.isReactServerComponentsEnabled ? 'client/' : '';
      const fileNames = Object.fromEntries(
        Object.entries(bundles).map(([platform, bundle]) => [
          platform,
          bundle.artifacts
            .filter((asset) => asset.type === 'js')
            .map((asset) => targetDomain + asset.filename),
        ])
      );

      // Generate a `metadata.json` for EAS Update.
      const contents = createMetadataJson({
        bundles,
        fileNames,
        embeddedHashSet,
        domComponentAssetsMetadata,
      });
      files.set('metadata.json', { contents: JSON.stringify(contents) });
    }

    // Additional web-only steps...

    if (platforms.includes('web') && useServerRendering) {
      const exportServer = exp.web?.output === 'server';

      if (exportServer) {
        // TODO: Remove when this is abstracted into the files map
        await copyPublicFolderAsync(publicPath, path.resolve(outputPath, 'client'));
      }

      if (skipSSG) {
        Log.log('Skipping static site generation');
        await exportApiRoutesStandaloneAsync(devServer, {
          files,
          platform: 'web',
          apiRoutesOnly: true,
        });

        // Output a placeholder index.html if one doesn't exist in the public directory.
        // This ensures native + API routes have some content at the root URL.
        const placeholderIndex = path.resolve(outputPath, 'client/index.html');
        if (!fs.existsSync(placeholderIndex)) {
          files.set('index.html', {
            contents: `<html><body></body></html>`,
            targetDomain: 'client',
          });
        }
      } else if (
        // TODO: Support static export with RSC.
        !devServer.isReactServerComponentsEnabled
      ) {
        await exportFromServerAsync(projectRoot, devServer, {
          mode,
          files,
          clear: !!clear,
          outputDir: outputPath,
          minify,
          baseUrl,
          includeSourceMaps: sourceMaps,
          routerRoot: getRouterDirectoryModuleIdWithManifest(projectRoot, exp),
          reactCompiler: !!exp.experiments?.reactCompiler,
          exportServer,
          maxWorkers,
          isExporting: true,
          exp: projectConfig.exp,
        });
      }
    }
  } finally {
    await devServerManager.stopAsync();
  }

  // Write all files at the end for unified logging.
  await persistMetroFilesAsync(files, outputPath);
}
