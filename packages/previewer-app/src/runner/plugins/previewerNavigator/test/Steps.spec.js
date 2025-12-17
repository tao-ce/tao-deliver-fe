// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import testsStateStore, {
    getTestStateStore
} from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';
import Steps from '../Steps.svelte';
import preset from './testStoreMocks/presetTwoPartsFourSectionsNonLinear.json';

// mock pxToRem function for steps fit calculations
vi.mock('@oat-sa-private/ui-core', async () => {
    const originalModule = await vi.importActual('@oat-sa-private/ui-core');
    return Object.assign({ __esModule: true }, originalModule, {
        pxToRem: px => parseInt(px, 10) / 8,
        arrowKeysFocusLoop: vi.fn(), // Add focus loop function mock
        isRTLElement: vi.fn(() => false) // Add RTL detection mock
    });
});

const serviceCallId = 'test-session-plswrk';

const setupStore = () => {
    const stateStore = getTestStateStore(serviceCallId);
    stateStore.setTestMap(preset.testMap);
    stateStore.setTestContext(preset.testContext);
};

describe('Steps for PreviewerNavigator ', () => {
    afterEach(() => {
        testsStateStore.clear();
    });

    it('fails rendering with no serviceCallId', () => {
        expect(() => {
            render(Steps, { props: {} });
        }).toThrowErrorMatchingSnapshot();
    });

    it('renders empty if testStateStore is empty', () => {
        const { container } = render(Steps, {
            props: {
                serviceCallId,
                containerWidth: 1200
            }
        });
        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('renders all steps if there is enough space', () => {
        setupStore();
        const { container } = render(Steps, {
            props: {
                serviceCallId,
                containerWidth: 1200
            }
        });
        return tick().then(() => {
            expect(container.querySelectorAll('.ellipsis-container').length).toBe(0);
            expect(container.querySelectorAll('button.step').length).toBe(5);
            expect(container.querySelectorAll('button.step.completed:enabled').length).toBe(5);
            expect(container.querySelectorAll('button.step.current').length).toBe(1);
            expect(container.querySelector('button.step.current').textContent).toContain('2');
            expect(container).toMatchSnapshot();
        });
    });

    it('renders with more button on the right', () => {
        setupStore();
        const { container } = render(Steps, {
            props: {
                serviceCallId,
                containerWidth: 250
            }
        });
        return tick().then(() => {
            expect(container.querySelectorAll('.ellipsis-container').length).toBe(1);
            expect(container.querySelectorAll('button.step').length).toBe(3);
            expect(container).toMatchSnapshot();
        });
    });

    it('renders with more button on the left', () => {
        setupStore();
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestContext(
            Object.assign({}, preset.testContext, {
                itemPosition: 4,
                itemIdentifier: 'item5',
                sectionId: 'section-3',
                testPartId: 'testPart-2'
            })
        );

        const { container } = render(Steps, {
            props: {
                serviceCallId,
                containerWidth: 250
            }
        });
        return tick().then(() => {
            expect(container.querySelectorAll('.ellipsis-container').length).toBe(1);
            expect(container.querySelectorAll('button.step').length).toBe(3);
            expect(container).toMatchSnapshot();
        });
    });

    it('renders with more buttons on both sides', () => {
        setupStore();
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestContext(
            Object.assign({}, preset.testContext, { itemPosition: 2, itemIdentifier: 'item3', sectionId: 'section-2' })
        );

        const { container } = render(Steps, {
            props: {
                serviceCallId,
                containerWidth: 250
            }
        });
        return tick().then(() => {
            expect(container.querySelectorAll('.ellipsis-container').length).toBe(2);
            expect(container.querySelectorAll('button.step').length).toBe(3);
            expect(container).toMatchSnapshot();
        });
    });

    it('renders disabled buttons when in disabled state', () => {
        setupStore();
        const { container } = render(Steps, {
            props: {
                serviceCallId,
                containerWidth: 1200,
                disabled: true
            }
        });
        return tick().then(() => {
            expect(container.querySelectorAll('button.step:disabled').length).toBe(5);
            expect(container.querySelectorAll('button.step:enabled').length).toBe(0);
        });
    });

    it('fires "move" event on step click', () => {
        setupStore();
        const { component, container } = render(Steps, {
            props: {
                serviceCallId,
                containerWidth: 1200
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
