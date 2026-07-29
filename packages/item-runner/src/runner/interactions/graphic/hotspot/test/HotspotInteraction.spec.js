// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// mock the scaling util
vi.mock('../../util/scaling.js', async () => {
    // Extend the unmocked module with only the desired mocks
    const originalModule = await vi.importActual('../../util/scaling.js');
    return Object.assign(
        {
            __esModule: true
        },
        originalModule,
        {
            calculateScalingFactor: () => 1
        }
    );
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
import HotspotInteraction from '../HotspotInteraction.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../../itemsStateStore.js';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../../../itemsSessionStatusStore.js';
import ContextWrapper from '../../../../static/test/ContextWrapper.svelte';

describe('HotspotInteraction', () => {
    const qtiClass = 'qti-hotspotInteraction';
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

    const testImgObject = {
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

    // RENDERING

    describe('Rendering', () => {
        it('renders prompt', () => {
            const itemIdentifier = 'foo';
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier: 'foo',
                        prompt: [
                            {
                                type: 'text',
                                content: 'Select hotspots'
                            }
                        ],
                        imgObject: testImgObject,
                        choices: []
                    }
                }
            });

            expect(container.querySelector('.qti-prompt')).toBeInTheDocument();
            expect(container.querySelector('.qti-prompt')).toHaveTextContent('Select hotspots');
        });

        it('renders simple props into markup', () => {
            const itemIdentifier = 'foo';
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
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
                        imgObject: testImgObject,
                        choices: []
                    }
                }
            });

            expect(container).toMatchSnapshot();
        });

        it('registers loading image', () => {
            const itemIdentifier = 'foo';
            render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier: 'foo',
                        imgObject: testImgObject,
                        choices
                    }
                }
            });

            expect(registerLoadingElement).toHaveBeenCalled();
        });

        it('renders image & choices', () => {
            const itemIdentifier = 'foo';
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier: 'foo',
                        imgObject: testImgObject,
                        choices
                    }
                }
            });

            expect(container).toMatchSnapshot();
        });

        it('renders with qti-unselected-hidden class', () => {
            const itemIdentifier = 'foo';
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier: 'foo',
                        classes: 'qti-unselected-hidden',
                        imgObject: testImgObject,
                        choices: []
                    }
                }
            });

            expect(container.querySelector('.qti-hotspotInteraction')).toHaveClass('qti-unselected-hidden');
        });

        it('renders correct feedbacks', () => {
            const itemIdentifier = 'iabcd1';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            interactionStateStore.setResponse({
                list: {
                    identifier: ['hotspot_1', 'hotspot_6']
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        minChoices: 1,
                        maxChoices: 3
                    }
                }
            });

            expect(container.querySelector('.qti-instruction-container')).toMatchSnapshot();
        });

        it('is disabled in closed session', () => {
            const itemIdentifier = 'iabcd2';
            const responseIdentifier = 'RESPONSE_123';
            const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);

            itemSessionStatusStore.set('closed');

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices
                    }
                }
            });

            expect(container.querySelector('.qti-hotspotInteraction').getAttribute('aria-disabled')).toBe('true');
        });

        it('cannot render without image definition', () => {
            expect(() => {
                render(HotspotInteraction, {
                    props: {
                        itemIdentifier: 'foo',
                        imgObject: void 0
                    }
                });
            }).toThrowError();
        });

        it('renders the instruction lang', () => {
            const itemIdentifier = 'iabcde0';
            const responseIdentifier = 'RESPONSE_1';
            getInstructionsLang.mockReturnValue('pt-br');

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        minChoices: 1,
                        maxChoices: 3
                    }
                }
            });
            expect(container).toMatchSnapshot();
            expect(getInstructionsLang).toHaveBeenCalled();
            expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toEqual('pt-br');
            expect(container.querySelector('.hotspot-choice text').getAttribute('lang')).toEqual('pt-br');
        });
    });

    // BEHAVIOUR

    describe('Behaviour', () => {
        it('can select and deselect a choice by click', () => {
            const itemIdentifier = 'iabcd';
            const responseIdentifier = 'RESPONSE_123';

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices
                    }
                }
            });

            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(0);

            const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');

            return fireEvent
                .click(shape1)
                .then(() => {
                    expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(1);
                    expect(shape1).toHaveClass('selected');
                    return fireEvent.click(shape1);
                })
                .then(() => {
                    expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(0);
                });
        });

        test.each(['Enter', 'Space'])('can select and deselect a choice by %s keyup', keyName => {
            const itemIdentifier = 'iabcd';
            const responseIdentifier = 'RESPONSE_123';

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices
                    }
                }
            });

            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(0);

            const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');
            shape1.focus();

            return fireEvent
                .keyUp(shape1, { key: keyName })
                .then(() => {
                    expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(1);
                    expect(shape1).toHaveClass('selected');
                    return fireEvent.keyUp(shape1, { key: keyName });
                })
                .then(() => {
                    expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(0);
                });
        });

        it('cannot select more choices than the max when maxChoices = 1', () => {
            const itemIdentifier = 'iabcd';
            const responseIdentifier = 'RESPONSE_123';

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        maxChoices: 1
                    }
                }
            });

            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(0);

            const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');
            const shape2 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_4"] > g');

            return fireEvent
                .click(shape1)
                .then(() => {
                    expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(1);
                    expect(shape1).toHaveClass('selected');
                    return fireEvent.click(shape2);
                })
                .then(() => {
                    expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(1);
                    expect(shape2).toHaveClass('selected');
                });
        });

        it('forwards focus to first choice', () =>
            new Promise(done => {
                expect.assertions(1);

                const itemIdentifier = 'iabcd';
                const responseIdentifier = 'RESPONSE_123';

                const { container } = render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext,
                        testComponent: HotspotInteraction,
                        testComponentProps: {
                            itemIdentifier,
                            responseIdentifier,
                            imgObject: testImgObject,
                            choices
                        }
                    }
                });

                const wrapper = container.querySelector('.qti-block');
                const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');

                // we need to wait for shape to 'mount', or there will be a timing issue
                setTimeout(() => {
                    wrapper.focus();
                    expect(shape1).toHaveFocus();
                    done();
                }, 250);
            }));

        it('navigates choices with arrow keys', () =>
            new Promise(done => {
                expect.assertions(10);

                const itemIdentifier = 'iabcd';
                const responseIdentifier = 'RESPONSE_123';

                const { container } = render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext,
                        testComponent: HotspotInteraction,
                        testComponentProps: {
                            itemIdentifier,
                            responseIdentifier,
                            imgObject: testImgObject,
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
                        done();
                    });
                }, 250);
            }));

        it('forwards focus to previously focused choice', () =>
            new Promise(done => {
                expect.assertions(3);

                const itemIdentifier = 'iabcd';
                const responseIdentifier = 'RESPONSE_123';

                const { container } = render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext,
                        testComponent: HotspotInteraction,
                        testComponentProps: {
                            itemIdentifier,
                            responseIdentifier,
                            imgObject: testImgObject,
                            choices
                        }
                    }
                });

                const wrapper1 = container.querySelector('.qti-flow-container');
                const wrapper2 = container.querySelector('.qti-block');
                const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');
                const shape2 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_4"] > g');

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
                            done();
                        });
                }, 250);
            }));

        it('renders numeric aria labels after receiving focus after subcomponents mount', () =>
            new Promise(done => {
                expect.assertions(3);

                getInstructionsLang.mockImplementationOnce(() => 'nb-NO');

                const itemIdentifier = 'iabcd';
                const responseIdentifier = 'RESPONSE_123';

                const { container } = render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext,
                        testComponent: HotspotInteraction,
                        testComponentProps: {
                            itemIdentifier,
                            responseIdentifier,
                            imgObject: testImgObject,
                            choices
                        }
                    }
                });

                const wrapper = container.querySelector('.qti-block');
                const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');

                // we need to wait for shapes to 'mount', or there will be a timing issue
                setTimeout(() => {
                    wrapper.focus();
                    expect(shape1).toHaveFocus();
                    tick().then(() => {
                        const labelledbyElt = container.querySelector('[data-choice-key="hotspot_1"] text.hidden');
                        expect(labelledbyElt.textContent).toBe(
                            'option 1 of 4 first hotspot, unselected toggle button, press enter or space to select, to move to next available option, use the arrow keys'
                        );
                        expect(labelledbyElt.getAttribute('lang')).toBe('nb-NO');
                        done();
                    });
                }, 250);
            }));
    });

    // STORE

    describe('Store', () => {
        it('loads stored response - single cardinality', () => {
            expect.assertions(3);

            const itemIdentifier = 'iabcd3';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            interactionStateStore.setResponse({
                base: {
                    identifier: 'hotspot_1'
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices
                    }
                }
            });

            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(1);
            expect(container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g')).toHaveClass('selected');
        });

        it('loads stored response - multiple cardinality', () => {
            expect.assertions(4);

            const itemIdentifier = 'iabcd3';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            interactionStateStore.setResponse({
                list: {
                    identifier: ['hotspot_4', 'hotspot_6']
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        maxChoices: 2
                    }
                }
            });

            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(2);
            expect(container.querySelector('.hotspot-choice[data-choice-key="hotspot_4"] > g')).toHaveClass('selected');
            expect(container.querySelector('.hotspot-choice[data-choice-key="hotspot_6"] > g')).toHaveClass('selected');
        });

        it('listens store modifications', () => {
            expect.assertions(4);

            const itemIdentifier = 'iabcd3';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            interactionStateStore.setResponse({
                base: {
                    identifier: 'hotspot_5'
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices
                    }
                }
            });

            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(1);
            expect(container.querySelector('.hotspot-choice[data-choice-key="hotspot_5"] > g')).toHaveClass('selected');

            interactionStateStore.setResponse({
                base: {
                    identifier: ''
                }
            });

            return tick().then(() => {
                expect(container.querySelector('.hotspot-choice > g.selected')).toBe(null);
            });
        });

        it('saves valid response to store on change with constraints set', () => {
            expect.assertions(7);

            const itemIdentifier = 'iabcd4';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        minChoices: 0,
                        maxChoices: 2
                    }
                }
            });
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });

            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(0);

            const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');

            return fireEvent.click(shape1).then(() => {
                expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(1);
                expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hotspot_1'] } });
                expect(interactionStateStore.getValidity()).toBe(true);
                expect(interactionStateStore.get()).toMatchObject({ qtiClass });
            });
        });

        it('saves valid response when max/min constraints turned off', () => {
            expect.assertions(5);

            const itemIdentifier = 'iabcd4';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        minChoices: -1,
                        maxChoices: -1
                    }
                }
            });

            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(0);

            const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');

            return fireEvent.click(shape1).then(() => {
                expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(1);
                expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hotspot_1'] } });
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        it('saves invalid response (too many choices) to store on change', () => {
            expect.assertions(5);

            const itemIdentifier = 'iabcd5';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        minChoices: 0,
                        maxChoices: 2
                    }
                }
            });

            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(0);

            const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');
            fireEvent.click(shape1);
            const shape2 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_5"] > g');
            fireEvent.click(shape2);
            const shape3 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_6"] > g');
            fireEvent.click(shape3);

            return tick().then(() => {
                expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(3);
                expect(interactionStateStore.getResponse()).toEqual({
                    list: { identifier: ['hotspot_1', 'hotspot_5', 'hotspot_6'] }
                });
                expect(interactionStateStore.getValidity()).toBe(false);
            });
        });

        it('saves invalid response (too few choices) to store on change', () => {
            expect.assertions(5);

            const itemIdentifier = 'iabcd6';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        minChoices: 2,
                        maxChoices: 2
                    }
                }
            });

            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(0);

            const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');

            return fireEvent.click(shape1).then(() => {
                expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(1);
                expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hotspot_1'] } });
                expect(interactionStateStore.getValidity()).toBe(false);
            });
        });

        it('saves single value response when maxChoices === 1', () => {
            expect.assertions(5);

            const itemIdentifier = 'iabcd4';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        minChoices: -1,
                        maxChoices: 1
                    }
                }
            });

            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(0);

            const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');

            return fireEvent.click(shape1).then(() => {
                expect(container.querySelectorAll('.hotspot-choice > g.selected').length).toBe(1);
                expect(interactionStateStore.getResponse()).toEqual({ base: { identifier: 'hotspot_1' } });
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        it('invalid constraints: maxChoices > choicesCount is the same as no maxChoices', () => {
            const itemIdentifier = 'iabcd4';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        minChoices: 1,
                        maxChoices: 10
                    }
                }
            });
            expect(interactionStateStore.getValidity()).toBe(false);

            const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');
            return fireEvent.click(shape1).then(() => {
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        it('invalid constraints: minChoices > maxChoices is the same as no constraints', () => {
            const itemIdentifier = 'iabcd4';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        minChoices: 3,
                        maxChoices: 2
                    }
                }
            });
            expect(interactionStateStore.getValidity()).toBe(true);
        });

        it('invalid constraints: minChoices > choicesCount is the same as no constraints', () => {
            const itemIdentifier = 'iabcd4';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices,
                        minChoices: 10
                    }
                }
            });
            expect(interactionStateStore.getValidity()).toBe(true);
        });
    });

    describe('Log events', () => {
        it('logs events on click change', () => {
            const itemIdentifier = 'iabcd7';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices
                    }
                }
            });

            const interaction = container.querySelector('.qti-hotspotInteraction');
            const traceInteraction = vi.fn();
            interaction.addEventListener('interactiontrace', traceInteraction);

            const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');

            return fireEvent.click(shape1).then(() => {
                const interactionResponse = interactionStateStore.getResponse();
                expect(traceInteraction).toHaveBeenCalledTimes(1);
                expect(traceInteraction.mock.calls[0][0].detail).toMatchObject({
                    domEventType: 'click',
                    newResponse: ['hotspot_1'],
                    position: {
                        clientX: 0,
                        clientY: 0,
                        screenX: 0,
                        screenY: 0
                    },
                    qtiChoiceIdentifier: interactionResponse.base.identifier,
                    target: shape1
                });
            });
        });

        it('logs events on keydown change', () => {
            const itemIdentifier = 'iabcd7';
            const responseIdentifier = 'RESPONSE_123';
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: HotspotInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject: testImgObject,
                        choices
                    }
                }
            });

            const interaction = container.querySelector('.qti-hotspotInteraction');
            const traceInteraction = vi.fn();
            interaction.addEventListener('interactiontrace', traceInteraction);

            const shape1 = container.querySelector('.hotspot-choice[data-choice-key="hotspot_1"] > g');
            shape1.focus();

            return fireEvent.keyUp(shape1, { key: 'Enter', bubbles: true }).then(() => {
                const interactionResponse = interactionStateStore.getResponse();
                expect(traceInteraction).toHaveBeenCalledTimes(1);
                expect(traceInteraction.mock.calls[0][0].detail).toMatchObject({
                    domEventType: 'keyup',
                    newResponse: ['hotspot_1'],
                    pressedKey: 'Enter',
                    qtiChoiceIdentifier: interactionResponse.base.identifier,
                    target: shape1
                });
            });
        });
    });
});
