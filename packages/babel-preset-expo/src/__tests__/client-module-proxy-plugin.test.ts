/**
 * Copyright © 2024 650 Industries.
 */

import * as babel from '@babel/core';

import preset from '..';

const ENABLED_CALLER = {
  name: 'metro',
  isDev: false,
  isServer: false,
  projectRoot: '/',
};

function getCaller(props: Record<string, string | boolean>): babel.TransformCaller {
  return props as unknown as babel.TransformCaller;
}

const DEF_OPTIONS = {
  // Ensure this is absolute to prevent the filename from being converted to absolute and breaking CI tests.
  filename: '/unknown',

  babelrc: false,
  presets: [[preset, { disableImportExportTransform: true }]],
  sourceMaps: true,
  configFile: false,
  compact: false,
  comments: true,
  retainLines: false,
  caller: getCaller({ ...ENABLED_CALLER, platform: 'ios' }),
};

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, FORCE_COLOR: '0' };
});

afterAll(() => {
  process.env = { ...originalEnv };
});

it(`asserts that use client and use server cannot be used together`, () => {
  const options = {
    ...DEF_OPTIONS,
    caller: getCaller({ ...ENABLED_CALLER, isReactServer: true, platform: 'ios' }),
  };

  const sourceCode = `
    'use server';
    'use client';
    
    export const greet = (name: string) => \`Hello $\{name} from server!\`;
    `;

  expect(() => babel.transform(sourceCode, options)).toThrowErrorMatchingSnapshot();
});

function transformClient(sourceCode: string) {
  const options = {
    ...DEF_OPTIONS,
    caller: getCaller({ ...ENABLED_CALLER, isReactServer: false, platform: 'ios' }),
  };

  const results = babel.transform(sourceCode, options);
  if (!results) throw new Error('Failed to transform code');

  return {
    code: results.code,
    metadata: results.metadata as unknown as { proxyExports?: string[] },
  };
}

function transformReactServer(sourceCode: string) {
  const options = {
    ...DEF_OPTIONS,
    caller: getCaller({ ...ENABLED_CALLER, isReactServer: true, platform: 'ios' }),
  };

  const results = babel.transform(sourceCode, options);
  if (!results) throw new Error('Failed to transform code');

  return {
    code: results.code,
    metadata: results.metadata as unknown as { proxyExports?: string[] },
  };
}

describe('use server', () => {
  it(`collects metadata with React Server Function references`, () => {
    const sourceCode = `
    "use server";
    
    export async function greet(name: string) {

    }
    
    export default async function doThing() {
      return '...'
    }
    `;

    const res = transformClient(sourceCode);
    expect(res.metadata.proxyExports).toEqual(['greet', 'default']);
    expect(res.code).toMatchInlineSnapshot(`
      "import { createServerReference } from 'react-server-dom-webpack/client';
      import { callServerRSC } from 'expo-router/rsc/internal';
      export var greet = createServerReference("./unknown#greet", callServerRSC);
      export default createServerReference("./unknown#default", callServerRSC);"
    `);
  });
  it(`asserts when using re-export for server function references`, () => {
    const sourceCode = `
    "use server";
    
    export * from './foo';
    
    `;

    expect(() => transformClient(sourceCode)).toThrow(
      /Re-exporting all modules is not supported in a/
    );
  });

  it(`asserts when using module.exports for server function references`, () => {
    const sourceCode = `
    "use server";
    
    module.exports = async function doThing() {}
    
    `;

    expect(() => transformClient(sourceCode)).toThrow(
      /Assignment to `module.exports` or `exports` is not allowed in a "use server" file./
    );
  });
  it(`asserts when using exports for server function references`, () => {
    const sourceCode = `
    "use server";
    
    exports.foo = async function doThing() {}
    `;

    expect(() => transformClient(sourceCode)).toThrow(
      /Assignment to `module.exports` or `exports` is not allowed in a "use server" file./
    );
  });
  it(`asserts when using Object.assign for server function references`, () => {
    const sourceCode = `
    "use server";
    
    Object.assign(exports, {
      foo: async function doThing() {}
    });
    `;

    expect(() => transformClient(sourceCode)).toThrow(
      /Assignment to `module.exports` or `exports` is not allowed in a "use server" file./
    );
  });
  // TODO: Assert that server action functions must be async.
});

describe('use client', () => {
  it(`does nothing without use client directive`, () => {
    const sourceCode = `
    export const foo = 'bar';
    `;

    const res = transformReactServer(sourceCode);
    expect(res.metadata.proxyExports).toBeUndefined();
    expect(res.code).not.toMatch('react-server-dom-webpack');
    expect(res.code).toMatchInlineSnapshot(`"export const foo = 'bar';"`);
  });

  it(`collects metadata with React client references`, () => {
    const sourceCode = `
    "use client";
    import { Text } from 'react-native';
    
    export const foo = 'bar';
    
    export default function App() {
      return <Text>Hello World</Text>
    }
    `;

    const res = transformReactServer(sourceCode);
    expect(res.metadata.proxyExports).toEqual(['foo', 'default']);
    expect(res.code).toMatchInlineSnapshot(`
      "const proxy = require("react-server-dom-webpack/server").createClientModuleProxy("./unknown");
      module.exports = proxy;
      export const foo = require("react-server-dom-webpack/server").registerClientReference(function () {
        throw new Error("Attempted to call foo() of /unknown from the server but foo is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
      }, "./unknown", "foo");
      export default require("react-server-dom-webpack/server").registerClientReference(function () {
        throw new Error("Attempted to call the default export of /unknown from the server but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
      }, "./unknown", "default");"
    `);
  });

  it(`exports default from module`, () => {
    const res = transformReactServer(`
    "use client";    
    export { default } from "client-only"
    `);
    expect(res.metadata.proxyExports).toEqual(['default']);
    expect(res.code).toMatchInlineSnapshot(`
      "const proxy = require("react-server-dom-webpack/server").createClientModuleProxy("./unknown");
      module.exports = proxy;
      export default require("react-server-dom-webpack/server").registerClientReference(function () {
        throw new Error("Attempted to call the default export of /unknown from the server but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
      }, "./unknown", "default");"
    `);
  });

  it(`exports class`, () => {
    const res = transformReactServer(`
    "use client";    
    export class Pattern {}
    `);
    expect(res.metadata.proxyExports).toEqual(['Pattern']);
    expect(res.code).toMatchInlineSnapshot(`
      "const proxy = require("react-server-dom-webpack/server").createClientModuleProxy("./unknown");
      module.exports = proxy;
      export const Pattern = require("react-server-dom-webpack/server").registerClientReference(function () {
        throw new Error("Attempted to call Pattern() of /unknown from the server but Pattern is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
      }, "./unknown", "Pattern");"
    `);
  });

  it(`skips typescript exports`, () => {
    const res = transformReactServer(`
    "use client";    
export type EdgeInsetsProp = object;

export interface BaseProps {
  accessible?: boolean;
}
    `);
    expect(res.metadata.proxyExports).toEqual([]);
  });

  it(`handles mixed exports from react-native-svg`, () => {
    const res = transformReactServer(`
    "use client";    
export * from './elements/Circle';

export type EdgeInsetsProp = object;

export interface BaseProps {
  accessible?: boolean;
}

export class Pattern extends WebShape<BaseProps & PatternProps> {
  tag = 'pattern';
}

const Svg = {};

export default Svg;

    `);
    expect(res.metadata.proxyExports).toEqual(['Pattern', 'default']);
    expect(res.code).toMatchInlineSnapshot(`
      "const proxy = require("react-server-dom-webpack/server").createClientModuleProxy("./unknown");
      module.exports = proxy;
      export const Pattern = require("react-server-dom-webpack/server").registerClientReference(function () {
        throw new Error("Attempted to call Pattern() of /unknown from the server but Pattern is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
      }, "./unknown", "Pattern");
      export default require("react-server-dom-webpack/server").registerClientReference(function () {
        throw new Error("Attempted to call the default export of /unknown from the server but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
      }, "./unknown", "default");"
    `);
  });

  it(`(TODO) does not support export * from correctly`, () => {
    const res = transformReactServer(`
    "use client";  
    export * from './other';
    `);
    expect(res.metadata.proxyExports).toEqual([]);
    expect(res.code).toMatchInlineSnapshot(`
      "const proxy = require("react-server-dom-webpack/server").createClientModuleProxy("./unknown");
      module.exports = proxy;"
    `);
  });

  it(`exports * as namespace from module`, () => {
    const res = transformReactServer(`
    "use client";    
    export * as Namespace from "client-only"
    `);
    expect(res.metadata.proxyExports).toEqual(['Namespace']);
    expect(res.code).toMatchInlineSnapshot(`
      "const proxy = require("react-server-dom-webpack/server").createClientModuleProxy("./unknown");
      module.exports = proxy;
      export const Namespace = require("react-server-dom-webpack/server").registerClientReference(function () {
        throw new Error("Attempted to call Namespace() of /unknown from the server but Namespace is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
      }, "./unknown", "Namespace");"
    `);
  });

  it(`replaces client exports with React client references (cjs)`, () => {
    const res = transformReactServer(`
    "use client";
    import { Text } from 'react-native';
    
    export const foo = 'bar';
    
    module.exports = function App() {
      return <Text>Hello World</Text>
    }
    `);
    expect(res.metadata.proxyExports).toEqual(['foo']);
    expect(res.code).toMatchInlineSnapshot(`
      "const proxy = require("react-server-dom-webpack/server").createClientModuleProxy("./unknown");
      module.exports = proxy;
      export const foo = require("react-server-dom-webpack/server").registerClientReference(function () {
        throw new Error("Attempted to call foo() of /unknown from the server but foo is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
      }, "./unknown", "foo");"
    `);
  });

  // Caller is marked for client.
  it(`does NOT collect metadata when bundling for the client`, () => {
    const options = {
      ...DEF_OPTIONS,
      caller: getCaller({ ...ENABLED_CALLER, isReactServer: false, platform: 'ios' }),
    };

    const sourceCode = `
    "use client";
    import { Text } from 'react-native';
    
    export const foo = 'bar';
    
    export default function App() {
      return <Text>Hello World</Text>
    }
    `;

    const contents = babel.transform(sourceCode, options);
    expect(contents?.metadata).toEqual({ hasCjsExports: false, publicEnvVars: [] });

    expect(contents?.code).not.toMatch('react-server-dom-webpack');
  });

  it(`converts "use dom" to client proxies`, () => {
    const res = transformReactServer(`
    "use dom";
    import { Text } from 'react-native';
    
    export const foo = 'bar';
    
    module.exports = function App() {
      return <Text>Hello World</Text>
    }
    `);
    expect(res.metadata.proxyExports).toEqual(['foo']);
    expect(res.code).toMatchInlineSnapshot(`
      "const proxy = require("react-server-dom-webpack/server").createClientModuleProxy("./unknown");
      module.exports = proxy;
      export const foo = require("react-server-dom-webpack/server").registerClientReference(function () {
        throw new Error("Attempted to call foo() of /unknown from the server but foo is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
      }, "./unknown", "foo");"
    `);
  });
});
