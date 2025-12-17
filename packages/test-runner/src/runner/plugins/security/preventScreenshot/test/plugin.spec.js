// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module'); // needed by taoTests/runner/proxy

import testRunnerFactory from 'taoTests/runner/runner.js';
import pluginFactory from '../plugin.js';
import proxyFactory from 'taoTests/runner/proxy.js';

describe('preventScreenshot plugin', () => {
    let container;
    const serviceCallId = 'test-session-foo';

    Object.assign(navigator, {
        clipboard: {
            writeText: () => {}
        }
    });

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

        vi.spyOn(navigator.clipboard, 'writeText');
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        document.body.innerHTML = '';
        document.body.style = '';
    });

    it('renders and destroys without error', () =>
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
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(runner.getState('destroy')).toBe(true);
                    done();
                })
                .init();
        }));

    it('Prevent PrintScreen event on Windows', () =>
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
                    const event = new KeyboardEvent('keyup', { key: 'PrintScreen', cancelable: true });
                    document.dispatchEvent(event);
                    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('Not to call Unblur after PrintScreen', () =>
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
                    // Trigger the keypress Cmd+Shift event, used in Windows
                    const eventPrintScreen = new KeyboardEvent('keyup', { key: 'PrintScreen', cancelable: true });
                    document.dispatchEvent(eventPrintScreen);
                    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('');

                    expect(document.body.style.filter).toBe('');

                    // Trigger focus to unblur
                    const eventUnblur = new Event('focusin', { bubbles: true });
                    document.dispatchEvent(eventUnblur);

                    expect(document.body.style.filter).not.toMatch('none');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('Blur screen on Cmd+Shift+3', () =>
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
                    // Trigger the keypress Cmd+Shift event, used in MacOS and Windows
                    const event = new KeyboardEvent('keydown', {
                        metaKey: true,
                        shiftKey: true,
                        key: '3',
                        cancelable: true
                    });
                    document.dispatchEvent(event);

                    expect(event.defaultPrevented).toBe(true);
                    expect(document.body.style.filter).toMatch('blur(20px)');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('Blur screen on Win+Shift+S on Windows', () =>
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
                    // Trigger the keypress Cmd+Shift event, used in Windows
                    const event = new KeyboardEvent('keydown', {
                        shiftKey: true,
                        metaKey: true,
                        key: 'S',
                        cancelable: true
                    });
                    document.dispatchEvent(event);

                    expect(event.defaultPrevented).toBe(true);
                    expect(document.body.style.filter).toMatch('blur(20px)');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('Blur screen on Ctrl+Shift+S on Firefox', () =>
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
                    // Trigger the keypress Cmd+Shift event, used in Windows
                    const event = new KeyboardEvent('keydown', {
                        shiftKey: true,
                        ctrlKey: true,
                        key: 'S',
                        cancelable: true
                    });
                    document.dispatchEvent(event);

                    expect(event.defaultPrevented).toBe(true);
                    expect(document.body.style.filter).toMatch('blur(20px)');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('Unblur screen on press other key', () =>
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
                    // Trigger the keypress Cmd+Shift event, used in Windows
                    const eventBlur = new KeyboardEvent('keydown', {
                        metaKey: true,
                        shiftKey: true,
                        key: '3',
                        cancelable: true
                    });
                    document.dispatchEvent(eventBlur);

                    expect(eventBlur.defaultPrevented).toBe(true);
                    expect(document.body.style.filter).toMatch('blur(20px)');

                    // Trigger other keypress Cmd+Shift event to unblur
                    const eventUnblur = new KeyboardEvent('keydown', {
                        shiftKey: false,
                        metaKey: false,
                        key: 'f',
                        cancelable: true
                    });
                    document.dispatchEvent(eventUnblur);

                    expect(document.body.style.filter).toMatch('none');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it.each([
        ['PrintScreen event on Windows', 'keyup', { key: 'PrintScreen', cancelable: true }],
        ['Win+Shift+S on Windows', 'keydown', { shiftKey: true, metaKey: true, key: 'S', cancelable: true }],
        ['Cmd+Shift+3', 'keydown', { metaKey: true, shiftKey: true, key: '3', cancelable: true }]
    ])(
        'Security log sent for %s',
        (title, eventType, eventProperties) =>
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
                    .on('render', () => {
                        const event = new KeyboardEvent(eventType, eventProperties);
                        document.dispatchEvent(event);

                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('security-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toEqual({
                            action: 'flag',
                            reason: 'screenshot-attempt'
                        });

                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            })
    );
});
