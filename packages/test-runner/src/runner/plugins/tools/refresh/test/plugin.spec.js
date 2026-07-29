// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import {
    getTestSessionUserDataService,
    clearAllTestSessionsUserData
} from '../../../../session/testSessionUserDataService.js';
import { getTestStateStore } from '../../../../testsStateStore.js';

describe('refresh plugin', () => {
    let container;
    let toolsStore;
    const serviceCallId = 'test-session-refresh';

    function createTestRunner() {
        return testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        });
    }

    beforeEach(() => {
        container = document.createElement('div');
        const getContainer = () => container;

        testRunnerFactory.registerProvider('foo', {
            loadAreaBroker() {
                return {
                    getContainer
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            init() {}
        });

        toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        clearAllTestSessionsUserData();
    });

    it('shows toolbar button on init', () =>
        new Promise(done => {
            expect.assertions(1);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect(toolsStore.getTestToolState('refresh')).toEqual(
                        expect.objectContaining({
                            visible: true
                        })
                    );

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('reloads page on toolbar action', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    const refreshPlugin = runner.getPlugin('refresh');
                    const reloadSpy = vi.spyOn(refreshPlugin, 'reload').mockImplementation(() => {});

                    expect(reloadSpy).not.toHaveBeenCalled();
                    runner.trigger('toolbaraction', 'fullscreen');
                    expect(reloadSpy).not.toHaveBeenCalled();

                    runner.trigger('toolbaraction', 'refresh');
                    expect(reloadSpy).toHaveBeenCalled();

                    reloadSpy.mockRestore();
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));
});
