// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../preloaders.js', async () => {
    const originalModule = await vi.importActual('../preloaders.js');
    return Object.assign(
        {
            __esModule: true
        },
        originalModule,
        {
            preloadNextItemAssets: vi.fn(() => {})
        }
    );
});

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import { getTestStateStore } from '../../../../../testsStateStore.js';
import { getItemsStore } from '../../../../../itemsStore.js';
import { preloadNextItemAssets } from '../preloaders.js';

function setupLayout() {
    return document.createElement('div');
}

function setupStore(serviceCallId, data) {
    const stateStore = getTestStateStore(serviceCallId);
    stateStore.setTestMap(data.testMap);
    stateStore.setTestContext(data.testContext);
}

describe('preloadNextItemAssets plugin', () => {
    let container;
    let testProviderApi;
    let itemStore;
    const serviceCallId = 'preload123';
    const pluginName = 'preloadNextItemAssets';

    const expectedPreloadStrategy = {
        stylesheets: true,
        images: true,
        audios: true,
        videos: true,
        audiosThreshold: 5000000,
        videosThreshold: 5000000
    };

    const item1 = {
        itemIdentifier: 'item1',
        itemData: {},
        itemState: null
    };
    const item2 = {
        itemIdentifier: 'item2',
        itemData: {},
        itemState: null
    };
    const testMap = {
        parts: {
            part1: {
                sections: {
                    section1: {
                        items: {
                            item1: { position: 0 },
                            item2: { position: 1 }
                        }
                    }
                }
            }
        }
    };
    const testContext = {
        itemPosition: 0
    };

    beforeEach(() => {
        container = setupLayout();

        testProviderApi = {
            loadAreaBroker: () => ({}),
            init() {}
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);

        setupStore(serviceCallId, {});
        itemStore = getItemsStore(serviceCallId);
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        container.innerHTML = '';
        itemStore.clear();
        preloadNextItemAssets.mockClear();
    });

    it('has default config by default', () =>
        new Promise(done => {
            expect.assertions(1);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    const pluginConfig = runner.getPlugin(pluginName).getConfig();
                    expect(pluginConfig).toEqual({
                        hostName: 'testRunner',
                        preloadStrategy: expectedPreloadStrategy
                    });
                    done();
                })
                .init();
        }));

    it('inherits new config from testRunner', () =>
        new Promise(done => {
            expect.assertions(1);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId,
                options: {
                    plugins: {
                        [pluginName]: {
                            preloadStrategy: {
                                stylesheets: false,
                                audios: false,
                                videosThreshold: 42
                            }
                        }
                    }
                }
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    const pluginConfig = runner.getPlugin(pluginName).getConfig();
                    expect(pluginConfig).toEqual({
                        hostName: 'testRunner',
                        preloadStrategy: {
                            stylesheets: false,
                            images: true,
                            audios: false,
                            videos: true,
                            audiosThreshold: 5000000,
                            videosThreshold: 42
                        }
                    });
                    done();
                })
                .init();
        }));

    it('runs preloadNextItemAssets when next item is set in store after renderItem event fires', () =>
        new Promise(done => {
            expect.assertions(4);

            const item2flaggedTrue = Object.assign({}, item2, { flags: { containsNonPreloadedAssets: true } });

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    runner.setTestMap(testMap);
                    runner.setTestContext(testContext);
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                    itemStore.setItem('item1', item1);
                })
                .after('renderitem', () => {
                    expect(preloadNextItemAssets).toHaveBeenCalledTimes(0);
                    itemStore.setItem('item2', item2flaggedTrue);

                    expect(preloadNextItemAssets).toHaveBeenCalledTimes(1);
                    expect(preloadNextItemAssets.mock.calls[0][0].itemData).toEqual(item2.itemData);
                    expect(preloadNextItemAssets.mock.calls[0][1].preloadStrategy).toEqual(expectedPreloadStrategy);
                    runner.destroy();
                })
                .on('destroy', done)
                .init();
        }));

    it('runs preloadNextItemAssets when renderItem event fires after next item is set in store', () =>
        new Promise(done => {
            expect.assertions(4);

            const item2flaggedTrue = Object.assign({}, item2, { flags: { containsNonPreloadedAssets: true } });

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    runner.setTestMap(testMap);
                    runner.setTestContext(testContext);
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                    itemStore.setItem('item1', item1);
                    itemStore.setItem('item2', item2flaggedTrue);
                    expect(preloadNextItemAssets).toHaveBeenCalledTimes(0);
                })
                .after('renderitem', () => {
                    expect(preloadNextItemAssets).toHaveBeenCalledTimes(1);
                    expect(preloadNextItemAssets.mock.calls[0][0].itemData).toEqual(item2.itemData);
                    expect(preloadNextItemAssets.mock.calls[0][1].preloadStrategy).toEqual(expectedPreloadStrategy);
                    runner.destroy();
                })
                .on('destroy', done)
                .init();
        }));

    it('preloading toggles containsNonPreloadedAssets flag', () =>
        new Promise(done => {
            expect.assertions(5);

            const item2flaggedTrue = Object.assign({}, item2, { flags: { containsNonPreloadedAssets: true } });
            const item2flaggedFalse = Object.assign({}, item2, { flags: { containsNonPreloadedAssets: false } });

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    runner.setTestMap(testMap);
                    runner.setTestContext(testContext);
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                    itemStore.setItem('item1', item1);
                })
                .after('renderitem', () => {
                    expect(preloadNextItemAssets).toHaveBeenCalledTimes(0);
                    itemStore.setItem('item2', item2flaggedTrue);

                    expect(preloadNextItemAssets).toHaveBeenCalledTimes(1);
                    expect(preloadNextItemAssets.mock.calls[0][0]).toEqual(item2flaggedFalse);
                    expect(preloadNextItemAssets.mock.calls[0][1].preloadStrategy).toEqual(expectedPreloadStrategy);
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(itemStore.getItem('item2')).toEqual(item2flaggedFalse);
                    done();
                })
                .init();
        }));

    it('cannot run preloadNextItemAssets after destroyed', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    runner.setTestMap(testMap);
                    runner.setTestContext(testContext);
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                    itemStore.setItem('item1', item1);
                    expect(preloadNextItemAssets).toHaveBeenCalledTimes(0);
                })
                .after('renderitem', () => {
                    expect(preloadNextItemAssets).toHaveBeenCalledTimes(0);
                    runner.destroy();
                })
                .on('destroy', () => {
                    itemStore.setItem('item2', item2);
                    expect(preloadNextItemAssets).toHaveBeenCalledTimes(0);
                    done();
                })
                .init();
        }));
});
