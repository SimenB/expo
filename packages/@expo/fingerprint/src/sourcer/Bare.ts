import spawnAsync from '@expo/spawn-async';
import assert from 'assert';
import chalk from 'chalk';
import process from 'node:process';
import path from 'path';
import resolveFrom from 'resolve-from';

import { resolveExpoAutolinkingCliPath } from '../ExpoResolver';
import { SourceSkips } from './SourceSkips';
import { getFileBasedHashSourceAsync } from './Utils';
import type { HashSource, NormalizedOptions } from '../Fingerprint.types';
import { toPosixPath } from '../utils/Path';

const debug = require('debug')('expo:fingerprint:sourcer:Bare');

export async function getBareAndroidSourcesAsync(
  projectRoot: string,
  options: NormalizedOptions
): Promise<HashSource[]> {
  if (options.platforms.includes('android')) {
    const result = await getFileBasedHashSourceAsync(projectRoot, 'android', 'bareNativeDir');
    if (result != null) {
      debug(`Adding bare native dir - ${chalk.dim('android')}`);
      return [result];
    }
  }
  return [];
}

export async function getBareIosSourcesAsync(
  projectRoot: string,
  options: NormalizedOptions
): Promise<HashSource[]> {
  if (options.platforms.includes('ios')) {
    const result = await getFileBasedHashSourceAsync(projectRoot, 'ios', 'bareNativeDir');
    if (result != null) {
      debug(`Adding bare native dir - ${chalk.dim('ios')}`);
      return [result];
    }
  }
  return [];
}

export async function getPackageJsonScriptSourcesAsync(
  projectRoot: string,
  options: NormalizedOptions
) {
  if (options.sourceSkips & SourceSkips.PackageJsonScriptsAll) {
    return [];
  }
  let packageJson;
  try {
    packageJson = require(resolveFrom(path.resolve(projectRoot), './package.json'));
  } catch (e: unknown) {
    debug(`Unable to read package.json from ${path.resolve(projectRoot)}/package.json: ` + e);
    return [];
  }
  const results: HashSource[] = [];
  if (packageJson.scripts) {
    debug(`Adding package.json contents - ${chalk.dim('scripts')}`);
    const id = 'packageJson:scripts';
    results.push({
      type: 'contents',
      id,
      contents: normalizePackageJsonScriptSources(packageJson.scripts, options),
      reasons: [id],
    });
  }
  return results;
}

export async function getGitIgnoreSourcesAsync(projectRoot: string, options: NormalizedOptions) {
  if (options.sourceSkips & SourceSkips.GitIgnore) {
    return [];
  }
  const result = await getFileBasedHashSourceAsync(projectRoot, '.gitignore', 'bareGitIgnore');
  if (result != null) {
    debug(`Adding file - ${chalk.dim('.gitignore')}`);
    return [result];
  }
  return [];
}

export async function getCoreAutolinkingSourcesFromRncCliAsync(
  projectRoot: string,
  options: NormalizedOptions,
  useRNCoreAutolinkingFromExpo?: boolean
): Promise<HashSource[]> {
  if (useRNCoreAutolinkingFromExpo === true) {
    return [];
  }
  try {
    const { stdout } = await spawnAsync('npx', ['react-native', 'config'], { cwd: projectRoot });
    const config = JSON.parse(stdout);
    const results: HashSource[] = await parseCoreAutolinkingSourcesAsync({
      config,
      contentsId: 'rncoreAutolinkingConfig',
      reasons: ['rncoreAutolinking'],
    });
    return results;
  } catch (e) {
    debug(chalk.red(`Error adding react-native core autolinking sources.\n${e}`));
    return [];
  }
}

export async function getCoreAutolinkingSourcesFromExpoAndroid(
  projectRoot: string,
  options: NormalizedOptions,
  coreAutolinkingTransitiveDeps: string[],
  useRNCoreAutolinkingFromExpo?: boolean
): Promise<HashSource[]> {
  if (useRNCoreAutolinkingFromExpo === false || !options.platforms.includes('android')) {
    return [];
  }
  const args = [
    resolveExpoAutolinkingCliPath(projectRoot),
    'react-native-config',
    '--json',
    '--platform',
    'android',
  ];
  if (coreAutolinkingTransitiveDeps.length > 0) {
    args.push('--transitive-linking-dependencies', ...coreAutolinkingTransitiveDeps);
  }
  try {
    const { stdout } = await spawnAsync('node', args, { cwd: projectRoot });
    const config = JSON.parse(stdout);
    const results: HashSource[] = await parseCoreAutolinkingSourcesAsync({
      config,
      contentsId: 'rncoreAutolinkingConfig:android',
      reasons: ['rncoreAutolinkingAndroid'],
      platform: 'android',
    });
    return results;
  } catch (e) {
    debug(chalk.red(`Error adding react-native core autolinking sources for android.\n${e}`));
    return [];
  }
}

export async function getCoreAutolinkingSourcesFromExpoIos(
  projectRoot: string,
  options: NormalizedOptions,
  useRNCoreAutolinkingFromExpo?: boolean
): Promise<HashSource[]> {
  if (useRNCoreAutolinkingFromExpo === false || !options.platforms.includes('ios')) {
    return [];
  }
  try {
    const { stdout } = await spawnAsync(
      'node',
      [
        resolveExpoAutolinkingCliPath(projectRoot),
        'react-native-config',
        '--json',
        '--platform',
        'ios',
      ],
      { cwd: projectRoot }
    );
    const config = JSON.parse(stdout);
    const results: HashSource[] = await parseCoreAutolinkingSourcesAsync({
      config,
      contentsId: 'rncoreAutolinkingConfig:ios',
      reasons: ['rncoreAutolinkingIos'],
      platform: 'ios',
    });
    return results;
  } catch (e) {
    debug(chalk.red(`Error adding react-native core autolinking sources for ios.\n${e}`));
    return [];
  }
}

async function parseCoreAutolinkingSourcesAsync({
  config,
  reasons,
  contentsId,
  platform,
}: {
  config: any;
  reasons: string[];
  contentsId: string;
  platform?: string;
}): Promise<HashSource[]> {
  const logTag = platform
    ? `react-native core autolinking dir for ${platform}`
    : 'react-native core autolinking dir';
  const results: HashSource[] = [];
  const { root } = config;
  const autolinkingConfig: Record<string, any> = {};
  for (const [depName, depData] of Object.entries<any>(config.dependencies)) {
    try {
      stripRncoreAutolinkingAbsolutePaths(depData, root);
      const filePath = toPosixPath(depData.root);
      debug(`Adding ${logTag} - ${chalk.dim(filePath)}`);
      results.push({ type: 'dir', filePath, reasons });

      autolinkingConfig[depName] = depData;
    } catch (e) {
      debug(chalk.red(`Error adding ${logTag} - ${depName}.\n${e}`));
    }
  }

  results.push({
    type: 'contents',
    id: contentsId,
    contents: JSON.stringify(autolinkingConfig),
    reasons,
  });
  return results;
}

function stripRncoreAutolinkingAbsolutePaths(dependency: any, root: string): void {
  assert(dependency.root);
  const dependencyRoot = dependency.root;
  const cmakeDepRoot =
    process.platform === 'win32' ? dependencyRoot.replace(/\\/g, '/') : dependencyRoot;

  dependency.root = toPosixPath(path.relative(root, dependencyRoot));
  for (const platformData of Object.values<any>(dependency.platforms)) {
    for (const [key, value] of Object.entries<any>(platformData ?? {})) {
      let newValue;
      if (
        process.platform === 'win32' &&
        ['cmakeListsPath', 'cxxModuleCMakeListsPath'].includes(key)
      ) {
        // CMake paths on Windows are serving in slashes,
        // we have to check startsWith with the same slashes.
        newValue = value?.startsWith?.(cmakeDepRoot)
          ? toPosixPath(path.relative(root, value))
          : value;
      } else {
        newValue = value?.startsWith?.(dependencyRoot)
          ? toPosixPath(path.relative(root, value))
          : value;
      }

      platformData[key] = newValue;
    }
  }
}

function normalizePackageJsonScriptSources(
  scripts: Record<string, string>,
  options: NormalizedOptions
): string {
  if (options.sourceSkips & SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun) {
    // Replicate the behavior of `expo prebuild`
    if (!scripts.android?.includes('run') || scripts.android === 'expo run:android') {
      delete scripts.android;
    }
    if (!scripts.ios?.includes('run') || scripts.ios === 'expo run:ios') {
      delete scripts.ios;
    }
  }
  return JSON.stringify(scripts);
}
