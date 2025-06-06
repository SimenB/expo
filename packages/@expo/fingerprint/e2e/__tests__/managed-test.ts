import spawnAsync from '@expo/spawn-async';
import fs from 'fs/promises';
import path from 'path';
import rimraf from 'rimraf';

import getFingerprintHashFromCLIAsync from './utils/CLIUtils';
import {
  createFingerprintAsync,
  createProjectHashAsync,
  diffFingerprintChangesAsync,
} from '../../src/Fingerprint';
import { normalizeOptionsAsync } from '../../src/Options';
import { getHashSourcesAsync } from '../../src/sourcer/Sourcer';

jest.mock('../../src/ExpoConfigLoader', () => ({
  // Mock the getExpoConfigLoaderPath to use the built version rather than the typescript version from src
  getExpoConfigLoaderPath: jest.fn(() =>
    jest.requireActual('path').resolve(__dirname, '..', '..', 'build', 'ExpoConfigLoader.js')
  ),
}));

describe('managed project test', () => {
  jest.setTimeout(600000);
  const tmpDir = require('temp-dir');
  const projectName = 'fingerprint-e2e-managed';
  const projectRoot = path.join(tmpDir, projectName);

  beforeAll(async () => {
    rimraf.sync(projectRoot);
    // Pin the SDK version to prevent the latest version breaking snapshots
    await spawnAsync('bunx', ['create-expo-app', '-t', 'blank@sdk-49', projectName], {
      stdio: 'inherit',
      cwd: tmpDir,
      env: {
        ...process.env,
        // Do not inherit the package manager from this repository
        npm_config_user_agent: undefined,
      },
    });
  });

  afterAll(async () => {
    rimraf.sync(projectRoot);
  });

  it('should have same hash after adding js only library', async () => {
    const hash = await createProjectHashAsync(projectRoot);
    await spawnAsync('npx', ['expo', 'install', '@react-navigation/core'], {
      stdio: 'ignore',
      cwd: projectRoot,
    });
    const hash2 = await createProjectHashAsync(projectRoot);
    expect(hash).toBe(hash2);
  });

  it('should have same hash after updating js code', async () => {
    const hash = await createProjectHashAsync(projectRoot);
    const hashCLI = await getFingerprintHashFromCLIAsync(projectRoot);
    expect(hash).toEqual(hashCLI);

    const jsPath = path.join(projectRoot, 'App.js');
    const js = await fs.readFile(jsPath, 'utf8');
    await fs.writeFile(jsPath, `${js}\n// adding comments`);

    const hash2 = await createProjectHashAsync(projectRoot);
    const hash2CLI = await getFingerprintHashFromCLIAsync(projectRoot);
    expect(hash2).toEqual(hash2CLI);

    expect(hash).toBe(hash2);
  });

  it('should have different hash after adding native library', async () => {
    const hash = await createProjectHashAsync(projectRoot);
    const hashCLI = await getFingerprintHashFromCLIAsync(projectRoot);
    expect(hash).toEqual(hashCLI);

    await spawnAsync('npx', ['expo', 'install', 'expo-updates'], {
      stdio: 'ignore',
      cwd: projectRoot,
    });
    const hash2 = await createProjectHashAsync(projectRoot);
    const hash2CLI = await getFingerprintHashFromCLIAsync(projectRoot);
    expect(hash2).toEqual(hash2CLI);

    expect(hash).not.toBe(hash2);
  });

  it('should have different hash after updating `jsEngine`', async () => {
    const hash = await createProjectHashAsync(projectRoot);
    const hashCLI = await getFingerprintHashFromCLIAsync(projectRoot);
    expect(hash).toEqual(hashCLI);

    const configPath = path.join(projectRoot, 'app.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    config.expo.jsEngine = 'hermes';
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    const hash2 = await createProjectHashAsync(projectRoot);
    const hash2CLI = await getFingerprintHashFromCLIAsync(projectRoot);
    expect(hash2).toEqual(hash2CLI);

    expect(hash).not.toBe(hash2);
  });

  it('should have different hash after updating icon file', async () => {
    const hash = await createProjectHashAsync(projectRoot);
    const hashCLI = await getFingerprintHashFromCLIAsync(projectRoot);
    expect(hash).toEqual(hashCLI);

    const iconPath = path.join(projectRoot, 'assets', 'icon.png');
    await fs.writeFile(iconPath, '');

    const hash2 = await createProjectHashAsync(projectRoot);
    const hash2CLI = await getFingerprintHashFromCLIAsync(projectRoot);
    expect(hash2).toEqual(hash2CLI);

    expect(hash).not.toBe(hash2);
  });

  it('should have different hash after adding js only config-plugin', async () => {
    const hash = await createProjectHashAsync(projectRoot);
    const hashCLI = await getFingerprintHashFromCLIAsync(projectRoot);
    expect(hash).toEqual(hashCLI);

    await spawnAsync('npx', ['expo', 'install', 'expo-build-properties'], {
      stdio: 'ignore',
      cwd: projectRoot,
    });
    const hash2 = await createProjectHashAsync(projectRoot);
    const hash2CLI = await getFingerprintHashFromCLIAsync(projectRoot);
    expect(hash2).toEqual(hash2CLI);

    expect(hash).not.toBe(hash2);
  });

  it('diffFingerprintChangesAsync - should return diff after adding native library', async () => {
    const fingerprint = await createFingerprintAsync(projectRoot);
    await spawnAsync('bun', ['install', '--save', '@react-native-community/netinfo@9.3.7'], {
      stdio: 'ignore',
      cwd: projectRoot,
    });
    const diff = await diffFingerprintChangesAsync(fingerprint, projectRoot);
    expect(diff).toMatchInlineSnapshot(`
      [
        {
          "addedSource": {
            "filePath": "node_modules/@react-native-community/netinfo",
            "hash": "7a41febc80b298412c7dd08b77e243c7aadd5c4e",
            "reasons": [
              "rncoreAutolinking",
            ],
            "type": "dir",
          },
          "op": "added",
        },
        {
          "afterSource": {
            "contents": "{"@react-native-community/netinfo":{"root":"node_modules/@react-native-community/netinfo","name":"@react-native-community/netinfo","platforms":{"ios":{"podspecPath":"node_modules/@react-native-community/netinfo/react-native-netinfo.podspec","configurations":[],"scriptPhases":[]},"android":{"sourceDir":"node_modules/@react-native-community/netinfo/android","packageImportPath":"import com.reactnativecommunity.netinfo.NetInfoPackage;","packageInstance":"new NetInfoPackage()","buildTypes":[],"componentDescriptors":[],"cmakeListsPath":"node_modules/@react-native-community/netinfo/android/build/generated/source/codegen/jni/CMakeLists.txt"}}},"expo":{"root":"node_modules/expo","name":"expo","platforms":{"ios":{"podspecPath":"node_modules/expo/Expo.podspec","configurations":[],"scriptPhases":[]},"android":{"sourceDir":"node_modules/expo/android","packageImportPath":"import expo.modules.ExpoModulesPackage;","packageInstance":"new ExpoModulesPackage()","buildTypes":[],"componentDescriptors":[],"cmakeListsPath":"node_modules/expo/android/build/generated/source/codegen/jni/CMakeLists.txt"}}}}",
            "hash": "ac75722bd87eb0189440be83faa2249079da5839",
            "id": "rncoreAutolinkingConfig",
            "reasons": [
              "rncoreAutolinking",
            ],
            "type": "contents",
          },
          "beforeSource": {
            "contents": "{"expo":{"root":"node_modules/expo","name":"expo","platforms":{"ios":{"podspecPath":"node_modules/expo/Expo.podspec","configurations":[],"scriptPhases":[]},"android":{"sourceDir":"node_modules/expo/android","packageImportPath":"import expo.modules.ExpoModulesPackage;","packageInstance":"new ExpoModulesPackage()","buildTypes":[],"componentDescriptors":[],"cmakeListsPath":"node_modules/expo/android/build/generated/source/codegen/jni/CMakeLists.txt"}}}}",
            "hash": "8cf8a7370fa76cf34e817714399ddea233459943",
            "id": "rncoreAutolinkingConfig",
            "reasons": [
              "rncoreAutolinking",
            ],
            "type": "contents",
          },
          "op": "changed",
        },
      ]
    `);
  });
});

describe(`getHashSourcesAsync - managed project`, () => {
  jest.setTimeout(600000);
  const tmpDir = require('temp-dir');
  const projectName = 'fingerprint-e2e-managed';
  const projectRoot = path.join(tmpDir, projectName);

  beforeAll(async () => {
    rimraf.sync(projectRoot);
    // Pin the SDK version to prevent the latest version breaking snapshots
    await spawnAsync('bunx', ['create-expo-app', '-t', 'blank@sdk-49', projectName], {
      stdio: 'inherit',
      cwd: tmpDir,
      env: {
        ...process.env,
        // Do not inherit the package manager from this repository
        npm_config_user_agent: undefined,
      },
    });

    // Pin the `expo` package version to prevent the latest version breaking snapshots
    await spawnAsync('bun', ['install', '--save', 'expo@49.0.16'], {
      stdio: 'ignore',
      cwd: projectRoot,
    });
  });

  afterAll(async () => {
    rimraf.sync(projectRoot);
  });

  it('should match snapshot', async () => {
    const sources = await getHashSourcesAsync(
      projectRoot,
      await normalizeOptionsAsync(projectRoot)
    );
    expect(sources).toMatchSnapshot();
  });
});
