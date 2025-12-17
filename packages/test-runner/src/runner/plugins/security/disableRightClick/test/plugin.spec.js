// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module'); // needed by taoTests/runner/proxy

import testRunnerFactory from 'taoTests/runner/runner.js';
import pluginFactory from '../plugin.js';
import proxyFactory from 'taoTests/runner/proxy.js';

describe('disableRightClick plugin', () => {
    let container;
    const serviceCallId = 'test-session-foo';

    const proxyCallTestActionSpy = vi.fn().mockImplementation(() => Promise.resolve());

    beforeEach(() => {
        proxyCallTestActionSpy.mockClear();

        container = document.createElement('div');
        document.body.appendChild(container);

        const testProviderApi = {
            loadAreaBroker() {
                return {};
            },
            loadProxy() {
                return proxyFactory('foo', {});
            },
            init() {
                return this.getProxy().init();
            }
        };
        proxyFactory.registerProvider('foo', {
            init: () => {},
            callTestAction: proxyCallTestActionSpy
        });
        testRunnerFactory.registerProvider('foo', testProviderApi);
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        document.body.innerHTML = '';
    });

    it.each([['contextmenu'], ['mouseup'], ['mousedown']])(
        'prevents default %s event behaviour on invalid targets',
        type =>
            new Promise(done => {
                expect.assertions(4);

                const runner = testRunnerFactory('foo', [pluginFactory], {
                    renderTo: container,
                    serviceCallId
                });

                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('render', () => {
                        const event = new Event(type, { cancelable: true, bubbles: true });
                        if (type !== 'contextmenu') {
                            event.button = 2;
                        }

                        container.dispatchEvent(event);

                        expect(event.defaultPrevented).toBe(true);

                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('security-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toEqual({
                            action: 'flag',
                            reason: 'context-menu-call-attempt'
                        });

                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            })
    );

    it.each([['mousedown'], ['mouseup'], ['contextmenu']])(
        "doesn't prevent default %s event behaviour on invalid targets",
        type =>
            new Promise(done => {
                const runner = testRunnerFactory('foo', [pluginFactory], {
                    renderTo: container,
                    serviceCallId
                });

                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('render', () => {
                        const event = new Event(type, { cancelable: true, bubbles: true });
                        if (type !== 'contextmenu') {
                            event.button = 2;
                        }

                        const textarea = document.createElement('textarea');
                        container.appendChild(textarea);

                        textarea.dispatchEvent(event);

                        expect(event.defaultPrevented).toBe(false);

                        expect(proxyCallTestActionSpy).not.toHaveBeenCalled();

                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            })
    );

    it('clears clipboard after copy event on invalid target', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            const clipboardDataSetDataSpy = vi.fn();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    const event = new Event('copy', { cancelable: true, bubbles: true });
                    event.clipboardData = {
                        setData: clipboardDataSetDataSpy
                    };

                    container.dispatchEvent(event);

                    expect(clipboardDataSetDataSpy).toHaveBeenCalledTimes(1);
                    expect(clipboardDataSetDataSpy.mock.calls[0][1]).toBe('');

                    expect(event.defaultPrevented).toBe(true);

                    expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                    expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('security-log');
                    expect(proxyCallTestActionSpy.mock.calls[0][1]).toEqual({
                        action: 'flag',
                        reason: 'copy-attempt'
                    });

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));
});
