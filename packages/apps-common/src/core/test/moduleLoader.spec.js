// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { inject } from 'vitest';
import moduleLoaderFactory from '../moduleLoader.js';
import glob from 'glob';
// eslint-disable-next-line
import * as plugins from 'taoQtiNuiTest/runner/plugins'; // unused, but side effect permits itemRunner/pciLoader to load

describe('moduleLoader', () => {
    describe('API', () => {
        it('is a function', () => {
            expect(moduleLoaderFactory).toBeTypeOf('function');
        });

        it('returns expected API', () => {
            const apiMethods = ['addList', 'add', 'append', 'prepend', 'remove', 'load', 'getModules', 'getCategories'];
            expect(moduleLoaderFactory()).toBeTypeOf('object');
            expect(Object.keys(moduleLoaderFactory())).toEqual(apiMethods);
        });
    });

    const requiredModules = {
        category1: [{ name: 'someModule' }],
        category2: [{ name: 'otherModule' }]
    };

    describe('Required modules', () => {
        it('loads required modules', () => {
            const loader = moduleLoaderFactory(requiredModules);
            const gotModules = loader.getModules();
            expect(gotModules).toEqual([{ name: 'someModule' }, { name: 'otherModule' }]);
        });

        it('throws on non-array', () => {
            expect(() => {
                const modules = {
                    category1: { name: 'someModule' }
                };
                moduleLoaderFactory(modules);
            }).toThrow('A list of modules must be an array');
        });

        it('throws if custom validator fails', () => {
            expect(() => {
                const modules = {
                    category1: [{ name: 'someModule' }]
                };
                const validate = module => typeof module.init === 'function';

                moduleLoaderFactory(modules, validate);
            }).toThrow('The list does not contain valid modules');
        });
    });

    describe('Getters', () => {
        it('getModules', () => {
            const loader = moduleLoaderFactory(requiredModules);
            expect(loader.getModules()).toEqual([{ name: 'someModule' }, { name: 'otherModule' }]);
            expect(loader.getModules('category1')).toEqual([{ name: 'someModule' }]);
            expect(loader.getModules('category2')).toEqual([{ name: 'otherModule' }]);
        });

        it('getCategories', () => {
            const loader = moduleLoaderFactory(requiredModules);
            expect(loader.getCategories()).toEqual(['category1', 'category2']);
        });
    });

    describe('Add modules', () => {
        it('throws if non-object module', () => {
            const loader = moduleLoaderFactory(requiredModules);
            expect(() => {
                loader.add([]);
            }).toThrow('The module definition module must be an object');
        });

        it('throws if no module definition', () => {
            const loader = moduleLoaderFactory(requiredModules);
            expect(() => {
                loader.add({
                    name: 'foo',
                    category: 'bar'
                });
            }).toThrow('A module must be defined');
        });

        it('throws if no module category', () => {
            const loader = moduleLoaderFactory(requiredModules);
            expect(() => {
                loader.add({
                    name: 'foo',
                    module: 'path/to/foo'
                });
            }).toThrow("The module 'foo' must belong to a category");
        });
    });

    describe('Load modules', () => {
        const providers = {
            testRunner: {
                id: 'qtinui',
                module: 'taoQtiNuiTest/runner/qti',
                category: 'runner'
            },
            itemRunner: {
                id: 'qtinui',
                module: 'taoQtiNuiItem/runner/qti',
                category: 'runner'
            },
            actionProxy: {
                id: 'actions-proxy',
                module: 'taoQtiNuiTest/runner/proxy/actionProxy',
                category: 'proxy'
            },
            preloadProxy: {
                id: 'preload-actions-proxy',
                module: 'taoQtiNuiTest/runner/proxy/preloadProxy',
                category: 'proxy'
            },
            reviewRunner: {
                id: 'qtinui',
                module: 'taoQtiNuiTest/runner/qtiReview',
                category: 'runner'
            },
            reviewProxy: {
                id: 'review-proxy',
                module: 'taoQtiNuiTest/runner/proxy/reviewProxy',
                category: 'proxy'
            }
        };

        it.each([
            ['test runner', providers.testRunner, 'qtinui'],
            ['item runner', providers.itemRunner, 'qtinui'],
            ['action proxy', providers.actionProxy, 'actions-proxy'],
            ['preload proxy', providers.preloadProxy, 'preload-actions-proxy'],
            ['review runner', providers.reviewRunner, 'qtinui'],
            ['review proxy', providers.reviewProxy, 'review-proxy']
        ])(
            'loads %s provider',
            (testName, moduleDefinition, expectedName) => {
                const loader = moduleLoaderFactory();

                return loader
                    .add(moduleDefinition)
                    .load(false)
                    .then(loaded => {
                        expect(loaded).toHaveLength(1);
                        expect(loaded[0]).toMatchObject({ name: expectedName, init: expect.any(Function) });
                    });
            },
            inject('LONG_TEST_TIMEOUT')
        ); // for slow-running test

        // This next test dynamically "discovers" all src plugins, and checks loadability.
        it('loads all test runner plugins', () => {
            const testRunnerSrcPath = 'packages/test-runner/src';
            const testRunnerSrcAlias = 'taoQtiNuiTest';

            // glob works relative to command execution directory, not this file.
            const pluginsDefs = glob.sync(`${testRunnerSrcPath}/runner/plugins/**/plugin.js`).map(pluginPath => ({
                name: pluginPath,
                module: pluginPath.replace(testRunnerSrcPath, testRunnerSrcAlias).replace(/\.js$/, ''),
                category: 'plugins'
            }));

            const loader = moduleLoaderFactory();

            return loader
                .addList(pluginsDefs)
                .load(false)
                .then(loaded => {
                    expect(loaded).toHaveLength(pluginsDefs.length);
                    loaded.forEach(pluginFactory => {
                        expect(typeof pluginFactory).toBe('function');
                    });
                });
        });

        // cannot be run due to vite's handling of invalid imports
        it.todo('cannot load non-existent module', () => {
            const moduleDef = {
                name: 'fooBarBaz',
                module: 'taoQtiNuiTest/runner/plugins/foo/bar/baz/plugin',
                category: 'plugins'
            };

            const loader = moduleLoaderFactory();

            return loader
                .add(moduleDef)
                .load(false)
                .then(loaded => {
                    expect(loaded).toHaveLength(1);
                    expect(loaded[0]).toBeUndefined();
                });
        });
    });
});
