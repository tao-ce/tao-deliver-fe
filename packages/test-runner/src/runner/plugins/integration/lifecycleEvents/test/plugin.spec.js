// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';

describe('LifecycleEvents plugin', () => {
    const serviceCallId = 'test-session-call-id';
    let container;
    let item;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        const testProviderApi = {
            init() {},
            loadItem() {
                return item;
            },
            loadAreaBroker() {
                return {};
            }
        };

        testRunnerFactory.registerProvider('foo', testProviderApi);
    });

    afterEach(() => {
        item = {};
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

    it('logs testrunner init', () =>
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
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .on('lifecycleEvent', (type, scope, detail) => {
                    expect(type).toBe('init');
                    expect(scope).toBe('test');
                    expect(detail).toBeUndefined();
                })
                .init();
        }));

    it('logs item init', () =>
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
                    runner
                        .on('lifecycleEvent', (type, scope, detail) => {
                            expect(type).toBe('init');
                            expect(scope).toBe('item');
                            expect(detail).toBeUndefined();
                            runner.destroy();
                        })
                        .trigger('loaditem');
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('logs item ready', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            const userAgentGetter = vi.spyOn(window.navigator, 'userAgent', 'get');
            const userAgent = 'some user agent';
            userAgentGetter.mockReturnValue(userAgent);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    runner
                        .on('lifecycleEvent', (type, scope, detail) => {
                            expect(type).toBe('ready');
                            expect(scope).toBe('item');
                            expect(detail).toEqual({
                                screen: { width: 0, height: 0 },
                                window: { width: 1024, height: 768 },
                                document: { width: 0, height: 0 },
                                userAgent
                            });
                            runner.destroy();
                        })
                        .trigger('renderitem');
                })
                .on('destroy', () => {
                    userAgentGetter.mockRestore();
                    done();
                })
                .init();
        }));

    it('logs navigation', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            const response = {
                foo: 'bar'
            };

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    runner.itemRunner = {
                        getResponses() {
                            return response;
                        }
                    };
                    runner.getTestMap = () => ({
                        parts: {
                            'part-1': {
                                sections: {
                                    'section-1': {
                                        items: {
                                            'item-1': {
                                                position: 0
                                            },
                                            'item-2': {
                                                position: 1
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });
                    runner
                        .on('lifecycleEvent', (type, scope, detail) => {
                            expect(type).toBe('move');
                            expect(scope).toBe('item');
                            expect(detail).toEqual({
                                scope: 'section',
                                direction: 'jump',
                                itemIdentifier: 'item-2',
                                response
                            });
                            runner.destroy();
                        })
                        .trigger('move', 'jump', 'section', 1);
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('logs test finish', () =>
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
                    runner
                        .on('lifecycleEvent', (type, scope, detail) => {
                            expect(type).toBe('finish');
                            expect(scope).toBe('test');
                            expect(detail).toBeUndefined();
                            runner.destroy();
                        })
                        .trigger('finish');
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));
});
