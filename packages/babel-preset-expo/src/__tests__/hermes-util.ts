import spawnAsync from '@expo/spawn-async';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import resolveFrom from 'resolve-from';

const debug = require('debug')('expo:metro:hermes') as typeof console.log;

const reactNativeDir = path.join(require.resolve('react-native/package.json'), '..');

function importHermesCommandFromProject(): string {
  const platformExecutable = getHermesCommandPlatform();

  const reactNativeRoot = path.dirname(require.resolve('react-native/package.json'));
  const hermescPaths = [
    // Override hermesc dir by environment variables
    process.env['REACT_NATIVE_OVERRIDE_HERMES_DIR']
      ? `${process.env['REACT_NATIVE_OVERRIDE_HERMES_DIR']}/build/bin/hermesc`
      : '',

    // Building hermes from source
    `${reactNativeRoot}/ReactAndroid/hermes-engine/build/hermes/bin/hermesc`,

    // Prebuilt hermesc in official react-native 0.69+
    `${reactNativeRoot}/sdks/hermesc/${platformExecutable}`,
  ];

  for (const hermescPath of hermescPaths) {
    try {
      if (fs.existsSync(hermescPath)) {
        return hermescPath;
      }
    } catch {}
  }
  throw new Error('Cannot find the hermesc executable.');
}

function getHermesCommandPlatform(): string {
  switch (os.platform()) {
    case 'darwin':
      return 'osx-bin/hermesc';
    case 'linux':
      return 'linux64-bin/hermesc';
    case 'win32':
      return 'win64-bin/hermesc.exe';
    default:
      throw new Error(`Unsupported host platform for Hermes compiler: ${os.platform()}`);
  }
}

type BuildHermesOptions = {
  code: string;
  minify?: boolean;
};

export async function compileToHermesBytecodeAsync({
  code,
  minify = false,
}: BuildHermesOptions): Promise<Buffer> {
  const tempDir = path.join(os.tmpdir(), `expo-babel-test-${Math.random()}-${Date.now()}`);
  await fs.promises.mkdir(tempDir, { recursive: true });
  try {
    const tempBundleFile = path.join(tempDir, 'index.js');
    await fs.promises.writeFile(tempBundleFile, code);

    const tempHbcFile = path.join(tempDir, 'index.hbc');
    const hermesCommand = importHermesCommandFromProject();
    const args = ['-emit-binary', '-strict', '-out', tempHbcFile, tempBundleFile];
    if (minify) {
      args.push('-O');
    }

    debug(`Running hermesc: ${hermesCommand} ${args.join(' ')}`);
    await spawnAsync(hermesCommand, args);

    return await fs.promises.readFile(tempHbcFile);
  } catch (error: any) {
    if ('status' in error) {
      throw new Error(error.output.join('\n'));
    }
    throw error;
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}
