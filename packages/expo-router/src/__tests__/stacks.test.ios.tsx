import React from 'react';
import { Text } from 'react-native';

import { store } from '../global-state/router-store';
import { router } from '../imperative-api';
import Stack from '../layouts/Stack';
import Tabs from '../layouts/Tabs';
import { act, screen, renderRouter, testRouter } from '../testing-library';
/**
 * Stacks are the most common navigator and have unique navigation actions
 *
 * This file is for testing Stack specific functionality
 */
describe('canDismiss', () => {
  it('should work within the default Stack', () => {
    renderRouter(
      {
        a: () => null,
        b: () => null,
      },
      {
        initialUrl: '/a',
      }
    );

    expect(router.canDismiss()).toBe(false);
    act(() => router.push('/b'));
    expect(router.canDismiss()).toBe(true);
  });

  it('should always return false while not within a stack', () => {
    renderRouter(
      {
        a: () => null,
        b: () => null,
        _layout: () => <Tabs />,
      },
      {
        initialUrl: '/a',
      }
    );

    expect(router.canDismiss()).toBe(false);
    act(() => router.push('/b'));
    expect(router.canDismiss()).toBe(false);
  });
});

test('dismiss', () => {
  renderRouter(
    {
      a: () => null,
      b: () => null,
      c: () => null,
      d: () => null,
    },
    {
      initialUrl: '/a',
    }
  );

  act(() => router.push('/b'));
  act(() => router.push('/c'));
  act(() => router.push('/d'));

  expect(screen).toHavePathname('/d');

  act(() => router.dismiss());
  expect(screen).toHavePathname('/c');

  act(() => router.dismiss(2));
  expect(screen).toHavePathname('/a');
});

test('dismissAll', () => {
  renderRouter(
    {
      a: () => null,
      b: () => null,
      c: () => null,
      d: () => null,
    },
    {
      initialUrl: '/a',
    }
  );

  act(() => router.push('/b'));
  act(() => router.push('/c'));
  act(() => router.push('/d'));

  expect(screen).toHavePathname('/d');

  act(() => router.dismissAll());
  expect(screen).toHavePathname('/a');
  expect(router.canDismiss()).toBe(false);
});

test('dismissAll nested', () => {
  renderRouter(
    {
      _layout: () => <Tabs />,
      a: () => null,
      b: () => null,
      'one/_layout': () => <Stack />,
      'one/index': () => null,
      'one/page': () => null,
      'one/two/_layout': () => <Stack />,
      'one/two/index': () => null,
      'one/two/page': () => null,
    },
    {
      initialUrl: '/a',
    }
  );

  testRouter.push('/b');

  testRouter.push('/one');
  testRouter.push('/one/page');
  testRouter.push('/one/page');

  testRouter.push('/one/two');
  testRouter.push('/one/two/page');
  testRouter.push('/one/two/page');

  // We should have three top level routes (/a, /b, /one)
  // The last route should include a sub-state for /one/_layout
  // It will have three routes  (/one/index, /one/page, /one/two)
  // The last route should include a sub-state for /one/two/_layout
  expect(store.state).toStrictEqual({
    index: 0,
    key: expect.any(String),
    preloadedRoutes: [],
    routeNames: ['__root'],
    routes: [
      {
        key: expect.any(String),
        name: '__root',
        params: undefined,
        state: {
          history: [
            {
              key: expect.any(String),
              type: 'route',
            },
            {
              key: expect.any(String),
              type: 'route',
            },
          ],
          index: 2,
          key: expect.any(String),
          preloadedRouteKeys: [],
          routeNames: ['a', 'b', 'one', '_sitemap', '+not-found'],
          routes: [
            {
              key: expect.any(String),
              name: 'a',
              params: undefined,
              path: '/a',
            },
            {
              key: expect.any(String),
              name: 'b',
              params: {},
              path: undefined,
            },
            {
              key: expect.any(String),
              name: 'one',
              path: undefined,
              state: {
                index: 3,
                key: expect.any(String),
                preloadedRoutes: [],
                routeNames: ['index', 'two', 'page'],
                routes: [
                  {
                    key: expect.any(String),
                    name: 'index',
                    params: {},
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'page',
                    params: {},
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'page',
                    params: {},
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'two',
                    path: undefined,
                    state: {
                      index: 2,
                      key: expect.any(String),
                      preloadedRoutes: [],
                      routeNames: ['index', 'page'],
                      routes: [
                        {
                          key: expect.any(String),
                          name: 'index',
                          params: {},
                          path: undefined,
                        },
                        {
                          key: expect.any(String),
                          name: 'page',
                          params: {},
                          path: undefined,
                        },
                        {
                          key: expect.any(String),
                          name: 'page',
                          params: {},
                          path: undefined,
                        },
                      ],
                      stale: false,
                      type: 'stack',
                    },
                  },
                ],
                stale: false,
                type: 'stack',
              },
            },
            {
              key: expect.any(String),
              name: '_sitemap',
              params: undefined,
            },
            {
              key: expect.any(String),
              name: '+not-found',
              params: undefined,
            },
          ],
          stale: false,
          type: 'tab',
        },
      },
    ],
    stale: false,
    type: 'stack',
  });

  // This should only dismissing the sub-state for /one/two/_layout
  testRouter.dismissAll();
  expect(screen).toHavePathname('/one/two');
  expect(store.state).toStrictEqual({
    index: 0,
    key: expect.any(String),
    preloadedRoutes: [],
    routeNames: ['__root'],
    routes: [
      {
        key: expect.any(String),
        name: '__root',
        params: undefined,
        state: {
          history: [
            {
              key: expect.any(String),
              type: 'route',
            },
            {
              key: expect.any(String),
              type: 'route',
            },
          ],
          index: 2,
          key: expect.any(String),
          preloadedRouteKeys: [],
          routeNames: ['a', 'b', 'one', '_sitemap', '+not-found'],
          routes: [
            {
              key: expect.any(String),
              name: 'a',
              params: undefined,
              path: '/a',
            },
            {
              key: expect.any(String),
              name: 'b',
              params: {},
              path: undefined,
            },
            {
              key: expect.any(String),
              name: 'one',
              path: undefined,
              state: {
                index: 3,
                key: expect.any(String),
                preloadedRoutes: [],
                routeNames: ['index', 'two', 'page'],
                routes: [
                  {
                    key: expect.any(String),
                    name: 'index',
                    params: {},
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'page',
                    params: {},
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'page',
                    params: {},
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'two',
                    path: undefined,
                    state: {
                      index: 0,
                      key: expect.any(String),
                      preloadedRoutes: [],
                      routeNames: ['index', 'page'],
                      routes: [
                        {
                          key: expect.any(String),
                          name: 'index',
                          params: {},
                          path: undefined,
                        },
                      ],
                      stale: false,
                      type: 'stack',
                    },
                  },
                ],
                stale: false,
                type: 'stack',
              },
            },
            {
              key: expect.any(String),
              name: '_sitemap',
              params: undefined,
            },
            {
              key: expect.any(String),
              name: '+not-found',
              params: undefined,
            },
          ],
          stale: false,
          type: 'tab',
        },
      },
    ],
    stale: false,
    type: 'stack',
  });

  // This should only dismissing the sub-state for /one/_layout
  testRouter.dismissAll();
  expect(screen).toHavePathname('/one');
  expect(store.state).toStrictEqual({
    index: 0,
    key: expect.any(String),
    preloadedRoutes: [],
    routeNames: ['__root'],
    routes: [
      {
        key: expect.any(String),
        name: '__root',
        params: undefined,
        state: {
          history: [
            {
              key: expect.any(String),
              type: 'route',
            },
            {
              key: expect.any(String),
              type: 'route',
            },
          ],
          index: 2,
          key: expect.any(String),
          preloadedRouteKeys: [],
          routeNames: ['a', 'b', 'one', '_sitemap', '+not-found'],
          routes: [
            {
              key: expect.any(String),
              name: 'a',
              params: undefined,
              path: '/a',
            },
            {
              key: expect.any(String),
              name: 'b',
              params: {},
              path: undefined,
            },
            {
              key: expect.any(String),
              name: 'one',
              path: undefined,
              state: {
                index: 0,
                key: expect.any(String),
                preloadedRoutes: [],
                routeNames: ['index', 'two', 'page'],
                routes: [
                  {
                    key: expect.any(String),
                    name: 'index',
                    params: {},
                    path: undefined,
                  },
                ],
                stale: false,
                type: 'stack',
              },
            },
            {
              key: expect.any(String),
              name: '_sitemap',
              params: undefined,
            },
            {
              key: expect.any(String),
              name: '+not-found',
              params: undefined,
            },
          ],
          stale: false,
          type: 'tab',
        },
      },
    ],
    stale: false,
    type: 'stack',
  });

  // Cannot dismiss again as we are at the root Tabs layout
  expect(router.canDismiss()).toBe(false);
});

test('pushing in a nested stack should only rerender the nested stack', () => {
  const RootLayout = jest.fn(() => <Stack />);
  const NestedLayout = jest.fn(() => <Stack />);
  const NestedNestedLayout = jest.fn(() => <Stack />);

  renderRouter(
    {
      _layout: RootLayout,
      '[one]/_layout': NestedLayout,
      '[one]/a': () => null,
      '[one]/b': () => null,
      '[one]/[two]/_layout': NestedNestedLayout,
      '[one]/[two]/a': () => null,
    },
    {
      initialUrl: '/one/a',
    }
  );

  testRouter.push('/one/b');
  expect(RootLayout).toHaveBeenCalledTimes(1);
  expect(NestedLayout).toHaveBeenCalledTimes(1);
  expect(NestedNestedLayout).toHaveBeenCalledTimes(0);

  testRouter.push('/one/two/a');
  expect(RootLayout).toHaveBeenCalledTimes(1);
  expect(NestedLayout).toHaveBeenCalledTimes(1);
  expect(NestedNestedLayout).toHaveBeenCalledTimes(1);
});

test('can preserve the nested initialRouteName when navigating to a nested stack', () => {
  renderRouter({
    index: () => <Text testID="link">Index</Text>,
    '/fruit/_layout': {
      unstable_settings: {
        anchor: 'apple',
      },
      default: () => {
        return <Stack />;
      },
    },
    '/fruit/apple': () => <Text testID="apple">Apple</Text>,
    '/fruit/banana': () => <Text testID="banana">Banana</Text>,
  });

  act(() => router.push('/fruit/banana', { withAnchor: true }));
  expect(screen.getByTestId('banana')).toBeDefined();
  act(() => router.back());
  expect(screen.getByTestId('apple')).toBeDefined();
  act(() => router.back());
  expect(screen.getByTestId('link')).toBeDefined();
});

describe('singular', () => {
  test('singular should only allow one instance of a screen', () => {
    renderRouter(
      {
        _layout: () => (
          <Stack>
            <Stack.Screen name="[slug]" dangerouslySingular />
          </Stack>
        ),
        '[slug]': () => <Text>slug</Text>,
      },
      {
        initialUrl: '/apple',
      }
    );

    expect(screen).toHaveRouterState({
      routes: [
        {
          name: '__root',
          params: {
            slug: 'apple',
          },
          state: {
            routes: [
              {
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: '/apple',
              },
            ],
            stale: true,
          },
        },
      ],
      stale: true,
    });

    // Normally pushing would add a new route, but since we have singular set to true
    // Nothing should happen, as the current route is already the same as the target route
    act(() => router.push('/apple'));
    expect(screen).toHaveRouterState({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: {
            slug: 'apple',
          },
          state: {
            index: 0,
            key: expect.any(String),
            preloadedRoutes: [],
            routeNames: ['[slug]', '_sitemap', '+not-found'],
            routes: [
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: '/apple',
              },
            ],
            stale: false,
            type: 'stack',
          },
        },
      ],
      stale: false,
      type: 'stack',
    });

    // Adding a new screen with different params should work
    act(() => router.push('/banana'));
    expect(screen).toHaveRouterState({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: {
            slug: 'apple',
          },
          state: {
            index: 1,
            key: expect.any(String),
            preloadedRoutes: [],
            routeNames: ['[slug]', '_sitemap', '+not-found'],
            routes: [
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: '/apple',
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'banana',
                },
                path: undefined,
              },
            ],
            stale: false,
            type: 'stack',
          },
        },
      ],
      stale: false,
      type: 'stack',
    });

    // Normally pushing would add a new route, but since we have singular set to true
    // It rearranges the Stack to move /apple to the current route
    act(() => router.push('/apple'));
    expect(screen).toHaveRouterState({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: {
            slug: 'apple',
          },
          state: {
            index: 1,
            key: expect.any(String),
            preloadedRoutes: [],
            routeNames: ['[slug]', '_sitemap', '+not-found'],
            routes: [
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'banana',
                },
                path: undefined,
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: '/apple',
              },
            ],
            stale: false,
            type: 'stack',
          },
        },
      ],
      stale: false,
      type: 'stack',
    });
  });
});
