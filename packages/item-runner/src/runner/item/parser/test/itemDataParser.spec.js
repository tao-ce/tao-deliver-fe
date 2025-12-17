// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('core/store', () => {
    const store = () =>
        // eslint-disable-next-line implicit-arrow-linebreak
        Promise.resolve({
            getItem() {
                return Promise.resolve();
            },
            setItem() {
                return Promise.resolve(true);
            }
        });
    store.backends = {
        memory: 'memory'
    };
    return {
        __esModule: true,
        default: store
    };
});

import itemDataParser from '../itemDataParser.js';

import samples from '../../../../../samples';
import * as interactions from '../../../interactions/index.js';

const getInteractionComponent = name => interactions[name] || null;

describe('Parse item content', () => {
    it('fails when the compiled data are missing', () => {
        expect(itemDataParser).toThrowError();
    });

    it('fails when the compiled data is invalid', () => {
        expect(() => {
            itemDataParser({
                baseUrl: [],
                itemData: [1, 2, 3]
            });
        }).toThrowErrorMatchingSnapshot();
    });

    it('fails when the compiled data is missing data', () => {
        expect(() => {
            itemDataParser({
                baseUrl: 'assets',
                itemData: {
                    type: 'qti',
                    data: {
                        attributes: {
                            title: 'zombieland',
                            'xml:lang': 'en-US'
                        },
                        body: {
                            body: 'Missing identifier',
                            elements: {}
                        },
                        stylesheets: [],
                        outcomes: {},
                        responses: {}
                    },
                    assets: []
                },
                itemState: {},
                itemIdentifier: 'item-3'
            });
        }).toThrowErrorMatchingSnapshot();
    });

    test.each([
        ['choice', samples.shuttle.itemData],
        ['choice and image', samples.zombieland.itemData],
        ['extendedText', samples.dagon.itemData],
        ['textEntry', samples.americaDiscovery.itemData],
        ['caption choice', samples.schengen.itemData],
        ['math', samples.equation.itemData],
        ['inlineChoice', samples.breakingWater.itemData],
        ['informational', samples.introduction.itemData],
        ['hottext', samples.frenchWords.itemData],
        ['table', samples.magicSquare.itemData],
        ['match', samples.shakespeare.itemData],
        ['pci', samples.demoPCI.itemData],
        ['styled passage', samples.styledPassage.itemData],
        ['modal feedback', samples.modalFeedback.itemData]
    ])('creates parsed data from %s ', (itemType, compiledItem) => {
        const output = itemDataParser(compiledItem, {}, getInteractionComponent);
        expect(output).toMatchSnapshot();
    });

    it('returns "dir" set on item level', () => {
        const output = itemDataParser(samples.arabic.itemData, {}, getInteractionComponent);
        expect(samples.arabic.itemData.itemData.data.attributes.dir).toBe('rtl');
        expect(output.itemDir).toBe('rtl');
    });

    it('applies qtiClassesOverride for HottextInteraction from itemRunnerConfig', () => {
        const itemRunnerConfig = {
            elements: {
                HottextInteraction: {
                    qtiClassesOverride: ['tao-control-styling-hidden']
                }
            }
        };
        const output = itemDataParser(samples.frenchWords.itemData, itemRunnerConfig, getInteractionComponent);
        expect(output.blockTree[0].children[1].children[1].props.classes).toBe(
            'tao-control-input-default tao-control-styling-hidden'
        );
        expect(output.blockTree[2].children[1].children[1].props.classes).toBe(
            'qti-control-input-hidden tao-control-styling-hidden'
        );
        expect(output.blockTree[4].children[1].children[1].props.classes).toBe(
            'tao-control-styling-hidden tao-control-styling-hidden'
        );
    });

    it('applies qtiClassesOverride for Include from itemRunnerConfig', () => {
        const itemRunnerConfig = {
            elements: {
                Include: {
                    qtiClassesOverride: ['tao-immediate-scroll']
                }
            }
        };
        const output = itemDataParser(samples.clarimonde1.itemData, itemRunnerConfig, getInteractionComponent);
        expect(output.blockTree[0].children[0].children[0].children[1].children[0].props.attributes.class).toBe(
            'tao-immediate-scroll'
        );
    });

    it('applies qtiClassesOverride for static element which has its own class in properties', () => {
        const itemRunnerConfig = {
            elements: {
                Include: {
                    qtiClassesOverride: ['tao-immediate-scroll']
                }
            }
        };
        const elements = samples.clarimonde1.itemData.itemData.data.body.elements;
        const staticElementKey = Object.keys(elements).pop();
        elements[staticElementKey].attributes.class = 'tao-item-class';
        const output = itemDataParser(samples.clarimonde1.itemData, itemRunnerConfig, getInteractionComponent);
        expect(output.blockTree[0].children[0].children[0].children[1].children[0].props.attributes.class).toBe(
            'tao-immediate-scroll tao-item-class'
        );
    });

    it('applies qtiClassesOverride for ChoiceInteraction from itemRunnerConfig', () => {
        const itemRunnerConfig = {
            elements: {
                ChoiceInteraction: {
                    qtiClassesOverride: ['qti-choices-stacking-3']
                }
            }
        };
        const output = itemDataParser(samples.shuttle.itemData, itemRunnerConfig, getInteractionComponent); // shuttle item has no "classes" attribute
        expect(output.blockTree[2].props.classes).toBe('qti-choices-stacking-3');
    });

    it('applies propertyOverride for UploadInteraction from itemRunnerConfig', () => {
        const itemRunnerConfig = {
            elements: {
                UploadInteraction: {
                    propertyOverride: {
                        maxSize: 30000
                    }
                }
            }
        };
        const output = itemDataParser(samples.photo.itemData, itemRunnerConfig, getInteractionComponent);
        const interaction = output.blockTree[0].children[1].children[1];
        expect(interaction.props.maxSize).toBe(30000);
    });

    it('applies propertyOverride for a dataAttr (onto non-existing) from itemRunnerConfig', () => {
        const itemRunnerConfig = {
            elements: {
                ChoiceInteraction: {
                    propertyOverride: {
                        dataAttrs: {
                            'data-foo': 'bar'
                        }
                    }
                }
            }
        };
        const output = itemDataParser(samples.shuttle.itemData, itemRunnerConfig, getInteractionComponent);
        expect(output.blockTree[2].props.dataAttrs).toEqual({
            'data-foo': 'bar',
            'data-qti-class': 'choiceInteraction',
            'data-response-id': 'RESPONSE'
        });
    });

    it('applies propertyOverride for a dataAttr (onto existing) from itemRunnerConfig', () => {
        const itemRunnerConfig = {
            elements: {
                InlineChoiceInteraction: {
                    propertyOverride: {
                        dataAttrs: {
                            'data-foo': 'bar'
                        }
                    }
                }
            }
        };
        const output = itemDataParser(samples.breakingWater.itemData, itemRunnerConfig, getInteractionComponent);
        expect(output.blockTree[0].children[1].children[2].children[2].props.dataAttrs).toEqual({
            'data-prompt': 'Atom 1',
            'data-foo': 'bar',
            'data-qti-class': 'inlineChoiceInteraction',
            'data-response-id': 'RESPONSE'
        });
    });

    it('gets interaction component from provided getInteractionComponent', () => {
        const itemData = {
            baseUrl: './asset/',
            itemIdentifier: 'item-1',
            itemData: {
                type: 'qti',
                data: {
                    identifier: 'id',
                    qtiClass: 'assessmentItem',
                    attributes: {},
                    body: {
                        body: '{{interaction_123}}',
                        elements: {
                            interaction_123: {
                                qtiClass: 'fooInteraction',
                                attributes: {}
                            }
                        }
                    },
                    responses: {}
                },
                assets: {}
            }
        };

        const interactionComponent = 'interactionComponent';

        const parsedData = itemDataParser(itemData, {}, name => {
            expect(name).toBe('FooInteraction');
            return interactionComponent;
        });

        expect(parsedData.blockTree[0].component).toBe(interactionComponent);
    });

    it('applies hideFeedbacks option from itemRunnerConfig as custom layout', () => {
        const itemRunnerConfig = {
            hideFeedbacks: true
        };
        const output = itemDataParser(samples.shuttle.itemData, itemRunnerConfig, getInteractionComponent);
        expect(output.layouts).toEqual(['hideFeedbacksLayout']);
        const output2 = itemDataParser(samples.breakingWater.itemData, itemRunnerConfig, getInteractionComponent);
        expect(output2.layouts).toEqual(['inlineInteractionsLayout', 'hideFeedbacksLayout']);
    });

    it('ignores or render tooltips depending on itemRunner option hideTooltips', () => {
        const itemRunnerConfig = {};

        const itemData = {
            baseUrl: './asset/',
            itemIdentifier: 'item-1',
            itemData: {
                type: 'qti',
                data: {
                    identifier: 'id',
                    qtiClass: 'assessmentItem',
                    attributes: {},
                    body: {
                        body: '{{_tooltip_1}}',
                        elements: {
                            _tooltip_1: {
                                qtiClass: '_tooltip',
                                attributes: {},
                                body: {
                                    body: 'CSS'
                                },
                                content: 'tooltip'
                            }
                        }
                    },
                    responses: {}
                },
                assets: {}
            }
        };
        const outputNoHideTooltipsSpecified = itemDataParser(itemData, itemRunnerConfig, getInteractionComponent);
        expect(outputNoHideTooltipsSpecified.blockTree[0].component).toBeUndefined();

        itemRunnerConfig.options = {
            hideTooltips: false
        };
        const outputHideTooltipsSetToFalse = itemDataParser(itemData, itemRunnerConfig, getInteractionComponent);
        expect(outputHideTooltipsSetToFalse.blockTree[0].component).toBeDefined();

        itemRunnerConfig.options = {
            hideTooltips: true
        };
        const outputHideTooltipsSetToTrue = itemDataParser(itemData, itemRunnerConfig, getInteractionComponent);
        expect(outputHideTooltipsSetToTrue.blockTree[0].component).toBeUndefined();
    });
});
