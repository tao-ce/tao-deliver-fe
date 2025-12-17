// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// mock the scaling util
vi.mock('../../util/scaling.js', async importOriginal => {
    // Extend the unmocked module with only the desired mocks
    const originalModule = await importOriginal();
    return {
        ...originalModule,
        calculateScalingFactor: () => 1
    };
});

const originalGetBBox = SVGElement.prototype.getBBox;
const originalGetScreenCTM = SVGElement.prototype.getScreenCTM;
beforeEach(() => {
    SVGElement.prototype.getBBox = () => ({ x: 50, y: 50, width: 36, height: 58 });
    SVGElement.prototype.getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 500, f: 300 });
});
afterEach(() => {
    SVGElement.prototype.getBBox = originalGetBBox;
    SVGElement.prototype.getScreenCTM = originalGetScreenCTM;
});

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import SelectPointInteraction from '../SelectPointInteraction.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../../itemsStateStore.js';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../../../itemsSessionStatusStore.js';
import userEvent from '@testing-library/user-event';
import ContextWrapper from '../../../../static/test/ContextWrapper.svelte';

describe('SelectPointInteraction', () => {
    const qtiClass = 'qti-selectPointInteraction';
    const itemIdentifier = 'foo';

    const responseIdentifier = 'RESPONSE_123';
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
    const getAssetManager = () => ({
        resolve: src => src
    });
    const registerLoadingElement = vi.fn();
    const getInstructionsLang = vi.fn();
    const testContext = {
        getAssetManager,
        registerLoadingElement,
        getInstructionsLang
    };

    const imgObject = {
        data: 'graphic/map-of-the-europe.jpg',
        type: 'image/jpeg',
        width: 800,
        height: 600
    };

    afterEach(() => {
        itemsStateStore.clear();
        itemsSessionStatusStore.clear();
        registerLoadingElement.mockClear();
        getInstructionsLang.mockClear();
    });

    // RENDERING

    describe('Rendering', () => {
        it('renders prompt', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier: itemIdentifier,
                        prompt: [
                            {
                                type: 'text',
                                content: 'Place your markers'
                            }
                        ],
                        imgObject
                    }
                }
            });
            expect(container.querySelector('.qti-prompt')).toBeInTheDocument();
            expect(container.querySelector('.qti-prompt')).toHaveTextContent('Place your markers');
        });

        it('registers loading image', () => {
            render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        imgObject,
                        prompt: [
                            {
                                type: 'text',
                                content: 'Place your markers'
                            }
                        ]
                    }
                }
            });
            expect(registerLoadingElement).toHaveBeenCalled();
        });

        it('renders simple props into markup', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier: 'foo',
                        responseIdentifier: 'RESPONSE',
                        disabled: true,
                        language: 'hu',
                        id: 'interactionId',
                        dir: 'rtl',
                        role: 'someUniqueRole',
                        dataAttrs: {
                            'data-foo': 'bar',
                            'data-baz': 24
                        },
                        ariaAttrs: {
                            ariaFoo: 12,
                            ariaBar: 'baz'
                        },
                        classes: 'foo bar baz',
                        imgObject
                    }
                }
            });

            expect(container).toMatchSnapshot();
        });

        it('renders correct feedbacks', () => {
            interactionStateStore.setResponse({
                list: {
                    point: [
                        [123, 456],
                        [640, 480]
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        minChoices: 1,
                        maxChoices: 3
                    }
                }
            });
            expect(container.querySelector('.qti-instruction-container')).toMatchSnapshot();
        });

        it('renders some MiniPins', () => {
            interactionStateStore.setResponse({
                list: {
                    point: [
                        [123, 456],
                        [640, 480]
                    ]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxChoices: 5
                    }
                }
            });

            expect(container.querySelector('.info-area')).toMatchSnapshot();
        });

        it('is disabled in closed session', () => {
            const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);

            itemSessionStatusStore.set('closed');

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject
                    }
                }
            });

            expect(container.querySelector('.qti-selectPointInteraction').getAttribute('aria-disabled')).toBe('true');
        });

        it('cannot render without image definition', () => {
            expect(() => {
                render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext,
                        testComponent: SelectPointInteraction,
                        testComponentProps: {
                            itemIdentifier: 'foo',
                            imgObject: void 0
                        }
                    }
                });
            }).toThrowError();
        });

        it('renders the instruction lang on the feedback block', () => {
            getInstructionsLang.mockReturnValueOnce('hi_IN');

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        minChoices: 1,
                        maxChoices: 3
                    }
                }
            });
            expect(container).toMatchSnapshot();
            expect(getInstructionsLang).toHaveBeenCalled();
            expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toEqual('hi_IN');
        });
    });

    // STORE

    describe('Store', () => {
        it('loads stored response - single cardinality', () => {
            expect.assertions(2);

            interactionStateStore.setResponse({
                base: {
                    point: [20, 30]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        cardinality: 'single'
                    }
                }
            });

            expect(container.querySelectorAll('.marker').length).toBe(1);
            expect(interactionStateStore.getValidity()).toBe(true);
        });

        it('loads stored response - multiple cardinality', () => {
            expect.assertions(2);

            interactionStateStore.setResponse({
                list: {
                    point: [
                        [20, 30],
                        [50, 60]
                    ]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        cardinality: 'multiple',
                        maxChoices: 2
                    }
                }
            });

            expect(container.querySelectorAll('.marker').length).toBe(2);
            expect(interactionStateStore.getValidity()).toBe(true);
        });

        it('listens store modifications', () => {
            expect.assertions(2);

            interactionStateStore.setResponse({
                base: {
                    point: [20, 30]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        cardinality: 'single'
                    }
                }
            });

            expect(container.querySelectorAll('.marker').length).toBe(1);

            interactionStateStore.setResponse({
                base: {
                    point: []
                }
            });

            return tick().then(() => {
                expect(container.querySelectorAll('.marker').length).toBe(0);
            });
        });

        it.each([
            [0, { list: { point: [] } }],
            [1, { base: null }],
            [2, { list: { point: [] } }]
        ])('has correct empty response value when maxChoices === %d', (maxChoices, expectedResponse) => {
            expect.assertions(2);

            render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxChoices
                    }
                }
            });
            expect(interactionStateStore.getResponse()).toStrictEqual(expectedResponse);
            expect(interactionStateStore.getValidity()).toBe(true);
        });

        it('saves valid response to store on change with constraints set', () => {
            expect.assertions(8);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        minChoices: 1,
                        maxChoices: 2
                    }
                }
            });
            expect(interactionStateStore.getResponse()).toEqual({ list: { point: [] } });
            expect(interactionStateStore.getValidity()).toBe(false);
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });

            expect(container.querySelectorAll('.marker').length).toBe(0);

            const svg = container.querySelector('.qti-block > svg');
            fireEvent.keyUp(svg, { key: 'Enter' }); // add & select marker

            return tick().then(() => {
                expect(container.querySelectorAll('.marker').length).toBe(1);
                expect(interactionStateStore.getResponse()).toEqual({ list: { point: [[400, 300]] } });
                expect(interactionStateStore.getValidity()).toBe(true);
                expect(interactionStateStore.get()).toMatchObject({ qtiClass });
            });
        });

        it('saves valid response when max/min constraints turned off', () => {
            expect.assertions(6);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        minChoices: -1,
                        maxChoices: -1
                    }
                }
            });
            expect(interactionStateStore.getResponse()).toEqual({ list: { point: [] } });
            expect(interactionStateStore.getValidity()).toBe(true);

            expect(container.querySelectorAll('.marker').length).toBe(0);

            const svg = container.querySelector('.qti-block > svg');
            fireEvent.keyUp(svg, { key: 'Enter' }); // add & select marker

            return tick().then(() => {
                expect(container.querySelectorAll('.marker').length).toBe(1);
                expect(interactionStateStore.getResponse()).toEqual({ list: { point: [[400, 300]] } });
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        it('saves invalid response (too few choices) to store on change', () => {
            expect.assertions(6);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        minChoices: 2,
                        maxChoices: 2
                    }
                }
            });
            expect(interactionStateStore.getResponse()).toEqual({ list: { point: [] } });
            expect(interactionStateStore.getValidity()).toBe(false);

            expect(container.querySelectorAll('.marker').length).toBe(0);

            const svg = container.querySelector('.qti-block > svg');
            fireEvent.keyUp(svg, { key: 'Enter' }); // add & select marker

            return tick().then(() => {
                expect(container.querySelectorAll('.marker').length).toBe(1);
                expect(interactionStateStore.getResponse()).toEqual({ list: { point: [[400, 300]] } });
                expect(interactionStateStore.getValidity()).toBe(false);
            });
        });

        it('saves single value response when maxChoices === 1', () => {
            expect.assertions(6);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        minChoices: -1,
                        maxChoices: 1
                    }
                }
            });
            expect(interactionStateStore.getResponse()).toEqual({ base: null });
            expect(interactionStateStore.getValidity()).toBe(true);

            expect(container.querySelectorAll('.marker').length).toBe(0);

            const svg = container.querySelector('.qti-block > svg');
            fireEvent.keyUp(svg, { key: 'Enter' }); // add & select marker

            return tick().then(() => {
                expect(container.querySelectorAll('.marker').length).toBe(1);
                expect(interactionStateStore.getResponse()).toEqual({ base: { point: [400, 300] } });
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        it('invalid constraints: minChoices > maxChoices is the same as no constraints', () => {
            render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        minChoices: 3,
                        maxChoices: 2
                    }
                }
            });
            expect(interactionStateStore.getValidity()).toBe(true);
        });
    });

    // BEHAVIOUR - MOUSE

    describe('Mouse events', () => {
        // can't write these yet, because JSDom doesn't support { offsetX, offsetY } of a MouseEvent
        it.todo('click on svg adds marker');
        it.todo('click on bay does nothing');
        it.todo('click on svg replaces only marker when maxChoices = 1');

        it('click on marker removes it', () => {
            expect.assertions(2);

            interactionStateStore.setResponse({
                base: {
                    point: [20, 30]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        cardinality: 'single'
                    }
                }
            });

            expect(container.querySelectorAll('.marker').length).toBe(1);

            const hitbox = container.querySelector('.marker .hitbox');

            return fireEvent.click(hitbox).then(() => {
                expect(container.querySelectorAll('.marker').length).toBe(0);
            });
        });

        it('click on marker fire feedback update', () => {
            expect.assertions(3);

            interactionStateStore.setResponse({
                list: {
                    point: [[20, 30]]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        minChoices: 1,
                        maxChoices: 3
                    }
                }
            });

            expect(container.querySelectorAll('.marker').length).toBe(1);

            const hitbox = container.querySelector('.marker .hitbox');

            return fireEvent.click(hitbox).then(() => {
                expect(container.querySelectorAll('.marker').length).toBe(0);
                expect(container.querySelector('.qti-instruction-container')).toMatchSnapshot();
            });
        });

        it('drag on marker moves it', () => {
            expect.assertions(4);

            interactionStateStore.setResponse({
                base: {
                    point: [20, 30]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        cardinality: 'single'
                    }
                }
            });

            expect(container.querySelectorAll('.marker').length).toBe(1);
            expect(interactionStateStore.getResponse()).toEqual({ base: { point: [20, 30] } });

            const hitbox = container.querySelector('.marker .hitbox');

            fireEvent.mouseDown(hitbox, { which: 1, clientX: 20, clientY: 30 });
            return new Promise(resolve => {
                setTimeout(() => {
                    fireEvent.mouseUp(window, { clientX: 40, clientY: 50 });
                    expect(container.querySelectorAll('.marker').length).toBe(1);
                    expect(interactionStateStore.getResponse()).toEqual({ base: { point: [40, 50] } });
                    resolve();
                }, 20);
            });
        });

        test.each([
            [
                [500, 500],
                [799, 599]
            ],
            [
                [-500, 500],
                [0, 599]
            ],
            [
                [500, -500],
                [799, 0]
            ],
            [
                [-500, -500],
                [0, 0]
            ]
        ])('drag by %s (beyond bounds) moves marker to corner %s', (deltaCoords, expectedCoords) => {
            expect.assertions(4);

            // centre
            const startX = 400;
            const startY = 300;

            const [dx, dy] = deltaCoords;

            interactionStateStore.setResponse({
                base: {
                    point: [startX, startY]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        cardinality: 'single'
                    }
                }
            });

            expect(container.querySelectorAll('.marker').length).toBe(1);
            expect(interactionStateStore.getResponse()).toEqual({ base: { point: [startX, startY] } });

            const hitbox = container.querySelector('.marker .hitbox');

            fireEvent.mouseDown(hitbox, { which: 1, clientX: startX, clientY: startY });
            return new Promise(resolve => {
                setTimeout(() => {
                    fireEvent.mouseUp(window, { clientX: startX + dx, clientY: startY + dy });
                    expect(container.querySelectorAll('.marker').length).toBe(1);
                    expect(interactionStateStore.getResponse()).toEqual({ base: { point: expectedCoords } });
                    resolve();
                }, 20);
            });
        });
    });

    // BEHAVIOUR - KEYBOARD

    describe('Keyboard events', () => {
        it('tutorial shows when block gains tabfocus', () =>
            new Promise(resolve => {
                expect.assertions(5);

                const { container } = render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext,
                        testComponent: SelectPointInteraction,
                        testComponentProps: {
                            itemIdentifier,
                            responseIdentifier,
                            imgObject,
                            cardinality: 'single',
                            prompt: [{ type: 'html', content: '<button>Hey</button>' }]
                        }
                    }
                });

                expect(container.querySelector('.tutorial-layer')).toBeNull();

                // need .qti-block to gain focus by tab
                const promptButton = container.querySelector('.qti-prompt > button');
                promptButton.focus();
                expect(promptButton).toHaveFocus();

                userEvent.tab();

                // tabFocus action takes 100ms to decide
                setTimeout(
                    () =>
                        tick()
                            .then(() => {
                                expect(container.querySelector('.qti-block')).toHaveFocus();
                                expect(container.querySelector('.tutorial-layer')).toBeInTheDocument();
                                userEvent.tab({ shift: true });
                            })
                            .then(tick)
                            .then(() => {
                                expect(container.querySelector('.tutorial-layer')).toBeNull();
                                resolve();
                            }),
                    105
                );
            }));

        test.each(['Enter', 'Space'])('adds a marker and selects and deselects it on %s keypress', keyName => {
            expect.assertions(5);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        cardinality: 'single'
                    }
                }
            });
            expect(container.querySelectorAll('.marker').length).toBe(0);

            const svg = container.querySelector('.qti-block > svg');

            fireEvent.keyUp(svg, { key: keyName }); // add & select marker

            return tick()
                .then(tick) // interaction has an extra tick to allow focusing
                .then(() => {
                    expect(container.querySelectorAll('.marker').length).toBe(1);
                    expect(container.querySelector('.marker')).toHaveClass('selected');

                    return fireEvent.keyUp(svg, { key: keyName }); // deselect marker
                })
                .then(tick)
                .then(() => {
                    expect(container.querySelectorAll('.marker').length).toBe(1);
                    expect(container.querySelector('.marker')).not.toHaveClass('selected');
                });
        });

        test.each([
            ['Left', false, -10, 0],
            ['Right', false, 10, 0],
            ['Up', false, 0, -10],
            ['Down', false, 0, 10],
            ['Left', true, -1, 0],
            ['Right', true, 1, 0],
            ['Up', true, 0, -1],
            ['Down', true, 0, 1]
        ])('Arrow %s key (Shift %s) moves selected marker [%d,%d]', (keyName, shiftKey, moveX, moveY) => {
            expect.assertions(5);

            interactionStateStore.setResponse({
                base: {
                    point: [50, 50]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        cardinality: 'single'
                    }
                }
            });
            expect(container.querySelectorAll('.marker').length).toBe(1);

            const svg = container.querySelector('.qti-block > svg');
            const marker = container.querySelector('.marker');

            marker.focus();
            expect(marker).toHaveFocus();

            return tick()
                .then(() => fireEvent.keyUp(svg, { key: 'Enter' })) // select
                .then(() => fireEvent.keyDown(svg, { key: keyName, shiftKey })) // move
                .then(() => fireEvent.keyUp(svg, { key: 'Enter' })) // deselect
                .then(() => {
                    expect(container.querySelectorAll('.marker').length).toBe(1);
                    expect(interactionStateStore.getResponse()).toEqual({ base: { point: [50 + moveX, 50 + moveY] } });
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });

        test.each(['Delete', 'Backspace'])('%s key deletes a focused & selected marker', keyName => {
            expect.assertions(5);

            interactionStateStore.setResponse({
                base: {
                    point: [50, 50]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        cardinality: 'single'
                    }
                }
            });
            expect(container.querySelectorAll('.marker').length).toBe(1);

            const svg = container.querySelector('.qti-block > svg');
            const marker = container.querySelector('.marker');

            marker.focus();
            expect(marker).toHaveFocus();

            return tick()
                .then(() => fireEvent.keyUp(svg, { key: 'Space' })) // select
                .then(() => fireEvent.keyUp(svg, { key: keyName })) // delete
                .then(() => {
                    expect(container.querySelectorAll('.marker').length).toBe(0);
                    expect(interactionStateStore.getResponse()).toEqual({ base: null });
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });

        it('cannot add marker if maxChoices reached', () => {
            expect.assertions(2);

            interactionStateStore.setResponse({
                list: {
                    point: [
                        [20, 30],
                        [40, 50],
                        [60, 70]
                    ]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SelectPointInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxChoices: 3
                    }
                }
            });
            expect(container.querySelectorAll('.marker').length).toBe(3);

            const svg = container.querySelector('.qti-block > svg');

            fireEvent.keyUp(svg, { key: 'Enter' }); // try to add marker

            return tick()
                .then(tick)
                .then(() => {
                    expect(container.querySelectorAll('.marker').length).toBe(3);
                });
        });
    });
});
