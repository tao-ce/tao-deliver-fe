// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../../util/shuffleChoices.js', () => ({
    __esModule: true,
    default: vi.fn()
}));
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import ChoiceInteraction from '../ChoiceInteraction.svelte';
import itemsStateStore, { getItemStateStore, getInteractionStateStore } from '../../../itemsStateStore.js';
import { getItemSettingsStore, releaseItemSettingsStore } from '../../../itemsSettingsStore.js';
import { getItemToolsStateStore, releaseItemToolsStateStore } from '../../../itemsToolsStateStore.js';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';
import shuffleChoiceOptions from '../../util/shuffleChoices.js';

const qtiClass = 'qti-choiceInteraction';
const itemIdentifier = 'i12345';
const responseIdentifier = 'RESPONSE_1';
const choices = [
    { key: 'c1', label: 'Choice 1' },
    { key: 'c2', label: 'Choice 2' },
    { key: 'c3', label: 'Choice 3' },
    { key: 'c4', label: 'Choice 4' }
];
const prompt = [{ type: 'text', content: 'Question 1' }];
const orientation = 'horizontal';
const classes =
    'qti-choices-stacking-2 qti-control-hidden qti-labels-lower-alpha qti-label-suffix-period qti-orientation-vertical';
const dataAttrs = {
    'data-max-selections-message': "You're limited to 4!",
    'data-min-selections-message': 'You need at least 1!'
};

describe('ChoiceInteraction', () => {
    afterEach(() => itemsStateStore.clear());

    it('renders correctly with basic props - radio mode', () => {
        const { container } = render(ChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                maxChoices: 1,
                minChoices: 0
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with basic props - checkbox mode', () => {
        const { container } = render(ChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                maxChoices: 2,
                minChoices: 2
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with full props', () => {
        const { container } = render(ChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                prompt,
                maxChoices: 4,
                minChoices: -1,
                orientation,
                classes,
                dataAttrs
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders choices shuffled if attribute is true', () => {
        shuffleChoiceOptions.mockImplementationOnce(choicesParam => [
            choicesParam[1],
            choicesParam[0],
            choicesParam[2],
            choicesParam[3]
        ]);

        const { container } = render(ChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                shuffle: true
            }
        });

        expect(shuffleChoiceOptions).toHaveBeenCalledTimes(1);
        expect(container).toMatchSnapshot();
    });

    it('does not override role attribute if set', () => {
        const { container } = render(ChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                maxChoices: 1,
                minChoices: 0,
                prompt,
                role: 'button'
            }
        });
        expect(container.querySelector('.qti-choiceInteraction[role="group"]')).toBeFalsy();
        expect(container.querySelector('.qti-choiceInteraction[role="button"]')).toBeTruthy();
    });

    it('does not override aria-labelledby attribute if set', () => {
        const { container } = render(ChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                maxChoices: 1,
                minChoices: 0,
                prompt,
                ariaAttrs: { 'aria-labelledby': 'some_id' }
            }
        });
        expect(container.querySelector('.qti-choiceInteraction[aria-labelledby="some_id"]')).toBeTruthy();
    });

    it('saves correct initial response', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        render(ChoiceInteraction, {
            props: { itemIdentifier, responseIdentifier }
        });

        expect(interactionStateStore.getResponse()).toMatchObject({ list: { identifier: [] } });
        expect(interactionStateStore.getValidity()).toBe(true);
        expect(interactionStateStore.get()).toMatchObject({ qtiClass });
    });

    it('saves correct initial response - minChoices constraint', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        render(ChoiceInteraction, {
            props: { itemIdentifier, responseIdentifier, choices, minChoices: 1 }
        });

        expect(interactionStateStore.getResponse()).toMatchObject({ list: { identifier: [] } });
        expect(interactionStateStore.getValidity()).toBe(false);
    });

    it('loads & saves interaction state from the ItemStateStore', () => {
        expect.assertions(5);

        const itemStateStore = getItemStateStore(itemIdentifier);
        const exampleItemState = {
            RESPONSE_1: { response: { list: { identifier: ['c1', 'c2'] } } }
        };
        itemStateStore.set(exampleItemState);

        const { container } = render(ChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                maxChoices: 3
            }
        });
        expect(container).toMatchSnapshot();

        // change selected via DOM, triggering saveResponse
        const choice = container.querySelector('input[value="c3"]');
        expect(choice.checked).toBe(false);

        choice.click();

        return tick().then(() => {
            expect(choice.checked).toBe(true);
            expect(itemStateStore.getInteractionResponse(responseIdentifier)).toMatchObject({
                list: { identifier: ['c1', 'c2', 'c3'] }
            });
            expect(itemStateStore.getInteractionValidity(responseIdentifier)).toBe(true);
        });
    });

    it('saves interaction state with multiple values', () => {
        expect.assertions(4);

        const itemStateStore = getItemStateStore(itemIdentifier);
        const exampleItemState = {
            RESPONSE_1: { response: { list: { identifier: ['c1', 'c2'] } }, qtiClass }
        };
        itemStateStore.set(exampleItemState);

        const { container } = render(ChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                maxChoices: 3
            }
        });
        expect(itemStateStore.getInteractionResponse(responseIdentifier)).toMatchObject({
            list: { identifier: ['c1', 'c2'] }
        });

        container.querySelector('input[value="c3"]').click();

        return tick()
            .then(tick())
            .then(() => {
                expect(itemStateStore.getInteractionResponse(responseIdentifier)).toMatchObject({
                    list: { identifier: ['c1', 'c2', 'c3'] }
                });
                expect(itemStateStore.getInteractionValidity(responseIdentifier)).toBe(true);
                expect(itemStateStore.getItemElementState(responseIdentifier)).toMatchObject({ qtiClass });
            });
    });

    it('saves interaction state with a single value', () => {
        expect.assertions(3);

        const itemStateStore = getItemStateStore(itemIdentifier);

        const { container } = render(ChoiceInteraction, {
            props: {
                cardinality: 'single',
                itemIdentifier,
                responseIdentifier,
                choices,
                minChoies: 1,
                maxChoices: 1
            }
        });
        container.querySelector('input[value="c1"]').click();
        container.querySelector('input[value="c2"]').click();

        return tick().then(() => {
            expect(itemStateStore.getInteractionResponse(responseIdentifier)).toMatchObject({
                base: { identifier: 'c2' }
            });
            expect(itemStateStore.getInteractionValidity(responseIdentifier)).toBe(true);
            expect(itemStateStore.getItemElementState(responseIdentifier)).toMatchObject({ qtiClass });
        });
    });

    it('saves interaction state to the store when empty', () => {
        expect.assertions(2);

        const itemStateStore = getItemStateStore(itemIdentifier);

        render(ChoiceInteraction, {
            props: {
                cardinality: 'single',
                itemIdentifier,
                responseIdentifier,
                choices,
                maxChoices: 1
            }
        });

        return tick().then(() => {
            expect(itemStateStore.getInteractionResponse(responseIdentifier)).toMatchObject({
                base: null
            });
            expect(itemStateStore.getInteractionValidity(responseIdentifier)).toBe(true);
        });
    });

    it('saves interaction state (invalid) to the store when minChoices not reached', () => {
        expect.assertions(2);

        const itemStateStore = getItemStateStore(itemIdentifier);

        render(ChoiceInteraction, {
            props: {
                cardinality: 'single',
                itemIdentifier,
                responseIdentifier,
                choices,
                minChoices: 1
            }
        });

        return tick().then(() => {
            expect(itemStateStore.getInteractionResponse(responseIdentifier)).toMatchObject({
                base: null
            });
            expect(itemStateStore.getInteractionValidity(responseIdentifier)).toBe(false);
        });
    });

    it('invalid constraints: maxChoices > choicesCount is the same as no maxChoices', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        const { container } = render(ChoiceInteraction, {
            props: { itemIdentifier, responseIdentifier, choices, minChoices: 1, maxChoices: 10 }
        });
        expect(interactionStateStore.getValidity()).toBe(false);

        container.querySelector('input[value="c1"]').click();
        return tick().then(() => {
            expect(interactionStateStore.getValidity()).toBe(true);
        });
    });

    it('invalid constraints: minChoices > maxChoices is the same as no constraints', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        render(ChoiceInteraction, {
            props: { itemIdentifier, responseIdentifier, choices, minChoices: 3, maxChoices: 2 }
        });
        expect(interactionStateStore.getValidity()).toBe(true);
    });

    it('invalid constraints: minChoices > choicesCount is the same as no constraints', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        render(ChoiceInteraction, {
            props: { itemIdentifier, responseIdentifier, choices, minChoices: 10 }
        });
        expect(interactionStateStore.getValidity()).toBe(true);
    });

    it('renders correctly if qti-label is set without qti-label-suffix', () => {
        const { container } = render(ChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                classes: 'qti-labels-decimal'
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders the instruction lang on the feedback block', () => {
        const getInstructionsLang = vi.fn(() => 'fr-FR');
        const testContext = {
            getAssetManager: () => ({
                resolve: src => src
            }),
            registerLoadingElement: vi.fn(),
            getInstructionsLang,
            getWritingMode: vi.fn()
        };

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ChoiceInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            }
        });
        expect(container).toMatchSnapshot();
        expect(getInstructionsLang).toHaveBeenCalled();
        expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toEqual('fr-FR');
    });

    describe('choice elimination', () => {
        const eliminableClass = 'eliminable';

        afterEach(() => {
            //unset choiceElimination through settingsStore
            releaseItemSettingsStore(itemIdentifier);
            releaseItemToolsStateStore(itemIdentifier);
        });

        it('renders elimination buttons if choiceElimination is on', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            itemSettingsStore.set({ choiceElimination: true });

            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: eliminableClass }
            });
            return tick().then(() => {
                //check action buttons appear
                expect(document.querySelector('.action-container')).toBeTruthy();
                expect(container).toMatchSnapshot();
            });
        });

        it('do not render elimination buttons if choiceElimination is disabled', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            itemSettingsStore.set({ _disabledKeys: ['choiceElimination'], choiceElimination: true });

            render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: eliminableClass }
            });

            return tick().then(() => {
                //check action buttons is hidden
                expect(document.querySelector('.action-container')).toBeFalsy();
            });
        });

        it('updates the state on elimination button click', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            const toolsStateStore = getItemToolsStateStore(itemIdentifier);
            itemSettingsStore.set({ choiceElimination: true });

            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: eliminableClass }
            });

            //click elimination button
            const eliminationButton = container.querySelector('.action-container > button');
            eliminationButton.click();

            return tick().then(() => {
                //check the state's eliminated array is updated with the key
                expect(toolsStateStore.getElementToolState('choiceElimination', responseIdentifier)).toEqual(['c1']);

                //click the eliminationButton again
                eliminationButton.click();
                return tick().then(() => {
                    //check the state's eliminated array is empty again
                    expect(toolsStateStore.getElementToolState('choiceElimination', responseIdentifier)).toEqual([]);
                });
            });
        });

        it('loads elimination state from eliminated state prop', () => {
            //set the eliminated array through state

            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            const toolsStateStore = getItemToolsStateStore(itemIdentifier);
            itemSettingsStore.set({ choiceElimination: true });
            toolsStateStore.setElementToolState('choiceElimination', responseIdentifier, ['c1']);

            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: eliminableClass }
            });

            return tick().then(() => {
                //check the first option is rendered as eliminated
                const firstLi = container.querySelector('li');
                expect(firstLi).toHaveClass('eliminated');
            });
        });

        it('removes the response if eliminated', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            const toolsStateStore = getItemToolsStateStore(itemIdentifier);
            itemSettingsStore.set({ choiceElimination: true });

            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: eliminableClass }
            });

            toolsStateStore.setElementToolState('choiceElimination', responseIdentifier, []);
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue({
                cardinality: 'multiple',
                baseType: 'identifier',
                value: ['c1']
            });

            const eliminationButton = container.querySelector('.action-container > button');
            eliminationButton.click();

            return tick().then(() => {
                //c1 key is in state's eliminated array and removed from
                expect(toolsStateStore.getElementToolState('choiceElimination', responseIdentifier)).toEqual(['c1']);
                expect(interactionStateStore.getResponseValue()).toEqual([]);
            });
        });

        it('clears eliminated if choiceElimination setting is disabled', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            const toolsStateStore = getItemToolsStateStore(itemIdentifier);
            itemSettingsStore.set({ choiceElimination: true });
            toolsStateStore.setElementToolState('choiceElimination', responseIdentifier, ['c1']);

            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: eliminableClass }
            });

            itemSettingsStore.set({ choiceElimination: false });
            return tick().then(() => {
                expect(container.querySelector(`.action-container`)).toBeFalsy();
                expect(container.querySelector(`.eliminated`)).toBeFalsy();
            });
        });

        it('keep choices if a elimination and selection data conflicts', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            const toolsStateStore = getItemToolsStateStore(itemIdentifier);
            itemSettingsStore.set({ choiceElimination: true });
            toolsStateStore.setElementToolState('choiceElimination', responseIdentifier, ['c1', 'c3']);

            const itemStateStore = getItemStateStore(itemIdentifier);
            const exampleItemState = {
                RESPONSE_1: { response: { list: { identifier: ['c1', 'c2'] } } }
            };
            itemStateStore.set(exampleItemState);

            render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: eliminableClass }
            });

            return tick().then(() => {
                expect(toolsStateStore.getElementToolState('choiceElimination', responseIdentifier)).toMatchObject([
                    'c3'
                ]);
            });
        });
    });

    describe('choice answerMasking', () => {
        const maskedClass = 'mask';
        afterEach(() => {
            //unset choiceAnswerMasking through settingsStore
            releaseItemSettingsStore(itemIdentifier);
            releaseItemToolsStateStore(itemIdentifier);
        });

        it('renders answerMasking buttons if choiceAnswerMasking is on', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            itemSettingsStore.set({ choiceAnswerMasking: true, choiceElimination: false });

            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: maskedClass }
            });
            return tick().then(() => {
                //check action buttons appear
                expect(document.querySelector('.action-container')).toBeTruthy();
                expect(container).toMatchSnapshot();
            });
        });

        it('do not render answerMasking buttons if choiceAnswerMasking is disabled', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            itemSettingsStore.set({ _disabledKeys: ['choiceAnswerMasking'], choiceAnswerMasking: true });

            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: maskedClass }
            });

            return tick().then(() => {
                //check action buttons is hidden
                expect(document.querySelector('.action-container')).toBeFalsy();
                expect(container).toMatchSnapshot();
            });
        });

        it('updates the state on answerMasking button click', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            const toolsStateStore = getItemToolsStateStore(itemIdentifier);
            itemSettingsStore.set({ choiceAnswerMasking: true });

            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: maskedClass }
            });

            //click answerMasking button
            const answerMaskingButton = container.querySelector('.action-container > button');
            answerMaskingButton.click();

            return tick().then(() => {
                //check the state's masked array is updated with the key
                expect(toolsStateStore.getElementToolState('choiceAnswerMasking', responseIdentifier)).toEqual(['c1']);

                //click the answerMaskingButton again
                answerMaskingButton.click();
                return tick().then(() => {
                    //check the state's masked array is empty again
                    expect(toolsStateStore.getElementToolState('choiceAnswerMasking', responseIdentifier)).toEqual([]);
                });
            });
        });

        it('loads answerMasking state from masked state prop', () => {
            //set the masked array through state

            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            const toolsStateStore = getItemToolsStateStore(itemIdentifier);
            itemSettingsStore.set({ choiceAnswerMasking: true });
            toolsStateStore.setElementToolState('choiceAnswerMasking', responseIdentifier, ['c1']);

            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: maskedClass }
            });

            return tick().then(() => {
                //check the first option is rendered as masked
                const firstLi = container.querySelector('li');
                expect(firstLi).toHaveClass('masked');
            });
        });

        it('removes the response if masked', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            const toolsStateStore = getItemToolsStateStore(itemIdentifier);
            itemSettingsStore.set({ choiceAnswerMasking: true });

            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: maskedClass }
            });

            toolsStateStore.setElementToolState('choiceAnswerMasking', responseIdentifier, []);
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue({
                cardinality: 'multiple',
                baseType: 'identifier',
                value: ['c1']
            });

            const eliminationButton = container.querySelector('.action-container > button');
            eliminationButton.click();

            return tick().then(() => {
                //c1 key is in state's eliminated array and removed from
                expect(toolsStateStore.getElementToolState('choiceAnswerMasking', responseIdentifier)).toEqual(['c1']);
                expect(interactionStateStore.getResponseValue()).toEqual([]);
            });
        });

        it('clears masked if choiceAnswerMasking setting is disabled', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            const toolsStateStore = getItemToolsStateStore(itemIdentifier);
            itemSettingsStore.set({ choiceAnswerMasking: true });
            toolsStateStore.setElementToolState('choiceAnswerMasking', responseIdentifier, ['c1']);

            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: maskedClass }
            });

            itemSettingsStore.set({ choiceAnswerMasking: false });
            return tick().then(() => {
                expect(container.querySelector(`.action-container`)).toBeFalsy();
                expect(container.querySelector(`.masked`)).toBeFalsy();
            });
        });

        it('keep choices if a answerMasking and selection data conflicts', () => {
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            const toolsStateStore = getItemToolsStateStore(itemIdentifier);
            itemSettingsStore.set({ choiceAnswerMasking: true });
            toolsStateStore.setElementToolState('choiceAnswerMasking', responseIdentifier, ['c1', 'c3']);

            const itemStateStore = getItemStateStore(itemIdentifier);
            const exampleItemState = {
                RESPONSE_1: { response: { list: { identifier: ['c1', 'c2'] } } }
            };
            itemStateStore.set(exampleItemState);

            render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices, classes: maskedClass }
            });

            return tick().then(() => {
                expect(toolsStateStore.getElementToolState('choiceAnswerMasking', responseIdentifier)).toMatchObject([
                    'c3'
                ]);
            });
        });
    });

    describe('trigger DOM events', () => {
        it('triggers DOM events on interaction click', () => {
            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices }
            });

            const interaction = container.querySelector('.qti-choiceInteraction');
            const input = interaction.querySelector('input');
            const traceInteraction = vi.fn();
            interaction.addEventListener('interactiontrace', traceInteraction);

            input.click();

            return tick().then(() => {
                expect(traceInteraction).toHaveBeenCalled();
                expect(traceInteraction.mock.calls[0][0].detail).toMatchObject({
                    domEventType: 'click',
                    newResponse: ['c1'],
                    position: {
                        clientX: 0,
                        clientY: 0,
                        screenX: 0,
                        screenY: 0
                    },
                    target: input,
                    qtiChoiceIdentifier: 'c1'
                });
            });
        });

        it('triggers DOM events on interaction keypress', () => {
            const { container } = render(ChoiceInteraction, {
                props: { itemIdentifier, responseIdentifier, choices }
            });

            const interaction = container.querySelector('.qti-choiceInteraction');
            const input = interaction.querySelector('input');

            const traceInteraction = vi.fn();
            const event = new KeyboardEvent('keyup', { key: 'Enter', bubbles: true });
            interaction.addEventListener('interactiontrace', traceInteraction);

            input.dispatchEvent(event);

            return tick().then(() => {
                expect(traceInteraction).toHaveBeenCalled();
                expect(traceInteraction.mock.calls[0][0].detail).toMatchObject({
                    domEventType: 'keyup',
                    newResponse: ['c1'],
                    pressedKey: 'Enter',
                    qtiChoiceIdentifier: 'c1',
                    target: input
                });
            });
        });
    });

    it('renders choices with correct images when shuffled', async () => {
        const mockAssetManager = {
            resolve: vi.fn(src => src)
        };

        const choicesImages = [
            { key: 'c1', label: 'Choice 1', image: { src: 'image1.jpg' } },
            { key: 'c2', label: 'Choice 2', image: { src: 'image2.jpg' } }
        ];

        shuffleChoiceOptions.mockImplementationOnce(choice => choice.reverse());

        const testContext = {
            getAssetManager: () => mockAssetManager,
            registerLoadingElement: vi.fn(),
            getInstructionsLang: vi.fn(() => 'en'),
            getWritingMode: vi.fn()
        };

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ChoiceInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    choices: choicesImages,
                    shuffle: true
                }
            }
        });

        await tick();

        const images = container.querySelectorAll('.selectable-choice-container li img');
        expect(images.length).toBe(2);
        expect(images[0].src).toContain('image2.jpg');
        expect(images[1].src).toContain('image1.jpg');
    });

    it('prevents selecting over maxChoices when tao-constrain-maxChoices data-prop is set', () => {
        //expect.assertions(3);

        const itemStateStore = getItemStateStore(itemIdentifier);
        const exampleItemState = {
            RESPONSE_1: { response: { list: { identifier: ['c1', 'c2'] } } }
        };
        itemStateStore.set(exampleItemState);

        const { container } = render(ChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                maxChoices: 2,
                classes: ['tao-constrain-maxChoices']
            }
        });
        expect(itemStateStore.getInteractionResponse(responseIdentifier)).toMatchObject({
            list: { identifier: ['c1', 'c2'] }
        });

        container.querySelector('input[value="c3"]').click();

        return tick()
            .then(tick())
            .then(() => {
                expect(itemStateStore.getInteractionResponse(responseIdentifier)).toMatchObject({
                    list: { identifier: ['c1', 'c2'] }
                });
                expect(itemStateStore.getInteractionValidity(responseIdentifier)).toBe(true);
            });
    });
});
