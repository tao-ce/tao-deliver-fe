// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import MockItem from './MockItem.svelte';
vi.mock('../../item/Item.svelte', () => ({
    default: MockItem
}));

// global.jest must be defined for jest-fetch-mock to run
global.jest = { fn: vi.fn };
require('jest-fetch-mock').enableMocks();

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import ItemPreviewer from '../ItemPreviewer.svelte';

describe('ItemPreviewer', () => {
    beforeAll(() => {
        //mock scroll method otherwise test will throw an error to console
        const scrollMock = vi.fn();
        Element.prototype.scroll = scrollMock;
    });

    it('renders correctly', () => {
        const { container } = render(ItemPreviewer, { itemIdentifier: 'item-123' });
        expect(container).toMatchSnapshot();
    });

    it('toggles response panel', () =>
        new Promise(resolve => {
            const { container } = render(ItemPreviewer, { itemIdentifier: 'item-123' });
            fireEvent.click(container.querySelector('[data-test-id="toggle-response-panel"]'));
            tick().then(() => {
                expect(container.querySelector('.response-panel-container').classList).not.toContain('hidden');
                fireEvent.click(container.querySelector('[data-test-id="toggle-response-panel"]'));
                tick().then(() => {
                    expect(container.querySelector('.response-panel-container').classList).toContain('hidden');
                    resolve();
                });
            });
        }));

    it('submits the response to the url provided, updates response panel', () =>
        new Promise(resolve => {
            const { container } = render(ItemPreviewer, {
                itemIdentifier: 'item-123',
                options: { itemRunnerConfig: { previewerMode: { submitResponseUrl: 'https://example.com/' } } }
            });

            //this promise is created to let us bind to fetch completion
            const fetchDonePromise = new Promise(fetchDone => {
                fetch.mockImplementation(function (url) {
                    expect(url).toBe('https://example.com/');

                    //put resolve method to the queue
                    setTimeout(fetchDone);

                    return Promise.resolve(
                        new Response(
                            '{"success":true,"displayFeedback":true,"itemSession":{"SCORE":{"base":{"float":0}},"MAXSCORE":{"base":{"float":1}}}}',
                            {
                                headers: {
                                    'Content-Type': 'application/json; charset=UTF-8'
                                }
                            }
                        )
                    );
                });
            });

            fireEvent.click(container.querySelector('[data-test-id="toggle-response-panel"]'));
            tick().then(() => {
                fireEvent.click(container.querySelector('[data-test-id="submit-response"]'));

                //fetch is done now
                fetchDonePromise.then(() => {
                    expect(document.querySelector('.response-panel-container')).toMatchSnapshot();
                    resolve();
                });
            });
        }));

    it('forwards events from child components', () => {
        const { component, container } = render(ItemPreviewer, {
            itemIdentifier: 'item-123',
            options: { itemRunnerConfig: { previewerMode: { submitResponseUrl: 'https://example.com/' } } }
        });
        expect.assertions(3);
        const readyListenerMock = vi.fn();
        const errorListenerMock = vi.fn();
        const closeListenerMock = vi.fn();
        component.$on('ready', readyListenerMock);
        component.$on('error', errorListenerMock);
        component.$on('close', closeListenerMock);

        //dispatch Item ready event
        fireEvent.click(container.querySelector('[data-test-id="dispatchReady"]'));
        //dispatch Item error event
        fireEvent.click(container.querySelector('[data-test-id="dispatchError"]'));
        //dispatch Item error event
        fireEvent.click(container.querySelector('.bar-main-section .actionable'));

        expect(readyListenerMock).toHaveBeenCalled();
        expect(errorListenerMock).toHaveBeenCalled();
        expect(closeListenerMock).toHaveBeenCalled();
    });

    it('calls renderFeedbacks when displayFeedback is true', () =>
        new Promise(resolve => {
            const renderFeedbacksMock = vi.fn();
            const mockItemRunner = {
                renderFeedbacks: renderFeedbacksMock
            };

            const { container } = render(ItemPreviewer, {
                itemIdentifier: 'item-123',
                options: { itemRunnerConfig: { previewerMode: { submitResponseUrl: 'https://example.com/' } } },
                itemRunner: mockItemRunner,
                content: {
                    data: {
                        feedbacks: {
                            feedback1: { title: 'Test Feedback', content: 'Feedback content' }
                        }
                    }
                }
            });

            const fetchDonePromise = new Promise(fetchDone => {
                fetch.mockImplementation(function () {
                    setTimeout(fetchDone);
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                success: true,
                                displayFeedback: true,
                                itemSession: { FEEDBACK_1: { base: { identifier: 'feedback1' } } }
                            }),
                            {
                                headers: {
                                    'Content-Type': 'application/json; charset=UTF-8'
                                }
                            }
                        )
                    );
                });
            });

            fireEvent.click(container.querySelector('[data-test-id="toggle-response-panel"]'));
            tick().then(() => {
                fireEvent.click(container.querySelector('[data-test-id="submit-response"]'));

                fetchDonePromise.then(() => {
                    tick().then(() => {
                        expect(renderFeedbacksMock).toHaveBeenCalledWith(
                            { feedback1: { title: 'Test Feedback', content: 'Feedback content' } },
                            { FEEDBACK_1: { base: { identifier: 'feedback1' } } }
                        );
                        resolve();
                    });
                });
            });
        }));

    it('does not call renderFeedbacks when displayFeedback is false', () =>
        new Promise(resolve => {
            const renderFeedbacksMock = vi.fn();
            const mockItemRunner = {
                renderFeedbacks: renderFeedbacksMock
            };

            const { container } = render(ItemPreviewer, {
                itemIdentifier: 'item-123',
                options: { itemRunnerConfig: { previewerMode: { submitResponseUrl: 'https://example.com/' } } },
                itemRunner: mockItemRunner,
                content: {
                    data: {
                        feedbacks: {
                            feedback1: { title: 'Test Feedback', content: 'Feedback content' }
                        }
                    }
                }
            });

            const fetchDonePromise = new Promise(fetchDone => {
                fetch.mockImplementation(function () {
                    setTimeout(fetchDone);
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                success: true,
                                displayFeedback: false,
                                itemSession: {}
                            }),
                            {
                                headers: {
                                    'Content-Type': 'application/json; charset=UTF-8'
                                }
                            }
                        )
                    );
                });
            });

            fireEvent.click(container.querySelector('[data-test-id="toggle-response-panel"]'));
            tick().then(() => {
                fireEvent.click(container.querySelector('[data-test-id="submit-response"]'));

                fetchDonePromise.then(() => {
                    tick().then(() => {
                        expect(renderFeedbacksMock).not.toHaveBeenCalled();
                        resolve();
                    });
                });
            });
        }));
});
