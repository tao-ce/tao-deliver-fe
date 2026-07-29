// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('@oat-sa-private/ui-core', async importOriginal => {
    const originalModule = await importOriginal();
    return {
        ...originalModule,
        generateElementId: nodeName => `tao-${nodeName}-123`,
        ResizeObserver: function (callback) {
            //used by resizeObserve.js
            return {
                observe() {
                    callback([
                        {
                            target: {
                                getBoundingClientRect: () => ({
                                    width: 1000,
                                    height: 500,
                                    top: 0,
                                    left: 0,
                                    bottom: 500,
                                    right: 1000
                                })
                            }
                        }
                    ]);
                },
                unobserve() {},
                disconnect() {}
            };
        }
    };
});

vi.mock('../../util/scaling.js', async importOriginal => {
    const originalModule = await importOriginal();
    return {
        ...originalModule,
        calculateScalingFactor: () => 1 //make 'answerPlacement.js' mock more realistic
    };
});

vi.mock('../../util/polygon.js', async () => {
    const originalModule = await vi.importActual('../../util/polygon.js');
    return Object.assign({ __esModule: true }, originalModule, {
        getIsThin: () => false
    });
});

// vi.hoisted will execute these before the mocks which reference them
const getPlacedAnswersOriginalValue = vi.hoisted(() => ({}));
const getPlacedAnswersMockImpl = vi.hoisted(() => (gaps, choices, matches, choiceWidth, choiceHeight) => {
    const answers = matches
        .map(([choiceKey, gapKey]) => [choices.find(c => c.key === choiceKey), gaps.find(g => g.key === gapKey)])
        .map(([choice, gap], i) => ({
            key: choice.key,
            gapKey: gap.key,
            concatenatedKey: `${choice.key}_${gap.key}`,
            data: choice.data,
            x: i * 10,
            y: i * 5,
            width: choiceWidth + i,
            height: choiceHeight + i,
            gap,
            choice,
            tabOrder: i
        }));
    return answers;
});

vi.mock('../util/answerPlacement.js', async importOriginal => {
    const originalModule = await importOriginal();
    getPlacedAnswersOriginalValue.value = originalModule.getPlacedAnswers;
    return {
        ...originalModule,
        getPlacedAnswers: vi.fn(getPlacedAnswersMockImpl)
    };
});

//used for sorting gaps with focusorder.js
const originalGetBBox = SVGElement.prototype.getBBox;
beforeEach(() => {
    SVGElement.prototype.getBBox = () => ({ x: 1, y: 1, width: 1, height: 1 });
});
afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

import { render, fireEvent } from '@testing-library/svelte';
import GraphicGapMatchInteraction from '../GraphicGapMatchInteraction.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../../itemsStateStore';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../../../itemsSessionStatusStore.js';
import { tick } from 'svelte';
import dropAreaRegistryFactory from '../util/dropAreaRegistry';
import { getPlacedAnswers } from '../util/answerPlacement.js';
import ContextWrapper from '../../../../static/test/ContextWrapper.svelte';

//used by resizeObserve.js
const originalRequestAnimationFrame = window.requestAnimationFrame;
beforeEach(() => {
    window.requestAnimationFrame = callback => {
        tick().then(() => {
            callback();
        });
    };
});

afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame;
});

const qtiClass = 'qti-graphicGapMatchInteraction';
const itemIdentifier = 'i12345';
const responseIdentifier = 'RESPONSE_1';
const imgObject = {
    data: 'background.jpg',
    width: 800,
    height: 600
};
const getChoices = () => [
    {
        key: 'A',
        data: 'aa.png',
        width: 72,
        height: 40,
        objectLabel: 'letter A',
        matchMax: 1,
        matchMin: 0
    },
    {
        key: 'B',
        data: 'bb.png',
        width: 40,
        height: 72,
        matchMax: 0,
        matchMin: 0
    },
    {
        key: 'C',
        data: 'cc.png',
        width: 100,
        height: 40,
        objectLabel: 'letter C',
        matchMax: 1,
        matchMin: 0
    },
    {
        key: 'D',
        data: 'dd.png',
        width: 10,
        height: 40,
        matchMax: 2,
        matchMin: 0
    }
];
const getGaps = () => [
    {
        key: 'a',
        shape: 'rect',
        coords: '0,0,100,50',
        hotspotLabel: 'a spot',
        matchMax: 1,
        matchMin: 0
    },
    {
        key: 'b',
        shape: 'circle',
        coords: '100,400,100',
        matchMax: 0,
        matchMin: 0
    },
    {
        key: 'c',
        shape: 'ellipse',
        coords: '400,400,100,50',
        hotspotLabel: 'a spot',
        matchMax: 1,
        matchMin: 0
    },
    {
        key: 'd',
        shape: 'poly',
        coords: '400,0,600,0,400,200',
        matchMax: 3,
        matchMin: 0
    }
];

const selectors = {
    getChoices(container) {
        return Array.from(container.querySelectorAll('.choice-area .choice .drag-anchor'));
    },
    getChoice(container, choiceKey) {
        return container.querySelector(
            `.choice-area .drag-anchor[data-drag-drop-key="choice__tao-gapmatch-123__${choiceKey}"]`
        );
    },
    getSelectedChoice(container, choiceKey) {
        return container.querySelector(
            `.choice-area .choice.selected .drag-anchor[data-drag-drop-key="choice__tao-gapmatch-123__${choiceKey}"]`
        );
    },
    getGap(container, gapKey) {
        return container.querySelector(`.answer-area .associable-hotspot[data-droparea-key="${gapKey}"]`);
    },
    getGapShape(container, gapKey) {
        return container.querySelector(`.answer-area .associable-hotspot[data-droparea-key="${gapKey}"] .shape`);
    },
    getAnswers(container) {
        return Array.from(container.querySelectorAll('.answer-area .choice .drag-anchor'));
    },
    getAnswer(container, choiceKey, gapKey) {
        return container.querySelector(
            `.answer-area .drag-anchor[data-drag-drop-key="${gapKey}__tao-gapmatch-123__${choiceKey}"]`
        );
    },
    getAnswerRemover(container, choiceKey, gapKey) {
        const answer = container.querySelector(
            `.answer-area .drag-anchor[data-drag-drop-key="${gapKey}__tao-gapmatch-123__${choiceKey}"]`
        );
        return answer ? answer.parentElement.querySelector('.remover') : null;
    },
    getSelectedAnswer(container, choiceKey, gapKey) {
        return container.querySelector(
            `.answer-area .choice.selected .drag-anchor[data-drag-drop-key="${gapKey}__tao-gapmatch-123__${choiceKey}"]`
        );
    },
    getBay(container) {
        return container.querySelector(`.choice-area .bay-content`);
    }
};

describe('GraphicGapMatchInteraction', () => {
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
        window.document.elementFromPoint = null;
        getPlacedAnswers.mockClear();
        registerLoadingElement.mockClear();
        getInstructionsLang.mockClear();
    });

    describe('rendering', () => {
        beforeEach(() => {
            getPlacedAnswers.mockImplementation(getPlacedAnswersOriginalValue.value);
        });
        afterEach(() => {
            getPlacedAnswers.mockImplementation(getPlacedAnswersMockImpl);
        });

        it('renders with default props', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject
                    }
                }
            });
            return tick()
                .then(tick)
                .then(() => {
                    expect(container).toMatchSnapshot();
                });
        });

        it('renders props correctly into markup', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
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
                        choices: getChoices(),
                        gaps: getGaps(),
                        imgObject
                    }
                }
            });
            return tick()
                .then(tick)
                .then(() => {
                    expect(container).toMatchSnapshot();
                });
        });

        it('renders with answers', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'],
                        ['B', 'b'],
                        ['C', 'c'],
                        ['D', 'd']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        choices: getChoices(),
                        gaps: getGaps(),
                        imgObject
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(container).toMatchSnapshot();
                });
        });

        it('handles mount & center events of gaps', () => {
            render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        choices: getChoices(),
                        gaps: getGaps(),
                        imgObject
                    }
                }
            });
            return tick()
                .then(tick)
                .then(() => {
                    const passedGaps = getPlacedAnswers.mock.calls[getPlacedAnswers.mock.calls.length - 1][0];
                    expect(passedGaps[0].svg).toBeTypeOf('object');
                    expect(passedGaps[0].svg.bbox).toBeTypeOf('function');
                    expect(passedGaps[3].svg).toBeTypeOf('object');
                    expect(passedGaps[3].svg.bbox).toBeTypeOf('function');
                    expect(passedGaps[3].cx).toBeTypeOf('number'); //this gap is 'poly', and only 'poly' has cx/cy
                    expect(passedGaps[3].cy).toBeTypeOf('number');
                });
        });

        it('renders all image containers in first mount (for image loading registration)', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'],
                        ['B', 'b'],
                        ['C', 'c'],
                        ['D', 'd']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        choices: getChoices(),
                        gaps: getGaps(),
                        imgObject
                    }
                }
            });

            expect(selectors.getAnswers(container).length).toBe(4);
            expect(selectors.getChoices(container).length).toBe(2);
            expect(container.querySelector('.answer-area > svg > .image image')).toBeTruthy(); //background
        });

        it('renders correct feedbacks', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'],
                        ['B', 'b']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps(),
                        minAssociations: 1,
                        maxAssociations: 3
                    }
                }
            });
            expect(container.querySelector('.qti-instruction-container')).toMatchSnapshot();
        });

        it('is disabled in closed session', () => {
            const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
            itemSessionStatusStore.set('closed');
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });
            expect(container.querySelector('.qti-graphicGapMatchInteraction').getAttribute('aria-disabled')).toBe(
                'true'
            );
        });

        it('renders with qti-unselected-hidden class', () => {
            const gaps = getGaps();
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        classes: 'qti-unselected-hidden',
                        imgObject,
                        choices: getChoices(),
                        gaps
                    }
                }
            });
            return tick()
                .then(tick)
                .then(() => {
                    expect(container.querySelector('.qti-graphicGapMatchInteraction')).toHaveClass(
                        'qti-unselected-hidden'
                    );
                    expect(selectors.getGap(container, gaps[0].key)).toHaveClass('invisible');
                    expect(selectors.getGapShape(container, gaps[0].key)).toHaveClass('invisible');
                });
        });

        it('renders the instruction lang on the feedback block', () => {
            getInstructionsLang.mockReturnValueOnce('ro');

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps(),
                        minAssociations: 1,
                        maxAssociations: 3
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(container).toMatchSnapshot();
                    expect(getInstructionsLang).toHaveBeenCalled();
                    expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toEqual('ro');
                    expect(container.querySelector('.associable-hotspot text').getAttribute('lang')).toEqual('ro');
                });
        });
    });

    describe('store', () => {
        function expectAnswersCount(container, count) {
            expect(selectors.getAnswers(container).length).toBe(count);
        }
        function expectAnswerRendered(container, choiceKey, gapKey) {
            expect(selectors.getAnswer(container, choiceKey, gapKey)).toBeTruthy();
        }
        function addAnswer(container, choiceKey, gapKey) {
            fireEvent.click(selectors.getChoice(container, choiceKey));
            return tick().then(() => {
                fireEvent.click(selectors.getGapShape(container, gapKey));
                return tick();
            });
        }
        function removeAnswer(container, choiceKey, gapKey) {
            fireEvent.click(selectors.getAnswerRemover(container, choiceKey, gapKey));
            return tick();
        }

        it('loads stored response', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'],
                        ['B', 'b']
                    ]
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expectAnswersCount(container, 2);
                    expectAnswerRendered(container, 'A', 'a');
                    expectAnswerRendered(container, 'B', 'b');
                });
        });

        it('listens to store modifications', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expectAnswersCount(container, 0);
                })
                .then(() => {
                    interactionStateStore.setResponse({
                        list: {
                            directedPair: [
                                ['A', 'a'],
                                ['B', 'b'],
                                ['C', 'c']
                            ]
                        }
                    });
                    return tick();
                })
                .then(tick)
                .then(() => {
                    expectAnswersCount(container, 3);
                    expectAnswerRendered(container, 'A', 'a');
                    expectAnswerRendered(container, 'B', 'b');
                    expectAnswerRendered(container, 'C', 'c');

                    interactionStateStore.setResponse({
                        list: {
                            directedPair: []
                        }
                    });
                    return tick();
                })
                .then(tick)
                .then(() => {
                    expectAnswersCount(container, 0);
                });
        });

        it('saves response to store on change', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            expect(interactionStateStore.getResponse()).toEqual({
                list: {
                    directedPair: []
                }
            });
            expect(interactionStateStore.getValidity()).toBe(true);
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });

            return tick()
                .then(tick)
                .then(() => addAnswer(container, 'A', 'a'))
                .then(() => addAnswer(container, 'B', 'b'))
                .then(() => {
                    expectAnswerRendered(container, 'A', 'a');
                    expectAnswerRendered(container, 'B', 'b');
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [
                                ['A', 'a'],
                                ['B', 'b']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                    expect(interactionStateStore.get()).toMatchObject({ qtiClass });

                    return removeAnswer(container, 'A', 'a');
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [['B', 'b']]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });

        it('validity depends on minAssociations', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        minAssociations: 2,
                        choices: getChoices().map(c => Object.assign(c, { matchMin: 0, matchMax: 0 })),
                        gaps: getGaps().map(g => Object.assign(g, { matchMin: 0, matchMax: 0 }))
                    }
                }
            });
            expect(interactionStateStore.getValidity()).toBe(false);

            return tick()
                .then(tick)
                .then(() => addAnswer(container, 'A', 'a'))
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [['A', 'a']]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);
                    return addAnswer(container, 'B', 'b');
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [
                                ['A', 'a'],
                                ['B', 'b']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });

        it('validity depends on maxAssociations', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 2,
                        choices: getChoices().map(c => Object.assign(c, { matchMin: 0, matchMax: 0 })),
                        gaps: getGaps().map(g => Object.assign(g, { matchMin: 0, matchMax: 0 }))
                    }
                }
            });
            expect(interactionStateStore.getValidity()).toBe(true);

            return tick()
                .then(tick)
                .then(() => addAnswer(container, 'A', 'a'))
                .then(() => addAnswer(container, 'B', 'b'))
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [
                                ['A', 'a'],
                                ['B', 'b']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                    return addAnswer(container, 'C', 'c');
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [
                                ['A', 'a'],
                                ['B', 'b'],
                                ['C', 'c']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);
                });
        });

        it('validity depends on matchMin of choice', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices().map(c =>
                            Object.assign(c, { matchMin: c.key === 'A' ? 1 : 0, matchMax: 0 })
                        ),
                        gaps: getGaps().map(g => Object.assign(g, { matchMin: 0, matchMax: 0 }))
                    }
                }
            });
            expect(interactionStateStore.getValidity()).toBe(false);

            return tick()
                .then(tick)
                .then(() => addAnswer(container, 'B', 'a'))
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [['B', 'a']]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);
                    return addAnswer(container, 'A', 'a');
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [
                                ['B', 'a'],
                                ['A', 'a']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });

        it('validity depends on matchMax of choice', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'],
                        ['A', 'b']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices().map(c =>
                            Object.assign(c, { matchMin: 0, matchMax: c.key === 'A' ? 1 : 0 })
                        ),
                        gaps: getGaps().map(g => Object.assign(g, { matchMin: 0, matchMax: 0 }))
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => addAnswer(container, 'B', 'b'))
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [
                                ['A', 'a'],
                                ['A', 'b'],
                                ['B', 'b']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);

                    return removeAnswer(container, 'A', 'a');
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [
                                ['A', 'b'],
                                ['B', 'b']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });

        it('validity depends on matchMin of gap', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices().map(c => Object.assign(c, { matchMin: 0, matchMax: 0 })),
                        gaps: getGaps().map(g => Object.assign(g, { matchMin: g.key === 'a' ? 1 : 0, matchMax: 0 }))
                    }
                }
            });
            expect(interactionStateStore.getValidity()).toBe(false);

            return tick()
                .then(tick)
                .then(() => addAnswer(container, 'A', 'b'))
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [['A', 'b']]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);
                    return addAnswer(container, 'A', 'a');
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [
                                ['A', 'b'],
                                ['A', 'a']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });

        it('validity depends on matchMax of gap', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'],
                        ['B', 'a']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices().map(c => Object.assign(c, { matchMin: 0, matchMax: 0 })),
                        gaps: getGaps().map(g => Object.assign(g, { matchMin: 0, matchMax: g.key === 'a' ? 1 : 0 }))
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => addAnswer(container, 'B', 'b'))
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [
                                ['A', 'a'],
                                ['B', 'a'],
                                ['B', 'b']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);

                    return removeAnswer(container, 'A', 'a');
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            directedPair: [
                                ['B', 'a'],
                                ['B', 'b']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });
    });

    describe('click behavior', () => {
        it('can add one answer to one single-usage gap', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeFalsy();

                    fireEvent.click(selectors.getChoice(container, 'A'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedChoice(container, 'A')).toBeTruthy();
                    fireEvent.click(selectors.getGapShape(container, 'a'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();

                    fireEvent.click(selectors.getChoice(container, 'C'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedChoice(container, 'C')).toBeTruthy();
                    fireEvent.click(selectors.getGapShape(container, 'a'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                });
        });

        it('can add several answers to one multi-usage gap', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'A', 'b')).toBeFalsy();

                    fireEvent.click(selectors.getChoice(container, 'A'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedChoice(container, 'A')).toBeTruthy();
                    fireEvent.click(selectors.getGapShape(container, 'b'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'A', 'b')).toBeTruthy();

                    fireEvent.click(selectors.getChoice(container, 'C'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedChoice(container, 'C')).toBeTruthy();
                    fireEvent.click(selectors.getGapShape(container, 'b'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'C', 'b')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'A', 'b')).toBeTruthy();
                });
        });

        it('can remove answer', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [['A', 'a']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();

                    fireEvent.click(selectors.getAnswerRemover(container, 'A', 'a'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeFalsy();
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                });
        });

        it('can swap choice with answer', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [['A', 'a']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeFalsy();
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getChoice(container, 'C')).toBeTruthy();

                    fireEvent.click(selectors.getChoice(container, 'C'));
                    return tick();
                })
                .then(() => {
                    fireEvent.click(selectors.getAnswer(container, 'A', 'a'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeTruthy();
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                    expect(selectors.getChoice(container, 'C')).toBeFalsy();
                });
        });

        it('can swap answer with choice', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [['A', 'a']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeFalsy();
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getChoice(container, 'C')).toBeTruthy();

                    fireEvent.click(selectors.getAnswer(container, 'A', 'a'));
                    return tick();
                })
                .then(() => {
                    fireEvent.click(selectors.getChoice(container, 'C'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeTruthy();
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                    expect(selectors.getChoice(container, 'C')).toBeFalsy();
                });
        });

        it('can swap answer with answer', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'],
                        ['C', 'c']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'C', 'c')).toBeTruthy();
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getChoice(container, 'C')).toBeFalsy();

                    fireEvent.click(selectors.getAnswer(container, 'A', 'a'));
                    return tick();
                })
                .then(() => {
                    fireEvent.click(selectors.getAnswer(container, 'C', 'c'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'c')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeTruthy();
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getChoice(container, 'C')).toBeFalsy();
                });
        });

        it('does nothing when swap multi-usage choice with answer of same key', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [['B', 'b']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeTruthy();
                    expect(selectors.getChoice(container, 'B')).toBeTruthy();
                    expect(selectors.getAnswers(container).length).toBe(1);
                    expect(selectors.getChoices(container).length).toBe(4);

                    fireEvent.click(selectors.getChoice(container, 'B'));
                    return tick();
                })
                .then(() => {
                    fireEvent.click(selectors.getAnswer(container, 'B', 'b'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeTruthy();
                    expect(selectors.getChoice(container, 'B')).toBeTruthy();
                    expect(selectors.getAnswers(container).length).toBe(1);
                    expect(selectors.getChoices(container).length).toBe(4);

                    fireEvent.click(selectors.getAnswer(container, 'B', 'b'));
                    return tick();
                })
                .then(() => {
                    fireEvent.click(selectors.getChoice(container, 'B'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeTruthy();
                    expect(selectors.getChoice(container, 'B')).toBeTruthy();
                    expect(selectors.getAnswers(container).length).toBe(1);
                    expect(selectors.getChoices(container).length).toBe(4);
                    return tick();
                });
        });

        it('does nothing when adding multi-usage choice to gap containing same key', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'b'],
                        ['B', 'b']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeTruthy();
                    expect(selectors.getChoice(container, 'B')).toBeTruthy();
                    expect(selectors.getAnswers(container).length).toBe(2);
                    expect(selectors.getChoices(container).length).toBe(3);

                    fireEvent.click(selectors.getChoice(container, 'B'));
                    return tick();
                })
                .then(() => {
                    fireEvent.click(selectors.getGapShape(container, 'b'));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeTruthy();
                    expect(selectors.getChoice(container, 'B')).toBeTruthy();
                    expect(selectors.getAnswers(container).length).toBe(2);
                    expect(selectors.getChoices(container).length).toBe(3);
                });
        });
    });

    describe('keyboard behavior', () => {
        test.each(['Enter', 'Space'])('can add one answer to one single-usage gap (key: %s)', key => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeFalsy();

                    fireEvent.keyUp(selectors.getChoice(container, 'A'), { key });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedChoice(container, 'A')).toBeTruthy();
                    fireEvent.keyUp(selectors.getGap(container, 'a'), { key });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();

                    fireEvent.keyUp(selectors.getChoice(container, 'C'), { key });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedChoice(container, 'C')).toBeTruthy();
                    fireEvent.keyUp(selectors.getGap(container, 'a'), { key });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                });
        });

        it('can add several answers to one multi-usage gap', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'A', 'b')).toBeFalsy();

                    fireEvent.keyUp(selectors.getChoice(container, 'A'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedChoice(container, 'A')).toBeTruthy();
                    fireEvent.keyUp(selectors.getGap(container, 'b'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'A', 'b')).toBeTruthy();

                    fireEvent.keyUp(selectors.getChoice(container, 'C'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedChoice(container, 'C')).toBeTruthy();
                    fireEvent.keyUp(selectors.getGap(container, 'b'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'C', 'b')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'A', 'b')).toBeTruthy();
                });
        });

        it('can move answer to another gap', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['B', 'b'], //gap b is partially filled
                        ['D', 'd'] //gap d is partially filled
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    fireEvent.keyUp(selectors.getAnswer(container, 'B', 'b'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedAnswer(container, 'B', 'b')).toBeTruthy();
                    fireEvent.keyUp(selectors.getGap(container, 'd'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'B', 'd')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'D', 'd')).toBeTruthy();
                });
        });

        test.each([['Enter'], ['Space']])('can remove answer (key: %s)', key => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [['A', 'a']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();

                    fireEvent.keyUp(selectors.getAnswerRemover(container, 'A', 'a'), { key });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeFalsy();
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                });
        });

        test.each([
            ['esc', 27],
            ['tab (blur)', 9]
        ])('cancels selection on %s', (str, keyCode) => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [['B', 'b']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();

                    fireEvent.keyUp(selectors.getChoice(container, 'A'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedChoice(container, 'A')).toBeTruthy();

                    fireEvent.keyDown(selectors.getGap(container, 'a'), { keyCode });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();

                    fireEvent.keyUp(selectors.getAnswer(container, 'B', 'b'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedAnswer(container, 'B', 'b')).toBeTruthy();

                    fireEvent.keyDown(selectors.getGap(container, 'a'), { keyCode });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedAnswer(container, 'B', 'b')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeTruthy();
                });
        });

        it('uses arrow keys to navigate through choices', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });
            return tick()
                .then(tick)
                .then(() => {
                    selectors.getChoice(container, 'A').focus();
                    return tick();
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Right' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'B')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Down' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'C')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Right' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'D')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Down' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Left' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'D')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Up' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'C')).toHaveFocus();
                });
        });

        it('uses arrow keys to navigate through answers', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'],
                        ['B', 'b'],
                        ['C', 'b']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });
            return tick()
                .then(tick)
                .then(() => {
                    selectors.getAnswer(container, 'A', 'a').focus();
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Right' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswerRemover(container, 'A', 'a')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Right' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Down' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswerRemover(container, 'B', 'b')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Down' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'C', 'b')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Right' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswerRemover(container, 'C', 'b')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Right' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Left' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswerRemover(container, 'C', 'b')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Up' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'C', 'b')).toHaveFocus();
                });
        });

        it('focuses first empty gap on choice selected and uses arrow keys to navigate', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'], //gap a is filled completely
                        ['B', 'b'] //gap b is partially filled
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    fireEvent.keyUp(selectors.getChoice(container, 'C'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getGap(container, 'b')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Right' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getGap(container, 'c')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Down' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getGap(container, 'd')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Right' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getGap(container, 'b')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Left' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getGap(container, 'd')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { key: 'Up' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getGap(container, 'c')).toHaveFocus();
                });
        });

        it('focuses first empty gap on answer selected', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'], //gap a is filled completely
                        ['B', 'b'] //gap b is partially filled
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    fireEvent.keyUp(selectors.getAnswer(container, 'B', 'b'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getGap(container, 'c')).toHaveFocus();
                    fireEvent.keyDown(document.activeElement, { keyCode: 27 }); //esc
                    return tick();
                })
                .then(() => {
                    fireEvent.keyUp(selectors.getAnswer(container, 'A', 'a'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getGap(container, 'b')).toHaveFocus();
                });
        });

        it('does nothing if choice/answer selected and no empty gaps', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'],
                        ['B', 'b'],
                        ['C', 'c'],
                        ['D', 'd']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices().map(c => Object.assign(c, { matchMax: 1 })),
                        gaps: getGaps().map(g => Object.assign(g, { matchMax: 1 }))
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getSelectedChoice(container, 'A')).toBeFalsy();
                    expect(document.body).toHaveFocus();
                    return tick();
                })
                .then(() => {
                    fireEvent.keyUp(selectors.getAnswer(container, 'A', 'a'), { key: 'Enter' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSelectedAnswer(container, 'A', 'a')).toBeFalsy();
                    expect(document.body).toHaveFocus();
                });
        });

        it('choices are a single tabstop', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [['A', 'a']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    const choiceElements = selectors.getChoices(container);
                    expect(choiceElements.length).toBe(3);
                    expect(choiceElements[0].getAttribute('tabindex')).toBe('0');
                    expect(choiceElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(2);
                    choiceElements[0].focus();
                    return tick();
                })
                .then(() => {
                    const choiceElements = selectors.getChoices(container);
                    expect(choiceElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(3);

                    selectors.getAnswer(container, 'A', 'a').focus();
                    return tick();
                })
                .then(() => {
                    const choiceElements = selectors.getChoices(container);
                    expect(choiceElements[0].getAttribute('tabindex')).toBe('0');
                    expect(choiceElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(2);
                });
        });

        it('answers are a single tabstop', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'],
                        ['B', 'b'],
                        ['C', 'c']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    const answerElements = selectors.getAnswers(container);
                    expect(answerElements.length).toBe(3);
                    expect(answerElements[0].getAttribute('tabindex')).toBe('0');
                    expect(answerElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(2);
                    answerElements[0].focus();
                    return tick();
                })
                .then(() => {
                    const answerElements = selectors.getAnswers(container);
                    expect(answerElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(3);

                    selectors.getChoice(container, 'D').focus();
                    return tick();
                })
                .then(() => {
                    const answerElements = selectors.getAnswers(container);
                    expect(answerElements[0].getAttribute('tabindex')).toBe('0');
                    expect(answerElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(2);
                });
        });
    });

    describe('drag behavior', () => {
        function dragAndDrop(element, dropAreaElement) {
            const draggable = element.closest('[data-drag-drop-key]');
            const draggableKey = draggable.getAttribute('data-drag-drop-key');

            return tick()
                .then(() => {
                    draggable.dispatchEvent(
                        new CustomEvent('dragStart', {
                            detail: { draggableKey }
                        })
                    );
                    return tick();
                })
                .then(() => {
                    document.elementFromPoint = () => dropAreaElement;
                    draggable.dispatchEvent(
                        new CustomEvent('dragMove', {
                            detail: { draggableKey, originalEvent: { clientX: 0, clientY: 0 } }
                        })
                    );
                })
                .then(() => {
                    draggable.dispatchEvent(new CustomEvent('dragStop', { detail: { draggableKey } }));
                    return tick();
                });
        }

        it('can add one answer to one single-usage gap', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps(),
                        dropareaRegistry: dropAreaRegistryFactory()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeFalsy();

                    return dragAndDrop(selectors.getChoice(container, 'A'), selectors.getGapShape(container, 'a'));
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();

                    return dragAndDrop(selectors.getChoice(container, 'C'), selectors.getGapShape(container, 'a'));
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                });
        });

        it('can add several answers to one multi-usage gap', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'A', 'b')).toBeFalsy();

                    return dragAndDrop(selectors.getChoice(container, 'A'), selectors.getGapShape(container, 'b'));
                })
                .then(() => {
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'A', 'b')).toBeTruthy();

                    return dragAndDrop(selectors.getChoice(container, 'C'), selectors.getGapShape(container, 'b'));
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'C', 'b')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'A', 'b')).toBeTruthy();
                });
        });

        it('can swap choice with answer', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [['A', 'a']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeFalsy();
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getChoice(container, 'C')).toBeTruthy();

                    return dragAndDrop(selectors.getChoice(container, 'C'), selectors.getAnswer(container, 'A', 'a'));
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeTruthy();
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                    expect(selectors.getChoice(container, 'C')).toBeFalsy();
                });
        });

        it('can swap answer with choice', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [['A', 'a']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeFalsy();
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getChoice(container, 'C')).toBeTruthy();

                    return dragAndDrop(selectors.getAnswer(container, 'A', 'a'), selectors.getChoice(container, 'C'));
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeFalsy();
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeTruthy();
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                    expect(selectors.getChoice(container, 'C')).toBeFalsy();
                });
        });

        it('can swap answer with answer', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'a'],
                        ['C', 'c']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'C', 'c')).toBeTruthy();
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getChoice(container, 'C')).toBeFalsy();

                    return dragAndDrop(
                        selectors.getAnswer(container, 'A', 'a'),
                        selectors.getAnswer(container, 'C', 'c')
                    );
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'c')).toBeTruthy();
                    expect(selectors.getAnswer(container, 'C', 'a')).toBeTruthy();
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();
                    expect(selectors.getChoice(container, 'C')).toBeFalsy();
                });
        });

        it('removes answer when drop to choice-list', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [['A', 'a']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeTruthy();
                    expect(selectors.getChoice(container, 'A')).toBeFalsy();

                    return dragAndDrop(selectors.getAnswer(container, 'A', 'a'), selectors.getBay(container));
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'A', 'a')).toBeFalsy();
                    expect(selectors.getChoice(container, 'A')).toBeTruthy();
                });
        });

        it('removes answer when swap answer with multi-usage choice of same key', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [['B', 'b']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeTruthy();
                    expect(selectors.getChoice(container, 'B')).toBeTruthy();
                    expect(selectors.getAnswers(container).length).toBe(1);
                    expect(selectors.getChoices(container).length).toBe(4);

                    return dragAndDrop(selectors.getChoice(container, 'B'), selectors.getAnswer(container, 'B', 'b'));
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeTruthy();
                    expect(selectors.getChoice(container, 'B')).toBeTruthy();
                    expect(selectors.getAnswers(container).length).toBe(1);
                    expect(selectors.getChoices(container).length).toBe(4);

                    return dragAndDrop(selectors.getAnswer(container, 'B', 'b'), selectors.getChoice(container, 'B'));
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeFalsy();
                    expect(selectors.getChoice(container, 'B')).toBeTruthy();
                    expect(selectors.getAnswers(container).length).toBe(0);
                    expect(selectors.getChoices(container).length).toBe(4);
                });
        });

        it('does nothing when adding multi-usage choice to gap containing same key', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    directedPair: [
                        ['A', 'b'],
                        ['B', 'b']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicGapMatchInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        gaps: getGaps()
                    }
                }
            });

            return tick()
                .then(tick)
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeTruthy();
                    expect(selectors.getChoice(container, 'B')).toBeTruthy();
                    expect(selectors.getAnswers(container).length).toBe(2);
                    expect(selectors.getChoices(container).length).toBe(3);

                    return dragAndDrop(selectors.getChoice(container, 'B'), selectors.getGapShape(container, 'b'));
                })
                .then(() => {
                    expect(selectors.getAnswer(container, 'B', 'b')).toBeTruthy();
                    expect(selectors.getChoice(container, 'B')).toBeTruthy();
                    expect(selectors.getAnswers(container).length).toBe(2);
                    expect(selectors.getChoices(container).length).toBe(3);
                });
        });
    });
});
