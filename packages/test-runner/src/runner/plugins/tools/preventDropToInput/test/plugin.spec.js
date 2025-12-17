// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
vi.mock('module');

import { tick } from 'svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';

describe('preventDropToInput plugin', () => {
    let container;
    let testProviderApi;
    const serviceCallId = 'test-session-jfm';

    function createTestRunner() {
        return testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        });
    }

    const proxyCallTestActionSpy = vi.fn().mockImplementation(() => Promise.resolve());

    beforeEach(() => {
        proxyCallTestActionSpy.mockClear();

        container = document.createElement('div');
        document.body.appendChild(container);

        testProviderApi = {
            loadDataHolder() {
                return {
                    set: vi.fn(),
                    clear: vi.fn()
                };
            },
            loadAreaBroker() {
                return {
                    getContainer: () => container
                };
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
        document.body.removeChild(container);
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect(runner.getState('ready')).toBe(true);
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('prevents drop on text inputs and specific textareas', () =>
        new Promise(done => {
            const runner = createTestRunner();
            const mockEvent = new Event('drop', {
                bubbles: true,
                cancelable: true
            });

            mockEvent.preventDefault = vi.fn();
            mockEvent.stopPropagation = vi.fn();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    const input = document.createElement('input');
                    input.type = 'text';
                    container.appendChild(input);

                    const div = document.createElement('div');
                    div.className = 'qti-extendedTextInteraction';
                    div.setAttribute('data-format', 'plain');
                    const textarea = document.createElement('textarea');
                    div.appendChild(textarea);
                    container.appendChild(div);

                    runner.trigger('renderitem');
                })
                .on('renderitem', () => {
                    tick().then(() => {
                        const input = container.querySelector("input[type='text']");
                        const textarea = container.querySelector(
                            ".qti-extendedTextInteraction:not([data-format='xhtml']) textarea"
                        );

                        // Simulate drop event on both elements
                        input.dispatchEvent(mockEvent);
                        textarea.dispatchEvent(mockEvent);

                        expect(mockEvent.preventDefault).toHaveBeenCalledTimes(2);
                        expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(2);

                        runner.destroy();
                    });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));
});
