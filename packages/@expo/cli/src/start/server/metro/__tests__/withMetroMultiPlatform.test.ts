import { getBareExtensions } from '@expo/config/paths';
import type Bundler from '@expo/metro/metro/Bundler';
import type { ConfigT } from '@expo/metro/metro-config';
import type { CustomResolutionContext, Resolution } from '@expo/metro/metro-resolver';
import { vol } from 'memfs';
import assert from 'node:assert';

import { StickyModuleResolverInput } from '../createExpoStickyResolver';
import { shouldCreateVirtualCanary, shouldCreateVirtualShim } from '../externals';
import { getNodejsExtensions, withExtendedResolver } from '../withMetroMultiPlatform';

const asMetroConfig = (config: Partial<ConfigT> = {}): ConfigT => config as any;

class FailedToResolveNameError extends Error {
  extraPaths: string[] = [];

  readonly name = 'FailedToResolveNameError';

  constructor() {
    super('Failed to resolve name');
  }
}
jest.mock('@expo/metro/metro-resolver', () => {
  const resolve = jest.fn(() => ({ type: 'empty' }));
  return {
    resolve,
  };
});

jest.mock('../externals', () => ({
  ...jest.requireActual('../externals'),
  shouldCreateVirtualCanary: jest.fn(() => false),
  shouldCreateVirtualShim: jest.fn(() => false),
}));

function getDefaultRequestContext(): CustomResolutionContext {
  return getResolverContext();
}

function getMetroBundlerGetter() {
  return jest.fn((): Bundler => {
    const transformFile = jest.fn();
    // @ts-expect-error
    transformFile.__patched = true;
    return {
      hasVirtualModule: jest.fn((path) => false),
      setVirtualModule: jest.fn(),
      transformFile,
    } as any;
  });
}

const expectVirtual = (result: Resolution, name: string) => {
  expect(result.type).toBe('sourceFile');
  assert(result.type === 'sourceFile');
  assert(/^\0/.test(result.filePath), 'Virtual files must start with null byte: \\0');
  expect(result.filePath).toBe(name);
};

function getResolverContext(
  context: Partial<CustomResolutionContext> = {}
): CustomResolutionContext {
  return {
    dev: true,
    extraNodeModules: {},
    mainFields: ['react-native', 'browser', 'main'],
    nodeModulesPaths: ['/root/node_modules'],
    preferNativePlatform: true,
    sourceExts: ['mjs', 'ts', 'tsx', 'js', 'jsx', 'json', 'css'],
    customResolverOptions: {},
    originModulePath: '/root/index.js',
    getPackage: () => null,
    ...context,
  } as any;
}
function getNodeResolverContext({
  customResolverOptions,
  ...context
}: Partial<CustomResolutionContext> = {}): CustomResolutionContext {
  return {
    dev: true,
    extraNodeModules: {},
    mainFields: ['react-native', 'browser', 'main'],
    nodeModulesPaths: ['/root/node_modules'],
    preferNativePlatform: true,
    sourceExts: ['mjs', 'ts', 'tsx', 'js', 'jsx', 'json', 'css'],
    customResolverOptions: {
      environment: 'node',
      ...(customResolverOptions || {}),
    },
    originModulePath: '/root/index.js',
    ...context,
  } as any;
}

function getResolveFunc() {
  const metroResolver: typeof import('@expo/metro/metro-resolver') = require('@expo/metro/metro-resolver');
  return metroResolver.resolve;
}

describe(withExtendedResolver, () => {
  function mockMinFs() {
    vol.fromJSON(
      {
        'node_modules/@react-native/assets-registry/registry.js': '',
      },
      '/root/'
    );
  }
  afterEach(() => {
    vol.reset();
  });

  it(`resolves a file for web`, async () => {
    mockMinFs();

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: null,
      isTsconfigPathsEnabled: false,
      getMetroBundler: getMetroBundlerGetter(),
    });

    const platform = 'ios';

    modified.resolver.resolveRequest!(getDefaultRequestContext(), 'react-native', platform);

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      expect.objectContaining({
        extraNodeModules: {},
        mainFields: ['react-native', 'browser', 'main'],
        nodeModulesPaths: ['/root/node_modules'],
        preferNativePlatform: true,
        sourceExts: ['mjs', 'ts', 'tsx', 'js', 'jsx', 'json', 'css'],
        customResolverOptions: {},
        originModulePath: expect.anything(),
        getPackage: expect.any(Function),
      }),
      'react-native',
      platform
    );
  });

  it(`resolves against tsconfig baseUrl`, async () => {
    mockMinFs();

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: { baseUrl: '/src', paths: { '/*': ['*'] } },
      isTsconfigPathsEnabled: true,
    });

    const platform = 'ios';

    modified.resolver.resolveRequest!(getDefaultRequestContext(), 'react-native', platform);

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);

    expect(getResolveFunc()).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        extraNodeModules: {},
        mainFields: ['react-native', 'browser', 'main'],
        preferNativePlatform: true,
      }),
      '/src/react-native',
      platform
    );
  });

  it(`resolves against tsconfig baseUrl without paths`, async () => {
    mockMinFs();

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: { baseUrl: '/src' },
      isTsconfigPathsEnabled: true,
    });

    const platform = 'ios';

    modified.resolver.resolveRequest!(getDefaultRequestContext(), 'react-native', platform);

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);

    expect(getResolveFunc()).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        extraNodeModules: {},
        mainFields: ['react-native', 'browser', 'main'],
        preferNativePlatform: true,
      }),
      '/src/react-native',
      platform
    );
  });

  it(`does not alias react-native-web in initial resolution with baseUrl on web`, async () => {
    mockMinFs();

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: { baseUrl: '/src', paths: { '/*': ['*'] } },
      isTsconfigPathsEnabled: true,
    });

    const platform = 'web';

    modified.resolver.resolveRequest!(getDefaultRequestContext(), 'react-native', platform);

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      expect.objectContaining({
        mainFields: ['browser', 'module', 'main'],
        preferNativePlatform: false,
      }),
      '/src/react-native',
      platform
    );
  });

  it(`resolves to react-native-web on web`, async () => {
    mockMinFs();

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: {},
      isTsconfigPathsEnabled: false,
    });

    const platform = 'web';

    modified.resolver.resolveRequest!(getDefaultRequestContext(), 'react-native', platform);

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      expect.objectContaining({
        mainFields: ['browser', 'module', 'main'],
        preferNativePlatform: false,
      }),
      'react-native-web',
      platform
    );
  });

  it(`resolves to expo-asset/build/resolveAssetSource on web`, async () => {
    mockMinFs();

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: {},
      isTsconfigPathsEnabled: false,
    });

    const platform = 'web';

    modified.resolver.resolveRequest!(
      getDefaultRequestContext(),
      'react-native/Libraries/Image/resolveAssetSource',
      platform
    );

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      expect.objectContaining({
        mainFields: ['browser', 'module', 'main'],
        preferNativePlatform: false,
      }),
      'expo-asset/build/resolveAssetSource',
      platform
    );
  });

  describe('development aliases', () => {
    [
      [
        'ios',
        '/Users/path/to/node_modules/react-native/Libraries/Renderer/shims/ReactNative.js',
        '../implementations/ReactNativeRenderer-prod',
      ],
      ['web', '/Users/path/to/expo/node_modules/react/index.js', './cjs/react.production.min.js'],
    ].forEach(([platform, originModulePath, targetModulePath]) => {
      it(`resolves production react files to empty when bundling for development: (platform: ${platform}, import: ${targetModulePath})`, async () => {
        mockMinFs();

        const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
          tsconfig: {},
          isTsconfigPathsEnabled: false,
        });

        modified.resolver.resolveRequest!(
          {
            ...getDefaultRequestContext(),
            dev: true,
            originModulePath,
          },
          targetModulePath,
          platform
        );

        expect(getResolveFunc()).not.toHaveBeenCalled();
      });
    });

    it(`does not mock native files on web`, async () => {
      mockMinFs();

      const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
        tsconfig: {},
        isTsconfigPathsEnabled: false,
      });

      modified.resolver.resolveRequest!(
        {
          ...getDefaultRequestContext(),
          dev: false,
          originModulePath:
            '/Users/path/to/node_modules/react-native/Libraries/Renderer/shims/ReactNative.js',
        },
        '../implementations/ReactNativeRenderer-prod.js',
        'web'
      );

      expect(getResolveFunc()).toHaveBeenCalled();
    });

    it(`resolves production react files normally when bundling for production`, async () => {
      mockMinFs();

      const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
        tsconfig: {},
        isTsconfigPathsEnabled: false,
      });

      modified.resolver.resolveRequest!(
        {
          ...getDefaultRequestContext(),
          dev: false,
          originModulePath: '/Users/path/to/expo/node_modules/react/index.js',
        },
        './cjs/react.production.min.js',
        'web'
      );

      expect(getResolveFunc()).toHaveBeenCalled();
    });
  });

  it(`resolves to @expo/vector-icons on any platform`, async () => {
    vol.fromJSON(
      {
        'node_modules/@react-native/assets-registry/registry.js': '',
        'node_modules/@expo/vector-icons/index.js': '',
      },
      '/root/'
    );

    ['ios', 'web'].forEach((platform) => {
      const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
        tsconfig: {},
        isTsconfigPathsEnabled: false,
      });

      modified.resolver.resolveRequest!(
        getDefaultRequestContext(),
        'react-native-vector-icons',
        platform
      );

      expect(getResolveFunc()).toHaveBeenCalledWith(
        expect.anything(),
        '@expo/vector-icons',
        platform
      );
    });
  });

  it(`resolves nested imports to @expo/vector-icons on any platform`, async () => {
    vol.fromJSON(
      {
        'node_modules/@react-native/assets-registry/registry.js': '',
        'node_modules/@expo/vector-icons/index.js': '',
      },
      '/root/'
    );

    ['ios', 'web'].forEach((platform) => {
      const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
        tsconfig: {},
        isTsconfigPathsEnabled: false,
      });

      modified.resolver.resolveRequest!(
        getDefaultRequestContext(),
        'react-native-vector-icons/FontAwesome',
        platform
      );

      expect(getResolveFunc()).toHaveBeenCalledWith(
        expect.anything(),
        '@expo/vector-icons/FontAwesome',
        platform
      );
    });
  });

  it(`does not alias react-native-vector-icons if @expo/vector-icons is not installed`, async () => {
    vol.fromJSON(
      {
        'node_modules/@react-native/assets-registry/registry.js': '',
      },
      '/root/'
    );

    ['ios', 'web'].forEach((platform) => {
      const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
        tsconfig: {},
        isTsconfigPathsEnabled: true,
      });

      modified.resolver.resolveRequest!(
        getDefaultRequestContext(),
        'react-native-vector-icons',
        platform
      );

      expect(getResolveFunc()).toHaveBeenCalledWith(
        expect.anything(),
        'react-native-vector-icons',
        platform
      );
    });
  });

  it(`allows importing @expo/vector-icons`, async () => {
    vol.fromJSON(
      {
        'node_modules/@react-native/assets-registry/registry.js': '',
        'node_modules/@expo/vector-icons/index.js': '',
      },
      '/root/'
    );
    const platform = 'ios';
    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: {},
      isTsconfigPathsEnabled: true,
    });

    modified.resolver.resolveRequest!(getDefaultRequestContext(), '@expo/vector-icons', platform);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      expect.anything(),
      '@expo/vector-icons',
      platform
    );
  });

  it(`resolves a node.js built-in as a shim on web`, async () => {
    mockMinFs();

    // Emulate throwing when the module doesn't exist...
    jest.mocked(getResolveFunc()).mockImplementationOnce(() => {
      throw new FailedToResolveNameError();
    });

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: null,
      isTsconfigPathsEnabled: false,
    });

    const platform = 'web';

    expect(
      modified.resolver.resolveRequest!(getDefaultRequestContext(), 'node:path', platform)
    ).toEqual({
      type: 'empty',
    });

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      expect.objectContaining({
        mainFields: ['browser', 'module', 'main'],
        preferNativePlatform: false,
      }),
      'node:path',
      platform
    );
  });

  it(`resolves a node.js built-in as a an installed module on web`, async () => {
    mockMinFs();

    // Emulate throwing when the module doesn't exist...
    jest.mocked(getResolveFunc()).mockImplementationOnce(() => {
      return {
        type: 'sourceFile',
        filePath: 'node_modules/path/index.js',
      };
    });

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: null,
      isTsconfigPathsEnabled: false,
    });

    const platform = 'web';

    expect(
      modified.resolver.resolveRequest!(getDefaultRequestContext(), 'node:path', platform)
    ).toEqual({
      filePath: 'node_modules/path/index.js',
      type: 'sourceFile',
    });

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeModulesPaths: ['/root/node_modules'],
        mainFields: ['browser', 'module', 'main'],
        preferNativePlatform: false,
      }),
      'node:path',
      platform
    );
  });

  it(`modifies resolution for Node.js environments`, async () => {
    mockMinFs();

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: null,
      isTsconfigPathsEnabled: false,
    });

    const platform = 'web';

    modified.resolver.resolveRequest!(
      {
        ...getDefaultRequestContext(),
        customResolverOptions: {
          environment: 'node',
        },
      },
      'react-native',
      platform
    );

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      expect.objectContaining({
        mainFields: ['main', 'module'],
        preferNativePlatform: false,
        // Moved mjs to the back
        sourceExts: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'css'],
      }),
      'react-native-web',
      platform
    );
  });

  it(`modifies resolution for React Server environments`, async () => {
    mockMinFs();

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: null,
      isTsconfigPathsEnabled: false,
      getMetroBundler: getMetroBundlerGetter(),
    });

    const platform = 'ios';

    modified.resolver.resolveRequest!(
      {
        ...getDefaultRequestContext(),
        customResolverOptions: {
          environment: 'react-server',
        },
      },
      'react-foobar',
      platform
    );

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      {
        customResolverOptions: { environment: 'react-server' },
        dev: true,
        extraNodeModules: {},
        mainFields: ['react-native', 'module', 'main'],
        nodeModulesPaths: ['/root/node_modules'],
        originModulePath: '/root/index.js',
        preferNativePlatform: true,
        sourceExts: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'css'],
        unstable_conditionNames: ['node', 'react-server', 'workerd'],
        unstable_conditionsByPlatform: {},
        unstable_enablePackageExports: true,
        getPackage: expect.any(Function),
      },
      'react-foobar',
      platform
    );
  });
  it(`modifies resolution for React Server environments (web)`, async () => {
    mockMinFs();

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: null,
      isTsconfigPathsEnabled: false,
      getMetroBundler: getMetroBundlerGetter(),
    });

    const platform = 'web';

    modified.resolver.resolveRequest!(
      {
        ...getDefaultRequestContext(),
        customResolverOptions: {
          environment: 'react-server',
        },
      },
      'react-foobar',
      platform
    );

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      {
        customResolverOptions: { environment: 'react-server' },
        dev: true,
        extraNodeModules: {},
        mainFields: ['module', 'main'],
        nodeModulesPaths: ['/root/node_modules'],
        originModulePath: '/root/index.js',
        preferNativePlatform: false,
        sourceExts: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'css'],
        unstable_conditionNames: ['node', 'react-server', 'workerd'],
        unstable_conditionsByPlatform: {},
        unstable_enablePackageExports: true,
        getPackage: expect.any(Function),
      },
      'react-foobar',
      platform
    );
  });
  it(`modifies resolution for Node.js environments (web + react-foobar)`, async () => {
    mockMinFs();

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: null,
      isTsconfigPathsEnabled: false,
      getMetroBundler: getMetroBundlerGetter(),
    });

    const platform = 'web';

    modified.resolver.resolveRequest!(
      {
        ...getDefaultRequestContext(),
        customResolverOptions: {
          environment: 'node',
        },
      },
      'react-foobar',
      platform
    );

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      {
        customResolverOptions: { environment: 'node' },
        dev: true,
        extraNodeModules: {},
        mainFields: ['main', 'module'],
        nodeModulesPaths: ['/root/node_modules'],
        originModulePath: '/root/index.js',
        preferNativePlatform: false,
        sourceExts: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'css'],
        unstable_conditionNames: ['node'],
        unstable_conditionsByPlatform: {},
        unstable_enablePackageExports: true,
        getPackage: expect.any(Function),
      },
      'react-foobar',
      platform
    );
  });

  it(`aliases react-native-web modules to virtual shims on web`, async () => {
    vol.fromJSON(
      {
        'node_modules/react-native-web/dist/cjs/exports/AppRegistry/AppContainer.js': '',

        'node_modules/@react-native/assets-registry/registry.js': '',

        mock: '',
      },
      '/'
    );

    jest
      .mocked(shouldCreateVirtualShim)
      .mockClear()
      .mockImplementationOnce((path: string) =>
        path.includes('react-native-web/dist/cjs/exports') ? '/mock' : null
      );
    // Emulate throwing when the module doesn't exist...
    jest
      .mocked(getResolveFunc())
      .mockClear()
      .mockImplementationOnce(() => {
        return {
          type: 'sourceFile',
          filePath: '/node_modules/react-native-web/dist/cjs/exports/AppRegistry/AppContainer.js',
        };
      });

    const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
      tsconfig: {},
      isTsconfigPathsEnabled: false,
      isReactCanaryEnabled: true,
      getMetroBundler: getMetroBundlerGetter(),
    });

    const result = modified.resolver.resolveRequest!(
      getDefaultRequestContext(),
      '/node_modules/react-native-web/dist/cjs/exports/AppRegistry/AppContainer.js',
      'web'
    );

    expect(result).toEqual({
      filePath: '\0shim:react-native-web/dist/cjs/exports/AppRegistry/AppContainer.js',
      type: 'sourceFile',
    });

    expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    expect(getResolveFunc()).toHaveBeenCalledWith(
      expect.anything(),
      '/node_modules/react-native-web/dist/cjs/exports/AppRegistry/AppContainer.js',
      'web'
    );
  });

  describe('built-in externals', () => {
    function getModifiedConfig(props: { isExporting?: boolean } = {}) {
      return withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
        tsconfig: {},
        isExporting: props.isExporting,
        isTsconfigPathsEnabled: false,
        isReactCanaryEnabled: false,
        getMetroBundler: getMetroBundlerGetter(),
      });
    }

    describe('node server + development', () => {
      const config = getModifiedConfig();

      ['ios', 'web'].forEach((platform) => {
        describe(platform, () => {
          ['react/123', 'expo'].forEach((name) => {
            it(`does not extern ${name} to virtual node shim`, () => {
              const result = config.resolver.resolveRequest!(
                // Context
                getNodeResolverContext(),
                // Module
                name,
                // Platform
                platform
              );

              expect(result.type).toBe('empty');
              expect(getResolveFunc()).toHaveBeenCalledTimes(1);
            });
          });

          [
            'source-map-support',
            'source-map-support/register.js',
            'react',
            '@radix-ui/accordion',
            '@babel/runtime/helpers/interopRequireDefault',
            'react-dom/server',
            'debug',
            'acorn-loose',
            'acorn',
            'css-in-js-utils/lib/escape',
            'hyphenate-style-name',
            'color',
            'color-string',
            'color-convert',
            'color-name',
            'fontfaceobserver',
            'fast-deep-equal',
            'query-string',
            'escape-string-regexp',
            'invariant',
            'postcss-value-parser',
            'memoize-one',
            'nullthrows',
            'strict-uri-encode',
            'decode-uri-component',
            'split-on-first',
            'filter-obj',
            'warn-once',
            'simple-swizzle',
            'is-arrayish',
            'inline-style-prefixer/index.js',
          ].forEach((name) => {
            it(`externs ${name} to virtual node shim`, () => {
              const result = config.resolver.resolveRequest!(
                // Context
                getNodeResolverContext(),
                // Module
                name,
                // Platform
                platform
              );

              expectVirtual(
                result,
                // Expected path
                `\0node:${name}`
              );

              expect(getResolveFunc()).toHaveBeenCalledTimes(0);
            });
          });

          it(`externs @babel/runtime/xxx subpaths `, () => {
            const result = config.resolver.resolveRequest!(
              getNodeResolverContext(),
              '@babel/runtime/xxx/foo.js',
              platform
            );

            expectVirtual(
              result,
              // Expected path
              '\0node:@babel/runtime/xxx/foo.js'
            );

            expect(getResolveFunc()).toHaveBeenCalledTimes(0);
          });
        });
      });
    });

    it(`does not apply virtual externals to imports originating in CSS files`, () => {
      vol.fromJSON(
        {
          'node_modules/@radix-ui/colors/green-dark.css': '',
          mock: '',
        },
        '/'
      );

      const config = getModifiedConfig();

      const result = config.resolver.resolveRequest!(
        getNodeResolverContext({
          originModulePath: '/index.css',
        }),
        '@radix-ui/colors/green-dark.css',
        'web'
      );

      expect(result).toEqual({
        type: 'empty',
      });

      expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    });

    it(`does not extern source-map-support in server environments that are bundling for standalone exports`, async () => {
      const result = getModifiedConfig({ isExporting: true }).resolver.resolveRequest!(
        getNodeResolverContext({
          customResolverOptions: {
            exporting: true,
          },
        }),
        'source-map-support',
        'web'
      );

      expect(result).toEqual({
        type: 'empty',
      });

      expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    });

    it(`does not extern source-map-support in client environment`, async () => {
      const result = getModifiedConfig().resolver.resolveRequest!(
        getResolverContext(),
        'source-map-support',
        'web'
      );

      expect(result).toEqual({
        type: 'empty',
      });

      expect(getResolveFunc()).toHaveBeenCalledTimes(1);
    });
  });

  it(`aliases React Native renderer modules to canaries on native`, async () => {
    vol.fromJSON(
      {
        'node_modules/react-native/Libraries/Renderer/implementations/ReactNativeRenderer-dev.js':
          '',

        'node_modules/@react-native/assets-registry/registry.js': '',

        mock: '',
      },
      '/'
    );

    ['ios', 'android'].forEach((platform) => {
      jest
        .mocked(shouldCreateVirtualCanary)
        .mockClear()
        .mockImplementationOnce((path: string) =>
          path.includes('Libraries/Renderer/implementations') ? '/mock' : null
        );
      // Emulate throwing when the module doesn't exist...
      jest
        .mocked(getResolveFunc())
        .mockClear()
        .mockImplementationOnce(() => {
          return {
            type: 'sourceFile',
            filePath:
              '/node_modules/react-native/Libraries/Renderer/implementations/ReactNativeRenderer-dev.js',
          };
        });

      const modified = withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
        tsconfig: {},
        isTsconfigPathsEnabled: false,
        isReactCanaryEnabled: true,
        getMetroBundler: getMetroBundlerGetter(),
      });

      const result = modified.resolver.resolveRequest!(
        getDefaultRequestContext(),
        '/node_modules/react-native/Libraries/Renderer/implementations/ReactNativeRenderer-dev.js',
        platform
      );

      expect(result).toEqual({
        filePath: '/mock',
        type: 'sourceFile',
      });

      expect(getResolveFunc()).toHaveBeenCalledTimes(1);
      expect(getResolveFunc()).toHaveBeenCalledWith(
        expect.anything(),
        '/node_modules/react-native/Libraries/Renderer/implementations/ReactNativeRenderer-dev.js',
        platform
      );
    });
  });

  describe('with fallback module resolver', () => {
    function getModifiedConfig() {
      return withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
        tsconfig: {},
        isTsconfigPathsEnabled: false,
        isReactCanaryEnabled: true,
        getMetroBundler: getMetroBundlerGetter() as any,
      });
    }

    it('resolves `@babel/runtime/helpers/interopRequireDefault` as a fallback module', () => {
      const platform = 'ios';
      const modified = getModifiedConfig();

      jest.mocked(getResolveFunc()).mockImplementation((context, moduleName, _platform) => {
        if (
          context.originModulePath === '/root/index.js' &&
          moduleName === '@babel/runtime/helpers/interopRequireDefault'
        ) {
          throw new FailedToResolveNameError();
        } else if (moduleName === 'expo/package.json') {
          return { type: 'sourceFile', filePath: `/node_modules/${moduleName}` };
        } else if (moduleName === 'expo-router/package.json') {
          return { type: 'sourceFile', filePath: `/node_modules/${moduleName}` };
        } else {
          return { type: 'empty' };
        }
      });

      modified.resolver.resolveRequest!(
        getResolverContext({
          getPackage(name) {
            if (name.endsWith('expo/package.json')) {
              return {
                name: 'expo',
                dependencies: {
                  // Needs to define that it depends on `@babel/runtime`
                  '@babel/runtime': '*',
                },
              };
            } else {
              return null;
            }
          },
        }),
        '@babel/runtime/helpers/interopRequireDefault',
        platform
      );

      expect(getResolveFunc()).toHaveBeenCalledTimes(3);

      // 1: Fails to resolve the dependency by `expo` (@babel/runtime)
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ originModulePath: '/root/index.js' }),
        '@babel/runtime/helpers/interopRequireDefault',
        platform
      );

      // 2: Resolves the origin root module path for `expo`
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ originModulePath: '/root/package.json' }),
        'expo/package.json',
        platform
      );

      // 3: After finding that `expo` has a dependency on `@babel/runtime`, resolves the dependency via `expo` insteaad
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          originModulePath: '/node_modules/expo',
          nodeModulesPaths: ['/node_modules/expo'],
        }),
        '@babel/runtime/helpers/interopRequireDefault',
        platform
      );
    });

    it('resolves fallback modules for `expo-router` dependencies', () => {
      const platform = 'ios';
      const modified = getModifiedConfig();

      jest.mocked(getResolveFunc()).mockImplementation((context, moduleName, _platform) => {
        if (context.originModulePath === '/root/index.js' && moduleName === 'example') {
          throw new FailedToResolveNameError();
        } else if (moduleName === 'expo/package.json') {
          return { type: 'sourceFile', filePath: `/node_modules/${moduleName}` };
        } else if (moduleName === 'expo-router/package.json') {
          return { type: 'sourceFile', filePath: `/node_modules/${moduleName}` };
        } else {
          return { type: 'empty' };
        }
      });

      modified.resolver.resolveRequest!(
        getResolverContext({
          getPackage(name) {
            if (name.endsWith('expo/package.json')) {
              return {
                name: 'expo',
                dependencies: {},
              };
            } else if (name.endsWith('expo-router/package.json')) {
              return {
                name: 'expo-router',
                dependencies: {
                  example: '*',
                },
              };
            } else {
              return null;
            }
          },
        }),
        'example',
        platform
      );

      expect(getResolveFunc()).toHaveBeenCalledTimes(4);

      // 1: Fails to resolve the dependency by `expo` (example)
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ originModulePath: '/root/index.js' }),
        'example',
        platform
      );

      // 2: Resolves the origin root module path for `expo`
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ originModulePath: '/root/package.json' }),
        'expo/package.json',
        platform
      );

      // 3: Resolves the origin root module path for `expo-router`
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ originModulePath: '/root/package.json' }),
        'expo-router/package.json',
        platform
      );

      // 4: After finding that `expor-router` has a dependency on `example`, resolves the dependency via `expo-router` insteaad
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          originModulePath: '/node_modules/expo-router',
          nodeModulesPaths: ['/node_modules/expo-router'],
        }),
        'example',
        platform
      );
    });

    it('resolves no fallback modules if no origin modules were found', () => {
      const platform = 'ios';
      const modified = getModifiedConfig();

      jest.mocked(getResolveFunc()).mockImplementation(() => {
        throw new FailedToResolveNameError();
      });

      expect(() => {
        modified.resolver.resolveRequest!(getDefaultRequestContext(), 'example', platform);
      }).toThrow();

      expect(getResolveFunc()).toHaveBeenCalledTimes(3);

      // 1: Fails to resolve the dependency by `expo` (@babel/runtime)
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ originModulePath: '/root/index.js' }),
        'example',
        platform
      );

      // 2: Fails to resolve origin root module path for `expo`
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ originModulePath: '/root/package.json' }),
        'expo/package.json',
        platform
      );

      // 3: Fails to resolve origin root module path for `expo-router`
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ originModulePath: '/root/package.json' }),
        'expo-router/package.json',
        platform
      );
    });

    it('resolves no fallback modules if origin module dependencies mismatch', () => {
      // Empty dependencies should cause no modules to match
      vol.fromJSON(
        {
          'node_modules/expo/package.json': JSON.stringify({
            name: 'expo',
            dependencies: {},
          }),
          'node_modules/expo-router/package.json': JSON.stringify({
            name: 'expo-router',
            dependencies: {},
          }),
        },
        '/root/'
      );

      const platform = 'ios';
      const modified = getModifiedConfig();

      jest.mocked(getResolveFunc()).mockImplementation(() => {
        throw new FailedToResolveNameError();
      });

      expect(() => {
        modified.resolver.resolveRequest!(getDefaultRequestContext(), 'example', platform);
      }).toThrow();

      expect(getResolveFunc()).toHaveBeenCalledTimes(3);

      // 1: Fails to resolve the dependency (example)
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ originModulePath: '/root/index.js' }),
        'example',
        platform
      );

      // 2: Resolves the origin root module path for `expo`
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ originModulePath: '/root/package.json' }),
        'expo/package.json',
        platform
      );

      // 2: Resolves the origin root module path for `expo-router`
      expect(getResolveFunc()).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ originModulePath: '/root/package.json' }),
        'expo-router/package.json',
        platform
      );
    });
  });

  describe('with sticky module resolver', () => {
    function getModifiedConfig(input: StickyModuleResolverInput) {
      return withExtendedResolver(asMetroConfig({ projectRoot: '/root/' }), {
        tsconfig: {},
        stickyModuleResolverInput: input,
        isTsconfigPathsEnabled: false,
        isReactCanaryEnabled: true,
        getMetroBundler: getMetroBundlerGetter() as any,
      });
    }

    it('resolves redirect path for sticky module input', () => {
      const platform = 'ios';
      const modified = getModifiedConfig({
        ios: {
          platform: 'ios',
          moduleTestRe: /^(expo-router)($|\/.*)/,
          resolvedModulePaths: {
            'expo-router': '/sticky/expo-router',
          },
        },
      });

      jest.mocked(getResolveFunc()).mockImplementation((context, moduleName, _platform) => {
        return { type: 'sourceFile', filePath: context.originModulePath };
      });

      // Supports bare module name
      let result = modified.resolver.resolveRequest!(
        getDefaultRequestContext(),
        'expo-router',
        platform
      );
      expect(getResolveFunc()).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        filePath: '/sticky/expo-router',
        type: 'sourceFile',
      });

      expect(getResolveFunc()).toHaveBeenLastCalledWith(
        expect.objectContaining({ originModulePath: '/sticky/expo-router' }),
        'expo-router',
        platform
      );

      // Supports sub-path module name
      result = modified.resolver.resolveRequest!(
        getDefaultRequestContext(),
        'expo-router/file',
        platform
      );
      expect(getResolveFunc()).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        filePath: '/sticky/expo-router',
        type: 'sourceFile',
      });

      expect(getResolveFunc()).toHaveBeenLastCalledWith(
        expect.objectContaining({ originModulePath: '/sticky/expo-router' }),
        'expo-router/file',
        platform
      );
    });
  });
});

describe(getNodejsExtensions, () => {
  it(`should return the correct extensions for the node.js platform`, () => {
    const sourceExts = getBareExtensions([], { isTS: true, isReact: true, isModern: true });

    expect(getNodejsExtensions(sourceExts)).not.toEqual(sourceExts);

    // Ensure mjs comes after js
    expect(getNodejsExtensions(sourceExts)).toMatchInlineSnapshot(`
      [
        "ts",
        "tsx",
        "js",
        "jsx",
        "mjs",
        "json",
      ]
    `);
  });
});
