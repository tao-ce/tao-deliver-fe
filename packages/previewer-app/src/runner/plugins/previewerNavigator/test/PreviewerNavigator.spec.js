// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('@oat-sa-private/ui-core', async () => {
    const originalModule = await vi.importActual('@oat-sa-private/ui-core');
    return Object.assign({ __esModule: true }, originalModule, {
        ResizeObserver: vi.fn(),
        arrowKeysFocusLoop: vi.fn(), // Add focus loop function mock
        isRTLElement: vi.fn(() => false), // Add RTL detection mock
        pxToRem: px => parseInt(px, 10) / 8 // Add pxToRem function mock
    });
});

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import { ResizeObserver } from '@oat-sa-private/ui-core';
import testsStateStore, {
    getTestStateStore
} from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';
import PreviewerNavigator from '../PreviewerNavigator.svelte';
import preset from './testStoreMocks/presetTwoPartsFourSectionsNonLinear.json';

const serviceCallId = 'test-session-plswrk';

const createResizeObserverImplementation = width =>
    function (callback) {
        return {
            observe() {
                callback([
                    {
                        target: {
                            getBoundingClientRect: () => ({
                                width,
                                height: 800
                            })
                        }
                    }
                ]);
            },
            unobserve() {},
            disconnect() {}
        };
    };

function setupStore(data) {
    const stateStore = getTestStateStore(serviceCallId);
    stateStore.setTestMap(data.testMap);
    stateStore.setTestContext(data.testContext);
}

describe('PreviewerNavigator', () => {
    beforeEach(() => {
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => callback());
        ResizeObserver.mockImplementation(createResizeObserverImplementation(1200));
    });

    afterEach(() => {
        testsStateStore.clear();
        ResizeObserver.mockClear();
        window.requestAnimationFrame.mockRestore();
    });

    it('fails rendering with no serviceCallId', () => {
        expect(() => {
            render(PreviewerNavigator, { props: {} });
        }).toThrowErrorMatchingSnapshot();
    });

    it('renders without error if testStateStore is empty', () => {
        const { container } = render(PreviewerNavigator, {
            props: {
                serviceCallId
            }
        });
        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('renders previous button, steps and next button', () => {
        setupStore(preset);
        const { container } = render(PreviewerNavigator, {
            props: {
                serviceCallId
            }
        });
        return tick().then(() => {
            expect(container.querySelector('button[name="next"]')).toBeTruthy();
            expect(container.querySelector('button[name="prev"]')).toBeTruthy();
            expect(container.querySelectorAll('button.step').length).toBe(5);
            expect(container).toMatchSnapshot();
        });
    });

    it('renders without next button if last item', () => {
        setupStore(preset);
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestContext(
            Object.assign({}, preset.testContext, {
                itemPosition: 4,
                itemIdentifier: 'item5',
                sectionId: 'section-3',
                testPartId: 'testPart-2'
            })
        );

        const { container } = render(PreviewerNavigator, {
            props: {
                serviceCallId
            }
        });
        return tick().then(() => {
            expect(container.querySelector('button[name="next"]')).toBeFalsy();
            expect(container.querySelector('button[name="prev"]')).toBeTruthy();
            expect(container.querySelectorAll('button.step').length).toBe(5);
            expect(container).toMatchSnapshot();
        });
    });

    it('renders without previous button if first item', () => {
        setupStore(preset);
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestContext(Object.assign({}, preset.testContext, { itemPosition: 0, itemIdentifier: 'item1' }));

        const { container } = render(PreviewerNavigator, {
            props: {
                serviceCallId
            }
        });
        return tick().then(() => {
            expect(container.querySelector('button[name="next"]')).toBeTruthy();
            expect(container.querySelector('button[name="prev"]')).toBeFalsy();
            expect(container.querySelectorAll('button.step').length).toBe(5);
            expect(container).toMatchSnapshot();
        });
    });

    it('renders disabled buttons when in disabled state', () => {
        setupStore(preset);
        const { container } = render(PreviewerNavigator, {
            props: {
                serviceCallId,
                disabled: true
            }
        });
        return tick().then(() => {
            expect(container.querySelectorAll('button:disabled').length).toBe(7);
            expect(container.querySelectorAll('button:enabled').length).toBe(0);
        });
    });

    it('measures containerWidth which allows to render flexible amount of steps', () => {
        ResizeObserver.mockImplementation(createResizeObserverImplementation(500));
        setupStore(preset);
        const { container } = render(PreviewerNavigator, {
            props: {
                serviceCallId
            }
        });
        return tick().then(() => {
            expect(container.querySelectorAll('button.step').length).toBe(5);
        });
    });

    it('fires move next on next button click', () => {
        setupStore(preset);
        const { component, container } = render(PreviewerNavigator, {
            props: {
                serviceCallId
            }
        });
        const onMove = vi.fn();
        component.$on('move', onMove);
        const button = container.querySelector('button[name="next"]');

        return fireEvent.click(button).then(() => {
            expect(onMove).toHaveBeenCalled();
            expect(onMove).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: {
                        direction: 'next',
                        scope: 'item'
                    }
                })
            );
        });
    });

    it('fires move previous on previous button click', () => {
        setupStore(preset);
        const { component, container } = render(PreviewerNavigator, {
            props: {
                serviceCallId
            }
        });
        const onMove = vi.fn();
        component.$on('move', onMove);
        const button = container.querySelector('button[name="prev"]');

        return fireEvent.click(button).then(() => {
            expect(onMove).toHaveBeenCalled();
            expect(onMove).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: {
                        direction: 'previous',
                        scope: 'item'
                    }
                })
            );
        });
    });

    it('fires move to position on step button click', () => {
        setupStore(preset);
        const { component, container } = render(PreviewerNavigator, {
            props: {
                serviceCallId
            }
        });
        const onMove = vi.fn();
        component.$on('move', onMove);
        const buttons = Array.from(container.querySelectorAll('button.step'));
        const button = buttons.find(btn => btn.textContent.trim() === '4');
        expect(button).toBeTruthy();

        return fireEvent.click(button).then(() => {
            expect(onMove).toHaveBeenCalled();
            expect(onMove).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: {
                        position: 3
                    }
                })
            );
        });
    });
});
