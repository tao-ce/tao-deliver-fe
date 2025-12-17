// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module'); // needed by taoTests/runner/proxy

import testRunnerFactory from 'taoTests/runner/runner.js';
import pluginFactory from '../plugin.js';
import proxyFactory from 'taoTests/runner/proxy.js';

describe('disableCommands plugin', () => {
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

    it.each([['copy'], ['cut'], ['paste']])(
        'blocks %s event without valid target',
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
                        const clipboardData = {
                            getData() {
                                return 'foo';
                            }
                        };
                        const event = new Event(type, { cancelable: true, bubbles: true });
                        event.clipboardData = clipboardData;

                        container.dispatchEvent(event);

                        expect(event.defaultPrevented).toBe(true);
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('security-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toEqual({
                            action: 'flag',
                            reason: `${type}-attempt`
                        });

                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            })
    );

    it.each([['copy'], ['cut']])(
        'does not block %s event if canCopy is configured',
        type =>
            new Promise(done => {
                const runner = testRunnerFactory('foo', [pluginFactory], {
                    renderTo: container,
                    serviceCallId
                });

                runner.getPluginConfig = () => ({ canCopy: true });

                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('render', () => {
                        const clipboardData = {
                            getData() {
                                return 'foo';
                            }
                        };
                        const event = new Event(type, { cancelable: true, bubbles: true });
                        event.clipboardData = clipboardData;

                        container.dispatchEvent(event);

                        expect(event.defaultPrevented).toBe(false);

                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            })
    );

    it('does not block paste event if canPaste is configured', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner.getPluginConfig = () => ({ canPaste: true });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    const clipboardData = {
                        getData() {
                            return 'foo';
                        }
                    };
                    const event = new Event('paste', { cancelable: true, bubbles: true });
                    event.clipboardData = clipboardData;

                    container.dispatchEvent(event);

                    expect(event.defaultPrevented).toBe(false);

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it.each([['copy'], ['cut']])(
        'does not block %s event with valid target',
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
                        const clipboardData = {
                            getData() {
                                return 'foo';
                            }
                        };
                        const event = new Event(type, { cancelable: true, bubbles: true });
                        event.clipboardData = clipboardData;

                        const textarea = document.createElement('textarea');
                        container.appendChild(textarea);

                        textarea.dispatchEvent(event);

                        expect(event.defaultPrevented).toBe(false);

                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            })
    );

    it('does not block drop event if dragAndDrop is enabled', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner.getPluginConfig = () => ({ canDragAndDrop: true });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    const clipboardData = {
                        getData() {
                            return 'foo';
                        }
                    };
                    const event = new Event('drop', { cancelable: true, bubbles: true });
                    event.clipboardData = clipboardData;

                    const textarea = document.createElement('textarea');
                    container.appendChild(textarea);

                    textarea.dispatchEvent(event);

                    expect(event.defaultPrevented).toBe(false);

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it.each([['paste'], ['drop']])(
        'does block %s event without correct source',
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
                        const clipboardData = {
                            getData() {
                                return 'foo';
                            }
                        };
                        const event = new Event(type, { cancelable: true, bubbles: true });
                        event.clipboardData = clipboardData;

                        const textarea = document.createElement('textarea');
                        container.appendChild(textarea);

                        textarea.dispatchEvent(event);

                        expect(event.defaultPrevented).toBe(true);

                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            })
    );

    it('does not block valid copy paste flow', () =>
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
                    const clipboardData = {
                        getData() {
                            return 'foo';
                        }
                    };

                    const textarea = document.createElement('textarea');
                    container.appendChild(textarea);

                    // copy
                    const copyEvent = new Event('copy', { cancelable: true, bubbles: true });
                    copyEvent.clipboardData = clipboardData;

                    textarea.dispatchEvent(copyEvent);

                    // paste
                    const pasteEvent = new Event('paste', { cancelable: true, bubbles: true });
                    pasteEvent.clipboardData = clipboardData;

                    textarea.dispatchEvent(pasteEvent);

                    expect(pasteEvent.defaultPrevented).toBe(false);

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('does not block valid mathlive copy paste flow', () =>
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
                    const copyClipboardData = {
                        getData() {
                            return 'foo';
                        }
                    };

                    const pasteClipboardData = {
                        getData() {
                            return '$$foo$$';
                        }
                    };

                    const mathliveContainer = document.createElement('div');
                    mathliveContainer.setAttribute('data-allow-copy', true);
                    container.appendChild(mathliveContainer);

                    // copy
                    const copyEvent = new Event('copy', { cancelable: true, bubbles: true });
                    copyEvent.clipboardData = copyClipboardData;

                    mathliveContainer.dispatchEvent(copyEvent);

                    // paste
                    const pasteEvent = new Event('paste', { cancelable: true, bubbles: true });
                    pasteEvent.clipboardData = pasteClipboardData;

                    const input = document.createElement('input');
                    container.appendChild(input);
                    input.dispatchEvent(pasteEvent);

                    expect(pasteEvent.defaultPrevented).toBe(false);

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('does not block valid drag and drop flow', () =>
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
                    const textarea = document.createElement('textarea');
                    container.appendChild(textarea);

                    // drag
                    const dragStartEvent = new Event('dragstart', { cancelable: true, bubbles: true });

                    textarea.dispatchEvent(dragStartEvent);

                    // drop
                    const dropEvent = new Event('drop', { cancelable: true, bubbles: true });

                    textarea.dispatchEvent(dropEvent);

                    expect(dropEvent.defaultPrevented).toBe(false);

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));
});
