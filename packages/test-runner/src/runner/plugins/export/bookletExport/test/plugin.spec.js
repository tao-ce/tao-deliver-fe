// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

const converterInstance = { convertDeferred: null };
vi.mock('../bookletFileConverter', () => ({
    bookletFileConverterFactory: () => {
        const mockConverter = {
            getFilenameForTest: vi.fn(),
            convert: vi.fn().mockImplementation(() => {
                if (converterInstance.convertDeferred) {
                    converterInstance.convertDeferred.resolve();
                    return converterInstance.convertDeferred.promise;
                }
                return Promise.resolve();
            }),
            downloadBooklet: vi.fn(),
            downloadHtml: vi.fn()
        };
        converterInstance.value = mockConverter;
        return mockConverter;
    }
}));

const builderInstance = { appendItemDeferred: null };
vi.mock('../bookletHtmlBuilder', () => ({
    bookletHtmlBuilderFactory: () => {
        const mockBuilder = {
            appendItem: vi.fn().mockImplementation(() => {
                if (builderInstance.appendItemDeferred) {
                    builderInstance.appendItemDeferred.resolve();
                    return builderInstance.appendItemDeferred.promise;
                }
                return Promise.resolve();
            }),
            getResult: vi.fn()
        };
        builderInstance.value = mockBuilder;
        return mockBuilder;
    }
}));

import { tick } from 'svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import testsStateStore, { getTestStateStore } from '../../../../testsStateStore.js';
import preset from './presetTwoPartsFourSectionsNonLinear.json';
import { DeferredPromise } from '@oat-sa-private/tao-item-runner-qtinui/src/runner/interactions/util/promise.js';

function setupLayout() {
    const div = document.createElement('div');
    div.innerHTML = '<div class="test-runner"><div class="top-bar"></div></div>';
    document.body.append(div);
    return div;
}

function setupStore(testServiceCallId, data) {
    const stateStore = getTestStateStore(testServiceCallId);
    stateStore.setTestMap(data.testMap);
    stateStore.setTestContext(data.testContext);
}

function untilRenderItemPromise(runner, itemIdentifier) {
    const deferred = new DeferredPromise();
    runner.on('renderitem.untilpromise', ({ id } = {}) => {
        runner.off('renderitem.untilpromise');
        expect(id).toBe(itemIdentifier);
        deferred.resolve();
    });
    return deferred.promise;
}

const serviceCallId = 'test-session-plswrk';

describe('bookletExport plugin', () => {
    let container;
    let getContainer;
    let getTopBarArea;
    let getTestRunnerArea;
    let clearAreasContent;
    let testProviderApi;
    let stateStore;
    let runner;
    let getPluginConfigSpy;
    const jumpSpy = vi.fn();

    beforeEach(() => {
        container = setupLayout();
        getContainer = () => container;
        getTopBarArea = () => container.querySelector('.top-bar');
        getTestRunnerArea = () => container.querySelector('.test-runner');
        clearAreasContent = () => {};
        getPluginConfigSpy = vi.fn().mockImplementation(() => void 0);

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getTopBarArea,
                    getTestRunnerArea,
                    clearAreasContent
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            jump: jumpSpy,
            init() {}
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);

        setupStore(serviceCallId, Object.assign({}, preset));
        stateStore = getTestStateStore(serviceCallId);

        runner = testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        });
        runner.getPluginConfig = getPluginConfigSpy;

        jumpSpy.mockImplementation(position => {
            const itemIdentifier = [
                ...Object.values(preset.testMap.parts['testPart-1'].sections['section-1'].items),
                ...Object.values(preset.testMap.parts['testPart-1'].sections['section-2'].items),
                ...Object.values(preset.testMap.parts['testPart-2'].sections['section-3'].items)
            ].find(i => i.position === position);
            expect(itemIdentifier).toBeTruthy(); // eslint-disable-line vitest/no-standalone-expect

            stateStore.setTestContext({
                ...preset.testContext,
                itemPosition: position,
                itemIdentifier: itemIdentifier
            });
            runner.loadItem(itemIdentifier);
        });
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        testsStateStore.clear();
        container.innerHTML = '';
        container.remove();
        delete builderInstance.value;
        vi.restoreAllMocks();
    });

    it('create booklet flow: interactive, specified item range', () =>
        new Promise((resolve, reject) => {
            getPluginConfigSpy.mockReturnValue({
                interactive: true,
                start: 2,
                end: 4,
                renderDelay: 0
            });
            stateStore.setTestContext({ ...preset.testContext, itemPosition: 0, itemIdentifier: 'item1' });

            runner
                .on('error', reject)
                .on('render', () => {
                    runner.loadItem('item1');
                    expect(document.body).toHaveClass('booklet-export-mode');
                })
                .after('renderitem.testcase', async () => {
                    runner.off('renderitem.testcase');
                    try {
                        await tick();
                        expect(container).toMatchSnapshot();
                        const btnHtml = container.querySelector('.booklet-toolbar [name="booklet-html"]');
                        const btnConvert = container.querySelector('.booklet-toolbar [name="booklet-convert"]');
                        const btnDownload = container.querySelector('.booklet-toolbar [name="booklet-download"]');
                        expect(btnHtml && btnConvert && btnDownload).toBeTruthy();
                        expect(btnConvert.disabled).toBe(true);

                        //get html for first item of range
                        const untilRenderItem3 = untilRenderItemPromise(runner, 'item2');
                        builderInstance.appendItemDeferred = new DeferredPromise();
                        btnHtml.click();
                        await untilRenderItem3;
                        expect(jumpSpy).toHaveBeenLastCalledWith(1, void 0);
                        expect(builderInstance.value).toBeTypeOf('object');
                        await builderInstance.appendItemDeferred.promise;

                        expect(builderInstance.value.appendItem).toHaveBeenCalledTimes(1);
                        await tick();
                        expect(btnConvert.disabled).toBe(true);

                        //get html for second item of range
                        builderInstance.appendItemDeferred = new DeferredPromise();
                        await untilRenderItemPromise(runner, 'item3');
                        expect(jumpSpy).toHaveBeenLastCalledWith(2, void 0);
                        await builderInstance.appendItemDeferred.promise;
                        expect(builderInstance.value.appendItem).toHaveBeenCalledTimes(2);
                        await tick();
                        expect(btnConvert.disabled).toBe(true);

                        //get html for third item of range
                        builderInstance.appendItemDeferred = new DeferredPromise();
                        await untilRenderItemPromise(runner, 'item4');
                        expect(jumpSpy).toHaveBeenLastCalledWith(3, void 0);
                        await builderInstance.appendItemDeferred.promise;
                        expect(builderInstance.value.appendItem).toHaveBeenCalledTimes(3);
                        await tick();
                        expect(btnConvert.disabled).toBe(false); //a way to test that bookletEnd param is respected

                        //convert
                        expect(converterInstance.value.convert).not.toHaveBeenCalled();
                        converterInstance.convertDeferred = new DeferredPromise();
                        btnConvert.click();
                        expect(converterInstance.value.convert).toHaveBeenCalled();
                        await converterInstance.convertDeferred;
                        await tick();
                        expect(btnDownload.disabled).toBe(false);

                        //download
                        expect(converterInstance.value.downloadBooklet).not.toHaveBeenCalled();
                        btnDownload.click();
                        expect(converterInstance.value.downloadBooklet).toHaveBeenCalled();

                        runner.destroy();
                    } catch (err) {
                        reject(err);
                    }
                })
                .on('destroy', () => {
                    expect(document.body).not.toHaveClass('booklet-export-mode');
                    resolve();
                })
                .init();
        }));

    it('create booklet flow: non-interactive, whole test', () =>
        new Promise((resolve, reject) => {
            getPluginConfigSpy.mockReturnValue({
                renderDelay: 0
            });
            stateStore.setTestContext({ ...preset.testContext, itemPosition: 0, itemIdentifier: 'item1' });

            runner
                .on('error', reject)
                .on('render', async () => {
                    builderInstance.appendItemDeferred = new DeferredPromise();
                    runner.loadItem('item1');
                    expect(document.body).toHaveClass('booklet-export-mode');
                })
                .after('renderitem.testcase', async () => {
                    runner.off('renderitem.testcase');
                    try {
                        await tick();
                        expect(container).toMatchSnapshot();

                        //get html for first item of range
                        expect(builderInstance.value).toBeTypeOf('object');
                        await builderInstance.appendItemDeferred.promise;

                        expect(builderInstance.value.appendItem).toHaveBeenCalledTimes(1);
                        await tick();

                        //get html for second item of range
                        builderInstance.appendItemDeferred = new DeferredPromise();
                        await untilRenderItemPromise(runner, 'item2');
                        expect(jumpSpy).toHaveBeenLastCalledWith(1, void 0);
                        await builderInstance.appendItemDeferred.promise;
                        expect(builderInstance.value.appendItem).toHaveBeenCalledTimes(2);
                        await tick();

                        //get html for third item of range
                        builderInstance.appendItemDeferred = new DeferredPromise();
                        await untilRenderItemPromise(runner, 'item3');
                        expect(jumpSpy).toHaveBeenLastCalledWith(2, void 0);
                        await builderInstance.appendItemDeferred.promise;
                        expect(builderInstance.value.appendItem).toHaveBeenCalledTimes(3);
                        await tick();

                        //get html for fourth item of range
                        builderInstance.appendItemDeferred = new DeferredPromise();
                        await untilRenderItemPromise(runner, 'item4');
                        expect(jumpSpy).toHaveBeenLastCalledWith(3, void 0);
                        await builderInstance.appendItemDeferred.promise;
                        expect(builderInstance.value.appendItem).toHaveBeenCalledTimes(4);
                        await tick();

                        //get html for fifth item of range
                        builderInstance.appendItemDeferred = new DeferredPromise();
                        await untilRenderItemPromise(runner, 'item5');
                        expect(jumpSpy).toHaveBeenLastCalledWith(4, void 0);
                        await builderInstance.appendItemDeferred.promise;
                        expect(builderInstance.value.appendItem).toHaveBeenCalledTimes(5);
                        await tick();

                        //convert
                        expect(converterInstance.value.convert).not.toHaveBeenCalled();
                        expect(converterInstance.value.downloadBooklet).not.toHaveBeenCalled();
                        converterInstance.convertDeferred = new DeferredPromise();
                        await tick();
                        expect(converterInstance.value.convert).toHaveBeenCalled();
                        await converterInstance.convertDeferred;
                        await tick();
                        expect(converterInstance.value.downloadBooklet).toHaveBeenCalled();

                        runner.destroy();
                    } catch (err) {
                        reject(err);
                    }
                })
                .on('destroy', () => {
                    expect(document.body).not.toHaveClass('booklet-export-mode');
                    resolve();
                })
                .init();
        }));
});
