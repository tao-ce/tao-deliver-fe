// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import MatchInteraction from '../MatchInteraction.svelte';
import Math from '../../../static/Math.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';
import { tick } from 'svelte';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';
import { getMathJax } from '../../../static/math/mathjax.js';

const getInstructionsLang = vi.fn(() => 'nb-NO');
const testContext = {
    getAssetManager: () => ({
        resolve: src => src
    }),
    registerLoadingElement: vi.fn(),
    getInstructionsLang
};

const choiceSet1 = [
    {
        key: 'A',
        content: 'A',
        plainText: 'A',
        position: 1,
        blockTree: [{ type: 'text', content: 'A' }],
        matchMin: 0,
        matchMax: 1
    },
    {
        key: 'B',
        content: 'B',
        plainText: 'B',
        position: 2,
        blockTree: [{ type: 'text', content: 'B' }],
        matchMin: 0,
        matchMax: 0
    }
];

const choiceSet2 = [
    {
        key: 'C',
        content: 'C',
        plainText: 'C',
        position: 1,
        blockTree: [{ type: 'text', content: 'C' }],
        matchMin: 0,
        matchMax: 0
    },
    {
        key: 'D',
        content: 'D',
        plainText: 'D',
        position: 2,
        blockTree: [{ type: 'text', content: 'D' }],
        matchMin: 0,
        matchMax: 0
    }
];

const choices = [choiceSet1, choiceSet2];
const baseType = 'directedPair';
const cardinality = 'single';
const itemIdentifier = 'i12345';
const responseIdentifier = 'RESPONSE_1';
const classes = 'qti-match-non-tabular';
const qtiClass = 'qti-matchInteraction';

const selectorHelperFactory = container => ({
    // Non-Tabular helpers
    getDropArea(areaKey) {
        return container.querySelector(`.drop-area[data-drag-drop-key="${areaKey}"]`);
    },
    getDropList(areaKey) {
        return this.getDropArea(areaKey).querySelector('ul');
    },
    getDraggable(areaKey, choiceKey) {
        return this.getDropArea(areaKey).querySelector(`.draggable-container[data-drag-drop-key="${choiceKey}"]`);
    },
    getItemBtnContainer(areaKey, choiceKey) {
        return this.getDraggable(areaKey, choiceKey).parentNode;
    },
    getListItem(areaKey, choiceKey) {
        return this.getDraggable(areaKey, choiceKey).closest('li');
    },
    getItemBtn(areaKey, choiceKey) {
        return this.getDraggable(areaKey, choiceKey).querySelector('.item-btn');
    }
});

describe('MatchInteraction Non-Tabular', () => {
    // load library early
    beforeAll(() => getMathJax());

    afterEach(() => {
        itemsStateStore.clear();
    });

    describe('Rendering', () => {
        it('renders non-tabular component', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: MatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        classes,
                        choices
                    }
                }
            });

            expect(container).toMatchSnapshot();
        });

        it('renders non-tabular component with stored response (single cardinality)', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: [['A', 'D']]
                },
                true
            );

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices
                }
            });

            expect(container.querySelector('.match-non-tabular .layout-container')).toMatchSnapshot();
        });

        it('renders non-tabular component with stored response (multiple cardinality)', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [
                        ['A', 'D'],
                        ['B', 'C']
                    ]
                },
                true
            );

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices
                }
            });

            expect(container.querySelector('.match-non-tabular .layout-container')).toMatchSnapshot();
        });

        it('renders non-tabular component with complex X & Y headers', () => {
            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices: [
                        [
                            {
                                key: 'A',
                                content: '{{i5f50a5ada92e3}} <em>d</em>',
                                plainText: 'd',
                                blockTree: [
                                    {
                                        type: 'element',
                                        content: 'i5f50a5ada92e3',
                                        component: Math,
                                        children: [],
                                        props: {
                                            itemIdentifier: 'item-3',
                                            attributes: {
                                                mathML: '<semantics>\n <mstyle displaystyle="true" scriptlevel="0">\n <mrow class="MJX-TeXAtom-ORD">\n <mi>π</mi>\n </mrow>\n </mstyle>\n \n </semantics>'
                                            }
                                        }
                                    },
                                    {
                                        type: 'html',
                                        content: '<i>r</i>'
                                    },
                                    {
                                        type: 'html',
                                        content: '<sup>2</sup>'
                                    },
                                    {
                                        type: 'html',
                                        content: '<i>h</i>'
                                    }
                                ],
                                position: 1,
                                matchMin: 0,
                                matchMax: 2
                            }
                        ],
                        [
                            {
                                key: 'C',
                                content: '{{i5f50a5ada918c}} <em>d</em>',
                                plainText: 'd',
                                blockTree: [
                                    {
                                        type: 'element',
                                        content: 'i5f50a5ada918c',
                                        component: Math,
                                        children: [],
                                        props: {
                                            attributes: {
                                                mathML: '<semantics>\n <mstyle displaystyle="true" scriptlevel="0">\n <mrow class="MJX-TeXAtom-ORD">\n <mi>π</mi>\n </mrow>\n </mstyle>\n \n </semantics>'
                                            }
                                        }
                                    },
                                    {
                                        type: 'html',
                                        content: '<em>d</em>'
                                    }
                                ],
                                position: 1,
                                matchMin: 0,
                                matchMax: 2
                            }
                        ]
                    ]
                }
            });

            return tick()
                .then(() => tick())
                .then(() => tick())
                .then(() => tick())
                .then(() => tick())
                .then(() => {
                    expect(container.querySelector('.match-non-tabular .layout-container')).toMatchSnapshot();
                });
        });
    });

    describe('Behaviour - drag', () => {
        const dragAndDropElement = (draggable, dropArea, cancelByKey = false) => {
            fireEvent.mouseDown(draggable);

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
                    dropArea.dispatchEvent(
                        new CustomEvent('out', { detail: { draggableKey, dropAreaKey }, bubbles: true })
                    );
                    dropArea.dispatchEvent(
                        new CustomEvent('over', { detail: { draggableKey, dropAreaKey }, bubbles: true })
                    );
                    return tick();
                })
                .then(() => {
                    if (cancelByKey) {
                        fireEvent.keyDown(window, { keyCode: 27 }); //esc
                    }
                    draggable.dispatchEvent(new CustomEvent('dragStop', { detail: { draggableKey }, bubbles: true }));
                    dropArea.dispatchEvent(
                        new CustomEvent('update', {
                            detail: { dropAreaKey, draggableKey, initialDropAreaKey },
                            bubbles: true
                        })
                    );
                    return tick();
                });
        };

        test.each([
            [
                'A',
                'choices',
                'bucket_C',
                [
                    ['B', 'D'],
                    ['A', 'C']
                ]
            ],
            ['B', 'bucket_D', 'bucket_C', [['B', 'C']]],
            ['B', 'bucket_D', 'choices', []],
            ['B', 'bucket_D', 'bucket_D', [['B', 'D']]],
            ['A', 'choices', 'choices', [['B', 'D']]]
        ])(
            'can drag choice %s from area %s to area %s and response is updated',
            (choiceKey, sourceKey, targetKey, expectedResponse) => {
                expect.assertions(2);

                const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
                interactionStateStore.setResponseValue(
                    {
                        cardinality: 'multiple',
                        baseType,
                        value: [['B', 'D']]
                    },
                    true
                );

                const { container } = render(MatchInteraction, {
                    props: {
                        itemIdentifier,
                        responseIdentifier,
                        classes,
                        choices,
                        maxAssociations: 0
                    }
                });

                const selectorHelper = selectorHelperFactory(container);

                return tick().then(() =>
                    dragAndDropElement(
                        selectorHelper.getDraggable(sourceKey, choiceKey),
                        selectorHelper.getDropArea(targetKey)
                    )
                        .then(tick)
                        .then(() => {
                            expect(interactionStateStore.getResponseValue()).toMatchObject(expectedResponse);
                            expect(interactionStateStore.getValidity()).toBe(true);
                        })
                );
            }
        );

        it('can cancel drag by drag to body', () => {
            expect.assertions(2);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices,
                    maxAssociations: 0
                }
            });

            const selectorHelper = selectorHelperFactory(container);

            return tick().then(() =>
                dragAndDropElement(selectorHelper.getDraggable('choices', 'A'), document.body)
                    .then(tick)
                    .then(() => {
                        expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                        expect(interactionStateStore.getValidity()).toBe(true);
                    })
            );
        });

        it('can cancel drag by Escape key', () => {
            expect.assertions(2);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices,
                    maxAssociations: 0
                }
            });

            const selectorHelper = selectorHelperFactory(container);

            return tick().then(() =>
                dragAndDropElement(
                    selectorHelper.getDraggable('choices', 'A'),
                    selectorHelper.getDropArea('bucket_C'),
                    true
                )
                    .then(tick)
                    .then(() => {
                        expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                        expect(interactionStateStore.getValidity()).toBe(true);
                    })
            );
        });
    });

    describe('Behaviour - click', () => {
        const clickAndClick = (element, dropArea, cancelByKey = false) => {
            fireEvent.click(element);

            return tick().then(() => {
                if (cancelByKey) {
                    fireEvent.keyDown(window, { keyCode: 27 }); //esc
                }
                fireEvent.click(dropArea);

                return tick();
            });
        };

        it('can click choice and then deselect it', () => {
            expect.assertions(5);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices,
                    maxAssociations: 0
                }
            });

            const selectorHelper = selectorHelperFactory(container);

            const choiceA = selectorHelper.getItemBtn('choices', 'A');
            const choiceAContainer = selectorHelper.getItemBtnContainer('choices', 'A');
            expect(choiceAContainer).not.toHaveClass('selected');
            choiceA.click();

            return tick()
                .then(() => {
                    expect(choiceAContainer).toHaveClass('selected');
                    choiceA.click();
                })
                .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(choiceAContainer).not.toHaveClass('selected');
                    expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });

        it('can click away to deselect', () => {
            expect.assertions(5);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices,
                    maxAssociations: 0
                }
            });

            const selectorHelper = selectorHelperFactory(container);

            const choiceA = selectorHelper.getItemBtn('choices', 'A');
            const choiceAContainer = selectorHelper.getItemBtnContainer('choices', 'A');
            expect(choiceAContainer).not.toHaveClass('selected');
            choiceA.click();

            return tick()
                .then(() => {
                    expect(choiceAContainer).toHaveClass('selected');
                    document.body.click();
                })
                .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(choiceAContainer).not.toHaveClass('selected');
                    expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });

        test.each([
            [
                'A',
                'choices',
                'bucket_C',
                [
                    ['B', 'D'],
                    ['A', 'C']
                ]
            ],
            ['B', 'bucket_D', 'bucket_C', [['B', 'C']]],
            ['B', 'bucket_D', 'choices', []],
            ['B', 'bucket_D', 'bucket_D', [['B', 'D']]],
            ['A', 'choices', 'choices', [['B', 'D']]]
        ])(
            'can click choice %s from area %s to area %s and response is updated',
            (choiceKey, sourceKey, targetKey, expectedResponse) => {
                expect.assertions(2);

                const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
                interactionStateStore.setResponseValue(
                    {
                        cardinality: 'multiple',
                        baseType,
                        value: [['B', 'D']]
                    },
                    true
                );

                const { container } = render(MatchInteraction, {
                    props: {
                        itemIdentifier,
                        responseIdentifier,
                        classes,
                        choices,
                        maxAssociations: 0
                    }
                });

                const selectorHelper = selectorHelperFactory(container);

                return clickAndClick(
                    selectorHelper.getItemBtn(sourceKey, choiceKey),
                    selectorHelper.getDropArea(targetKey)
                )
                    .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                    .then(tick)
                    .then(() => {
                        expect(interactionStateStore.getResponseValue()).toMatchObject(expectedResponse);
                        expect(interactionStateStore.getValidity()).toBe(true);
                    });
            }
        );

        it('can remove by remove icon', () => {
            expect.assertions(2);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [['A', 'D']]
                },
                true
            );

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices,
                    maxAssociations: 0
                }
            });

            const selectorHelper = selectorHelperFactory(container);
            const choiceA = selectorHelper.getDraggable('bucket_D', 'A');
            choiceA.querySelector('.remover').click();

            return new Promise(resolve => setTimeout(resolve, 0)) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });
    });

    describe('Behaviour - keyboard', () => {
        it('choice list is a single tabstop', () => {
            expect.assertions(6);

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices
                }
            });

            const button = document.createElement('button');

            const choice1 = container.querySelector('.choices li:first-child .item-btn');
            const choice2 = container.querySelector('.choices li:last-child .item-btn');

            expect(choice1.getAttribute('tabindex')).toBe('0');
            expect(choice2.getAttribute('tabindex')).toBe('-1');

            choice1.focus();

            return tick()
                .then(() => {
                    expect(choice1.getAttribute('tabindex')).toBe('-1');
                    expect(choice2.getAttribute('tabindex')).toBe('-1');

                    document.body.appendChild(button);
                    button.focus();

                    return tick();
                })
                .then(() => {
                    button.remove();
                    expect(choice1.getAttribute('tabindex')).toBe('0');
                    expect(choice2.getAttribute('tabindex')).toBe('-1');
                });
        });

        test.each(['Enter', 'Space'])('can select and deselect an unused choice on %s', keyName => {
            expect.assertions(7);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices
                }
            });
            expect(interactionStateStore.getResponseValue()).toBeUndefined();

            const selectorHelper = selectorHelperFactory(container);

            // Initial target
            const choiceA_unused = selectorHelper.getItemBtn('choices', 'A');
            const choiceAContainer = selectorHelper.getItemBtnContainer('choices', 'A');
            expect(choiceAContainer).not.toHaveClass('selected');

            // Subsequent targets
            const choiceList = selectorHelper.getDropList('choices');
            const bucketCList = selectorHelper.getDropList('bucket_C');

            choiceA_unused.focus();
            fireEvent.keyUp(choiceA_unused, { key: keyName });

            return tick()
                .then(() => {
                    expect(choiceAContainer).toHaveClass('selected');
                })
                .then(() => {
                    // first bucket was autofocused
                    expect(bucketCList).toHaveFocus();
                    fireEvent.keyUp(document.activeElement, { key: 'Left' });
                })
                .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(choiceList).toHaveFocus();
                    fireEvent.keyUp(document.activeElement, { key: keyName });
                })
                .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(choiceAContainer).not.toHaveClass('selected');
                    expect(interactionStateStore.getResponseValue()).toBeUndefined();
                });
        });

        it('can move selected choice right and place down', () => {
            expect.assertions(4);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices
                }
            });
            expect(interactionStateStore.getResponseValue()).toBeUndefined();

            const selectorHelper = selectorHelperFactory(container);

            // Initial target
            const choiceA_unused = selectorHelper.getItemBtn('choices', 'A');

            // Subsequent targets
            const bucketCList = selectorHelper.getDropList('bucket_C');
            const bucketDList = selectorHelper.getDropList('bucket_D');

            choiceA_unused.focus();
            fireEvent.keyUp(choiceA_unused, { key: 'Enter' });

            return tick()
                .then(() => {
                    // first bucket was autofocused
                    expect(bucketCList).toHaveFocus();
                    fireEvent.keyUp(document.activeElement, { key: 'Right' });
                })
                .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(bucketDList).toHaveFocus();
                    fireEvent.keyUp(document.activeElement, { key: 'Enter' });
                })
                .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(interactionStateStore.getResponseValue()).toMatchObject(['A', 'D']);
                });
        });

        it('can move selected choice left and place down', () => {
            expect.assertions(5);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices
                }
            });
            expect(interactionStateStore.getResponseValue()).toBeUndefined();

            const selectorHelper = selectorHelperFactory(container);

            // Initial target
            const choiceA_unused = selectorHelper.getItemBtn('choices', 'A');

            // Subsequent targets
            const choiceList = selectorHelper.getDropList('choices');
            const bucketCList = selectorHelper.getDropList('bucket_C');
            const bucketDList = selectorHelper.getDropList('bucket_D');

            choiceA_unused.focus();
            fireEvent.keyUp(choiceA_unused, { key: 'Enter' });

            return tick()
                .then(() => {
                    // first bucket was autofocused
                    expect(bucketCList).toHaveFocus();
                    fireEvent.keyUp(document.activeElement, { key: 'Left' });
                })
                .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(choiceList).toHaveFocus();
                    fireEvent.keyUp(document.activeElement, { key: 'Left' });
                })
                .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(bucketDList).toHaveFocus();
                    fireEvent.keyUp(document.activeElement, { key: 'Enter' });
                })
                .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(interactionStateStore.getResponseValue()).toMatchObject(['A', 'D']);
                });
        });

        it('can cancel move with escape', () => {
            expect.assertions(4);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices
                }
            });
            expect(interactionStateStore.getResponseValue()).toBeUndefined();

            const selectorHelper = selectorHelperFactory(container);

            // Initial target
            const choiceA_unused = selectorHelper.getItemBtn('choices', 'A');
            const choiceAContainer = selectorHelper.getItemBtnContainer('choices', 'A');

            expect(choiceAContainer).not.toHaveClass('selected');

            choiceA_unused.focus();
            fireEvent.keyUp(choiceA_unused, { key: 'Enter' });

            return tick()
                .then(() => {
                    fireEvent.keyUp(document.activeElement, { key: 'Esc' });
                })
                .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(choiceAContainer).not.toHaveClass('selected');
                    expect(interactionStateStore.getResponseValue()).toBeUndefined();
                });
        });

        test.each(['Enter', 'Space'])('can activate remove button with %s', keyName => {
            expect.assertions(2);

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality: 'multiple',
                    baseType,
                    value: [['A', 'D']]
                },
                true
            );

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices,
                    maxAssociations: 0
                }
            });

            const selectorHelper = selectorHelperFactory(container);

            // Initial target
            const choiceA_bucketD_container = selectorHelper.getDraggable('bucket_D', 'A');
            const remover = choiceA_bucketD_container.querySelector('.remover');
            expect(remover).toBeInTheDocument();

            fireEvent.keyUp(remover, { key: keyName });

            return tick()
                .then(() => new Promise(resolve => setTimeout(resolve, 0))) // clearSelected timeout
                .then(tick)
                .then(() => {
                    expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                });
        });
    });

    describe('Store saving', () => {
        it('qtiClass is saved in itemState', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices,
                    maxAssociations: 0
                }
            });
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });
            const selectorHelper = selectorHelperFactory(container);
            fireEvent.click(selectorHelper.getItemBtn('choices', 'A'));
            return tick()
                .then(() => {
                    fireEvent.click(selectorHelper.getDropArea('bucket_C'));
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toMatchObject({ list: { directedPair: [['A', 'C']] } });
                    expect(interactionStateStore.get()).toMatchObject({ qtiClass });
                });
        });
    });
});
