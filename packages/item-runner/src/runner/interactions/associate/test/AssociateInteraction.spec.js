// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
vi.mock('../../util/shuffleChoices.js', () => ({
    __esModule: true,
    default: vi.fn(options => options)
}));

import { render, fireEvent } from '@testing-library/svelte';
import AssociateInteraction from '../AssociateInteraction.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';
import { tick } from 'svelte';
import shuffleChoiceOptions from '../../util/shuffleChoices.js';

const qtiClass = 'qti-associateInteraction';
const itemIdentifier = 'i12345';
const responseIdentifier = 'RESPONSE_1';
const cardinality = 'single';
const baseType = 'pair';
const choices = [
    {
        identifier: 'A',
        matchMax: 0,
        matchMin: 1,
        content: 'A'
    },
    {
        identifier: 'B',
        matchMax: 2,
        matchMin: 0,
        content: 'B',
        fixed: true
    },
    {
        identifier: 'C',
        matchMax: 1,
        matchMin: 1,
        content: 'C'
    },
    {
        identifier: 'D',
        matchMax: 0,
        matchMin: 0,
        content: 'D',
        blockTree: [{ type: 'text', content: 'Blocktree D' }]
    }
];

const dragAndDropElement = (element, dropAreaElement) => {
    const draggable = element.closest('.draggable-container[data-drag-drop-key]');
    const dropArea = dropAreaElement.closest('.drop-area[data-drag-drop-key]');
    const initialDropArea = draggable.parentElement.closest('.drop-area[data-drag-drop-key]');
    const draggableKey = draggable.getAttribute('data-drag-drop-key');
    const initialDropAreaKey = initialDropArea.getAttribute('data-drag-drop-key');
    const dropAreaKey = dropArea.getAttribute('data-drag-drop-key');

    return tick()
        .then(() => {
            draggable.dispatchEvent(
                new CustomEvent('dragStart', {
                    detail: { draggableKey, dropAreaKey: initialDropAreaKey },
                    bubbles: true
                })
            );
            return tick();
        })
        .then(() => {
            dropArea.dispatchEvent(new CustomEvent('over', { detail: { draggableKey, dropAreaKey }, bubbles: true }));
            return tick();
        })
        .then(() => {
            draggable.dispatchEvent(new CustomEvent('dragStop', { detail: { draggableKey }, bubbles: true }));
            dropArea.dispatchEvent(
                new CustomEvent('update', { detail: { dropAreaKey, draggableKey, initialDropAreaKey }, bubbles: true })
            );
            return tick();
        });
};

const selectorHelperFactory = container => ({
    get choiceArea() {
        return container.querySelector('.choices');
    },

    getChoice(choiceId) {
        return this.choiceArea.querySelector(`li:not(.removed) [data-drag-drop-key=${choiceId}] .item-btn`);
    },

    getChoiceClassesContainer(choiceId) {
        const choice = this.getChoice(choiceId);
        return choice.closest('.item-btn-container');
    },

    getChoicesDropArea() {
        return this.choiceArea.querySelector(`.draggable-list`);
    },

    get answerArea() {
        return container.querySelector('.pairs');
    },

    getPairContainer(i, n) {
        return this.answerArea.querySelector(`[data-drag-drop-key=pair_${i}_${n}]`);
    },

    getPlaceholder(i, n) {
        const pairContainer = this.getPairContainer(i, n);
        return pairContainer && pairContainer.querySelector('.pair-element-empty');
    },

    getPairItem(i, n) {
        const pairContainer = this.getPairContainer(i, n);
        return pairContainer && pairContainer.querySelector('.item-btn');
    },

    getPairItemClassesContainer(i, n) {
        const pairContainer = this.getPairContainer(i, n);
        return pairContainer && pairContainer.querySelector('.item-btn-container');
    },

    getPairItemRemoveButton(i, n) {
        return this.getPairContainer(i, n).querySelector('.remover');
    },

    getPairRemoveButton(i) {
        const pairContainer = this.getPairContainer(i, 0);
        return pairContainer && pairContainer.closest('.pair').querySelector('.remove-pair');
    }
});

describe('AssociateInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
        window.document.elementFromPoint = null;
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders with default props', () => {
            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('renders props correctly into markup', () => {
            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    role: 'someUniqueRole',
                    ariaAttrs: {
                        ariaFoo: 12,
                        ariaBar: 'baz'
                    },
                    dataAttrs: {
                        'data-foo': 'bar',
                        'data-baz': 24
                    },
                    language: 'hu',
                    id: 'interactionId',
                    classes: 'foo bar baz',
                    dir: 'rtl',
                    prompt: [{ type: 'text', content: 'Question 1' }],
                    choices
                }
            });

            expect(container).toMatchSnapshot();
        });

        it('renders maxAssociations pairs of placeholders if set', () => {
            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 3,
                    minAssociations: 2,
                    choices
                }
            });

            expect(container).toMatchSnapshot();
            expect(container.querySelectorAll('.pair').length).toEqual(3);
        });

        it('renders at least one pair of placeholders', () => {
            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    minAssociations: 0,
                    choices
                }
            });

            expect(container).toMatchSnapshot();
            expect(container.querySelectorAll('.pair').length).toEqual(1);
        });

        it('renders minAssociations pairs of placeholders if maxAssociations is 0', () => {
            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    minAssociations: 2,
                    choices
                }
            });

            expect(container).toMatchSnapshot();
            expect(container.querySelectorAll('.pair').length).toEqual(2);
        });

        it('renders placeholder pairs for all response pairs', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    minAssociations: 2,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [
                    ['D', 'C'],
                    ['A', 'B'],
                    ['C', void 0]
                ]
            });

            return tick().then(() => {
                expect(container).toMatchSnapshot();
                expect(container.querySelectorAll('.pair').length).toEqual(3);
            });
        });

        it('renders extra placeholder pair if all response pairs are complete', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    minAssociations: 2,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [
                    ['D', 'C'],
                    ['A', 'B'],
                    ['C', 'A']
                ]
            });

            return tick()
                .then(() => {
                    expect(container).toMatchSnapshot();
                    expect(container.querySelectorAll('.pair').length).toEqual(4);

                    interactionStateStore.set({
                        pairs: [['D', 'C']]
                    });
                    return tick();
                })
                .then(() => {
                    expect(container.querySelectorAll('.pair').length).toEqual(2);
                });
        });
    });

    describe('click and point', () => {
        it('adds choice to answer area', () => {
            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            const choiceA = selectorHelper.getChoice('A');
            choiceA.click();

            const placeHolder = selectorHelper.getPlaceholder(0, 0);

            return tick()
                .then(() => {
                    expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                        area: 'choices',
                        domEventType: 'click',
                        qtiChoiceIdentifier: 'A',
                        target: choiceA
                    });
                    placeHolder.click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getPairItem(0, 0)).toMatchSnapshot();

                    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
                    expect(interactionStateStore.get().pairs).toMatchObject([['A']]);
                    expect(interactionStateStore.getValidity()).toBe(false);

                    expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                        area: 'pair_0_0',
                        domEventType: 'click',
                        qtiChoiceIdentifier: 'A',
                        target: placeHolder,
                        state: [['A']]
                    });
                });
        });

        it('moves choice in answer area', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [[null, 'C']]
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            return tick()
                .then(() => {
                    const choiceC = selectorHelper.getPairItem(0, 1);
                    choiceC.click();
                    expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                        area: 'pair_0_1',
                        domEventType: 'click',
                        qtiChoiceIdentifier: 'C',
                        target: choiceC
                    });

                    const placeHolder = selectorHelper.getPlaceholder(0, 0);
                    placeHolder.click();
                    expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                        area: 'pair_0_0',
                        domEventType: 'click',
                        qtiChoiceIdentifier: 'C',
                        target: placeHolder,
                        state: [['C', void 0]]
                    });
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getPairItem(0, 0)).toMatchSnapshot();
                    expect(selectorHelper.getPairItem(0, 1)).toBe(null);

                    expect(interactionStateStore.get().pairs).toMatchObject([['C', void 0]]);
                    expect(interactionStateStore.getValidity()).toBe(false);
                });
        });

        it('swaps choice from choice area with answer', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [['D', 'C']]
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            return tick()
                .then(() => {
                    const choiceA = selectorHelper.getChoice('A');
                    choiceA.click();
                    expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                        area: 'choices',
                        domEventType: 'click',
                        qtiChoiceIdentifier: 'A',
                        target: choiceA
                    });

                    const choiceC = selectorHelper.getPairItem(0, 1);
                    choiceC.click();
                    expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                        area: 'pair_0_1',
                        domEventType: 'click',
                        qtiChoiceIdentifier: 'A',
                        target: choiceC,
                        newResponse: [['D', 'A']],
                        state: [['D', 'A']]
                    });
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getPairItem(0, 0)).toMatchSnapshot();
                    expect(selectorHelper.getPairItem(0, 1)).toMatchSnapshot();
                    expect(selectorHelper.getPairItem(1, 0)).toBe(null);

                    // choice C went back to choice area
                    expect(selectorHelper.getChoice('C')).not.toBe(null);

                    expect(interactionStateStore.get().pairs).toMatchObject([['D', 'A']]);
                    expect(interactionStateStore.getValidity()).toBe(false); //'C' matchMin not met
                });
        });

        it('swaps answer with another answer', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [['D', 'C']]
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            return tick()
                .then(() => {
                    const choiceD = selectorHelper.getPairItem(0, 0);
                    choiceD.click();
                    expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                        area: 'pair_0_0',
                        domEventType: 'click',
                        qtiChoiceIdentifier: 'D',
                        target: choiceD
                    });

                    const choiceC = selectorHelper.getPairItem(0, 1);
                    choiceC.click();
                    expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                        area: 'pair_0_1',
                        domEventType: 'click',
                        qtiChoiceIdentifier: 'D',
                        target: choiceC,
                        newResponse: [['C', 'D']],
                        state: [['C', 'D']]
                    });
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getPairItem(0, 0)).toMatchSnapshot();
                    expect(selectorHelper.getPairItem(0, 1)).toMatchSnapshot();
                    expect(selectorHelper.getPairItem(1, 0)).toBe(null);

                    expect(interactionStateStore.get().pairs).toMatchObject([['C', 'D']]);
                    expect(interactionStateStore.getValidity()).toBe(false); //'C' matchMin not met
                });
        });

        it('swaps answer with choice from choice area', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [['D', 'C']]
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            return tick()
                .then(() => {
                    const choiceC = selectorHelper.getPairItem(0, 1);
                    choiceC.click();
                    expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                        area: 'pair_0_1',
                        domEventType: 'click',
                        qtiChoiceIdentifier: 'C',
                        target: choiceC
                    });

                    const choiceA = selectorHelper.getChoice('A');
                    choiceA.click();
                    expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                        area: 'choices',
                        domEventType: 'click',
                        qtiChoiceIdentifier: 'A',
                        target: choiceA,
                        newResponse: [['D', 'A']],
                        state: [['D', 'A']]
                    });
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getPairItem(0, 0)).toMatchSnapshot();
                    expect(selectorHelper.getPairItem(0, 1)).toMatchSnapshot();
                    expect(selectorHelper.getPairItem(1, 0)).toBe(null);

                    // choice C went back to choice area
                    expect(selectorHelper.getChoice('C')).not.toBe(null);

                    expect(interactionStateStore.get().pairs).toMatchObject([['D', 'A']]);
                    expect(interactionStateStore.getValidity()).toBe(false); //'C' matchMin not met
                });
        });

        it('removes choice from answer area', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [[null, 'C']]
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            return tick().then(() => {
                // there is only one and it is in answer area
                expect(container).toMatchSnapshot();

                expect(selectorHelper.getChoice('C')).toBe(null);
                expect(selectorHelper.getPairItem(0, 1)).toMatchSnapshot();

                const pairItemRemoveButton = selectorHelper.getPairItemRemoveButton(0, 1);
                pairItemRemoveButton.click();
                expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                    area: 'pair_0_1',
                    domEventType: 'click',
                    qtiChoiceIdentifier: 'C',
                    target: pairItemRemoveButton,
                    state: []
                });

                return tick().then(() => {
                    expect(selectorHelper.getPairItem(0, 1)).toBe(null);

                    expect(selectorHelper.getChoice('C')).not.toBe(null);

                    expect(interactionStateStore.get().pairs).toMatchObject([]);
                    expect(interactionStateStore.getValidity()).toBe(false);
                });
            });
        });

        it('does not focus removed choice, if it is removed by mouse navigation', async () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [[null, 'C']]
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await tick();
            const pairItemRemoveButton = selectorHelper.getPairItemRemoveButton(0, 1);
            pairItemRemoveButton.click();

            await tick();
            expect(selectorHelper.getChoice('C')).not.toHaveFocus();
        });

        it('focuses removed choice, if it is removed by keyboard navigation', async () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [
                    ['A', 'C'],
                    ['B', 'D']
                ]
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await tick();
            const pairItemRemoveButton = selectorHelper.getPairItemRemoveButton(0, 1);
            fireEvent.keyUp(pairItemRemoveButton, { key: 'Enter', keyCode: 13, detail: 1 });

            await tick();
            expect(selectorHelper.getChoice('C')).toHaveFocus();
        });

        it('removes whole pair from answer area', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [['A', 'C']]
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            return tick().then(() => {
                // there is only one and it is in answer area
                expect(selectorHelper.getChoice('C')).toBe(null);
                expect(selectorHelper.getPairContainer(0, 0).closest('.pair')).toMatchSnapshot();

                const removePairButton = selectorHelper.getPairRemoveButton(0);
                fireEvent.click(removePairButton, { detail: 1 });

                expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                    area: 'pair_0',
                    domEventType: 'click',
                    target: removePairButton,
                    state: []
                });

                return tick().then(() => {
                    expect(selectorHelper.getPairItem(0, 0)).toBe(null);
                    expect(selectorHelper.getPairItem(0, 1)).toBe(null);

                    expect(selectorHelper.getChoice('C')).not.toBe(null);

                    expect(interactionStateStore.get().pairs).toMatchObject([]);
                    expect(interactionStateStore.getValidity()).toBe(false);
                });
            });
        });

        it('does not re-focus on removing a pair by mouse click', async () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [['A', 'C']]
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await tick();
            const removePairButton = selectorHelper.getPairRemoveButton(0);
            fireEvent.click(removePairButton, { detail: 1 });

            await tick();
            expect(selectorHelper.getChoice('A')).not.toHaveFocus();
        });

        it('re-focuses on removing a pair by keyboard navigation', async () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [['A', 'C']]
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await tick();
            const removePairButton = selectorHelper.getPairRemoveButton(0);
            fireEvent.keyDown(removePairButton, { key: 'Enter' });

            await tick();
            expect(selectorHelper.getChoice('A')).toHaveFocus();
        });

        it('order in which removed choices are restored is preserved', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.set({ choiceKeys: ['C', 'A', 'D', 'B'] });
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [['B'], ['B']]
                },
                false
            );
            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);

            expect(selectorHelper.choiceArea).toMatchSnapshot();

            selectorHelper.getChoice('C').click();
            selectorHelper.getPlaceholder(0, 1).click();

            return tick()
                .then(() => {
                    expect(interactionStateStore.get().pairs).toMatchObject([['B', 'C'], ['B']]);
                    expect(interactionStateStore.get().choiceKeys).toMatchObject(['A', 'D', 'C', 'B']);
                    selectorHelper.getPairItemRemoveButton(0, 1).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.choiceArea).toMatchSnapshot();

                    //newly restored choice 'D' goes after other not-removed choices, and not to its original position
                    expect(interactionStateStore.get().pairs).toMatchObject([['B', void 0], ['B']]);
                    expect(interactionStateStore.get().choiceKeys).toMatchObject(['A', 'D', 'C', 'B']);
                });
        });
    });

    describe('drag and drop', () => {
        it('adds choice to answer area', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });

            interactionStateStore.set({ pairs: [] });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            return tick().then(() => {
                const action = dragAndDropElement(selectorHelper.getChoice('B'), selectorHelper.getPlaceholder(0, 1))
                    .then(tick)
                    .then(() => {
                        expect(selectorHelper.getPairItem(0, 1)).toMatchSnapshot();
                        expect(interactionStateStore.get().pairs).toMatchObject([[void 0, 'B']]);
                        expect(interactionStateStore.getValidity()).toBe(false);
                        expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                            area: 'choice_B',
                            domEventType: 'dragstart',
                            qtiChoiceIdentifier: 'B',
                            target: null
                        });
                        expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                            area: 'choice_B',
                            domEventType: 'dragend',
                            qtiChoiceIdentifier: 'B',
                            target: null
                        });
                        expect(interactiontraceListener.mock.calls[2][0].detail).toMatchObject({
                            areaFrom: 'choice_B',
                            areaTo: 'pair_0_1',
                            domEventType: 'drop',
                            qtiChoiceIdentifier: 'B',
                            target: null,
                            state: [[void 0, 'B']]
                        });
                    });
                return action;
            });
        });

        it('moves answer to another place in answer area', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [['A', 'C']]
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            return tick().then(() => {
                const action = dragAndDropElement(selectorHelper.getPairItem(0, 1), selectorHelper.getPlaceholder(1, 1))
                    .then(tick)
                    .then(() => {
                        expect(selectorHelper.getPairItem(0, 1)).toBe(null);
                        expect(selectorHelper.getPairItem(1, 1)).toMatchSnapshot();
                        expect(selectorHelper.getPairItem(1, 0)).toBe(null);

                        // new empty pair placeholder was not created
                        expect(selectorHelper.getPairContainer(2, 0)).toBe(null);

                        // response is correct
                        expect(interactionStateStore.get().pairs).toMatchObject([
                            ['A', void 0],
                            [void 0, 'C']
                        ]);
                        expect(interactionStateStore.getResponseValue()).toStrictEqual([]);
                        expect(interactionStateStore.getValidity()).toBe(false); // because C: matchMin 1 not used in response

                        expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                            area: 'pair_0_1',
                            domEventType: 'dragstart',
                            qtiChoiceIdentifier: 'C',
                            target: null
                        });
                        expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                            area: 'pair_0_1',
                            domEventType: 'dragend',
                            qtiChoiceIdentifier: 'C',
                            target: null
                        });
                        expect(interactiontraceListener.mock.calls[2][0].detail).toMatchObject({
                            areaFrom: 'pair_0_1',
                            areaTo: 'pair_1_1',
                            domEventType: 'drop',
                            qtiChoiceIdentifier: 'C',
                            target: null,
                            state: [
                                ['A', void 0],
                                [void 0, 'C']
                            ]
                        });
                    });
                return action;
            });
        });

        it('swaps answer with with choice from choice area', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });

            interactionStateStore.set({ pairs: [['C'], ['B']] });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            return tick().then(() => {
                const action = dragAndDropElement(selectorHelper.getPairItem(0, 0), selectorHelper.getChoice('A'))
                    .then(tick)
                    .then(() => {
                        expect(selectorHelper.getPairItem(0, 0)).toMatchSnapshot();
                        // choice C went back to choice area
                        expect(selectorHelper.getChoice('C')).not.toBe(null);
                        // and choice A has taken its place
                        expect(selectorHelper.getPairItem(1, 0)).toMatchSnapshot();
                        // response is correct
                        expect(interactionStateStore.get().pairs).toMatchObject([['A'], ['B']]);
                        expect(interactionStateStore.getValidity()).toBe(false);
                        expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                            area: 'pair_0_0',
                            domEventType: 'dragstart',
                            qtiChoiceIdentifier: 'C',
                            target: null
                        });
                        expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                            area: 'pair_0_0',
                            domEventType: 'dragend',
                            qtiChoiceIdentifier: 'C',
                            target: null
                        });
                        expect(interactiontraceListener.mock.calls[2][0].detail).toMatchObject({
                            areaFrom: 'pair_0_0',
                            areaTo: 'choice_A',
                            domEventType: 'drop',
                            qtiChoiceIdentifier: 'C',
                            target: null,
                            newResponse: void 0,
                            state: [['A'], ['B']]
                        });
                    });
                return action;
            });
        });

        it('moves answer back to choice area', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });

            interactionStateStore.set({ pairs: [['C'], ['B']] });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            return tick().then(() => {
                const action = dragAndDropElement(selectorHelper.getPairItem(0, 0), selectorHelper.getChoicesDropArea())
                    .then(tick)
                    .then(() => {
                        expect(selectorHelper.getPairItem(0, 0)).toMatchSnapshot();

                        // choice C went back to choice area
                        expect(selectorHelper.getChoice('C')).not.toBe(null);
                        //
                        expect(selectorHelper.getPairItem(1, 0)).toBe(null);

                        // response is correct
                        expect(interactionStateStore.get().pairs).toMatchObject([['B']]);
                        expect(interactionStateStore.getValidity()).toBe(false);

                        expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                            area: 'pair_0_0',
                            domEventType: 'dragstart',
                            qtiChoiceIdentifier: 'C',
                            target: null
                        });
                        expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                            area: 'pair_0_0',
                            domEventType: 'dragend',
                            qtiChoiceIdentifier: 'C',
                            target: null
                        });
                        expect(interactiontraceListener.mock.calls[2][0].detail).toMatchObject({
                            areaFrom: 'pair_0_0',
                            areaTo: 'choices',
                            domEventType: 'drop',
                            qtiChoiceIdentifier: 'C',
                            target: null,
                            state: [['B']]
                        });
                    });
                return action;
            });
        });

        it('swaps answer with another answer', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });

            interactionStateStore.set({
                pairs: [
                    [void 0, 'B'],
                    ['A', 'C']
                ]
            });
            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            return tick().then(() => {
                const action = dragAndDropElement(selectorHelper.getPairItem(0, 1), selectorHelper.getPairItem(1, 1))
                    .then(tick)
                    .then(() => {
                        expect(selectorHelper.getPairItem(0, 1)).toMatchSnapshot();
                        expect(selectorHelper.getPairItem(1, 1)).toMatchSnapshot();

                        // response is correct
                        expect(interactionStateStore.get().pairs).toMatchObject([
                            [void 0, 'C'],
                            ['A', 'B']
                        ]);
                        expect(interactionStateStore.getResponseValue()).toStrictEqual([['A', 'B']]);
                        expect(interactionStateStore.getValidity()).toBe(false); // because C: matchMin 1 not used in response

                        expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                            area: 'pair_0_1',
                            domEventType: 'dragstart',
                            qtiChoiceIdentifier: 'B',
                            target: null
                        });
                        expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                            area: 'pair_0_1',
                            domEventType: 'dragend',
                            qtiChoiceIdentifier: 'B',
                            target: null
                        });
                        expect(interactiontraceListener.mock.calls[2][0].detail).toMatchObject({
                            areaFrom: 'pair_0_1',
                            areaTo: 'pair_1_1',
                            domEventType: 'drop',
                            qtiChoiceIdentifier: 'B',
                            target: null,
                            newResponse: [['A', 'B']],
                            state: [
                                [void 0, 'C'],
                                ['A', 'B']
                            ]
                        });
                    });
                return action;
            });
        });
    });

    describe('store saving and validation', () => {
        test.each([[void 0], [0], [1], [2]])(
            'cardinality is set correctly when maxAssociations is %s',
            maxAssociations => {
                const { container } = render(AssociateInteraction, {
                    props: {
                        itemIdentifier,
                        responseIdentifier,
                        maxAssociations,
                        choices
                    }
                });

                const selectorHelper = selectorHelperFactory(container);
                selectorHelper.getChoice('A').click();

                return tick()
                    .then(() => {
                        selectorHelper.getPlaceholder(0, 0).click();
                        return tick();
                    })
                    .then(() => {
                        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
                        expect(interactionStateStore.getResponse()).toMatchSnapshot();
                    });
            }
        );

        it('validity is true when matchMins and matchMax are valid', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [
                        ['A', 'C'],
                        ['A', 'A']
                    ]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);
            fireEvent.click(selectorHelper.getPairRemoveButton(1), { detail: 1 }); // synthetic event was lacking real MouseEvent detail

            return tick().then(() => {
                expect(interactionStateStore.getResponseValue()).toMatchObject([['A', 'C']]);
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        it('validity is false when matchMins are not correct', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [
                        ['A', 'D'],
                        ['A', 'A']
                    ]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);
            fireEvent.click(selectorHelper.getPairRemoveButton(1), { detail: 1 });

            return tick().then(() => {
                expect(interactionStateStore.getResponseValue()).toMatchObject([['A', 'D']]);
                expect(interactionStateStore.getValidity()).toBe(false);
            });
        });

        it('validity is false when matchMax are not correct', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [
                        ['C', 'C'],
                        ['A', 'D'],
                        ['A', 'A']
                    ]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);
            fireEvent.click(selectorHelper.getPairRemoveButton(2), { detail: 1 });

            return tick().then(() => {
                expect(interactionStateStore.getResponseValue()).toMatchObject([
                    ['C', 'C'],
                    ['A', 'D']
                ]);
                expect(interactionStateStore.getValidity()).toBe(false);
            });
        });

        it('validity is true when matchGroup are correct', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [
                        ['A', 'B'],
                        ['A', 'C'],
                        ['A', 'D'],
                        ['B', 'D'],
                        ['D', 'D'],
                        ['A', 'A']
                    ]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices: [
                        {
                            identifier: 'A',
                            matchMin: 0,
                            matchMax: 0,
                            matchGroup: ['B', 'C', 'D'],
                            content: ''
                        },
                        {
                            identifier: 'B',
                            matchMin: 0,
                            matchMax: 0,
                            matchGroup: ['A', 'D'],
                            content: ''
                        },
                        {
                            identifier: 'C',
                            matchMin: 0,
                            matchMax: 0,
                            content: ''
                        },
                        {
                            identifier: 'D',
                            matchMin: 0,
                            matchMax: 0,
                            matchGroup: ['A', 'B', 'C', 'D'],
                            content: ''
                        }
                    ]
                }
            });
            const selectorHelper = selectorHelperFactory(container);
            fireEvent.click(selectorHelper.getPairRemoveButton(5), { detail: 1 });

            return tick().then(() => {
                expect(interactionStateStore.getResponseValue()).toMatchObject([
                    ['A', 'B'],
                    ['A', 'C'],
                    ['A', 'D'],
                    ['B', 'D'],
                    ['D', 'D']
                ]);
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        test.each([
            [
                [
                    ['A', 'A'],
                    ['B', 'B']
                ],
                [
                    ['A', 'B', 'C'],
                    ['A', 'C']
                ]
            ],
            [
                [
                    ['A', 'B'],
                    ['B', 'C']
                ],
                [['C'], ['A', 'C']]
            ],
            [
                [
                    ['A', 'A'],
                    ['C', 'A']
                ],
                [
                    ['A', 'B'],
                    ['A', 'B', 'C'],
                    ['B', 'A']
                ]
            ]
        ])('validity is false when matchGroup are not correct', (state, matchGroups) => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [...state, ['A', 'A']]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    choices: [
                        {
                            identifier: 'A',
                            matchMin: 0,
                            matchMax: 0,
                            matchGroup: matchGroups[0],
                            content: ''
                        },
                        {
                            identifier: 'B',
                            matchMin: 0,
                            matchMax: 0,
                            matchGroup: matchGroups[1],
                            content: ''
                        },
                        {
                            identifier: 'C',
                            matchMin: 0,
                            matchMax: 0,
                            matchGroup: matchGroups[2],
                            content: ''
                        }
                    ]
                }
            });
            const selectorHelper = selectorHelperFactory(container);
            fireEvent.click(selectorHelper.getPairRemoveButton(2), { detail: 1 });

            return tick().then(() => {
                expect(interactionStateStore.getResponseValue()).toMatchObject(state);
                expect(interactionStateStore.getValidity()).toBe(false);
            });
        });

        it('validity true when maxAssociations is correct', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [
                        ['C', 'A'],
                        ['A', 'A']
                    ]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 2,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);
            fireEvent.click(selectorHelper.getPairRemoveButton(1), { detail: 1 });

            return tick().then(() => {
                expect(interactionStateStore.getResponseValue()).toMatchObject([['C', 'A']]);
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        it('validity true when minAssociations is correct', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [
                        ['A', 'C'],
                        ['A', 'A']
                    ]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    minAssociations: 1,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);
            fireEvent.click(selectorHelper.getPairRemoveButton(1), { detail: 1 });

            return tick().then(() => {
                expect(interactionStateStore.getResponseValue()).toMatchObject([['A', 'C']]);
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        it('validity false when minAssociations is not correct', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [
                        ['C', 'A'],
                        ['A', 'A']
                    ]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    minAssociations: 2,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);
            fireEvent.click(selectorHelper.getPairRemoveButton(1), { detail: 1 });

            return tick().then(() => {
                expect(interactionStateStore.getResponseValue()).toMatchObject([['C', 'A']]);
                expect(interactionStateStore.getValidity()).toBe(false);
            });
        });

        it('qtiClass is saved in itemState', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });

            const selectorHelper = selectorHelperFactory(container);
            selectorHelper.getChoice('A').click();
            selectorHelper.getPlaceholder(0, 0).click();
            selectorHelper.getChoice('B').click();
            selectorHelper.getPlaceholder(0, 1).click();

            return tick().then(() => {
                expect(interactionStateStore.get()).toMatchObject({ qtiClass });
                expect(interactionStateStore.getResponse()).toEqual({ base: { pair: ['A', 'B'] } });
            });
        });
    });

    describe('keyboard behavior', () => {
        test.each([
            [13, ''],
            [32, '']
        ])('selects choice and moves to answer (keyCode: %d)', (keyCode, code) => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: ['B']
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            const choiceC = selectorHelper.getChoice('C');
            fireEvent.keyUp(choiceC, { keyCode });
            const place = selectorHelper.getPlaceholder(0, 1);

            return tick()
                .then(() => {
                    expect(selectorHelper.getChoiceClassesContainer('C').classList.contains('selected')).toBe(true);
                    expect(document.activeElement).toBe(place);
                    fireEvent.keyUp(document.activeElement, { keyCode });
                    return tick().then(tick);
                })
                .then(() => {
                    expect(selectorHelper.getPairItem(0, 1)).toMatchSnapshot();

                    return tick();
                })
                .then(() => {
                    expect(document.activeElement).toBe(selectorHelper.getPairItem(0, 1));
                    expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'keyup',
                        area: 'choices',
                        qtiChoiceIdentifier: 'C',
                        target: choiceC
                    });
                    expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                        domEventType: 'keyup',
                        area: 'pair_0_1',
                        pressedKey: code,
                        qtiChoiceIdentifier: 'C',
                        target: place,
                        newResponse: ['B', 'C'],
                        state: [['B', 'C']]
                    });
                });
        });

        test.each([[13], [32]])('selects answer and moves to another place (keyCode: %d)', keyCode => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: ['B', 'C']
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);
            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            const place0 = selectorHelper.getPairItem(0, 0);
            const place1 = selectorHelper.getPairItem(0, 1);
            fireEvent.keyUp(place0, { keyCode });

            return tick()
                .then(() => {
                    expect(selectorHelper.getPairItemClassesContainer(0, 0).classList.contains('selected')).toBe(true);
                    fireEvent.keyUp(place1, { keyCode });
                    return tick().then(tick);
                })
                .then(() => {
                    expect(place1).toMatchSnapshot();
                    expect(place0).toMatchSnapshot();

                    return tick();
                })
                .then(() => {
                    expect(document.activeElement).toBe(place1);
                    expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'keyup',
                        area: 'pair_0_0',
                        qtiChoiceIdentifier: 'B',
                        target: place0
                    });
                    expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                        domEventType: 'keyup',
                        area: 'pair_0_1',
                        qtiChoiceIdentifier: 'B',
                        target: place1,
                        newResponse: ['C', 'B'],
                        state: [['C', 'B']]
                    });
                });
        });

        it('unselects selected choice when esc pressed', () => {
            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);
            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            const choiceA = selectorHelper.getChoice('A');
            choiceA.click();

            return tick()
                .then(() => {
                    expect(selectorHelper.getChoiceClassesContainer('A').classList.contains('selected')).toBe(true);
                    fireEvent.keyDown(window, { keyCode: 27 }); //esc
                    expect(interactiontraceListener.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'click',
                        area: 'choices',
                        qtiChoiceIdentifier: 'A',
                        target: choiceA
                    });
                    expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                        domEventType: 'keydown',
                        pressedKey: '',
                        timeStamp: expect.any(Number)
                    });
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getChoiceClassesContainer('A').classList.contains('selected')).toBe(false);

                    selectorHelper.getPlaceholder(0, 0).click();
                    return tick();
                })
                .then(() => {
                    // it should not move previously selected element after esc press
                    expect(selectorHelper.getPairItem(0, 0)).toBe(null);
                });
        });

        it('unselects selected answer when esc pressed', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: ['D']
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);
            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            const choiceD = selectorHelper.getPairItem(0, 0);
            choiceD.click();

            return tick()
                .then(() => {
                    expect(selectorHelper.getPairItemClassesContainer(0, 0).classList.contains('selected')).toBe(true);
                    fireEvent.keyDown(window, { keyCode: 27 }); //esc
                    expect(interactiontraceListener.mock.calls[0][0].detail).toEqual({
                        domEventType: 'click',
                        area: 'pair_0_0',
                        qtiChoiceIdentifier: 'D',
                        target: choiceD,
                        timeStamp: expect.any(Number)
                    });
                    expect(interactiontraceListener.mock.calls[1][0].detail).toMatchObject({
                        domEventType: 'keydown',
                        pressedKey: '',
                        timeStamp: expect.any(Number)
                    });
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getPairItemClassesContainer(0, 0).classList.contains('selected')).toBe(false);

                    selectorHelper.getPlaceholder(0, 1).click();
                    return tick();
                })
                .then(() => {
                    // it should not move previously selected element after esc press
                    expect(selectorHelper.getPairItem(0, 1)).toBe(null);
                });
        });

        test.each([[39], [40]])('focuses correct next elements with arrow key %s', keyCode => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [['A', 'B'], ['C'], [void 0, 'D']]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 4,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);

            selectorHelper.getPairItem(0, 0).focus();

            const focusOrder = [
                selectorHelper.getPairItem(0, 0),
                selectorHelper.getPairItemRemoveButton(0, 0),
                selectorHelper.getPairItem(0, 1),
                selectorHelper.getPairItemRemoveButton(0, 1),
                selectorHelper.getPairRemoveButton(0),
                selectorHelper.getPairItem(1, 0),
                selectorHelper.getPairItemRemoveButton(1, 0),
                selectorHelper.getPairItem(2, 1),
                selectorHelper.getPairItemRemoveButton(2, 1),
                selectorHelper.getPairItem(0, 0)
            ];

            return focusOrder.reduce((flow, expectedFocusElement) => {
                expect(document.activeElement).toBe(expectedFocusElement);
                fireEvent.keyDown(document.activeElement, { keyCode });
                return flow.then(tick);
            }, tick());
        });

        it('focuses correct next elements with arrow key when selected', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [['A', 'B'], ['C'], [void 0, 'D']]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 4,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);

            selectorHelper.getPairItem(0, 0).click();
            selectorHelper.getPairItem(0, 0).focus();

            return tick().then(() => {
                const focusOrder = [
                    selectorHelper.getPairItem(0, 0),
                    selectorHelper.getPairItem(0, 1),
                    selectorHelper.getPairItem(1, 0),
                    selectorHelper.getPlaceholder(1, 1),
                    selectorHelper.getPlaceholder(2, 0),
                    selectorHelper.getPairItem(2, 1),
                    selectorHelper.getPlaceholder(3, 0),
                    selectorHelper.getPlaceholder(3, 1),
                    selectorHelper.getPairItem(0, 0)
                ];

                return focusOrder.reduce((flow, expectedFocusElement) => {
                    expect(document.activeElement).toBe(expectedFocusElement);
                    fireEvent.keyDown(document.activeElement, { keyCode: 39 });
                    return flow.then(tick);
                }, tick());
            });
        });

        test.each([[37], [38]])('focuses correct previous elements with arrow key %s', keyCode => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [['A', 'B'], ['C'], [void 0, 'D']]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 4,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);

            selectorHelper.getPairItemRemoveButton(2, 1).focus();

            const focusOrder = [
                selectorHelper.getPairItemRemoveButton(2, 1),
                selectorHelper.getPairItem(2, 1),
                selectorHelper.getPairItemRemoveButton(1, 0),
                selectorHelper.getPairItem(1, 0),
                selectorHelper.getPairRemoveButton(0),
                selectorHelper.getPairItemRemoveButton(0, 1),
                selectorHelper.getPairItem(0, 1),
                selectorHelper.getPairItemRemoveButton(0, 0),
                selectorHelper.getPairItem(0, 0),
                selectorHelper.getPairItemRemoveButton(2, 1)
            ];

            return focusOrder.reduce((flow, expectedFocusElement) => {
                expect(document.activeElement).toBe(expectedFocusElement);
                fireEvent.keyDown(document.activeElement, { keyCode });
                return flow.then(tick);
            }, tick());
        });

        it('focuses correct previous elements with arrow key when selected', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [['A', 'B'], ['C'], [void 0, 'D']]
                },
                false
            );

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 4,
                    choices
                }
            });
            const selectorHelper = selectorHelperFactory(container);

            selectorHelper.getPairItem(0, 0).click();

            return tick().then(() => {
                selectorHelper.getPlaceholder(3, 1).focus();

                const focusOrder = [
                    selectorHelper.getPlaceholder(3, 1),
                    selectorHelper.getPlaceholder(3, 0),
                    selectorHelper.getPairItem(2, 1),
                    selectorHelper.getPlaceholder(2, 0),
                    selectorHelper.getPlaceholder(1, 1),
                    selectorHelper.getPairItem(1, 0),
                    selectorHelper.getPairItem(0, 1),
                    selectorHelper.getPairItem(0, 0),
                    selectorHelper.getPlaceholder(3, 1)
                ];

                return focusOrder.reduce((flow, expectedFocusElement) => {
                    expect(document.activeElement).toBe(expectedFocusElement);
                    fireEvent.keyDown(document.activeElement, { keyCode: 37 });
                    return flow.then(tick);
                }, tick());
            });
        });
    });

    it('renders the instruction lang on the feedback block', () => {
        const getInstructionsLang = vi.fn(() => 'nb_NO');
        const testContext = {
            getAssetManager: () => ({
                resolve: src => src
            }),
            registerLoadingElement: vi.fn(),
            getInstructionsLang
        };

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: AssociateInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 4,
                    choices
                }
            }
        });
        expect(container).toMatchSnapshot();
        expect(getInstructionsLang).toHaveBeenCalled();
        expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toEqual('nb_NO');
    });

    describe('shuffle choices', () => {
        it('renders choices shuffled if attribute is true', () => {
            shuffleChoiceOptions.mockImplementationOnce(choicesParam => {
                expect(shuffleChoiceOptions).toHaveBeenCalled();
                return [choicesParam[1], choicesParam[0], choicesParam[2], choicesParam[3]];
            });

            const { container } = render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    shuffle: true
                }
            });

            expect(container).toMatchSnapshot();
        });

        it('should not override optionsOrder in the store', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const optionsOrder = [1, 2, 3, 0];
            interactionStateStore.merge({ optionsOrder });

            render(AssociateInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    shuffle: true
                }
            });

            expect(interactionStateStore.get()).toHaveProperty('optionsOrder', optionsOrder);
        });
    });
});
