// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import OrderInteraction from '../OrderInteraction.svelte';
import { getItemStateStore, getInteractionStateStore } from '../../../itemsStateStore.js';
import Img from '../../../static/Img.svelte';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';
import shuffleChoiceOptions from '../../util/shuffleChoices.js';

vi.mock('../../util/shuffleChoices.js', () => ({
    __esModule: true,
    default: vi.fn(options => options)
}));

const qtiClass = 'qti-orderInteraction';
const itemIdentifier = 'testItem';
const responseIdentifier = 'RESPONSE_1';
const choices = [
    { key: 'choice_1', label: 'Choice 1' },
    { key: 'choice_2', label: 'Choice 2' },
    { key: 'choice_3', label: 'Choice 3' },
    { key: 'choice_4', label: 'Choice 4' }
];
const complexChoice = {
    key: 'choice_5',
    label: '{{img_5f85d25cde4e7740100570}}\n<div>Jean Renoir - The Umbrellas</div>',
    blockTree: [
        {
            type: 'element',
            content: 'img_5f85d25cde4e7740100570',
            children: [],
            component: Img,
            props: {
                itemIdentifier: 'item-2',
                attributes: {
                    src: 'renoir-umbrellas-1886.jpg',
                    alt: "Renoir's Umbrellas",
                    width: '62%',
                    type: 'image/jpeg'
                }
            }
        },
        {
            type: 'text',
            content: '\n'
        },
        {
            type: 'html',
            content: '<div>Jean Renoir - The Umbrellas</div>'
        }
    ]
};

const prompt = [{ type: 'text', content: 'Question 1' }];

const renderWithContext = (component, { props, contextOverrides = {} }) => {
    const getInstructionsLang = contextOverrides.getInstructionsLang || vi.fn(() => 'es-ES');
    const getItemLang = contextOverrides.getItemLang || vi.fn(() => 'de-DE');
    const getTestContext =
        contextOverrides.getTestContext ||
        vi.fn(() => ({
            validateResponses: true
        }));
    const testContext = {
        getAssetManager: () => ({
            resolve: src => src
        }),
        registerLoadingElement: vi.fn(),
        getInstructionsLang,
        getItemLang,
        getTestContext
    };

    return render(ContextWrapper, {
        props: {
            testContextKey: itemIdentifier,
            testContext,
            testComponent: component,
            testComponentProps: props
        }
    });
};

describe('OrderInteraction', () => {
    beforeAll(() => {
        const originalConsoleError = console.error;
        vi.spyOn(console, 'error').mockImplementation((...args) => {
            if (args[0]?.includes('invalid response')) {
                return;
            }
            originalConsoleError(...args);
        });
    });

    afterEach(() => {
        getItemStateStore(itemIdentifier).clear();
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    describe('rendering', () => {
        it('renders correctly with no minChoices and no maxChoices', () => {
            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('renders correctly with no minChoices', () => {
            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    maxChoices: 2
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('renders correctly with no maxChoices', () => {
            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    minChoices: 2
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('renders correctly with set minChoices equal to maxChoices', () => {
            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    minChoices: 2,
                    maxChoices: 2
                }
            });
            expect(container.querySelectorAll('.answer-placeholder').length).toEqual(2);
            expect(container).toMatchSnapshot();
        });

        it('renders correctly with set minChoices and set maxChoices', () => {
            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    minChoices: 2,
                    maxChoices: 3
                }
            });
            expect(container.querySelectorAll('.answer-placeholder').length).toEqual(3);
            expect(container.querySelector('.qti-instruction-container')).toMatchSnapshot();
        });

        it('renders with correct prompt content', () => {
            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    prompt
                }
            });
            expect(container.querySelector('.qti-prompt').textContent).toEqual(prompt[0].content);
        });

        it('renders correctly the single order interaction', () => {
            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    minChoices: 0,
                    maxChoices: 0,
                    dataAttrs: {
                        'data-order': 'single'
                    }
                }
            });
            // should contain all placeholders in answers area
            expect(container.querySelectorAll('.answer-placeholder').length).toEqual(4);
            // should prefill the results area with all choices
            expect(container.querySelectorAll('.label-container').length).toEqual(4);
            // should NOT contain any remove buttons
            expect(container.querySelectorAll('.remover').length).toEqual(0);
            // should NOT contain choice feedback block
            expect(container.querySelectorAll('.qti-instruction-container').length).toEqual(0);
            // should NOT contain choice area
            expect(container.querySelectorAll('.draggable-list').length).toEqual(0);
            expect(container.querySelector('.qti-instruction-container')).toMatchSnapshot();
        });

        test.each([
            [true, void 0, void 0, true],
            [true, 1, 3, true],
            [false, void 0, void 0, false],
            [false, 0, 0, false],
            [false, 1, 3, true]
        ])(
            'renders correctly when validateResponses set to %s, minChoices %s, maxChoices %s, feedback block rendered -> %s',
            (validateResponses, minChoices, maxChoices, shoulShowFeedback) => {
                const { container } = renderWithContext(OrderInteraction, {
                    props: {
                        itemIdentifier,
                        responseIdentifier,
                        choices,
                        minChoices,
                        maxChoices
                    },
                    contextOverrides: {
                        getTestContext: vi.fn(() => ({
                            validateResponses
                        }))
                    }
                });
                // should render choice feedback block depending on conditions
                expect(container.querySelectorAll('.qti-instruction-container').length).toEqual(
                    shoulShowFeedback ? 1 : 0
                );
            }
        );

        test.each([
            ['qti-labels-decimal', 'qti-label-suffix-none', void 0, '1'],
            ['qti-labels-lower-alpha', 'qti-label-suffix-period', void 0, 'a.'],
            ['qti-labels-upper-alpha', 'qti-label-suffix-parenthesis', void 0, 'A)'],
            ['qti-labels-none', 'qti-label-suffix-parenthesis', void 0, ''],
            ['qti-labels-decimal', 'qti-label-suffix-none', 'single', '1'],
            ['qti-labels-lower-alpha', 'qti-label-suffix-period', 'single', 'a.'],
            ['qti-labels-upper-alpha', 'qti-label-suffix-parenthesis', 'single', 'A)'],
            ['qti-labels-none', 'qti-label-suffix-parenthesis', 'single', '']
        ])(
            'renders with correct label style if labelStyle is %s and suffixStyle is %s and order is %s',
            (labelType, suffixType, order, expectedValue) => {
                const { container } = render(OrderInteraction, {
                    props: {
                        itemIdentifier,
                        responseIdentifier,
                        order,
                        choices,
                        minChoices: 2,
                        maxChoices: 2,
                        classes: [labelType, suffixType].join(' ')
                    }
                });

                expect(container.querySelector('.item-bullet').textContent).toEqual(expectedValue);
            }
        );

        it('renders correctly with a complex choice', () => {
            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices: [choices[0], complexChoice]
                }
            });
            expect(container.querySelector('.draggable-list')).toMatchSnapshot();
        });

        it('renders correctly with a complex answer', () => {
            const exampleItemState = {
                RESPONSE_1: { response: { list: { identifier: ['choice_5'] } } }
            };
            const itemStateStore = getItemStateStore(itemIdentifier);

            itemStateStore.set(exampleItemState);

            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices: [choices[0], complexChoice]
                }
            });
            expect(container.querySelector('.sortable-list')).toMatchSnapshot();
        });

        it('renders the instruction lang on the feedback block', () => {
            const getInstructionsLang = vi.fn(() => 'es-ES');

            const { container } = renderWithContext(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    minChoices: 1,
                    maxChoices: 2
                },
                contextOverrides: {
                    getInstructionsLang
                }
            });
            expect(container).toMatchSnapshot();
            expect(getInstructionsLang).toHaveBeenCalled();
            expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toEqual('es-ES');
        });
    });

    describe('state management', () => {
        test.each([
            ['no minChoices, no maxChoices', void 0, void 0],
            ['minChoices set, no maxChoices', 1, void 0],
            ['no minChoices, maxChoices set', void 0, 1],
            ['minChoices set, maxChoices set', 1, 4]
        ])('saves correct initial response: %s, and valitadeResponses set to true', (descr, minChoices, maxChoices) => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            render(OrderInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, minChoices, maxChoices }
            });

            expect(interactionStateStore.getResponse()).toMatchObject({ list: { identifier: [] } });
            expect(interactionStateStore.getValidity()).toBe(false);
        });

        it('loads & saves interaction state from the ItemStateStore', () => {
            const exampleItemState = {
                RESPONSE_1: { response: { list: { identifier: ['choice_1', 'choice_2'] } } }
            };
            const itemStateStore = getItemStateStore(itemIdentifier);

            itemStateStore.set(exampleItemState);

            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    minChoices: 3,
                    maxChoices: 3
                }
            });
            expect(container).toMatchSnapshot();
            const choiceElement = container.querySelector('[data-drag-drop-key="choice_4"] > .item-btn');
            choiceElement.click();
            return tick()
                .then(() => {
                    const answerSlotElement = container.querySelector('[data-drag-drop-key="2"] > .answer-placeholder');
                    answerSlotElement.click();
                    return tick();
                })
                .then(() => {
                    expect(itemStateStore.getInteractionResponse(responseIdentifier)).toMatchObject({
                        list: { identifier: ['choice_1', 'choice_2', 'choice_4'] }
                    });
                    expect(itemStateStore.getInteractionValidity(responseIdentifier)).toBe(true);
                });
        });

        it('saves invalid interaction state when minChoices not reached', () => {
            const exampleItemState = {
                RESPONSE_1: { response: { list: { identifier: ['choice_1', 'choice_2'] } } }
            };
            const itemStateStore = getItemStateStore(itemIdentifier);
            itemStateStore.set(exampleItemState);

            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    minChoices: 4,
                    maxChoices: 4
                }
            });
            expect(container).toMatchSnapshot();

            // change selected via DOM, triggering saveResponse
            const choiceElement = container.querySelector('[data-drag-drop-key="choice_4"] > .item-btn');
            choiceElement.click();
            return tick()
                .then(() => {
                    const answerSlotElement = container.querySelector('[data-drag-drop-key="2"] > .answer-placeholder');
                    answerSlotElement.click();
                    return tick();
                })
                .then(() => {
                    expect(itemStateStore.getInteractionResponse(responseIdentifier)).toMatchObject({
                        list: { identifier: ['choice_1', 'choice_2', 'choice_4'] }
                    });
                    expect(itemStateStore.getInteractionValidity(responseIdentifier)).toBe(false);
                });
        });

        it('loads & saves intermediate states of answers and choices', () => {
            const exampleItemState = {
                RESPONSE_1: {
                    response: { list: { identifier: ['choice_1', 'choice_2'] } },
                    selectedKeysGaps: ['choice_1', null, null, 'choice_2'],
                    choiceKeys: ['choice_4', 'choice_3', 'choice_2', 'choice_1']
                }
            };
            const itemStateStore = getItemStateStore(itemIdentifier);
            itemStateStore.set(exampleItemState);

            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    minChoices: 0,
                    maxChoices: 0
                }
            });
            return tick()
                .then(() => {
                    expect(container).toMatchSnapshot();
                    const choiceElement = container.querySelector('[data-drag-drop-key="choice_4"] > .item-btn');
                    choiceElement.click();
                    return tick();
                })
                .then(() => {
                    const answerSlotElement = container.querySelector('[data-drag-drop-key="2"] > .answer-placeholder');
                    answerSlotElement.click();
                    return tick();
                })
                .then(() => {
                    expect(itemStateStore.get()).toMatchObject({
                        RESPONSE_1: {
                            response: { list: { identifier: ['choice_1', 'choice_4', 'choice_2'] } },
                            selectedKeysGaps: ['choice_1', null, 'choice_4', 'choice_2'],
                            choiceKeys: ['choice_3', 'choice_4', 'choice_2', 'choice_1']
                        }
                    });
                });
        });

        it('qtiClass is saved in itemState', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });

            const choiceElement = container.querySelector('[data-drag-drop-key="choice_4"] > .item-btn');
            choiceElement.click();
            return tick()
                .then(() => {
                    const answerSlotElement = container.querySelector('[data-drag-drop-key="2"] > .answer-placeholder');
                    answerSlotElement.click();
                    return tick();
                })
                .then(() => {
                    expect(interactionStateStore.get()).toMatchObject({ qtiClass });
                    expect(interactionStateStore.getResponse()).toMatchObject({
                        list: { identifier: ['choice_4'] }
                    });
                });
        });
    });

    describe('operation', () => {
        describe('drag and drop', () => {
            it('adds targetable class to sortableList answer placeholders', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });
                const draggableKey = choices[0].key;
                const choiceElement = container.querySelector(`[data-drag-drop-key="${draggableKey}"]`);
                choiceElement.dispatchEvent(
                    new CustomEvent('dragStart', { detail: { draggableKey, dropAreaKey: 'tao-dropArea-123' } })
                );
                return tick().then(() => {
                    expect(container.querySelector('.answer-placeholder').classList).toContain('empty-targetable');
                    expect(container).toMatchSnapshot();
                });
            });

            it('adds targetable class to choice list on answer drag start', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });
                const draggableKey = choices[0].key;
                const choiceElement = container.querySelector(
                    `.draggable-list [data-drag-drop-key="${draggableKey}"] .item-btn`
                );
                const answerSlotElement = container.querySelector(`.sortable-list .answer-placeholder`);
                fireEvent.click(choiceElement);
                return tick()
                    .then(() => {
                        fireEvent.click(answerSlotElement);
                        return tick();
                    })
                    .then(() => {
                        //now choice is placed in answers
                        const answerElement = container.querySelector(
                            `.sortable-list [data-drag-drop-key="${draggableKey}"]`
                        );
                        answerElement.dispatchEvent(
                            new CustomEvent('dragStart', { detail: { draggableKey, dropAreaKey: '0' } })
                        );
                        return tick();
                    })
                    .then(() => {
                        expect(container.querySelector('.height-keeper').classList).toContain('targetable');
                        expect(container).toMatchSnapshot();
                    });
            });

            it('adds targeted class to choice list on answer drag over', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });
                const draggableKey = choices[0].key;
                return tick()
                    .then(() => {
                        const draggableListElement = container.querySelector('[data-drag-drop-key="tao-dropArea-123"]');
                        draggableListElement.dispatchEvent(
                            new CustomEvent('over', { detail: { draggableKey, dropAreaKey: 'tao-dropArea-123' } })
                        );
                        return tick();
                    })
                    .then(() => {
                        expect(container.querySelector('.height-keeper').classList).toContain('targeted');

                        const draggableListElement = container.querySelector('[data-drag-drop-key="tao-dropArea-123"]');
                        draggableListElement.dispatchEvent(
                            new CustomEvent('out', { detail: { draggableKey, dropAreaKey: 'tao-dropArea-123' } })
                        );
                        return tick();
                    })
                    .then(() => {
                        expect(container.querySelector('.height-keeper').classList).not.toContain('targeted');
                    });
            });

            it('adds answer on drop to answer list', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });
                const draggableKey = choices[0].key;
                const answerSlot = container.querySelector(`[data-drag-drop-key="1"]`);
                answerSlot.dispatchEvent(new CustomEvent('over', { detail: { draggableKey, dropAreaKey: '1' } }));
                answerSlot.dispatchEvent(new CustomEvent('update', { detail: { dropAreaKey: '1', draggableKey } }));
                return tick().then(() => {
                    expect(container.querySelector('.answer-placeholder').classList).not.toContain('empty-targetable');
                    expect(
                        container.querySelector(`.draggable-list li.removed [data-drag-drop-key="${draggableKey}"]`)
                    ).toBeTruthy();
                    expect(answerSlot.querySelector('.item-btn')).toBeTruthy();
                });
            });

            it('removes answer on drop to choice list and puts it below other choices', () => {
                const removedKey = choices[1].key;
                const restoreKey = choices[2].key;
                const itemStateStore = getItemStateStore(itemIdentifier);
                itemStateStore.set({
                    RESPONSE_1: { response: { list: { identifier: [restoreKey, removedKey] } } } //place two choices to answer area
                });
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });

                return tick()
                    .then(() => {
                        const allElements = Array.from(container.querySelectorAll('.draggable-list .item-btn'));
                        const restoreElement = container.querySelector(
                            `.draggable-list li.removed [data-drag-drop-key="${restoreKey}"] .item-btn`
                        );
                        const removedElement = container.querySelector(
                            `.draggable-list li.removed [data-drag-drop-key="${removedKey}"] .item-btn`
                        );
                        expect(allElements.indexOf(removedElement)).toBe(2);
                        expect(allElements.indexOf(restoreElement)).toBe(3);

                        expect(
                            container.querySelector(`.answer-placeholder [data-drag-drop-key="${restoreKey}"]`)
                        ).toBeTruthy();

                        const choiceArea = container.querySelector(`[data-drag-drop-key="tao-dropArea-123"]`);
                        choiceArea.dispatchEvent(
                            new CustomEvent('over', {
                                detail: { draggableKey: restoreKey, dropAreaKey: 'tao-dropArea-123' }
                            })
                        );
                        choiceArea.dispatchEvent(
                            new CustomEvent('update', {
                                detail: { dropAreaKey: 'tao-dropArea-123', draggableKey: restoreKey }
                            })
                        );
                        return tick();
                    })
                    .then(() => {
                        const allElements2 = Array.from(container.querySelectorAll('.draggable-list .item-btn'));
                        const restoreElement2 = container.querySelector(
                            `.draggable-list li:not(.removed) [data-drag-drop-key="${restoreKey}"] .item-btn`
                        );
                        const removedElement2 = container.querySelector(
                            `.draggable-list li.removed [data-drag-drop-key="${removedKey}"] .item-btn`
                        );
                        expect(allElements2.indexOf(restoreElement2)).toBe(2);
                        expect(allElements2.indexOf(removedElement2)).toBe(3);

                        expect(
                            container.querySelector(`.answer-placeholder [data-drag-drop-key="${restoreKey}"]`)
                        ).toBeFalsy();

                        expect(container.querySelector('.height-keeper').classList).not.toContain('targeted');
                        expect(container.querySelector('.height-keeper').classList).not.toContain('targetable');
                    });
            });
        });

        describe('keyboard operation', () => {
            it('adds item to sortable list in suggested state', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });
                const draggableKey = choices[0].key;
                const choiceElement = container.querySelector(`[data-drag-drop-key="${draggableKey}"] .item-btn`);
                choiceElement.focus();
                fireEvent.keyUp(choiceElement, { keyCode: 13 }); //enter
                return tick().then(() => {
                    expect(
                        container
                            .querySelector('.sortable-list  .item-btn-container')
                            .querySelector(`[data-drag-drop-key="${draggableKey}"]`)
                    ).toBeTruthy();
                    expect(container.querySelector(`.sortable-list .item-btn-container`).classList).toContain(
                        'selected'
                    );
                    expect(container).toMatchSnapshot();
                });
            });

            it('cancels suggested item on escape', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });
                const draggableKey = choices[0].key;
                const choiceElement = container.querySelector(`[data-drag-drop-key="${draggableKey}"] .item-btn`);
                choiceElement.focus();
                fireEvent.keyUp(choiceElement, { keyCode: 13 }); //enter
                return tick().then(() => {
                    const sortableListElement = container.querySelector(
                        `.sortable-list [data-drag-drop-key="${draggableKey}"]`
                    );
                    expect(sortableListElement).toBeTruthy();
                    fireEvent.keyDown(sortableListElement, { keyCode: 27 }); //esc
                    return tick().then(() => {
                        expect(
                            container.querySelector(`.sortable-list [data-drag-drop-key="${draggableKey}"]`)
                        ).toBeFalsy();
                        expect(container).toMatchSnapshot();
                    });
                });
            });

            it('places suggested item on window click', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });
                const draggableKey = choices[0].key;
                const choiceElement = container.querySelector(`[data-drag-drop-key="${draggableKey}"] .item-btn`);
                choiceElement.focus();
                fireEvent.keyUp(choiceElement, { keyCode: 13 });
                return tick().then(() => {
                    expect(
                        container.querySelector(`.sortable-list .selected [data-drag-drop-key="${draggableKey}"]`)
                    ).toBeTruthy();
                    fireEvent.click(window);
                    return tick().then(() => {
                        expect(
                            container.querySelector(`.sortable-list .selected [data-drag-drop-key="${draggableKey}"]`)
                        ).toBeFalsy();
                        expect(
                            container.querySelector(`.sortable-list [data-drag-drop-key="${draggableKey}"]`)
                        ).toBeTruthy();
                        expect(container).toMatchSnapshot();
                    });
                });
            });

            it('places suggested item on tab', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });
                const draggableKey = choices[0].key;
                const choiceElement = container.querySelector(`[data-drag-drop-key="${draggableKey}"] .item-btn`);
                choiceElement.focus();
                fireEvent.keyUp(choiceElement, { keyCode: 13 });
                return tick().then(() => {
                    const sortableListElement = container.querySelector(
                        `.sortable-list .selected [data-drag-drop-key="${draggableKey}"]`
                    );
                    expect(sortableListElement).toBeTruthy();
                    fireEvent.keyDown(sortableListElement, { keyCode: 9 }); //tab
                    return tick().then(() => {
                        expect(
                            container.querySelector(`.sortable-list .selected [data-drag-drop-key="${draggableKey}"]`)
                        ).toBeFalsy();
                        expect(
                            container.querySelector(`.sortable-list [data-drag-drop-key="${draggableKey}"]`)
                        ).toBeTruthy();
                        expect(container).toMatchSnapshot();
                    });
                });
            });

            it('choice list is a single tabstop', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });
                const button = document.createElement('button');
                const choiceElements = Array.from(container.querySelectorAll(`.draggable-list .item-btn`));
                expect(choiceElements[0].getAttribute('tabindex')).toBe('0');
                expect(choiceElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(
                    choiceElements.length - 1
                );
                choiceElements[0].focus();

                return tick()
                    .then(() => {
                        expect(choiceElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(
                            choiceElements.length
                        );

                        document.body.appendChild(button);
                        button.focus();

                        return tick();
                    })
                    .then(() => {
                        button.remove();
                        expect(choiceElements[0].getAttribute('tabindex')).toBe('0');
                        expect(choiceElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(
                            choiceElements.length - 1
                        );
                    });
            });
        });

        describe('mouse click operation', () => {
            it('removes item on remove btn click and puts it below other choices', async () => {
                const removedKey = choices[1].key;
                const restoreKey = choices[2].key;
                const itemStateStore = getItemStateStore(itemIdentifier);
                itemStateStore.set({
                    RESPONSE_1: { response: { list: { identifier: [restoreKey, removedKey] } } } //place two choices to answer area
                });
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });

                return tick()
                    .then(() => {
                        const allElements = Array.from(container.querySelectorAll('.draggable-list .item-btn'));
                        const restoreElement = container.querySelector(
                            `.draggable-list li.removed [data-drag-drop-key="${restoreKey}"] .item-btn`
                        );
                        const removedElement = container.querySelector(
                            `.draggable-list li.removed [data-drag-drop-key="${removedKey}"] .item-btn`
                        );
                        expect(allElements.indexOf(removedElement)).toBe(2);
                        expect(allElements.indexOf(restoreElement)).toBe(3);

                        expect(
                            container.querySelector(`.answer-placeholder [data-drag-drop-key="${restoreKey}"]`)
                        ).toBeTruthy();

                        fireEvent.click(
                            container.querySelector(`.sortable-list [data-drag-drop-key="${restoreKey}"] .remover`)
                        );
                        return tick();
                    })
                    .then(() => {
                        const allElements2 = Array.from(container.querySelectorAll('.draggable-list .item-btn'));
                        const restoreElement2 = container.querySelector(
                            `.draggable-list li:not(.removed) [data-drag-drop-key="${restoreKey}"] .item-btn`
                        );
                        const removedElement2 = container.querySelector(
                            `.draggable-list li.removed [data-drag-drop-key="${removedKey}"] .item-btn`
                        );
                        expect(allElements2.indexOf(restoreElement2)).toBe(2);
                        expect(allElements2.indexOf(removedElement2)).toBe(3);

                        expect(
                            container.querySelector(`.answer-placeholder [data-drag-drop-key="${restoreKey}"]`)
                        ).toBeFalsy();
                    });
            });

            it('does not refocus item on removing it by mouse click', async () => {
                const removedKey = choices[1].key;
                const restoreKey = choices[2].key;
                const itemStateStore = getItemStateStore(itemIdentifier);
                itemStateStore.set({
                    RESPONSE_1: { response: { list: { identifier: [restoreKey, removedKey] } } } //place two choices to answer area
                });
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });
                await tick();

                fireEvent.click(
                    container.querySelector(`.sortable-list [data-drag-drop-key="${restoreKey}"] .remover`)
                );
                await tick();

                expect(
                    container.querySelector(`.draggable-list [data-drag-drop-key="${restoreKey}"] .item-btn`)
                ).not.toHaveFocus();
            });

            it('refocus item on removing it by keyboard enter click', async () => {
                const removedKey = choices[1].key;
                const restoreKey = choices[2].key;
                const itemStateStore = getItemStateStore(itemIdentifier);
                itemStateStore.set({
                    RESPONSE_1: { response: { list: { identifier: [restoreKey, removedKey] } } } // place two choices to answer area
                });
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 3 }
                });
                await tick();

                fireEvent.keyUp(
                    container.querySelector(`.sortable-list [data-drag-drop-key="${restoreKey}"] .remover`),
                    { key: 'Enter' }
                );
                await tick();

                expect(
                    container.querySelector(`.draggable-list [data-drag-drop-key="${restoreKey}"] .item-btn`)
                ).toHaveFocus();
            });

            it('selects choice and places it to empty answer slot', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 0 }
                });
                const draggableKey1 = choices[0].key;
                const choice1Btn = Array.from(container.querySelectorAll('.item-btn'))[0];
                const answer2Slot = Array.from(container.querySelectorAll('.sortable-list .answer-placeholder'))[2];

                fireEvent.click(choice1Btn);
                return tick()
                    .then(() => {
                        expect(container).toMatchSnapshot();
                        expect(
                            container.querySelector(
                                `.draggable-list li:not(.removed) [data-drag-drop-key="${draggableKey1}"]`
                            )
                        ).toBeTruthy();
                        expect(
                            container.querySelector(`.sortable-list [data-drag-drop-key="${draggableKey1}"] .item-btn`)
                        ).toBeFalsy();

                        fireEvent.click(answer2Slot);
                        return tick();
                    })
                    .then(() => {
                        expect(container).toMatchSnapshot();
                        expect(
                            container.querySelector(
                                `.draggable-list li.removed [data-drag-drop-key="${draggableKey1}"]`
                            )
                        ).toBeTruthy();
                        expect(
                            answer2Slot.querySelector(`[data-drag-drop-key="${draggableKey1}"] .item-btn`)
                        ).toBeTruthy();
                    });
            });

            it('does not swap choice with existing answer', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 0 }
                });
                const draggableKey2 = choices[1].key;
                const choice1Btn = Array.from(container.querySelectorAll('.item-btn'))[0];
                const choice2Btn = Array.from(container.querySelectorAll('.item-btn'))[1];
                const answer2Slot = Array.from(container.querySelectorAll('.sortable-list .answer-placeholder'))[2];

                fireEvent.click(choice1Btn);
                return tick()
                    .then(() => {
                        fireEvent.click(answer2Slot);
                        return tick();
                    })
                    .then(() => {
                        //now choice 1 is placed in answer slot 2
                        fireEvent.click(choice2Btn);
                        return tick();
                    })
                    .then(() => {
                        fireEvent.click(answer2Slot.querySelector('.item-btn'));
                        return tick();
                    })
                    .then(() => {
                        expect(
                            container.querySelector(
                                `.draggable-list li:not(.removed) [data-drag-drop-key="${draggableKey2}"]`
                            )
                        ).toBeTruthy();
                        expect(
                            container.querySelector(`.sortable-list [data-drag-drop-key="${draggableKey2}"] .item-btn`)
                        ).toBeFalsy();
                    });
            });

            it('does not swap answer with choice', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices, maxChoices: 0 }
                });
                const draggableKey1 = choices[0].key;
                const draggableKey2 = choices[1].key;
                const choice1Btn = Array.from(container.querySelectorAll('.item-btn'))[0];
                const choice2Btn = Array.from(container.querySelectorAll('.item-btn'))[1];
                const answer2Slot = Array.from(container.querySelectorAll('.sortable-list .answer-placeholder'))[2];

                fireEvent.click(choice1Btn);
                return tick()
                    .then(() => {
                        fireEvent.click(answer2Slot);
                        return tick();
                    })
                    .then(() => {
                        //now choice 1 is placed in answer slot 2
                        fireEvent.click(
                            container.querySelector(`.sortable-list [data-drag-drop-key="${draggableKey1}"] .item-btn`)
                        );
                        return tick();
                    })
                    .then(() => {
                        expect(
                            container.querySelector(
                                `.draggable-list .item-btn-container:not(.selected) [data-drag-drop-key="${draggableKey2}"]`
                            )
                        ).toBeTruthy();
                        fireEvent.click(choice2Btn);
                        return tick();
                    })
                    .then(() => {
                        expect(
                            container.querySelector(
                                `.draggable-list .item-btn-container.selected [data-drag-drop-key="${draggableKey2}"]`
                            )
                        ).toBeTruthy();
                        expect(
                            answer2Slot.querySelector(`[data-drag-drop-key="${draggableKey1}"] .item-btn`)
                        ).toBeTruthy();
                    });
            });
        });

        describe('trigger event operation', () => {
            it('logs event on drag', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices }
                });

                const interaction = container.querySelector('.qti-interaction');
                const dispatchTraceInteraction = vi.fn();
                interaction.addEventListener('interactiontrace', dispatchTraceInteraction);

                const draggableKey = choices[0].key;
                const choiceElement = container.querySelector(`[data-drag-drop-key="${draggableKey}"]`);
                choiceElement.dispatchEvent(
                    new CustomEvent('dragStart', { detail: { draggableKey, dropAreaKey: 'tao-dropArea-123' } })
                );

                return tick().then(() => {
                    expect(dispatchTraceInteraction).toHaveBeenCalled();
                    expect(dispatchTraceInteraction.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'dragstart',
                        qtiChoiceIdentifier: 'choice_1',
                        target: null,
                        area: 'choices'
                    });
                });
            });

            it('logs event on drop', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices }
                });

                const interaction = container.querySelector('.qti-interaction');
                const dispatchTraceInteraction = vi.fn();
                interaction.addEventListener('interactiontrace', dispatchTraceInteraction);

                const draggableKey = choices[0].key;
                const choiceElement = container.querySelector(`[data-drag-drop-key="${draggableKey}"]`);
                choiceElement.dispatchEvent(new CustomEvent('dragStop', { detail: { draggableKey } }));

                return tick().then(() => {
                    expect(dispatchTraceInteraction).toHaveBeenCalled();
                    expect(dispatchTraceInteraction.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'dragend',
                        qtiChoiceIdentifier: 'choice_1',
                        target: null
                    });
                });
            });

            it('logs event on click', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices }
                });

                const interaction = container.querySelector('.qti-interaction');
                const dispatchTraceInteraction = vi.fn();
                interaction.addEventListener('interactiontrace', dispatchTraceInteraction);

                const draggableKey = choices[0].key;
                const choiceElement = container.querySelector(`[data-drag-drop-key="${draggableKey}"] .item-btn`);
                choiceElement.dispatchEvent(
                    new CustomEvent('click', { detail: { draggableKey, dropAreaKey: 'tao-dropArea-123' } })
                );

                return tick().then(() => {
                    expect(container.querySelector(`.item-btn-container`).classList).toContain('selected');
                    expect(dispatchTraceInteraction).toHaveBeenCalled();
                    expect(dispatchTraceInteraction.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'click',
                        qtiChoiceIdentifier: 'choice_1',
                        target: choiceElement
                    });
                });
            });

            it('logs event on keyselect', () => {
                const { container } = render(OrderInteraction, {
                    props: { itemIdentifier, responseIdentifier, choices }
                });

                const interaction = container.querySelector('.qti-interaction');
                const dispatchTraceInteraction = vi.fn();
                interaction.addEventListener('interactiontrace', dispatchTraceInteraction);

                const draggableKey = choices[0].key;
                const choiceElement = container.querySelector(`[data-drag-drop-key="${draggableKey}"] .item-btn`);

                choiceElement.focus();
                fireEvent.keyUp(choiceElement, {
                    keyCode: 13,
                    detail: { draggableKey, dropAreaKey: 'tao-dropArea-123' }
                });

                return tick().then(() => {
                    expect(dispatchTraceInteraction).toHaveBeenCalled();
                    expect(dispatchTraceInteraction.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'keyup',
                        qtiChoiceIdentifier: 'choice_1',
                        target: choiceElement
                    });
                });
            });
        });
    });

    describe('shuffling', () => {
        afterEach(() => {
            shuffleChoiceOptions.mockReset();
        });

        it('should call shuffling method, if shuffle prop is true', () => {
            // Run
            render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    shuffle: true
                }
            });

            // Check
            expect(shuffleChoiceOptions).toHaveBeenCalled();
        });
        it('should not call shuffling method, if shuffle prop is false', () => {
            // Run
            render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    shuffle: false
                }
            });

            // Check
            expect(shuffleChoiceOptions).not.toHaveBeenCalled();
        });
    });

    describe('undefined case', () => {
        it('should not crash with undefined choice', () => {
            const exampleItemState = {
                RESPONSE_1: {
                    response: { list: { identifier: ['choice_1', 'choice_2'] } },
                    selectedKeysGaps: ['choice_1', null, 'undefined', 'choice_2'],
                    choiceKeys: ['choice_4', 'choice_3', 'choice_2', 'choice_1']
                }
            };
            const itemStateStore = getItemStateStore(itemIdentifier);
            itemStateStore.set(exampleItemState);

            render(OrderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });
            return tick().then(() => {
                expect(itemStateStore.get()).toMatchObject({
                    RESPONSE_1: {
                        response: { list: { identifier: ['choice_1', 'choice_2'] } },
                        selectedKeysGaps: ['choice_1', null, null, 'choice_2'],
                        choiceKeys: ['choice_4', 'choice_3', 'choice_2', 'choice_1']
                    }
                });
            });
        });
    });
});
