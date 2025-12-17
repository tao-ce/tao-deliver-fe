// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import MatchInteraction from '../MatchInteraction.svelte';
import Math from '../../../static/Math.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';
import { tick } from 'svelte';
import { generateElementId } from '@oat-sa-private/ui-core';
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
        matchMax: 0
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
const idPrefix = generateElementId('tabularMatch');
const classes = 'qti-match-tabular';
const qtiClass = 'qti-matchInteraction';

const selectorHelperFactory = container => ({
    // Tabular helpers
    getInput(x, y) {
        return container.querySelector(`input#${idPrefix}_${x}_${y}`);
    },
    getInputContainer(x, y) {
        return this.getInput(x, y).parentElement;
    }
});

describe('MatchInteraction Tabular', () => {
    // load library early
    beforeAll(() => getMathJax());

    afterEach(() => {
        itemsStateStore.clear();
    });

    describe('Checkbox mode', () => {
        it('renders tabular component correctly in checkbox mode', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: ['A', 'D']
                },
                true
            );

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: MatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        classes,
                        choices,
                        dataAttrs: {
                            'data-first-column-header': 'first column header'
                        }
                    }
                }
            });

            expect(container).toMatchSnapshot();

            const selectorHelper = selectorHelperFactory(container);
            expect(selectorHelper.getInput(0, 1).checked).toBe(true);
        });

        it('select and unselect works correctly with mouse', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: [['A', 'C']]
                },
                true
            );

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices,
                    maxAssociations: 2
                }
            });
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceSpy = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceSpy);

            const input_0_0 = selectorHelper.getInput(0, 0);
            const input_0_1 = selectorHelper.getInput(0, 1);
            input_0_1.click();

            return tick()
                .then(() => {
                    expect(selectorHelper.getInput(0, 1).checked).toBe(true);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([
                        ['A', 'C'],
                        ['A', 'D']
                    ]);
                    expect(interactionStateStore.get()).toMatchObject({ qtiClass });

                    // uncheck previously selected checkbox
                    input_0_0.click();
                    return tick();
                })
                .then(() => {
                    expect(input_0_0.checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([['A', 'D']]);

                    expect(interactiontraceSpy).toHaveBeenCalledTimes(2);
                    expect(interactiontraceSpy.mock.calls[0][0].detail).toEqual({
                        domEventType: 'click',
                        qtiChoiceIdentifier: ['A', 'D'],
                        newResponse: [
                            ['A', 'C'],
                            ['A', 'D']
                        ],
                        position: {
                            clientX: 0,
                            clientY: 0,
                            screenX: 0,
                            screenY: 0
                        },
                        target: input_0_1
                    });
                    expect(interactiontraceSpy.mock.calls[1][0].detail).toEqual({
                        domEventType: 'click',
                        qtiChoiceIdentifier: ['A', 'C'],
                        newResponse: [['A', 'D']],
                        position: {
                            clientX: 0,
                            clientY: 0,
                            screenX: 0,
                            screenY: 0
                        },
                        target: input_0_0
                    });
                });
        });

        it('select and unselect works correctly with keyboard', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: [['A', 'C']]
                },
                true
            );

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices,
                    maxAssociations: 2
                }
            });

            const selectorHelper = selectorHelperFactory(container);

            const interactiontraceSpy = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceSpy);

            const input_0_0 = selectorHelper.getInput(0, 0);
            const input_0_1 = selectorHelper.getInput(0, 1);
            fireEvent.keyDown(input_0_1, { keyCode: 13, key: ' ' });

            return tick()
                .then(() => {
                    expect(selectorHelper.getInput(0, 1).checked).toBe(true);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([
                        ['A', 'C'],
                        ['A', 'D']
                    ]);

                    // uncheck previously selected checkbox
                    fireEvent.keyDown(input_0_0, { keyCode: 32, key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(input_0_0.checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([['A', 'D']]);
                    expect(interactiontraceSpy).toHaveBeenCalledTimes(2);
                    expect(interactiontraceSpy.mock.calls[0][0].detail).toEqual({
                        domEventType: 'keydown',
                        qtiChoiceIdentifier: ['A', 'D'],
                        newResponse: [
                            ['A', 'C'],
                            ['A', 'D']
                        ],
                        target: input_0_1,
                        pressedKey: ' '
                    });
                    expect(interactiontraceSpy.mock.calls[1][0].detail).toEqual({
                        domEventType: 'keydown',
                        qtiChoiceIdentifier: ['A', 'C'],
                        newResponse: [['A', 'D']],
                        target: input_0_0,
                        pressedKey: 'Enter'
                    });
                });
        });

        it('matchMax validation works correctly', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: [['A', 'C']]
                },
                true
            );

            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices: [
                        [
                            {
                                key: 'A',
                                content: 'A',
                                blockTree: [{ type: 'text', content: 'A' }],
                                matchMin: 0,
                                matchMax: 1
                            },
                            {
                                key: 'B',
                                content: 'B',
                                blockTree: [{ type: 'text', content: 'B' }],
                                matchMin: 0,
                                matchMax: 0
                            }
                        ],
                        choiceSet2
                    ],
                    maxAssociations: 0
                }
            });

            const selectorHelper = selectorHelperFactory(container);

            selectorHelper.getInputContainer(0, 1).click(); // adds A-D, passing matchMax

            return tick().then(() => {
                expect(interactionStateStore.getResponseValue()).toMatchObject([
                    ['A', 'C'],
                    ['A', 'D']
                ]);
                expect(interactionStateStore.getValidity()).toEqual(false);
            });
        });

        it('matchMin validation works correctly', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: []
                },
                true
            );
            render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices: [
                        [
                            {
                                key: 'A',
                                content: 'A',
                                blockTree: [{ type: 'text', content: 'A' }],
                                matchMin: 1,
                                matchMax: 0
                            },
                            {
                                key: 'B',
                                content: 'B',
                                blockTree: [{ type: 'text', content: 'B' }],
                                matchMin: 0,
                                matchMax: 0
                            }
                        ],
                        choiceSet2
                    ],
                    maxAssociations: 0
                }
            });

            return tick().then(() => {
                expect(interactionStateStore.getValidity()).toEqual(false);
            });
        });
    });

    describe('Radio X mode', () => {
        it('renders tabular component correctly', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: ['A', 'D']
                },
                true
            );
            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices: [
                        [
                            {
                                key: 'A',
                                content: 'A',
                                blockTree: [{ type: 'text', content: 'A' }],
                                matchMin: 0,
                                matchMax: 1
                            },
                            {
                                key: 'B',
                                content: 'B',
                                blockTree: [{ type: 'text', content: 'B' }],
                                matchMin: 0,
                                matchMax: 1
                            }
                        ],
                        choiceSet2
                    ],
                    dataAttrs: {
                        'data-first-column-header': 'first column header'
                    }
                }
            });

            expect(container).toMatchSnapshot();
            const selectorHelper = selectorHelperFactory(container);
            expect(selectorHelper.getInput(0, 1).checked).toBe(true);
        });

        it('can select and unselect with mouse', () => {
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
                    maxAssociations: 2,
                    choices: [
                        [
                            {
                                key: 'A',
                                content: 'A',
                                blockTree: [{ type: 'text', content: 'A' }],
                                matchMin: 0,
                                matchMax: 1
                            },
                            {
                                key: 'B',
                                content: 'B',
                                blockTree: [{ type: 'text', content: 'B' }],
                                matchMin: 0,
                                matchMax: 1
                            }
                        ],
                        choiceSet2
                    ]
                }
            });

            const selectorHelper = selectorHelperFactory(container);

            selectorHelper.getInputContainer(0, 0).click();

            return tick()
                .then(() => {
                    expect(selectorHelper.getInput(0, 0).checked).toBe(true);
                    expect(selectorHelper.getInput(0, 1).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([['A', 'C']]);

                    // click it again to unselect
                    selectorHelper.getInputContainer(0, 0).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(0, 0).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                });
        });

        it('can select and unselect with keyboard', () => {
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
                    maxAssociations: 2,
                    choices: [
                        [
                            {
                                key: 'A',
                                content: 'A',
                                blockTree: [{ type: 'text', content: 'A' }],
                                matchMin: 0,
                                matchMax: 1
                            },
                            {
                                key: 'B',
                                content: 'B',
                                blockTree: [{ type: 'text', content: 'B' }],
                                matchMin: 0,
                                matchMax: 1
                            }
                        ],
                        choiceSet2
                    ]
                }
            });

            const selectorHelper = selectorHelperFactory(container);

            fireEvent.keyDown(selectorHelper.getInput(0, 0), { keyCode: 13 });

            return tick()
                .then(() => {
                    expect(selectorHelper.getInput(0, 0).checked).toBe(true);
                    expect(selectorHelper.getInput(0, 1).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([['A', 'C']]);

                    // click it again to unselect
                    fireEvent.keyDown(selectorHelper.getInput(0, 0), { keyCode: 32 });
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(0, 0).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                });
        });
    });

    describe('Radio Y mode', () => {
        it('renders tabular component correctly', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: ['A', 'D']
                },
                true
            );
            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    choices: [
                        choiceSet1,
                        [
                            {
                                key: 'C',
                                content: 'C',
                                blockTree: [{ type: 'text', content: 'C' }],
                                matchMin: 0,
                                matchMax: 1
                            },
                            {
                                key: 'D',
                                content: 'D',
                                blockTree: [{ type: 'text', content: 'D' }],
                                matchMin: 0,
                                matchMax: 1
                            }
                        ]
                    ],
                    dataAttrs: {
                        'data-first-column-header': 'first column header'
                    }
                }
            });

            expect(container).toMatchSnapshot();
            const selectorHelper = selectorHelperFactory(container);
            expect(selectorHelper.getInput(0, 1).checked).toBe(true);
        });

        it('can select and unselect with mouse', () => {
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
                    maxAssociations: 2,
                    choices: [
                        choiceSet1,
                        [
                            {
                                key: 'C',
                                content: 'C',
                                blockTree: [{ type: 'text', content: 'C' }],
                                matchMin: 0,
                                matchMax: 1
                            },
                            {
                                key: 'D',
                                content: 'D',
                                blockTree: [{ type: 'text', content: 'D' }],
                                matchMin: 0,
                                matchMax: 1
                            }
                        ]
                    ]
                }
            });

            const selectorHelper = selectorHelperFactory(container);

            selectorHelper.getInputContainer(1, 1).click();

            return tick()
                .then(() => {
                    expect(selectorHelper.getInput(1, 1).checked).toBe(true);
                    expect(selectorHelper.getInput(0, 1).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([['B', 'D']]);

                    // click it again to unselect
                    selectorHelper.getInputContainer(1, 1).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(1, 1).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                });
        });

        it('can select and unselect with keyboard', () => {
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
                    maxAssociations: 2,
                    choices: [
                        choiceSet1,
                        [
                            {
                                key: 'C',
                                content: 'C',
                                blockTree: [{ type: 'text', content: 'C' }],
                                matchMin: 0,
                                matchMax: 1
                            },
                            {
                                key: 'D',
                                content: 'D',
                                blockTree: [{ type: 'text', content: 'D' }],
                                matchMin: 0,
                                matchMax: 1
                            }
                        ]
                    ]
                }
            });

            const selectorHelper = selectorHelperFactory(container);

            fireEvent.keyDown(selectorHelper.getInput(1, 1), { keyCode: 32 });

            return tick()
                .then(() => {
                    expect(selectorHelper.getInput(1, 1).checked).toBe(true);
                    expect(selectorHelper.getInput(0, 1).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([['B', 'D']]);

                    // click it again to unselect
                    fireEvent.keyDown(selectorHelper.getInput(1, 1), { keyCode: 13 });
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(1, 1).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                });
        });
    });

    describe('Radio X & Y mode', () => {
        const createChoice = (txt, idx) => ({
            key: txt,
            content: txt,
            plainText: txt,
            position: idx,
            blockTree: [{ type: 'text', content: txt }],
            matchMin: 0,
            matchMax: 1
        });

        it('renders tabular component correctly', () => {
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
                    maxAssociations: 0,
                    classes,
                    choices: [
                        ['A', 'B', 'M'].map((txt, idx) => createChoice(txt, idx)),
                        ['C', 'D', 'N'].map((txt, idx) => createChoice(txt, idx))
                    ],
                    dataAttrs: {
                        'data-first-column-header': 'first column header'
                    }
                }
            });

            expect(container).toMatchSnapshot();
            const selectorHelper = selectorHelperFactory(container);
            expect(selectorHelper.getInput(0, 1).checked).toBe(true);
        });

        it('allows to select only one choice in row/column', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    maxAssociations: 0,
                    classes,
                    choices: [
                        ['A', 'B', 'M'].map((txt, idx) => createChoice(txt, idx)),
                        ['C', 'D', 'N'].map((txt, idx) => createChoice(txt, idx))
                    ]
                }
            });
            const selectorHelper = selectorHelperFactory(container);

            selectorHelper.getInputContainer(1, 1).click();

            return tick()
                .then(() => {
                    expect(selectorHelper.getInput(1, 1).checked).toBe(true);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([['B', 'D']]);

                    // select choice in another row and column
                    selectorHelper.getInputContainer(0, 0).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(1, 1).checked).toBe(true);
                    expect(selectorHelper.getInput(0, 0).checked).toBe(true);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([
                        ['A', 'C'],
                        ['B', 'D']
                    ]);

                    // select another choice in the same row
                    selectorHelper.getInputContainer(2, 0).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(1, 1).checked).toBe(true);
                    expect(selectorHelper.getInput(2, 0).checked).toBe(true);
                    expect(selectorHelper.getInput(0, 0).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([
                        ['B', 'D'],
                        ['M', 'C']
                    ]);

                    // select another choice in the same column
                    selectorHelper.getInputContainer(2, 2).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(1, 1).checked).toBe(true);
                    expect(selectorHelper.getInput(2, 2).checked).toBe(true);
                    expect(selectorHelper.getInput(2, 0).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([
                        ['B', 'D'],
                        ['M', 'N']
                    ]);

                    // select another choice in those row and column
                    selectorHelper.getInputContainer(2, 1).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(2, 1).checked).toBe(true);
                    expect(selectorHelper.getInput(1, 1).checked).toBe(false);
                    expect(selectorHelper.getInput(2, 2).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([['M', 'D']]);

                    // click it again to unselect
                    selectorHelper.getInputContainer(2, 1).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(2, 1).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject([]);
                });
        });

        it('allows to select only one choice in interaction if maxAssociations=1', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(MatchInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes,
                    maxAssociations: 1,
                    choices: [
                        ['A', 'B', 'M'].map((txt, idx) => createChoice(txt, idx)),
                        ['C', 'D', 'N'].map((txt, idx) => createChoice(txt, idx))
                    ]
                }
            });
            const selectorHelper = selectorHelperFactory(container);

            selectorHelper.getInputContainer(1, 1).click();

            return tick()
                .then(() => {
                    expect(selectorHelper.getInput(1, 1).checked).toBe(true);
                    expect(interactionStateStore.getResponseValue()).toMatchObject(['B', 'D']);

                    // select choice in another row and column
                    selectorHelper.getInputContainer(0, 0).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(0, 0).checked).toBe(true);
                    expect(selectorHelper.getInput(1, 1).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject(['A', 'C']);

                    // select another choice in the same row
                    selectorHelper.getInputContainer(2, 0).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(2, 0).checked).toBe(true);
                    expect(selectorHelper.getInput(0, 0).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject(['M', 'C']);

                    // select another choice in the same column
                    selectorHelper.getInputContainer(2, 2).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(2, 2).checked).toBe(true);
                    expect(selectorHelper.getInput(2, 0).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject(['M', 'N']);

                    // select another choice in those row and column
                    selectorHelper.getInputContainer(1, 1).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(1, 1).checked).toBe(true);
                    expect(selectorHelper.getInput(2, 2).checked).toBe(false);
                    expect(interactionStateStore.getResponseValue()).toMatchObject(['B', 'D']);

                    // click it again to unselect
                    selectorHelper.getInputContainer(1, 1).click();
                    return tick();
                })
                .then(() => {
                    expect(selectorHelper.getInput(1, 1).checked).toBe(false);
                    expect(interactionStateStore.getResponse()).toMatchObject({ base: null });
                });
        });
    });

    describe('Complex content', () => {
        it('renders tabular component with complex X & Y headers', () => {
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
                                matchMin: 0,
                                matchMax: 2
                            }
                        ],
                        [
                            {
                                key: 'C',
                                content: '{{i5f50a5ada918c}} <em>d</em>',
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
                    expect(container).toMatchSnapshot();
                });
        });
    });
});
