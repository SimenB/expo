/* eslint-env jest */
import fs from 'fs/promises';
import path from 'path';

import { projectRoot, getRoot, getLoadedModulesAsync } from './utils';
import { executeExpoAsync } from '../utils/expo';

const originalForceColor = process.env.FORCE_COLOR;

beforeAll(async () => {
  await fs.mkdir(projectRoot, { recursive: true });
  process.env.FORCE_COLOR = '0';
});

afterAll(() => {
  process.env.FORCE_COLOR = originalForceColor;
});

it('loads expected modules by default', async () => {
  const modules = await getLoadedModulesAsync(`require('../../build/src/config').expoConfig`);
  expect(modules).toStrictEqual([
    '@expo/cli/build/src/config/index.js',
    '@expo/cli/build/src/log.js',
    '@expo/cli/build/src/utils/args.js',
  ]);
});

it('runs `npx expo config --help`', async () => {
  const results = await executeExpoAsync(projectRoot, ['config', '--help']);
  expect(results.stdout).toMatchInlineSnapshot(`
    "
      Info
        Show the project config

      Usage
        $ npx expo config <dir>

      Options
        <dir>                                    Directory of the Expo project. Default: Current working directory
        --full                                   Include all project config data
        --json                                   Output in JSON format
        -t, --type <public|prebuild|introspect>  Type of config to show
        -h, --help                               Usage info
    "
  `);
});

it('runs `npx expo config --json`', async () => {
  const projectRoot = getRoot('basic-config');

  // Create the project root aot
  await fs.mkdir(projectRoot, { recursive: true });
  // Create a fake package.json -- this is a terminal file that cannot be overwritten.
  await fs.writeFile(path.join(projectRoot, 'package.json'), '{ "version": "1.0.0" }');
  await fs.writeFile(path.join(projectRoot, 'app.json'), '{ "expo": { "name": "foobar" } }');
  // Add an environment variable file to test that it's not included in the config.
  await fs.writeFile(path.join(projectRoot, '.env'), 'FOOBAR=1');

  const results = await executeExpoAsync(projectRoot, ['config', '--json']);
  // @ts-ignore
  const exp = JSON.parse(results.stdout);

  expect(exp.name).toEqual('foobar');
  expect(exp.slug).toEqual('foobar');
  expect(exp.platforms).toStrictEqual([]);
  expect(exp.version).toBe('1.0.0');
  expect(exp._internal.dynamicConfigPath).toBe(null);
  expect(exp._internal.staticConfigPath).toMatchPath(/\/basic-config\/app\.json$/);
});

it('runs `npx expo config --json` with a warning', async () => {
  const projectRoot = getRoot('basic-config');

  // Create the project root aot
  await fs.mkdir(projectRoot, { recursive: true });
  // Create a fake package.json -- this is a terminal file that cannot be overwritten.
  await fs.writeFile(path.join(projectRoot, 'package.json'), '{ "version": "1.0.0" }');
  await fs.writeFile(
    path.join(projectRoot, 'app.json'),
    '{ "abc": true, "expo": { "name": "foobar" } }'
  );

  const results = await executeExpoAsync(projectRoot, ['config', '--json']);
  // @ts-ignore
  const exp = JSON.parse(results.stdout);

  expect(exp.abc).not.toBeDefined();
  expect(exp.name).toEqual('foobar');
});

it('throws on invalid project root', async () => {
  await expect(
    executeExpoAsync(projectRoot, ['config', 'very---invalid', '--json'], { verbose: false })
  ).rejects.toThrow(/^Invalid project root: .*very---invalid$/m);
});
