// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../../util/shuffleChoices.js', () => ({
    __esModule: true,
    default: vi.fn()
}));
import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import GapMatchInteraction from '../GapMatchInteraction.svelte';
import Gap from '../Gap.svelte';
import P from '../../../static/P.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../../itemsSessionStatusStore.js';
import userEvent from '@testing-library/user-event';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';
import shuffleChoiceOptions from '../../util/shuffleChoices.js';

const controlActions = {
    click: 'click',
    enter: '13',
    space: '32',
    escape: '27',
    tab: '9',
    down: '40'
};

const testBlockTree = [
    {
        type: 'container',
        component: P,
        children: [
            {
                type: 'text',
                content: 'TEXT'
            },
            {
                type: 'element',
                component: Gap,
                children: [],
                props: {
                    attributes: {
                        itemIdentifier: 'item-5',
                        identifier: 'gap_1'
                    }
                }
            }
        ]
    },
    {
        type: 'container',
        component: P,
        children: [
            {
                type: 'text',
                content: 'TEXT'
            },
            {
                type: 'element',
                component: Gap,
                children: [],
                props: {
                    attributes: {
                        itemIdentifier: 'item-5',
                        identifier: 'gap_2'
                    }
                }
            }
        ]
    }
];

const choices = [
    {
        identifier: 'choice_1',
        fixed: false,
        matchMax: 1,
        matchMin: 0,
        content: 'CHOICE1',
        blockTree: [
            {
                type: 'text',
                content: 'CHOICE1'
            }
        ]
    },
    {
        identifier: 'choice_2',
        fixed: false,
        matchMax: 1,
        matchMin: 0,
        content: 'CHOICE2',
        blockTree: [
            {
                type: 'text',
                content: 'CHOICE2'
            }
        ]
    },
    {
        identifier: 'choice_3',
        fixed: false,
        matchMax: 1,
        matchMin: 0,
        content: 'CHOICE3',
        blockTree: [
            {
                type: 'text',
                content: 'CHOICE3'
            }
        ]
    }
];

const gaps = [
    {
        identifier: 'gap_1'
    },
    {
        identifier: 'gap_2'
    }
];

const qtiClass = 'qti-gapMatchInteraction';
const itemIdentifier = 'foo';
const responseIdentifier = 'RESPONSE';
const cardinality = 'multiple';
const baseType = 'directedPair';

function clickOrPress(element, action) {
    element.focus();
    if (action === controlActions.click) {
        element.click();
    } else {
        fireEvent.keyDown(element, { keyCode: action });
        fireEvent.keyUp(element, { keyCode: action });
    }
}

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

window.HTMLElement.prototype.scrollIntoView = function () {};

beforeAll(() => {
    const originalConsoleError = console.error;
    vi.spyOn(console, 'error').mockImplementation((...args) => {
        if (args[0]?.includes('invalid response')) {
            return;
        }
        originalConsoleError(...args);
    });
});

beforeEach(() => {
    itemsStateStore.clear();
    itemsSessionStatusStore.clear();
    window.document.elementFromPoint = null;
});

afterAll(() => {
    vi.restoreAllMocks();
});

describe('GapMatchInteraction', () => {
    // RENDERING

    it('renders an answer area', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier: 'foo',
                blockTree: testBlockTree
            }
        });

        expect(container).toMatchSnapshot();
        expect(container.querySelectorAll('.gap').length).toBe(2);
    });

    it('renders a choice list', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier: 'foo',
                choices
            }
        });

        expect(container).toMatchSnapshot();
        expect(container.querySelectorAll('li.last').length).toBe(3);
    });

    it('renders prompt', () => {
        const text = 'Match a words with poem';
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier: 'foo',
                prompt: [
                    {
                        type: 'text',
                        content: text
                    }
                ]
            }
        });

        expect(container.querySelector('.qti-prompt')).toBeInTheDocument();
        expect(container.querySelector('.qti-prompt')).toHaveTextContent(text);
    });

    it('renders props into markup', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier: 'foo',
                responseIdentifier: 'RESPONSE',
                id: 'interactionId',
                classes: 'one two three',
                language: 'by',
                dir: 'rtl',
                role: 'anyRole',
                ariaAttrs: {
                    ariaFoo: 12,
                    ariaBar: 'baz'
                },
                minAssociations: '1',
                maxAssociations: '3',
                dataAttrs: {
                    'data-foo': 'bar',
                    'data-baz': 24
                },
                disabled: false
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders a top choice list', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier: 'foo',
                choices,
                classes: 'qti-choices-top'
            }
        });

        expect(container).toMatchSnapshot();
    });

    test.each([
        [1, '7.5rem'],
        [2, '7.5rem'],
        [3, '7.5rem'],
        [4, '8.6rem'],
        [6, '12.9rem'],
        [10, '21.5rem'],
        [15, '32.3rem'],
        [20, '43rem'],
        [72, '100%'],
        [100, '100%']
    ])('renders gap with "qti-input-width-%s" class', (qtiWidthClass, gapWidth) => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier: 'foo',
                choices,
                blockTree: [
                    {
                        type: 'container',
                        component: P,
                        children: [
                            {
                                type: 'text',
                                content: 'TEXT'
                            },
                            {
                                type: 'element',
                                component: Gap,
                                children: [],
                                props: {
                                    attributes: {
                                        itemIdentifier: 'item-5',
                                        identifier: 'gap_1',
                                        class: `qti-input-width-${qtiWidthClass}`
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        });

        const gap = container.querySelector('.gap');
        if (qtiWidthClass === 72) {
            expect(gap.getAttribute('style')).toContain(`--qti-gap-width: ${gapWidth}; --matched-gap-width: 100%`);
        } else if (qtiWidthClass === 100) {
            expect(gap.getAttribute('style')).toContain(`--qti-gap-width: ${gapWidth};`);
        } else if (qtiWidthClass < 4) {
            expect(gap.getAttribute('style')).toContain(`--qti-gap-width: ${gapWidth};`);
        } else {
            expect(gap.getAttribute('style')).toContain(`--qti-gap-width: ${gapWidth};`);
        }
    });

    it('renders correct feedbacks with constraints on associations', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                minAssociations: 1,
                maxAssociations: 3
            }
        });

        expect(container.querySelector('.qti-instruction-container')).toMatchSnapshot();
    });

    it('adapts the instructions when only one gap is available', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps: [gaps[0]],
                blockTree: [testBlockTree[0]]
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('adapts the instructions when only one free gap is remaining and one choice is left', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            true
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices: [choices[0], choices[1]],
                gaps,
                blockTree: testBlockTree
            }
        });

        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('is disabled in closed session', () => {
        expect.assertions(1);
        const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);

        itemSessionStatusStore.set('closed');

        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier
            }
        });

        expect(container.querySelector('.qti-gapMatchInteraction').getAttribute('aria-disabled')).toBe('true');
    });

    it('moves focus over the elements in answer area', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });

        expect(container.querySelectorAll('.gap-droppable.matched').length).toBe(1);
        const gapElements = container.querySelectorAll('.gap-droppable');
        expect(gapElements.length).toBe(2);
        let focusedGap = null;
        let nextGapAfterFocused = null;
        for (let i in gapElements) {
            const gap = gapElements[i];
            if (focusedGap) {
                nextGapAfterFocused = gap;
                break;
            }
            if (gap.classList.contains('matched')) {
                focusedGap = gap;
            }
        }
        // on focusing this element focus jump to first filed gap or out of interaction
        const focusableHelperArea = container.querySelector('.answer-area .visually-hidden');
        focusableHelperArea.focus();

        return tick()
            .then(() => {
                expect(focusedGap).toMatchSnapshot();
                //wait focusing finished
                return new Promise(resolve => {
                    setTimeout(resolve, 200);
                });
            })
            .then(() => {
                //choice placeholder is focused
                expect(focusedGap).toMatchSnapshot();
                expect(focusedGap.querySelector('.item-btn')).toHaveFocus();
                expect(focusedGap).not.toHaveFocus();
                clickOrPress(focusedGap, controlActions.down);
                return tick();
            })
            .then(() => {
                expect(focusedGap).toMatchSnapshot();
                //wait focusing finished
                return new Promise(resolve => {
                    setTimeout(resolve, 200);
                });
            })
            .then(() => {
                //'remove' button is focused
                expect(focusedGap).toMatchSnapshot();
                expect(focusedGap.querySelector('.remover')).toHaveFocus();
                expect(focusedGap.querySelector('.item-btn')).not.toHaveFocus();
                clickOrPress(focusedGap, controlActions.down);
                return tick();
            })
            .then(() => {
                expect(focusedGap).toMatchSnapshot();
                //wait focusing finished
                return new Promise(resolve => {
                    setTimeout(resolve, 500);
                });
            })
            .then(() => {
                //choice placeholder is focused
                expect(nextGapAfterFocused).toMatchSnapshot();
                expect(nextGapAfterFocused).not.toHaveFocus();
                expect(focusedGap.querySelector('.remover')).not.toHaveFocus();
                expect(focusedGap.querySelector('.item-btn')).toHaveFocus();
            });
    });

    it('move choices between gaps by click', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        const gapElements = container.querySelectorAll('.gap-droppable');
        const matchedChoice = container.querySelector('.gap-droppable.matched .item-btn');
        //click on choice in gap
        clickOrPress(matchedChoice, controlActions.click);

        return tick()
            .then(() => {
                expect(gapElements[0]).toHaveClass('selected', 'activated');
                //click on empty gap. gaps[0] is matched
                clickOrPress(gapElements[1], controlActions.click);
                return tick();
            })
            .then(() => {
                expect(gapElements[1]).toMatchSnapshot();
                expect(gapElements[0].children).toHaveLength(1);
            })
            .then(() => {
                expect(document.activeElement).toBe(gapElements[1]);
            });
    });

    it('adds choice to answer area by click', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        expect(interactionStateStore.get()).toMatchObject({ qtiClass });

        const firstGap = container.querySelector('.gap-droppable');
        const firstChoice = container.querySelector('li .item-btn');
        clickOrPress(firstChoice, controlActions.click);

        return tick()
            .then(() => {
                clickOrPress(firstGap, controlActions.click);
                return tick();
            })
            .then(() => {
                expect(firstGap).toMatchSnapshot();

                expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_1', 'gap_1']]);
                expect(interactionStateStore.getValidity()).toBe(true);
                expect(interactionStateStore.get()).toMatchObject({ qtiClass });
            });
    });

    it('is select choices by click', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps
            }
        });
        expect(container.querySelectorAll('li.last').length).toBe(3);

        expect(container.querySelectorAll('li .item-btn-container.selected').length).toBe(0);
        const firstChoice = container.querySelector('li .item-btn');

        clickOrPress(firstChoice, controlActions.click);

        return tick().then(() => {
            expect(firstChoice.closest('.item-btn-container')).toHaveClass('selected');
            expect(container.querySelectorAll('li.last .item-btn-container.selected').length).toBe(1);
        });
    });

    test.each([controlActions.enter, controlActions.space])('remove matched choice by pressing key', action => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        expect(container.querySelectorAll('li:not(.removed)').length).toBe(2);
        const matchedGaps = container.querySelectorAll('.gap-droppable.matched');
        expect(matchedGaps.length).toBe(1);
        const choiceToRemove = matchedGaps[0];

        clickOrPress(choiceToRemove.querySelector('.remover'), action);
        return tick().then(() => {
            expect(container).toMatchSnapshot();
            expect(container.getElementsByTagName('li').length).toBe(3);
            expect(container.querySelectorAll('.gap-droppable.matched').length).toBe(0);
        });
    });

    test.each([controlActions.space])('adds choice to answer area by pressing key', action => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });

        const firstGap = container.querySelector('.gap-droppable');
        const firstChoice = container.querySelector('li .item-btn');
        clickOrPress(firstChoice, action);

        return tick()
            .then(() => {
                clickOrPress(firstGap, action);
                return tick();
            })
            .then(() => {
                expect(firstGap).toMatchSnapshot();

                const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
                expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_1', 'gap_1']]);
                expect(interactionStateStore.getValidity()).toBe(true);
                userEvent.tab({ shift: true });
            })
            .then(tick)
            .then(() => {
                userEvent.tab({ shift: true });
            })
            .then(tick)
            .then(() => {
                const firstChoiceInList = container.querySelector('.choices-area .item-btn');
                expect(firstChoiceInList).toMatchSnapshot();
            });
    });

    test.each([controlActions.enter, controlActions.space])('move choices between gaps by pressing key', action => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        const gapElements = container.querySelectorAll('.gap-droppable');
        const matchedChoice = container.querySelector('.gap-droppable.matched .item-btn');
        //click on filled gap
        clickOrPress(matchedChoice, action);
        return tick()
            .then(() => {
                expect(gapElements[0]).toHaveClass('selected');
                //click on empty gap
                clickOrPress(gapElements[1], action);
                return tick();
            })
            .then(() => {
                expect(gapElements[1]).toMatchSnapshot();
                expect(gapElements[0].children).toHaveLength(1);
            });
    });

    it('removes matched choice by click', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        expect(container.querySelectorAll('li:not(.removed)').length).toBe(2);
        const matchedGaps = container.querySelectorAll('.gap-droppable.matched');
        expect(matchedGaps.length).toBe(1);
        const choiceToRemove = matchedGaps[0];
        clickOrPress(choiceToRemove.querySelector('.remover'), controlActions.click);
        return tick().then(() => {
            expect(container).toMatchSnapshot();
            expect(container.getElementsByTagName('li').length).toBe(3);
            expect(container.querySelectorAll('.gap-droppable.matched').length).toBe(0);
        });
    });

    it('does not trigger re-focus on removing matched choice by mouse click', async () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        const matchedGaps = container.querySelectorAll('.gap-droppable.matched');
        const choiceToRemove = matchedGaps[0];
        const removeButton = choiceToRemove.querySelector('.remover');
        clickOrPress(removeButton, controlActions.click);

        await tick();

        expect(container.querySelectorAll('.draggable-list .item-btn')[0]).not.toHaveFocus();
    });

    it('triggers re-focus on removing matched choice by keyboard navigation', async () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        const matchedGaps = container.querySelectorAll('.gap-droppable.matched');
        const choiceToRemove = matchedGaps[0];
        const removeButton = choiceToRemove.querySelector('.remover');
        clickOrPress(removeButton, controlActions.enter);

        await tick();
        await tick();

        expect(container.querySelectorAll('.draggable-list .item-btn')[0]).toHaveFocus();
    });

    test.each([controlActions.enter, controlActions.space])('keypress on choice if all gaps is filled', action => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [
                    ['choice_1', 'gap_1'],
                    ['choice_2', 'gap_2']
                ]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        let unselectedChoices = container.querySelectorAll('li:not(.removed) .item-btn');
        expect(unselectedChoices.length).toBe(1);
        const emptyGaps = container.querySelectorAll('.gap-droppable:not(.matched)');
        expect(emptyGaps.length).toBe(0);
        clickOrPress(unselectedChoices[0], action);
        return tick().then(() => {
            expect(container).toMatchSnapshot();
            expect(document.activeElement).toBe(unselectedChoices[0]);
        });
    });

    it('adds choice to answer area by click 2', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });

        const firstGap = container.querySelector('.gap-droppable');
        const firstChoice = container.querySelector('li .item-btn');
        clickOrPress(firstChoice, controlActions.click);

        return tick()
            .then(() => {
                clickOrPress(firstGap, controlActions.click);
                return tick();
            })
            .then(() => {
                expect(firstGap).toMatchSnapshot();

                const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
                expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_1', 'gap_1']]);
                expect(interactionStateStore.getValidity()).toBe(true);
            });
    });

    it('swap choices in answer area by click', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps
            }
        });
        const choicesInList = container.querySelectorAll('li .item-btn');
        expect(choicesInList.length).toBe(3);
        const firstChoice = choicesInList[0];
        const secondChoice = choicesInList[1];
        clickOrPress(firstChoice, controlActions.click);

        return tick()
            .then(() => {
                clickOrPress(secondChoice, controlActions.click);
                return tick();
            })
            .then(() => {
                expect(choicesInList).toMatchSnapshot();
                expect(container.getElementsByTagName('li').length).toBe(3);

                expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                expect(interactionStateStore.getValidity()).toBe(true);
            });
    });
});

describe('drag and drop', () => {
    afterEach(() => {
        itemsStateStore.clear();
        itemsSessionStatusStore.clear();
        window.document.elementFromPoint = null;
    });

    it('adds choice to answer area', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });

        const firstGap = container.querySelector('.gap-droppable');
        const firstChoice = container.querySelector('li .item-btn');

        return tick().then(() =>
            dragAndDropElement(firstChoice, firstGap).then(() => {
                expect(firstGap).toMatchSnapshot();

                const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
                expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_1', 'gap_1']]);
                expect(interactionStateStore.getValidity()).toBe(true);
            })
        );
    });

    it('adds choice to another place in answer area', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        const matchedGap = container.querySelector('.gap-droppable.matched');
        const firstEmptyGap = container.querySelectorAll('.gap-droppable:not(.matched)')[0];
        const matchedChoice = matchedGap.querySelector('.draggable-container');
        return tick().then(() =>
            dragAndDropElement(matchedChoice, firstEmptyGap).then(() => {
                expect(matchedGap.children).toHaveLength(1);
                expect(firstEmptyGap).toMatchSnapshot();

                // aria labels
                expect(matchedGap.getAttribute('aria-labelledby')).toBe('gap_1_label');
                expect(firstEmptyGap.getAttribute('aria-labelledby')).toBe('gap_2_label');

                expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_1', 'gap_2']]);
                expect(interactionStateStore.getValidity()).toBe(true);
            })
        );
    });

    it('moves back choice with drag from answer area to choice area', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        const matchedGap = container.querySelector('.gap-droppable.matched');
        const choicesList = container.querySelector('.draggable-list');
        const matchedChoice = matchedGap.querySelector('.draggable-container');
        return tick().then(() =>
            dragAndDropElement(matchedChoice, choicesList).then(() => {
                expect(matchedGap.children).toHaveLength(1);
                expect(choicesList).toMatchSnapshot();

                expect(container.getElementsByTagName('li').length).toBe(3);

                expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                expect(interactionStateStore.getValidity()).toBe(true);
            })
        );
    });

    it('adds choice to another place in answer area and replace another', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [
                    ['choice_1', 'gap_1'],
                    ['choice_2', 'gap_2']
                ]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree,
                maxAssociations: 2
            }
        });
        const matchedGaps = container.querySelectorAll('.gap-droppable.matched');
        const matchedChoice = matchedGaps[0].querySelector('.draggable-container');
        expect(matchedGaps.length).toBe(2);
        return tick().then(() =>
            dragAndDropElement(matchedChoice, matchedGaps[1]).then(() => {
                expect(matchedGaps[0]).toMatchSnapshot();
                expect(matchedGaps[1]).toMatchSnapshot();

                expect(interactionStateStore.getResponseValue()).toMatchObject([
                    ['choice_1', 'gap_2'],
                    ['choice_2', 'gap_1']
                ]);
                expect(interactionStateStore.getValidity()).toBe(true);
            })
        );
    });

    it('swap choice from choice area to answer area and replace another', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree,
                maxAssociations: 2
            }
        });

        const firstChoice = container.querySelector('li .item-btn');
        let matchedGaps = container.querySelectorAll('.gap-droppable.matched');
        expect(matchedGaps.length).toBe(1);

        return tick().then(() =>
            dragAndDropElement(firstChoice, matchedGaps[0]).then(() => {
                matchedGaps = container.querySelectorAll('.gap-droppable.matched');
                expect(matchedGaps[0]).toMatchSnapshot();
                expect(matchedGaps.length).toBe(1);
                expect(container.querySelectorAll('li:not(.removed) .item-btn').length).toBe(2);

                expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_2', 'gap_1']]);
                expect(interactionStateStore.getValidity()).toBe(true);
            })
        );
    });

    it('swap choice from answer area to choice area', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        const matchedGap = container.querySelector('.gap-droppable.matched');
        const firstChoiceInList = container.querySelector('li:not(.removed) .drop-area');
        const matchedChoice = container.querySelector('.gap-droppable.matched .item-btn');
        return tick().then(() =>
            dragAndDropElement(matchedChoice, firstChoiceInList).then(() => {
                expect(matchedGap).not.toBeEmptyDOMElement();
                expect(firstChoiceInList).toMatchSnapshot();

                expect(container.getElementsByTagName('li').length).toBe(3);

                expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_2', 'gap_1']]);
                expect(interactionStateStore.getValidity()).toBe(true);
            })
        );
    });

    it('swap choices in answer area', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps
            }
        });
        const choicesInList = container.querySelectorAll('li');
        expect(choicesInList.length).toBe(3);
        const firstChoice = choicesInList[0].querySelector('.draggable-container');
        const secondChoice = choicesInList[1].querySelector('.drop-area');
        return tick().then(() =>
            dragAndDropElement(firstChoice, secondChoice).then(() => {
                expect(choicesInList).toMatchSnapshot();
                expect(container.getElementsByTagName('li').length).toBe(3);

                expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                expect(interactionStateStore.getValidity()).toBe(true);
            })
        );
    });

    it('cancel selection for choice', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree
            }
        });
        const matchedGap = container.querySelector('.gap-droppable.matched');
        expect(matchedGap).toBeInTheDocument();
        const matchedChoice = matchedGap.querySelector('.item-btn');
        //activate choice
        clickOrPress(matchedChoice, controlActions.click);
        return tick()
            .then(() => {
                expect(matchedGap).toHaveClass('activated');
                // cancel activation by click outside
                clickOrPress(document.body, controlActions.click);
                return tick();
            })
            .then(() => {
                expect(matchedGap).not.toHaveClass('activated');
                //activate choice
                clickOrPress(matchedChoice, controlActions.click);
                return tick();
            })
            .then(() => {
                expect(matchedGap).toHaveClass('activated');
                // cancel activation by pressing 'esc'
                clickOrPress(matchedChoice, controlActions.escape);
                return tick();
            })
            .then(() => {
                expect(matchedGap).not.toHaveClass('activated');
            });
    });
});

describe('store saving and validation', () => {
    afterEach(() => {
        itemsStateStore.clear();
        itemsSessionStatusStore.clear();
    });

    it('validity is true when matchMins and matchMax are valid', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices: [
                    {
                        identifier: 'choice_1',
                        fixed: false,
                        matchMax: 1,
                        matchMin: 0,
                        content: 'CHOICE1',
                        blockTree: [
                            {
                                type: 'text',
                                content: 'CHOICE1'
                            }
                        ]
                    }
                ],
                gaps,
                blockTree: testBlockTree
            }
        });
        const firstGap = container.querySelector('.gap-droppable:not(.matched)');
        const firstChoice = container.querySelector('li .item-btn');
        clickOrPress(firstChoice, controlActions.click);

        return tick()
            .then(() => {
                clickOrPress(firstGap, controlActions.click);
                return tick();
            })
            .then(() => {
                const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
                expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_1', 'gap_1']]);
                expect(interactionStateStore.getValidity()).toBe(true);
                return tick();
            });
    });

    it('validity is false when matchMins are not correct', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices: [
                    {
                        identifier: 'choice_1',
                        fixed: false,
                        matchMax: 3,
                        matchMin: 2,
                        content: 'CHOICE1',
                        blockTree: [
                            {
                                type: 'text',
                                content: 'CHOICE1'
                            }
                        ]
                    }
                ],
                gaps,
                blockTree: testBlockTree
            }
        });
        const firstGap = container.querySelector('.gap-droppable:not(.matched)');
        const firstChoice = container.querySelector('li .item-btn');
        clickOrPress(firstChoice, controlActions.click);

        return tick()
            .then(() => {
                clickOrPress(firstGap, controlActions.click);
                return tick();
            })
            .then(() => {
                const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
                expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_1', 'gap_1']]);
                expect(interactionStateStore.getValidity()).toBe(false);
            });
    });

    it('validity is false when matchMax are not correct', () => {
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices: [
                    {
                        identifier: 'choice_1',
                        fixed: false,
                        matchMax: -1,
                        matchMin: 1,
                        content: 'CHOICE1',
                        blockTree: [
                            {
                                type: 'text',
                                content: 'CHOICE1'
                            }
                        ]
                    }
                ],
                gaps,
                blockTree: testBlockTree
            }
        });
        const firstGap = container.querySelector('.gap-droppable:not(.matched)');
        const firstChoice = container.querySelector('li .item-btn');
        clickOrPress(firstChoice, controlActions.click);

        return tick()
            .then(() => {
                clickOrPress(firstGap, controlActions.click);
                return tick();
            })
            .then(() => {
                const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
                expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_1', 'gap_1']]);
                expect(interactionStateStore.getValidity()).toBe(false);
            });
    });

    test.each([
        { associations: 2, validity: true },
        { associations: 1, validity: false }
    ])('validity depends on maxAssociations', ({ associations, validity }) => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [['choice_1', 'gap_1']]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree,
                maxAssociations: associations
            }
        });
        const firstGap = container.querySelector('.gap-droppable:not(.matched)');
        const firstChoice = container.querySelector('li .item-btn');
        clickOrPress(firstChoice, controlActions.click);

        return tick()
            .then(() => {
                clickOrPress(firstGap, controlActions.click);
                return tick();
            })
            .then(() => {
                expect(interactionStateStore.getResponseValue()).toMatchObject([
                    ['choice_1', 'gap_1'],
                    ['choice_2', 'gap_2']
                ]);
                expect(interactionStateStore.getValidity()).toBe(validity);
            });
    });

    test.each([
        { associations: 2, validity: false },
        { associations: 1, validity: true }
    ])('validity depends on minAssociations', ({ associations, validity }) => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: [
                    ['choice_1', 'gap_1'],
                    ['choice_2', 'gap_2']
                ]
            },
            false
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                blockTree: testBlockTree,
                minAssociations: associations
            }
        });
        clickOrPress(document.body, controlActions.click);

        return tick()
            .then(() => {
                const firstGap = container.querySelector('.gap-droppable.matched');
                expect(firstGap).toBeInTheDocument();
                const removeButton = firstGap.querySelector('button.remover');
                expect(removeButton).toBeInTheDocument();
                clickOrPress(removeButton, controlActions.click);
                return tick();
            })
            .then(() => {
                expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_2', 'gap_2']]);
                expect(interactionStateStore.getValidity()).toBe(validity);
            });
    });

    it('renders the instruction lang on the feedback blocks', () => {
        const getInstructionsLang = vi.fn(() => 'en-AU');
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
                testComponent: GapMatchInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    gaps,
                    blockTree: testBlockTree,
                    maxAssociations: 2
                }
            }
        });
        expect(container).toMatchSnapshot();
        expect(getInstructionsLang).toHaveBeenCalled();
        expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toEqual('en-AU');
    });

    test.each([[['choice_1', 'not_a_real_gap_1']], [['not_a_real_choice_1', 'gap_1']]])(
        'corrupted response will not be loaded',
        initialValue => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: initialValue
                },
                false
            );
            const { container } = render(GapMatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    choices,
                    gaps,
                    blockTree: testBlockTree
                }
            });
            // Verify that corrupt state not set to UI
            expect(container.querySelectorAll('.gap').length).toBe(2);
            expect(container.querySelectorAll('.gap-droppable.matched').length).toBe(0);
            expect(container.querySelectorAll('li .item-btn').length).toBe(3);
            expect(container.querySelectorAll('li.removed .item-btn').length).toBe(0);

            // Place a choice, to verify corrupt state gets erased
            const firstGap = container.querySelector('.gap-droppable');
            const firstChoice = container.querySelector('li .item-btn');
            clickOrPress(firstChoice, controlActions.click);

            return tick()
                .then(() => {
                    clickOrPress(firstGap, controlActions.click);
                    return tick();
                })
                .then(() => {
                    expect(interactionStateStore.getResponseValue()).toMatchObject([['choice_1', 'gap_1']]);
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        }
    );

    it('single cardinality: loads and stores response', async () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: ['choice_2', 'gap_1']
            },
            true
        );
        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                cardinality: 'single',
                choices,
                gaps: [gaps[0]],
                blockTree: [testBlockTree[0]]
            }
        });

        // Verify that state is set to UI
        expect(container.querySelectorAll('.gap').length).toBe(1);
        expect(container.querySelectorAll('.gap-droppable.matched').length).toBe(1);
        expect(container.querySelectorAll('li .item-btn').length).toBe(3);
        expect(container.querySelectorAll('li.removed .item-btn').length).toBe(1);

        // Remove choice
        const firstGap = container.querySelector('.gap-droppable');
        const firstGapRemover = firstGap.querySelector('.remover');
        clickOrPress(firstGapRemover, controlActions.click);
        await tick();
        expect(interactionStateStore.getResponseValue()).toBe(void 0);

        // Add choice
        const firstChoice = container.querySelector('li .item-btn');
        clickOrPress(firstChoice, controlActions.click);
        clickOrPress(firstGap, controlActions.click);
        await tick();
        expect(interactionStateStore.getResponseValue()).toMatchObject(['choice_1', 'gap_1']);
    });
});

describe('shuffle choices', () => {
    it('renders choices shuffled if attribute is true', () => {
        shuffleChoiceOptions.mockImplementationOnce(choicesParam => {
            expect(shuffleChoiceOptions).toHaveBeenCalled();
            return [choicesParam[1], choicesParam[0], choicesParam[2]];
        });

        const { container } = render(GapMatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices,
                gaps,
                shuffle: true
            }
        });

        expect(container).toMatchSnapshot();
    });
});
