// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getModalFeedbackQueueData, getModalFeedbackItemData } from '../modalFeedbackParser.js';

describe('getModalFeedbackQueueData', () => {
    it('returns array of matching feedbacks', () => {
        const itemSession = {
            RESPONSE: {
                list: {
                    identifier: ['choice_1']
                }
            },
            FEEDBACK_1: {
                base: {
                    identifier: 'feedbackModal_2'
                }
            },
            FEEDBACK_2: {
                base: null
            },
            FEEDBACK_3: {
                base: {
                    identifier: 'feedbackModal_4'
                }
            }
        };
        const feedbacks = {
            responsedeclaration_a: {
                feedbackRules: {
                    response_simplefeedbackrule_a: {
                        serial: 'response_simplefeedbackrule_a',
                        qtiClass: '_simpleFeedbackRule',
                        comparedOutcome: 'responsedeclaration_a',
                        feedbackOutcome: 'outcomedeclaration_a',
                        feedbackThen: 'feedback_modalfeedback_111',
                        feedbackElse: 'feedback_modalfeedback_222'
                    }
                }
            },
            responsedeclaration_b: {
                feedbackRules: {
                    response_simplefeedbackrule_b: {
                        serial: 'response_simplefeedbackrule_b',
                        qtiClass: '_simpleFeedbackRule',
                        comparedOutcome: 'responsedeclaration_b',
                        feedbackOutcome: 'outcomedeclaration_b',
                        feedbackThen: 'feedback_modalfeedback_333',
                        feedbackElse: ''
                    }
                }
            },
            responsedeclaration_c: {
                feedbackRules: {
                    response_simplefeedbackrule_c: {
                        serial: 'response_simplefeedbackrule_c',
                        qtiClass: '_simpleFeedbackRule',
                        comparedOutcome: 'responsedeclaration_c',
                        feedbackOutcome: 'outcomedeclaration_c',
                        feedbackThen: 'feedback_modalfeedback_444',
                        feedbackElse: ''
                    }
                }
            },
            feedback_modalfeedback_111: {
                identifier: 'feedbackModal_1',
                serial: 'feedback_modalfeedback_111',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_1',
                    outcomeIdentifier: 'FEEDBACK_1',
                    showHide: 'show',
                    title: '111'
                },
                body: {
                    a: '11'
                }
            },
            feedback_modalfeedback_222: {
                identifier: 'feedbackModal_2',
                serial: 'feedback_modalfeedback_222',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_2',
                    outcomeIdentifier: 'FEEDBACK_1',
                    showHide: 'show',
                    title: '222'
                },
                body: {
                    b: '22'
                }
            },
            feedback_modalfeedback_333: {
                identifier: 'feedbackModal_3',
                serial: 'feedback_modalfeedback_333',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_3',
                    outcomeIdentifier: 'FEEDBACK_2',
                    showHide: 'show',
                    title: '333'
                },
                body: {
                    c: '33'
                }
            },
            feedback_modalfeedback_444: {
                identifier: 'feedbackModal_4',
                serial: 'feedback_modalfeedback_444',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_4',
                    outcomeIdentifier: 'FEEDBACK_3',
                    showHide: 'show',
                    title: '444'
                },
                body: {
                    d: '44'
                }
            }
        };
        expect(getModalFeedbackQueueData(feedbacks, itemSession)).toEqual([
            {
                identifier: 'feedbackModal_2',
                serial: 'feedback_modalfeedback_222',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_2',
                    outcomeIdentifier: 'FEEDBACK_1',
                    showHide: 'show',
                    title: '222'
                },
                body: {
                    b: '22'
                }
            },
            {
                identifier: 'feedbackModal_4',
                serial: 'feedback_modalfeedback_444',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_4',
                    outcomeIdentifier: 'FEEDBACK_3',
                    showHide: 'show',
                    title: '444'
                },
                body: {
                    d: '44'
                }
            }
        ]);
    });

    it('returns empty array if no declared feedbacks', () => {
        const itemSession = {
            RESPONSE: {
                list: {
                    identifier: ['choice_1']
                }
            }
        };
        const feedbacks = {
            i64dd0b4e19f9f: {
                processingType: 'templateDriven',
                responseRules: [
                    {
                        qtiClass: 'responseCondition',
                        responseIf: {
                            qtiClass: 'responseIf',
                            expression: {
                                qtiClass: 'match',
                                expressions: [
                                    {
                                        qtiClass: 'variable',
                                        attributes: {
                                            identifier: 'RESPONSE'
                                        }
                                    },
                                    {
                                        qtiClass: 'correct',
                                        attributes: {
                                            identifier: 'RESPONSE'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        };

        expect(getModalFeedbackQueueData(feedbacks, itemSession)).toEqual([]);
    });

    it('adds modals with just title or just body into queue', () => {
        const itemSession = {
            RESPONSE: {
                list: {
                    identifier: ['choice_1']
                }
            },
            FEEDBACK_1: {
                base: {
                    identifier: 'feedbackModal_1'
                }
            },
            FEEDBACK_2: {
                base: {
                    identifier: 'feedbackModal_2'
                }
            },
            FEEDBACK_3: {
                base: {
                    identifier: 'feedbackModal_3'
                }
            }
        };
        const feedbacks = {
            feedback_with_only_title: {
                identifier: 'feedbackModal_1',
                serial: 'feedback_modalfeedback_111',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_1',
                    outcomeIdentifier: 'FEEDBACK_1',
                    showHide: 'show',
                    title: '111'
                },
                body: {
                    body: '',
                    elements: {}
                }
            },
            feedback_with_only_simple_body: {
                identifier: 'feedbackModal_2',
                serial: 'feedback_modalfeedback_222',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_2',
                    outcomeIdentifier: 'FEEDBACK_2',
                    showHide: 'show',
                    title: ''
                },
                body: {
                    body: 'body text'
                }
            },
            feedback_with_only_complex_body: {
                identifier: 'feedbackModal_3',
                serial: 'feedback_modalfeedback_333',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_3',
                    outcomeIdentifier: 'FEEDBACK_3',
                    showHide: 'show',
                    title: ''
                },
                body: {
                    body: '{{{some_element_serial}}}',
                    elements: {
                        some_element_serial: {
                            elements: {
                                qtiClass: 'math',
                                attributes: [],
                                mathML: '<mrow><mi>E</mi></mrow><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup>'
                            }
                        }
                    }
                }
            }
        };

        expect(getModalFeedbackQueueData(feedbacks, itemSession).length).toBe(3);
    });

    it('does not add modal with empty data into queue', () => {
        const itemSession = {
            RESPONSE: {
                list: {
                    identifier: ['choice_1']
                }
            },
            FEEDBACK_1: {
                base: {
                    identifier: 'feedbackModal_1'
                }
            },
            FEEDBACK_2: {
                base: {
                    identifier: 'feedbackModal_2'
                }
            },
            FEEDBACK_3: {
                base: {
                    identifier: 'feedbackModal_3'
                }
            }
        };
        const feedbacks = {
            feedback_with_data: {
                identifier: 'feedbackModal_1',
                serial: 'feedback_modalfeedback_111',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_1',
                    outcomeIdentifier: 'FEEDBACK_1',
                    showHide: 'show',
                    title: '111'
                },
                body: {
                    a: '11'
                }
            },
            feedback_with_empty_data: {
                identifier: 'feedbackModal_2',
                serial: 'feedback_modalfeedback_222',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_2',
                    outcomeIdentifier: 'FEEDBACK_2',
                    showHide: 'show',
                    title: ''
                },
                body: {
                    body: '',
                    elements: {}
                }
            },
            feedback_with_spaces_filled_data: {
                identifier: 'feedbackModal_3',
                serial: 'feedback_modalfeedback_333',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_3',
                    outcomeIdentifier: 'FEEDBACK_3',
                    showHide: 'show',
                    title: '\n\n  '
                },
                body: {
                    body: '<div class="x-tao-wrapper x-tao-relatedOutcome-RESPONSE"></div>',
                    elements: [],
                }
            },
        };

        expect(getModalFeedbackQueueData(feedbacks, itemSession)).toEqual([{
            identifier: 'feedbackModal_1',
            serial: 'feedback_modalfeedback_111',
            qtiClass: 'modalFeedback',
            attributes: {
                identifier: 'feedbackModal_1',
                outcomeIdentifier: 'FEEDBACK_1',
                showHide: 'show',
                title: '111'
            },
            body: {
                a: '11'
            }
        }]);
    });
});

describe('getModalFeedbackItemData', () => {
    it('returns modal data, wrapped to fit itemData structure, with inherited assets & stylesheets', () => {
        const modal = {
            identifier: 'feedbackModal_1',
            serial: 'feedback_modalfeedback_111',
            qtiClass: 'modalFeedback',
            attributes: {
                identifier: 'feedbackModal_1',
                outcomeIdentifier: 'FEEDBACK_1',
                showHide: 'show',
                title: '111'
            },
            body: {
                body: '{{image_1}}',
                elements: { e: '55' }
            }
        };
        const compiledItemData = {
            itemData: {
                b: '22',
                data: {
                    body: {
                        body: '{{interaction_a}}',
                        elements: { c: '33' }
                    },
                    assets: ['aa'],
                    stylesheets: ['bb'],
                    d: '44'
                }
            }
        };
        expect(getModalFeedbackItemData(modal, compiledItemData)).toEqual({
            itemData: {
                b: '22',
                data: {
                    body: { body: `{{feedback_modalfeedback_111}}`, elements: { feedback_modalfeedback_111: modal } },
                    assets: ['aa'],
                    stylesheets: ['bb'],
                    d: '44'
                }
            }
        });
    });
});
