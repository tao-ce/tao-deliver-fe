// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('core/store', () => ({
    __esModule: true,
    default: vi.fn(() =>
        Promise.resolve({
            getItem: vi.fn(() => Promise.resolve()),
            setItem: vi.fn(() => Promise.resolve())
        })
    )
}));

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import { getTestSessionStatusStore } from '../../../../testsStateStore.js';
import preset from './linear3ItemsPreset.json';

function setupLayout() {
    const div = document.createElement('div');
    div.innerHTML = `<div>
            <button name="next"></button>
        </div>`;

    return div;
}
describe('dev timing plugin', () => {
    let testProviderApi;

    let container = setupLayout();
    let getItemId = vi.fn();
    let table;
    let group;
    let groupEnd;
    let timeOrigin;
    beforeEach(() => {
        container = setupLayout();
        testProviderApi = {
            loadAreaBroker: () => ({}),
            loadDataHolder: () => ({
                getTestMap: () => preset.testMap,
                getTestContext: () => preset.testContext,
                set: () => {},
                get: key =>
                    ({
                        testMap: preset.testMap,
                        testContext: preset.testContext
                    }[key]),
                clear: () => {}
            }),
            install() {
                this.getCurrentItemIdentifier = getItemId;
            },
            init() {}
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);
        timeOrigin = vi.spyOn(window.performance, 'timeOrigin', 'get').mockReturnValue(0);
        table = vi.spyOn(window.console, 'table').mockImplementation(() => {});
        group = vi.spyOn(window.console, 'group').mockImplementation(() => {});
        groupEnd = vi.spyOn(window.console, 'groupEnd').mockImplementation(() => {});
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        container.innerHTML = '';
        table.mockReset();
        group.mockReset();
        groupEnd.mockReset();
        timeOrigin.mockReset();
    });

    it('collects stats about initial load', () =>
        new Promise(done => {
            expect.assertions(12);

            window.performance.mark = vi.fn();
            window.performance.measure = vi.fn();
            window.performance.getEntriesByType = vi.fn(() => []);
            window.performance.clearMarks = vi.fn();
            window.performance.clearMeasures = vi.fn();

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId: 'test-123'
            });

            runner
                .on('init', () => runner.loadItem('item1'))
                .on('error', err => {
                    throw err;
                })
                .after('renderitem', () => {
                    setTimeout(() => runner.destroy(), 2);
                })
                .on('destroy', () => {
                    expect(window.performance.mark).toHaveBeenCalledTimes(3);
                    expect(window.performance.mark).toHaveBeenNthCalledWith(1, 'loading-start');
                    expect(window.performance.mark).toHaveBeenNthCalledWith(2, 'loading-end');
                    expect(window.performance.mark).toHaveBeenNthCalledWith(3, 'initial-load');

                    expect(window.performance.measure).toHaveBeenCalledTimes(2);
                    expect(window.performance.measure).toHaveBeenNthCalledWith(
                        2,
                        'initial-item1',
                        void 0,
                        'initial-load'
                    );
                    expect(window.performance.measure).toHaveBeenNthCalledWith(
                        1,
                        'loading-item1',
                        'loading-start',
                        'loading-end'
                    );

                    expect(window.performance.getEntriesByType).toHaveBeenNthCalledWith(1, 'measure');
                    expect(window.performance.getEntriesByType).toHaveBeenNthCalledWith(2, 'resource');
                    expect(window.performance.clearMarks).toHaveBeenCalled();
                    expect(window.performance.clearMeasures).toHaveBeenCalled();

                    expect(table).toHaveBeenCalled();

                    done();
                })
                .init();
        }));

    it('collects stats about waiting time', () =>
        new Promise(done => {
            expect.assertions(13);

            window.performance.mark = vi.fn();
            window.performance.measure = vi.fn();
            window.performance.getEntriesByType = vi.fn(() => []);
            window.performance.clearMarks = vi.fn();
            window.performance.clearMeasures = vi.fn();
            let i = 10;
            getItemId.mockImplementation(() => `item${++i}`);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId: 'test-125'
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    const statusStore = getTestSessionStatusStore('test-125');
                    setTimeout(() => statusStore.set('interacting'), 1);
                    setTimeout(() => statusStore.set('loading'), 5);
                    setTimeout(() => statusStore.set('interacting'), 10);
                    setTimeout(() => statusStore.set('loading'), 15);
                    setTimeout(() => statusStore.set('interacting'), 20);
                    setTimeout(() => runner.destroy(), 25);
                })
                .on('destroy', () => {
                    expect(window.performance.mark).toHaveBeenCalledTimes(4);
                    expect(window.performance.mark).toHaveBeenNthCalledWith(1, 'waiting-start');
                    expect(window.performance.mark).toHaveBeenNthCalledWith(2, 'waiting-end');
                    expect(window.performance.mark).toHaveBeenNthCalledWith(3, 'waiting-start');
                    expect(window.performance.mark).toHaveBeenNthCalledWith(4, 'waiting-end');

                    expect(window.performance.measure).toHaveBeenCalledTimes(2);
                    expect(window.performance.measure).toHaveBeenNthCalledWith(
                        1,
                        'waiting-item11',
                        'waiting-start',
                        'waiting-end'
                    );
                    expect(window.performance.measure).toHaveBeenNthCalledWith(
                        2,
                        'waiting-item12',
                        'waiting-start',
                        'waiting-end'
                    );

                    expect(window.performance.getEntriesByType).toHaveBeenNthCalledWith(1, 'measure');
                    expect(window.performance.getEntriesByType).toHaveBeenNthCalledWith(2, 'resource');
                    expect(window.performance.clearMarks).toHaveBeenCalled();
                    expect(window.performance.clearMeasures).toHaveBeenCalled();

                    expect(table).toHaveBeenCalled();
                    done();
                })
                .init();
        }));
});
