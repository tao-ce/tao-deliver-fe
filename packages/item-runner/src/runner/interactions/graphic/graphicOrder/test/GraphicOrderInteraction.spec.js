// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
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

vi.mock('../../util/polygon.js', async () => {
    const originalModule = await vi.importActual('../../util/polygon.js');
    return Object.assign({ __esModule: true }, originalModule, {
        getIsThin: () => false
    });
});

//mock getBBox for <text> rendering
const originalGetBBox = SVGElement.prototype.getBBox;
beforeEach(() => {
    SVGElement.prototype.getBBox = () => ({ x: 1, y: 1, width: 1, height: 1 });
});
afterEach(() => {
    SVGElement.prototype.getBBox = originalGetBBox;
});

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import GraphicOrderInteraction from '../GraphicOrderInteraction.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../../itemsStateStore.js';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../../../itemsSessionStatusStore.js';
import ContextWrapper from '../../../../static/test/ContextWrapper.svelte';

function expectNumberOfShapes(n, container) {
    const shapes = container.querySelectorAll('.hotspot-choice') || [];
    expect(shapes.length).toBe(n);
}

function expectNumberOfSelectedShapes(n, container) {
    const shapes = container.querySelectorAll('.hotspot-choice > g.selected') || [];
    expect(shapes.length).toBe(n);
}

function getShapeByDataKey(dataKey, container) {
    return container.querySelector(`.hotspot-choice[data-choice-key="${dataKey}"] > g`);
}

function getShapeControlByDataKey(dataKey, container) {
    return container.querySelector(`.hotspot-choice[data-choice-key="${dataKey}"]`);
}

describe('GraphicOrderInteraction', () => {
    const qtiClass = 'qti-graphicOrderInteraction';
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

    afterEach(() => {
        itemsStateStore.clear();
        itemsSessionStatusStore.clear();
        registerLoadingElement.mockClear();
        getInstructionsLang.mockClear();
    });

    const imgObject = {
        data: 'graphic/map-of-the-europe.jpg',
        type: 'image/jpeg',
        width: 1213,
        height: 860
    };

    const choices = [
        {
            key: 'hotspot_1',
            shape: 'rect',
            coords: '311,358,385,402',
            hotspotLabel: 'first hotspot'
        },
        {
            key: 'hotspot_4',
            shape: 'poly',
            coords: '112,491,190,482,193,551,106,549'
        },
        {
            key: 'hotspot_5',
            shape: 'ellipse',
            coords: '153,41,51,39'
        },
        {
            key: 'hotspot_6',
            shape: 'circle',
            coords: '50,50,50'
        }
    ];

    const itemIdentifier = 'iabcd';
    const responseIdentifier = 'RESPONSE_123';

    // RENDERING

    describe('Rendering', () => {
        it('renders prompt', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        prompt: [
                            {
                                type: 'text',
                                content: 'Select hotspots'
                            }
                        ],
                        imgObject,
                        choices: []
                    }
                }
            });

            expect(container.querySelector('.qti-prompt')).toBeInTheDocument();
            expect(container.querySelector('.qti-prompt')).toHaveTextContent('Select hotspots');
        });

        it('renders simple props into markup', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
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
                        imgObject,
                        choices: []
                    }
                }
            });

            expect(container).toMatchSnapshot();
        });

        it('registers loading image', () => {
            render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        imgObject,
                        choices
                    }
                }
            });

            expect(registerLoadingElement).toHaveBeenCalled();
        });

        it('renders image & choices', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        imgObject,
                        choices
                    }
                }
            });

            expect(container).toMatchSnapshot();
        });

        it('renders with qti-unselected-hidden class', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        classes: 'qti-unselected-hidden',
                        imgObject,
                        choices: []
                    }
                }
            });

            expect(container.querySelector('.qti-graphicOrderInteraction')).toHaveClass('qti-unselected-hidden');
        });

        test.each([
            [0, 0],
            [3, 0],
            [0, 3],
            [3, 3],
            [2, 3]
        ])('renders correct feedbacks: min=%d max=%d', (minChoices, maxChoices) => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices,
                        minChoices,
                        maxChoices
                    }
                }
            });
            expect(choices.length).toBe(4);
            expect(container.querySelector('.qti-instruction-container')).toMatchSnapshot();
        });

        it('is disabled in closed session', () => {
            const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);

            itemSessionStatusStore.set('closed');

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices
                    }
                }
            });

            expect(container.querySelector('.qti-graphicOrderInteraction').getAttribute('aria-disabled')).toBe('true');
        });

        it('cannot render without image definition', () => {
            expect(() => {
                render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext,
                        testComponent: GraphicOrderInteraction,
                        testComponentProps: {
                            itemIdentifier: 'foo',
                            imgObject: void 0
                        }
                    }
                });
            }).toThrowError();
        });

        it('renders the instruction lang on the feedback block', () => {
            getInstructionsLang.mockReturnValueOnce('en-GB');

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices,
                        minChoices: 1,
                        maxChoices: 3
                    }
                }
            });
            expect(container).toMatchSnapshot();
            expect(getInstructionsLang).toHaveBeenCalled();
            expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toEqual('en-GB');
        });
    });

    // BEHAVIOUR

    describe('Behaviour', () => {
        it('can select and deselect a choice by click', () => {
            expect.assertions(5);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(0, container);

            const shape1 = getShapeByDataKey('hotspot_1', container);

            return fireEvent
                .click(shape1)
                .then(() => {
                    expectNumberOfSelectedShapes(1, container);
                    expect(shape1).toHaveClass('selected');
                    return fireEvent.click(shape1);
                })
                .then(() => {
                    expectNumberOfSelectedShapes(0, container);
                });
        });

        test.each(['Enter', 'Space'])('can select and deselect a choice by %s keyup', keyName => {
            expect.assertions(5);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(0, container);

            const shape1 = getShapeByDataKey('hotspot_1', container);
            shape1.focus();

            return fireEvent
                .keyUp(shape1, { key: keyName })
                .then(() => {
                    expectNumberOfSelectedShapes(1, container);
                    expect(shape1).toHaveClass('selected');
                    return fireEvent.keyUp(shape1, { key: keyName });
                })
                .then(() => {
                    expectNumberOfSelectedShapes(0, container);
                });
        });

        it('cannot select more choices than the max', () => {
            expect.assertions(6);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices,
                        minChoices: 1,
                        maxChoices: 1
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(0, container);

            const shape1 = getShapeByDataKey('hotspot_1', container);
            const shape2 = getShapeByDataKey('hotspot_4', container);

            return fireEvent
                .click(shape1)
                .then(() => {
                    expectNumberOfSelectedShapes(1, container);
                    expect(shape1).toHaveClass('selected');
                    return fireEvent.click(shape2);
                })
                .then(() => {
                    expectNumberOfSelectedShapes(1, container);
                    expect(shape1).toHaveClass('selected');
                });
        });

        it('places 1,2,3 in order', () => {
            expect.assertions(8);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(0, container);

            const shape1 = getShapeByDataKey('hotspot_1', container);
            const shape2 = getShapeByDataKey('hotspot_4', container);
            const shape3 = getShapeByDataKey('hotspot_6', container);

            return fireEvent
                .click(shape1)
                .then(() => {
                    expect(shape1).toHaveTextContent('1');
                    expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hotspot_1'] } });
                    return fireEvent.click(shape2);
                })
                .then(() => {
                    expect(shape2).toHaveTextContent('2');
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: { identifier: ['hotspot_1', 'hotspot_4'] }
                    });
                    return fireEvent.click(shape3);
                })
                .then(() => {
                    expect(shape3).toHaveTextContent('3');
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: { identifier: ['hotspot_1', 'hotspot_4', 'hotspot_6'] }
                    });
                });
        });

        it('places 1,3 if 2 already set', () => {
            expect.assertions(8);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            interactionStateStore.set({
                selected: [null, { key: 'hotspot_4' }, null]
            });
            interactionStateStore.setResponse({
                list: {
                    identifier: ['hotspot_4']
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices,
                        minChoices: 3,
                        maxChoices: 3
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(1, container);

            const shape1 = getShapeByDataKey('hotspot_1', container);
            const shape2 = getShapeByDataKey('hotspot_4', container);
            const shape3 = getShapeByDataKey('hotspot_6', container);

            expect(shape2).toHaveTextContent('2');
            expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hotspot_4'] } });

            return fireEvent
                .click(shape1)
                .then(() => {
                    expect(shape1).toHaveTextContent('1');
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: { identifier: ['hotspot_1', 'hotspot_4'] }
                    });
                    return fireEvent.click(shape3);
                })
                .then(() => {
                    expect(shape3).toHaveTextContent('3');
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: { identifier: ['hotspot_1', 'hotspot_4', 'hotspot_6'] }
                    });
                });
        });

        it('places 1,2 if 3 already set', () => {
            expect.assertions(8);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            interactionStateStore.set({
                selected: [null, null, { key: 'hotspot_6' }]
            });
            interactionStateStore.setResponse({
                list: {
                    identifier: ['hotspot_6']
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices,
                        minChoices: 3,
                        maxChoices: 3
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(1, container);

            const shape1 = getShapeByDataKey('hotspot_1', container);
            const shape2 = getShapeByDataKey('hotspot_4', container);
            const shape3 = getShapeByDataKey('hotspot_6', container);

            expect(shape3).toHaveTextContent('3');
            expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hotspot_6'] } });

            return fireEvent
                .click(shape1)
                .then(() => {
                    expect(shape1).toHaveTextContent('1');
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: { identifier: ['hotspot_1', 'hotspot_6'] }
                    });
                    return fireEvent.click(shape2);
                })
                .then(() => {
                    expect(shape2).toHaveTextContent('2');
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: { identifier: ['hotspot_1', 'hotspot_4', 'hotspot_6'] }
                    });
                });
        });

        it('can remove 1,2,3 in order', () => {
            expect.assertions(18);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            interactionStateStore.set({
                selected: [{ key: 'hotspot_4' }, { key: 'hotspot_5' }, { key: 'hotspot_6' }]
            });
            interactionStateStore.setResponse({
                list: {
                    identifier: ['hotspot_4', 'hotspot_5', 'hotspot_6']
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices,
                        minChoices: 3,
                        maxChoices: 3
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(3, container);

            const shape1 = getShapeByDataKey('hotspot_4', container);
            const shape2 = getShapeByDataKey('hotspot_5', container);
            const shape3 = getShapeByDataKey('hotspot_6', container);

            expect(shape1).toHaveTextContent('1');
            expect(shape2).toHaveTextContent('2');
            expect(shape3).toHaveTextContent('3');
            expect(shape1).toHaveClass('selected');
            expect(shape2).toHaveClass('selected');
            expect(shape3).toHaveClass('selected');

            expect(interactionStateStore.getResponse()).toEqual({
                list: { identifier: ['hotspot_4', 'hotspot_5', 'hotspot_6'] }
            });

            return fireEvent
                .click(shape1)
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: { identifier: ['hotspot_5', 'hotspot_6'] }
                    });
                    expect(shape1).not.toHaveClass('selected');
                    expectNumberOfSelectedShapes(2, container);
                    return fireEvent.click(shape2);
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hotspot_6'] } });
                    expect(shape2).not.toHaveClass('selected');
                    expectNumberOfSelectedShapes(1, container);
                    return fireEvent.click(shape3);
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: [] } });
                    expect(shape3).not.toHaveClass('selected');
                    expectNumberOfSelectedShapes(0, container);
                });
        });

        it('can remove 2, leaving 1 and 3', () => {
            expect.assertions(12);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            interactionStateStore.set({
                selected: [{ key: 'hotspot_4' }, { key: 'hotspot_5' }, { key: 'hotspot_6' }]
            });
            interactionStateStore.setResponse({
                list: {
                    identifier: ['hotspot_4', 'hotspot_5', 'hotspot_6']
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices,
                        minChoices: 3,
                        maxChoices: 3
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(3, container);

            const shape1 = getShapeByDataKey('hotspot_4', container);
            const shape2 = getShapeByDataKey('hotspot_5', container);
            const shape3 = getShapeByDataKey('hotspot_6', container);

            expect(shape1).toHaveTextContent('1');
            expect(shape2).toHaveTextContent('2');
            expect(shape3).toHaveTextContent('3');
            expect(shape1).toHaveClass('selected');
            expect(shape2).toHaveClass('selected');
            expect(shape3).toHaveClass('selected');

            expect(interactionStateStore.getResponse()).toEqual({
                list: { identifier: ['hotspot_4', 'hotspot_5', 'hotspot_6'] }
            });

            return fireEvent.click(shape2).then(() => {
                expect(interactionStateStore.getResponse()).toEqual({
                    list: { identifier: ['hotspot_4', 'hotspot_6'] }
                });
                expect(shape2).not.toHaveClass('selected');
                expectNumberOfSelectedShapes(2, container);
            });
        });

        it('can remove 3, leaving 1 and 2', () => {
            expect.assertions(12);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            interactionStateStore.set({
                selected: [{ key: 'hotspot_4' }, { key: 'hotspot_5' }, { key: 'hotspot_6' }]
            });
            interactionStateStore.setResponse({
                list: {
                    identifier: ['hotspot_4', 'hotspot_5', 'hotspot_6']
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices,
                        minChoices: 3,
                        maxChoices: 3
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(3, container);

            const shape1 = getShapeByDataKey('hotspot_4', container);
            const shape2 = getShapeByDataKey('hotspot_5', container);
            const shape3 = getShapeByDataKey('hotspot_6', container);

            expect(shape1).toHaveTextContent('1');
            expect(shape2).toHaveTextContent('2');
            expect(shape3).toHaveTextContent('3');
            expect(shape1).toHaveClass('selected');
            expect(shape2).toHaveClass('selected');
            expect(shape3).toHaveClass('selected');

            expect(interactionStateStore.getResponse()).toEqual({
                list: { identifier: ['hotspot_4', 'hotspot_5', 'hotspot_6'] }
            });

            return fireEvent.click(shape3).then(() => {
                expect(interactionStateStore.getResponse()).toEqual({
                    list: { identifier: ['hotspot_4', 'hotspot_5'] }
                });
                expect(shape3).not.toHaveClass('selected');
                expectNumberOfSelectedShapes(2, container);
            });
        });

        it('forwards focus to first choice', () =>
            new Promise(resolve => {
                expect.assertions(1);

                const { container } = render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext,
                        testComponent: GraphicOrderInteraction,
                        testComponentProps: {
                            itemIdentifier,
                            responseIdentifier,
                            imgObject,
                            choices
                        }
                    }
                });

                const wrapper = container.querySelector('.qti-block');
                const shape1 = getShapeByDataKey('hotspot_1', container);

                // we need to wait for shape to 'mount', or there will be a timing issue
                setTimeout(() => {
                    wrapper.focus();
                    expect(shape1).toHaveFocus();
                    resolve();
                }, 250);
            }));

        it('navigates choices with arrow keys', () =>
            new Promise(resolve => {
                expect.assertions(10);

                const { container } = render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext,
                        testComponent: GraphicOrderInteraction,
                        testComponentProps: {
                            itemIdentifier,
                            responseIdentifier,
                            imgObject,
                            choices
                        }
                    }
                });

                const wrapper = container.querySelector('.qti-block');
                const shapes = Array.from(container.querySelectorAll('.hotspot-choice > g'));

                // we need to wait for shapes to 'mount', or there will be a timing issue
                setTimeout(() => {
                    wrapper.focus();
                    expect(shapes[0]).toHaveFocus();
                    // wait for lastFocusedChoiceKey to be passed into arrowKeysFocusLoop
                    return tick().then(() => {
                        fireEvent.keyDown(document.activeElement, { key: 'Right' });
                        expect(shapes[1]).toHaveFocus();
                        fireEvent.keyDown(document.activeElement, { key: 'Right' });
                        expect(shapes[2]).toHaveFocus();
                        fireEvent.keyDown(document.activeElement, { key: 'Right' });
                        expect(shapes[3]).toHaveFocus();
                        fireEvent.keyDown(document.activeElement, { key: 'Right' });
                        expect(shapes[0]).toHaveFocus();
                        fireEvent.keyDown(document.activeElement, { key: 'Left' });
                        expect(shapes[3]).toHaveFocus();
                        fireEvent.keyDown(document.activeElement, { key: 'Left' });
                        expect(shapes[2]).toHaveFocus();
                        fireEvent.keyDown(document.activeElement, { key: 'Left' });
                        expect(shapes[1]).toHaveFocus();
                        fireEvent.keyDown(document.activeElement, { key: 'Left' });
                        expect(shapes[0]).toHaveFocus();
                        fireEvent.keyDown(document.activeElement, { key: 'Left' });
                        expect(shapes[3]).toHaveFocus();
                        resolve();
                    });
                }, 250);
            }));

        it('forwards focus to previously focused choice', () =>
            new Promise(resolve => {
                expect.assertions(3);

                const { container } = render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext,
                        testComponent: GraphicOrderInteraction,
                        testComponentProps: {
                            itemIdentifier,
                            responseIdentifier,
                            imgObject,
                            choices
                        }
                    }
                });

                const wrapper1 = container.querySelector('.qti-flow-container');
                const wrapper2 = container.querySelector('.qti-block');
                const shape1 = getShapeByDataKey('hotspot_1', container);
                const shape2 = getShapeByDataKey('hotspot_4', container);

                // we need to wait for shapes to 'mount', or there will be a timing issue
                setTimeout(() => {
                    wrapper2.focus();
                    expect(shape1).toHaveFocus();
                    // wait for lastFocusedChoiceKey to be passed into arrowKeysFocusLoop
                    return tick()
                        .then(() => {
                            fireEvent.keyDown(document.activeElement, { key: 'Right' });
                            expect(shape2).toHaveFocus();

                            wrapper1.focus();
                            // wait for hasFocus = false to take effect
                            return tick();
                        })
                        .then(() => {
                            wrapper2.focus();
                            expect(shape2).toHaveFocus();
                            resolve();
                        });
                }, 250);
            }));

        it('renders numeric aria labels after receiving focus after subcomponents mount', () =>
            new Promise(resolve => {
                expect.assertions(3);
                getInstructionsLang.mockImplementationOnce(() => 'nb-NO');
                const { container } = render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext,
                        testComponent: GraphicOrderInteraction,
                        testComponentProps: {
                            itemIdentifier,
                            responseIdentifier,
                            imgObject,
                            choices
                        }
                    }
                });

                const wrapper = container.querySelector('.qti-block');
                const shape1 = getShapeByDataKey('hotspot_1', container);

                setTimeout(() => {
                    wrapper.focus();
                    expect(shape1).toHaveFocus();
                    tick().then(() => {
                        const labelledByElt = container.querySelector('[data-choice-key="hotspot_1"] text.hidden');
                        expect(labelledByElt.textContent).toBe(
                            'first hotspot Unordered hotspot 1. Toggle button. Press enter or space to order to position 1. To move to next available hotspot, use the arrow keys.'
                        );
                        expect(labelledByElt.getAttribute('lang')).toBe('nb-NO');
                        resolve();
                    });
                }, 250);
            }));

        it('disable available options when maximum reached', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices,
                        minChoices: 1,
                        maxChoices: 2
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(0, container);

            const shape1 = getShapeByDataKey('hotspot_1', container);
            const shape2 = getShapeByDataKey('hotspot_4', container);
            const shape3 = getShapeByDataKey('hotspot_5', container);
            const shape4 = getShapeByDataKey('hotspot_6', container);

            const control1 = getShapeControlByDataKey('hotspot_1', container);
            const control2 = getShapeControlByDataKey('hotspot_4', container);
            const control3 = getShapeControlByDataKey('hotspot_5', container);
            const control4 = getShapeControlByDataKey('hotspot_6', container);

            return fireEvent
                .click(shape1)
                .then(() => {
                    // First option selected, [1]/2
                    expect(control1).not.toHaveClass('disabled');
                    expect(control2).not.toHaveClass('disabled');
                    expect(control3).not.toHaveClass('disabled');
                    expect(control4).not.toHaveClass('disabled');

                    expectNumberOfSelectedShapes(1, container);
                    expect(interactionStateStore.getResponseValue().length).toBe(1);
                    expect(interactionStateStore.getValidity()).toBe(true);

                    return fireEvent.click(shape2);
                })
                .then(() => {
                    // Second option selected, [1,2]/2
                    expect(control1).not.toHaveClass('disabled');
                    expect(control2).not.toHaveClass('disabled');
                    expect(control3).toHaveClass('disabled');
                    expect(control4).toHaveClass('disabled');

                    expectNumberOfSelectedShapes(2, container);
                    expect(interactionStateStore.getResponseValue().length).toBe(2);
                    expect(interactionStateStore.getValidity()).toBe(true);

                    return fireEvent.click(shape2);
                })
                .then(() => {
                    // Second option unselected, [1]/2
                    expect(control1).not.toHaveClass('disabled');
                    expect(control2).not.toHaveClass('disabled');
                    expect(control3).not.toHaveClass('disabled');
                    expect(control4).not.toHaveClass('disabled');

                    expectNumberOfSelectedShapes(1, container);
                    expect(interactionStateStore.getResponseValue().length).toBe(1);
                    expect(interactionStateStore.getValidity()).toBe(true);

                    return fireEvent.click(shape3);
                })
                .then(() => {
                    // Third option selected, [1,3]/2
                    expect(control1).not.toHaveClass('disabled');
                    expect(control2).toHaveClass('disabled');
                    expect(control3).not.toHaveClass('disabled');
                    expect(control4).toHaveClass('disabled');

                    expectNumberOfSelectedShapes(2, container);
                    expect(interactionStateStore.getResponseValue().length).toBe(2);
                    expect(interactionStateStore.getValidity()).toBe(true);

                    return fireEvent.click(shape4);
                })
                .then(() => {
                    // Attempt to select over-limit option [1,3,4]/2
                    expect(control1).not.toHaveClass('disabled');
                    expect(control2).toHaveClass('disabled');
                    expect(control3).not.toHaveClass('disabled');
                    expect(control4).toHaveClass('disabled');

                    expectNumberOfSelectedShapes(2, container);
                    expect(interactionStateStore.getResponseValue().length).toBe(2);
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });
    });

    // STORE

    describe('Store', () => {
        it('loads stored response', () => {
            expect.assertions(3);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            interactionStateStore.setResponse({
                list: {
                    identifier: ['hotspot_1']
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices
                    }
                }
            });

            const shape1 = getShapeByDataKey('hotspot_1', container);

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(1, container);
            expect(shape1).toHaveClass('selected');
        });

        it('listens store modifications', () => {
            expect.assertions(4);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            interactionStateStore.setResponse({
                list: {
                    identifier: ['hotspot_5']
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices
                    }
                }
            });

            const shape1 = getShapeByDataKey('hotspot_5', container);

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(1, container);
            expect(shape1).toHaveClass('selected');

            interactionStateStore.set({
                selected: []
            });
            interactionStateStore.setResponse({
                list: {
                    identifier: []
                }
            });

            return tick().then(() => {
                expect(container.querySelector('.hotspot-choice > g.selected')).toBe(null);
            });
        });

        it('saves valid response to store on change with constraints set', () => {
            expect.assertions(7);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices,
                        minChoices: 1,
                        maxChoices: 2
                    }
                }
            });
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(0, container);

            const shape1 = getShapeByDataKey('hotspot_1', container);

            return fireEvent.click(shape1).then(() => {
                expectNumberOfSelectedShapes(1, container);
                expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hotspot_1'] } });
                expect(interactionStateStore.getValidity()).toBe(true);
                expect(interactionStateStore.get()).toMatchObject({ qtiClass });
            });
        });

        it('saves invalid response (too few choices) to store on change', () => {
            expect.assertions(5);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices,
                        minChoices: 2,
                        maxChoices: 3
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(0, container);

            const shape1 = getShapeByDataKey('hotspot_1', container);

            return fireEvent.click(shape1).then(() => {
                expectNumberOfSelectedShapes(1, container);
                expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hotspot_1'] } });
                expect(interactionStateStore.getValidity()).toBe(false);
            });
        });

        it('requires selection of all choices if minChoices not defined', () => {
            expect.assertions(14);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices
                    }
                }
            });

            expectNumberOfShapes(4, container);
            expectNumberOfSelectedShapes(0, container);

            const shape1 = getShapeByDataKey('hotspot_1', container);
            const shape2 = getShapeByDataKey('hotspot_4', container);
            const shape3 = getShapeByDataKey('hotspot_5', container);
            const shape4 = getShapeByDataKey('hotspot_6', container);

            return fireEvent
                .click(shape1)
                .then(() => {
                    expectNumberOfSelectedShapes(1, container);
                    expect(interactionStateStore.getResponseValue().length).toBe(1);
                    expect(interactionStateStore.getValidity()).toBe(false);
                    return fireEvent.click(shape2);
                })
                .then(() => {
                    expectNumberOfSelectedShapes(2, container);
                    expect(interactionStateStore.getResponseValue().length).toBe(2);
                    expect(interactionStateStore.getValidity()).toBe(false);
                    return fireEvent.click(shape3);
                })
                .then(() => {
                    expectNumberOfSelectedShapes(3, container);
                    expect(interactionStateStore.getResponseValue().length).toBe(3);
                    expect(interactionStateStore.getValidity()).toBe(false);
                    return fireEvent.click(shape4);
                })
                .then(() => {
                    expectNumberOfSelectedShapes(4, container);
                    expect(interactionStateStore.getResponseValue().length).toBe(4);
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });
    });

    describe('Log events', () => {
        let interactionStateStore;
        const traceInteraction = vi.fn();
        let shape1;

        beforeEach(() => {
            interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicOrderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices
                    }
                }
            });

            const interaction = container.querySelector('.qti-graphicOrderInteraction');
            interaction.addEventListener('interactiontrace', traceInteraction);

            shape1 = getShapeByDataKey('hotspot_1', container);
            shape1.focus();
        });

        afterEach(() => {
            traceInteraction.mockRestore();
        });

        it('logs events on click change', () =>
            fireEvent.click(shape1).then(() => {
                const interactionResponse = interactionStateStore.getResponse();
                expect(traceInteraction).toHaveBeenCalledTimes(1);
                expect(traceInteraction.mock.calls[0][0].detail).toEqual({
                    domEventType: 'click',
                    newResponse: interactionResponse.list.identifier,
                    position: {
                        clientX: 0,
                        clientY: 0,
                        screenX: 0,
                        screenY: 0
                    },
                    qtiChoiceIdentifier: 'hotspot_1',
                    target: shape1
                });
            }));

        it('logs events on keydown change', () =>
            fireEvent.keyUp(shape1, { key: 'Enter', bubbles: true }).then(() => {
                const interactionResponse = interactionStateStore.getResponse();
                expect(traceInteraction).toHaveBeenCalledTimes(1);
                expect(traceInteraction.mock.calls[0][0].detail).toEqual({
                    domEventType: 'keyup',
                    newResponse: interactionResponse.list.identifier,
                    pressedKey: 'Enter',
                    qtiChoiceIdentifier: 'hotspot_1',
                    target: shape1
                });
            }));
    });
});
