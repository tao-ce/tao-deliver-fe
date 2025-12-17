// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';

describe('warnBeforeLeaving plugin', () => {
    const serviceCallId = 'test-session-a16jt8h';
    let testProviderApi;

    beforeEach(() => {
        testProviderApi = {
            loadAreaBroker: () => ({}),
            loadDataHolder: () => ({
                getTestMap: () => ({}),
                getTestContext: () => ({}),
                set: () => {},
                get: () => {},
                clear: () => {}
            }),
            install() {},
            init() {}
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('add a listener on the beforeunload event', () =>
        new Promise(done => {
            expect.assertions(2);

            const addListenerSpy = vi.spyOn(window, 'addEventListener');
            const rmListenerSpy = vi.spyOn(window, 'removeEventListener');

            const runner = testRunnerFactory('foo', [pluginFactory], {
                serviceCallId: serviceCallId,
                renderTo: document.createElement('div')
            });

            runner
                .on('init', () => {
                    expect(addListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
                })
                .on('render', () => {
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(rmListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

                    done();
                })
                .init();
        }));

    it('removes beforeunload listener before error triggered', () =>
        new Promise(done => {
            expect.assertions(2);

            const addListenerSpy = vi.spyOn(window, 'addEventListener');
            const rmListenerSpy = vi.spyOn(window, 'removeEventListener');

            const runner = testRunnerFactory('foo', [pluginFactory], {
                serviceCallId: serviceCallId,
                renderTo: document.createElement('div')
            });

            runner
                .on('init', () => {
                    expect(addListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
                })
                .on('render', () => {
                    runner.trigger('error');
                    expect(rmListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
                    done();
                })
                .init();
        }));

    it('removes beforeunload listener when proctor-reset is triggered', () =>
        new Promise(done => {
            expect.assertions(2);

            const addListenerSpy = vi.spyOn(window, 'addEventListener');
            const rmListenerSpy = vi.spyOn(window, 'removeEventListener');

            const runner = testRunnerFactory('foo', [pluginFactory], {
                serviceCallId: serviceCallId,
                renderTo: document.createElement('div')
            });

            runner
                .on('init', () => {
                    expect(addListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
                })
                .on('render', () => {
                    runner.trigger('proctor-reset');
                    expect(rmListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
                    done();
                })
                .init();
        }));
});
