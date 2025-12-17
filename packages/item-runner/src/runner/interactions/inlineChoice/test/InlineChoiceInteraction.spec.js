// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('@oat-sa-private/ui-core/dom/dom.js', async importOriginal => {
    const actual = await importOriginal();
    return {
        ...actual,
        generateElementId: nodeName => `tao-${nodeName}-123`
    };
});
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import InlineChoiceInteraction from '../InlineChoiceInteraction.svelte';
import itemsStateStore, { getItemStateStore, getInteractionStateStore } from '../../../itemsStateStore.js';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';

// common fixtures
const qtiClass = 'qti-inlineChoiceInteraction';
const itemIdentifier = 'ia121314';
const responseIdentifier = 'RSP';
const choices = {
    c1: 'Choice 1',
    c2: 'Choice 2',
    c3: 'Choice 3',
    c4: 'Choice 4',
    c5: 'Choice 5',
    c6: 'Choice 6'
};

const getInstructionsLang = () => 'nb-NO';
const getWritingMode = vi.fn();
const testContext = {
    getInstructionsLang,
    getWritingMode
};

describe('InlineChoiceInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
    });

    // RENDERING

    it('renders correctly with basic props', () => {
        const { container } = render(InlineChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with a HTML attributes', () => {
        const { container } = render(InlineChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                classes: 'very-important highlight',
                id: 'inline-choice-34',
                lang: 'en',
                ariaAttrs: {
                    'aria-hidden': false,
                    'aria-foo': 'bar'
                },
                dataAttrs: {
                    'data-extra-value': '42'
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with a sizing class', () => {
        const { container } = render(InlineChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                classes: 'qti-input-width-4'
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with a data prompt', () => {
        const { container } = render(InlineChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                dataAttrs: {
                    'data-prompt': 'Please select a choice'
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('adds a class to the block container', () => {
        expect(document.querySelectorAll('.inline-interaction-container')).toHaveLength(0);

        // Create a proper block parent structure for the test
        const blockParent = document.createElement('div');
        blockParent.style.display = 'block';
        document.body.appendChild(blockParent);

        render(InlineChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices
            },
            target: blockParent
        });

        // The class should be added to the block parent, not the container
        expect(document.querySelectorAll('.inline-interaction-container')).toHaveLength(1);
        expect(blockParent.classList.contains('inline-interaction-container')).toBe(true);

        // Clean up
        document.body.removeChild(blockParent);
    });

    it('renders feedback with correct lang', () => {
        const { container, getByText } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: InlineChoiceInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    required: true
                }
            }
        });
        fireEvent.click(container.querySelector('button'));
        return tick()
            .then(() => {
                fireEvent.mouseUp(getByText('leave blank'));
                return tick();
            })
            .then(() => {
                expect(container.querySelector('.feedback-inline')).toHaveAttribute('lang', getInstructionsLang());
            });
    });

    // STORE

    test.each([
        [true, false],
        [false, true],
        [void 0, true]
    ])('saves correct initial response', (required, expected) => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        render(InlineChoiceInteraction, {
            props: { itemIdentifier, responseIdentifier, required }
        });

        expect(interactionStateStore.getResponse()).toMatchObject({ base: null });
        expect(interactionStateStore.getValidity()).toBe(expected);
    });

    it('loads & saves interaction state from the ItemStateStore', () => {
        expect.assertions(2);

        const itemStateStore = getItemStateStore(itemIdentifier);
        const exampleItemState = {
            RSP: { response: { base: { identifier: 'c2' } } }
        };
        itemStateStore.set(exampleItemState);

        const { container, getByText } = render(InlineChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices
            }
        });
        expect(container).toMatchSnapshot();

        fireEvent.click(container.querySelector('button'));
        return tick()
            .then(() => {
                fireEvent.mouseUp(getByText('Choice 4'));
                return tick();
            })
            .then(() => {
                const response = itemStateStore.getInteractionResponse(responseIdentifier);
                expect(response).toMatchObject({ base: { identifier: 'c4' } });
            });
    });

    test.each([
        [void 0, false, ''],
        [void 0, true, ''],
        ['', false, ''],
        ['', true, ''],
        ['c5', false, ''],
        ['c5', true, 'c5']
    ])('loads correct value from store for value: "%s", validity: %s', (storeValue, storeValidity, expectedValue) => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponse(
            {
                base: {
                    identifier: storeValue
                }
            },
            storeValidity
        );

        const { container } = render(InlineChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices
            }
        });
        const input = container.querySelector('input[data-type="select"]');

        return tick().then(() => {
            expect(input.value).toBe(expectedValue);
        });
    });

    test.each([
        ['Choice 1', false, 'c1', true],
        ['Choice 1', true, 'c1', true],
        ['leave blank', false, null, true],
        ['leave blank', true, null, false]
    ])(
        'sets correct value & validity into store for label: "%s", required: %s',
        (label, required, expectedValue, expectedValidity) => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container, getByText } = render(InlineChoiceInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    required
                }
            });
            const dropdown = container.querySelector('.select');
            const button = dropdown.querySelector('button');

            fireEvent.click(button);

            return tick()
                .then(() => {
                    fireEvent.mouseUp(getByText(label));
                    return tick();
                })
                .then(() => {
                    const interactionResponse = interactionStateStore.getResponse();
                    if (expectedValue === null) {
                        expect(interactionResponse).toMatchObject({
                            base: null
                        });
                    } else {
                        expect(interactionResponse).toMatchObject({
                            base: {
                                identifier: expectedValue
                            }
                        });
                    }
                    expect(interactionStateStore.getValidity()).toBe(expectedValidity);
                });
        }
    );

    it('listens store modifications', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        interactionStateStore.setResponse({ base: { identifier: 'c3' } }, true);

        const { container } = render(InlineChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices
            }
        });

        return tick().then(() => {
            expect(container.querySelector('button span').innerHTML).toContain('Choice 3');
            expect(container.querySelector('input[data-type="select"]').value).toBe('c3');

            interactionStateStore.setResponse({
                base: {
                    identifier: null
                }
            });

            return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
                expect(container.querySelector('input[data-type="select"]').value).toBe('');
            });
        });
    });

    it('qtiClass is saved in itemState', () => {
        expect.assertions(3);

        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        const { container, getByText } = render(InlineChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices
            }
        });
        expect(interactionStateStore.get()).toMatchObject({ qtiClass });

        fireEvent.click(container.querySelector('button'));
        return tick()
            .then(() => {
                fireEvent.mouseUp(getByText('Choice 4'));
                return tick();
            })
            .then(() => {
                expect(interactionStateStore.getResponse()).toMatchObject({ base: { identifier: 'c4' } });
                expect(interactionStateStore.get()).toMatchObject({ qtiClass });
            });
    });

    describe('shuffle choices', () => {
        it('shuffles choices if `shuffle` attribute set to `true`', async () => {
            // Create test choices as an array to make shuffling more predictable
            const testChoices = [
                { key: 'c1', label: 'Choice 1', showHide: 'show' },
                { key: 'c2', label: 'Choice 2', showHide: 'show' },
                { key: 'c3', label: 'Choice 3', showHide: 'show' },
                { key: 'c4', label: 'Choice 4', showHide: 'show' },
                { key: 'c5', label: 'Choice 5', showHide: 'show' },
                { key: 'c6', label: 'Choice 6', showHide: 'show' }
            ];

            // Mock Math.random to ensure deterministic shuffling
            const originalRandom = Math.random;
            let callCount = 0;
            const mockValues = [0.8, 0.2, 0.9, 0.1, 0.7, 0.3]; // Values to ensure shuffling
            Math.random = vi.fn(() => mockValues[callCount++ % mockValues.length]);

            try {
                // First render without shuffle
                const shuffleItemId = 'shuffle-item-1';
                const shuffleResponseId = 'shuffle-response-1';

                const { container: container1 } = render(InlineChoiceInteraction, {
                    props: {
                        itemIdentifier: shuffleItemId,
                        responseIdentifier: shuffleResponseId,
                        choices: testChoices
                    }
                });
                const container1Snap = container1.innerHTML;

                // Reset call count for second render
                callCount = 0;

                // Second render with shuffle
                const shuffleItemId2 = 'shuffle-item-2';
                const shuffleResponseId2 = 'shuffle-response-2';

                const { container: container2 } = render(InlineChoiceInteraction, {
                    props: {
                        itemIdentifier: shuffleItemId2,
                        responseIdentifier: shuffleResponseId2,
                        choices: testChoices,
                        shuffle: true
                    }
                });
                const container2Snap = container2.innerHTML;

                // The shuffled version should be different from the unshuffled version
                expect(container1Snap).not.toEqual(container2Snap);
            } finally {
                // Restore original Math.random
                Math.random = originalRandom;
            }
        });

        it('preserves position of a choice if it has `fixed` attribute set to `true`', () => {
            const randomIndexes = [0, 3, 5, 9];
            const choiceOpts = [...Array(10).keys()].map((item, index) => ({
                fixed: randomIndexes.includes(index),
                key: `choice_${item}`,
                label: `Choice ${item}`,
                showHide: 'show'
            }));

            const fixedItemsIndexes = choiceOpts.filter(item => item.fixed).map(item => choiceOpts.indexOf(item));

            const { container } = render(InlineChoiceInteraction, {
                itemIdentifier,
                responseIdentifier,
                choices: choiceOpts,
                shuffle: true
            });

            for (const index of fixedItemsIndexes) {
                expect(container.querySelectorAll('[role="option"]')[index + 1].innerHTML).toEqual(
                    choiceOpts[index].label
                );
            }
        });
    });

    describe('Log events', () => {
        let interactionStateStore;
        const traceInteraction = vi.fn();
        let selectedChoice;
        let dropdown;

        beforeEach(() => {
            interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container, getByText } = render(InlineChoiceInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices
                }
            });

            const interaction = container.querySelector('.qti-inlineChoiceInteraction');
            interaction.addEventListener('interactiontrace', traceInteraction);
            selectedChoice = getByText('Choice 1');
            dropdown = container.querySelector('.select');
        });

        afterEach(() => {
            traceInteraction.mockRestore();
        });

        it('triggers DOM events on interaction click', () => {
            fireEvent.mouseUp(selectedChoice);
            return tick().then(() => {
                const interactionResponse = interactionStateStore.getResponse();
                expect(traceInteraction).toHaveBeenCalledTimes(1);
                expect(traceInteraction.mock.calls[0][0].detail).toEqual({
                    domEventType: 'mouseup',
                    newResponse: interactionResponse.base.identifier,
                    qtiChoiceIdentifier: interactionResponse.base.identifier,
                    target: selectedChoice
                });
            });
        });

        it('triggers DOM events on interaction keypress', () => {
            // force the dropdown to open
            fireEvent.keyDown(dropdown, { keyCode: 40 });

            return tick()
                .then(() => {
                    //  focus on 1st option
                    fireEvent.keyDown(selectedChoice, { keyCode: 40 });
                })
                .then(() => {
                    fireEvent.keyDown(selectedChoice, { keyCode: 13, key: 'Enter', bubbles: true });
                    // return tick();
                })
                .then(() => {
                    const interactionResponse = interactionStateStore.getResponse();
                    expect(traceInteraction).toHaveBeenCalledTimes(1);
                    expect(traceInteraction.mock.calls[0][0].detail).toEqual({
                        domEventType: 'keydown',
                        newResponse: interactionResponse.base.identifier,
                        pressedKey: 'Enter',
                        qtiChoiceIdentifier: interactionResponse.base.identifier,
                        target: selectedChoice
                    });
                });
        });
    });
});
