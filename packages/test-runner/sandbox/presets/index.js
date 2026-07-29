// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import linear3Items from './tests/linear3Items.json';
import nonLinear8Items from './tests/nonLinear8Items.json';
import nonLinearGraphic from './tests/nonLinearGraphicInteractions.json';
import nonLinear2Sections from './tests/nonLinear2Sections.json';
import nonLinear2Parts3Sections25Items from './tests/nonLinear2Parts3Sections25Items.json';
import nonLinear4Sections20Items from './tests/nonLinear4Sections20Items.json';
import nonLinear6ItemsSubmissionRestrictions from './tests/nonLinear6ItemsSubmissionRestrictions.json';
import nonLinearStyledItems from './tests/nonLinearStyledItems.json';
import nonLinear4Parts from './tests/nonLinear4Parts.json';
import nonLinearShortAttempts from './tests/nonLinearShortAttempts.json';
import nonLinearStateful from './tests/nonLinearStatefulInteractions.json';
import nonLinearPassages from './tests/nonLinearWithPassages.json';
import nonLinearChoiceWithElimination from './tests/nonLinearChoiceWithElimination.json';
import nonLinearWithResponses from './tests/nonLinearWithResponses.json';
import itemsWithStyledPassages from './tests/itemsWithStyledPassages.json';
import nonLinearPcis from './tests/nonLinearPcis.json';
import nonLinearTimers from './tests/nonLinearTimers.json';
import allExtendedTexts from './tests/allExtendedTexts.json';
import itemWithLongTextAndAnchor from './tests/itemWithLongTextAndAnchor.json';
import nonLinearModalFeedbacks from './tests/nonLinearModalFeedbacks.json';
import itemsVerticalWriting from './tests/itemsVerticalWriting.json';

import * as items from './items/index.js';

export default {
    linear3Items: {
        label: 'Linear 3 Items',
        test: linear3Items,
        items: {
            item1: items.collectable,
            item2: items.gt,
            item3: items.multilanguageText
        }
    },
    nonLinear8Items: {
        label: 'Non-Linear 8 Items',
        test: nonLinear8Items,
        items: {
            item1: items.spaceShuttle,
            item2: items.planets,
            item3: items.frenchWords,
            item4: items.weights,
            item5: items.photo,
            item6: items.rich3,
            item7: items.netherlands,
            item8: items.maths
        }
    },
    nonLinearWithResponses: {
        label: 'Non-Linear with responses',
        test: nonLinearWithResponses,
        items: {
            item1: items.marketplaceWithResponse,
            item2: items.photoWithResponse,
            item3: items.planetsWithReview
        }
    },
    nonLinearGraphic: {
        label: 'Non-Linear Graphic interactions',
        test: nonLinearGraphic,
        items: {
            item1: items.humanBody,
            item2: items.vegetarian,
            item3: items.usPopulation,
            item4: items.wally,
            item5: items.toolsAndMaterials
        }
    },
    nonLinearStyledItems: {
        label: 'Non-Linear styled items',
        test: nonLinearStyledItems,
        items: {
            item1: items.styledSpaceShuttle,
            item2: items.styledArithmetic,
            item3: items.styledRich3,
            item4: items.toolsAndMaterials
        }
    },
    itemsWithStyledPassages: {
        label: 'Items with styled passages',
        test: itemsWithStyledPassages,
        items: {
            'item-1': items.styledPassage1,
            'item-2': items.styledPassage2,
            'item-3': items.styledPassage3,
            'item-4': items.styledPassage4
        }
    },
    nonLinear2Sections: {
        label: 'Non-Linear 2 Sections',
        test: nonLinear2Sections,
        items: {
            item1: items.baudelaire,
            item2: items.maths,
            item3: items.arithmetic,
            item4: items.clarimonde,
            item5: items.baudelaire,
            item6: items.maths,
            item7: items.rich3,
            item8: items.arithmetic
        }
    },
    nonLinear2Parts3Sections25Items: {
        label: 'Non-Linear 2 Parts 3 Sections 25 Items',
        test: nonLinear2Parts3Sections25Items,
        items: {
            item24: items.baudelaire,
            item17: items.maths,
            item19: items.arithmetic,
            item20: items.rich3,
            item21: items.baudelaire,
            item22: items.maths,
            item23: items.rich3,
            item1: items.arithmetic,
            item2: items.baudelaire,
            item3: items.maths,
            item4: items.arithmetic,
            item5: items.rich3,
            item6: items.baudelaire,
            item7: items.maths,
            item8: items.rich3,
            item9: items.arithmetic,
            item10: items.baudelaire,
            item11: items.maths,
            item12: items.arithmetic,
            item13: items.extended,
            item14: items.baudelaire,
            item15: items.maths,
            item16: items.rich3,
            item18: items.arithmetic,
            item25: items.baudelaire
        }
    },
    nonLinear4Sections20Items: {
        label: 'Non-Linear 4 Sections',
        test: nonLinear4Sections20Items,
        items: {
            item1: items.baudelaire,
            item2: items.maths,
            item3: items.arithmetic,
            item4: items.rich3,
            item5: items.baudelaire,
            item6: items.maths,
            item7: items.rich3,
            item8: items.arithmetic,
            item9: items.baudelaire,
            item10: items.maths,
            item11: items.arithmetic,
            item12: items.rich3,
            item13: items.baudelaire,
            item14: items.maths,
            item15: items.rich3,
            item16: items.arithmetic,
            item17: items.baudelaire,
            item18: items.maths,
            item19: items.arithmetic,
            item20: items.rich3,
            item21: items.baudelaire
        }
    },
    nonLinear6ItemsSubmissionRestrictions: {
        label: 'Non-Linear 6 Items Submission Restrictions',
        test: nonLinear6ItemsSubmissionRestrictions,
        items: {
            item1: items.spaceShuttle, // choice, 3 attempts, disallow skipping
            item2: items.marketplace, // extendedText, patternMask, 5 attempts, validate responses
            item3: items.mathEntry, // extendedText, math entry, 3 attempts
            item4: items.netherlands, // textEntry multiple, patternMasks, 2 attempts, disallow skipping & validate responses
            item5: items.beatles, // inlineChoice multiple, all required, 5 attempts, validate reponses
            item6: items.arithmetic // textEntry multiple, constraints, 2 attempts, validate responses
        }
    },
    nonLinear4Parts: {
        label: 'Non-Linear 4 Parts',
        test: nonLinear4Parts,
        items: {
            item1: items.spaceShuttle,
            item2: items.planets,
            item3: items.frenchWords,
            item4: items.weights,
            item5: items.photo,
            item6: items.rich3,
            item7: items.netherlands,
            item8: items.maths,
            item9: items.arithmetic,
            item10: items.extended
        }
    },
    nonLinearShortAttempts: {
        label: 'Non-Linear Short Attempts',
        test: nonLinearShortAttempts,
        items: {
            item1: items.frenchWords, // hottext, 2 attempts
            item2: items.mathEntry, // extendedText, 2 attempts
            item3: items.spaceShuttle // choice
        }
    },
    nonLinearStateful: {
        label: 'Non-Linear Stateful Interactions',
        test: nonLinearStateful,
        items: {
            item1: items.chemistry, // media
            item2: items.staticMedia, // no interactions
            item3: items.weights, // order
            item4: items.planets, // associate
            item5: items.usPopulation, // graphic order
            item6: items.spaceShuttle, // choice
            item7: items.sequentialAudios, // 2 audios
            item8: items.audioRecordingPci // 2 audios + 2 recordings
        }
    },
    nonLinearPassages: {
        label: 'Non-Linear with Passages',
        test: nonLinearPassages,
        items: {
            item1: items.passageAll,
            item2: items.passageFirst,
            item3: items.passageSecond,
            item4: items.passagePrompt,
            item5: items.frenchWords,
            item6: items.dualColumn
        }
    },
    nonLinearChoiceWithElimination: {
        label: 'Non-Linear Choice interactions',
        test: nonLinearChoiceWithElimination,
        items: {
            item1: items.choiceEliminationEnabled,
            item2: items.choiceEliminationDisabled,
            item3: items.choice3EliminationEnabled,
            item4: items.choice3EliminationDisabled,
            item5: items.choiceMixEliminationEnableDisabled,
            item6: items.choiceEliminationEnabled,
            item7: items.choiceEliminationDisabled,
            item8: items.choice3EliminationEnabled,
            item9: items.choice3EliminationDisabled,
            item10: items.choiceMixEliminationEnableDisabled,
            item15: items.choiceEliminationEnabled,
            item14: items.choiceEliminationDisabled,
            item13: items.choice3EliminationEnabled,
            item12: items.choice3EliminationDisabled,
            item11: items.choiceMixEliminationEnableDisabled,
            item16: items.choiceMixEliminationEnableDisabled,
            item17: items.choiceAnswerMaskingEnabled,
            item18: items.choiceAnswerMaskingDisabled
        }
    },
    nonLinearPcis: {
        label: 'Non-Linear PCIs',
        test: nonLinearPcis,
        items: {
            item1: items.demoPci,
            item2: items.entryCodePci,
            item3: items.audioRecordingPci,
            item4: items.geogebraPci,
            item5: items.textReaderPci

        }
    },
    nonLinearTimers: {
        label: 'Non-Linear Timers',
        test: nonLinearTimers,
        items: {
            item1: items.spaceShuttle,
            item2: items.planets,
            item3: items.frenchWords,
            item4: items.weights,
            item5: items.photo,
            item6: items.rich3,
            item7: items.netherlands,
            item8: items.maths
        }
    },
    itemWithLongTextAndAnchor: {
        label: 'Item with long text and anchor',
        test: itemWithLongTextAndAnchor,
        items: {
            item1: items.clarimonde2
        }
    },
    allExtendedTexts: {
        label: 'All ExtendedTexts',
        test: allExtendedTexts,
        items: {
            item1: items.marketplace,
            item2: items.marketplaceWithResponse,
            item3: items.mathEntry,
            item4: items.extended,
            item5: items.documentEditor,
            item6: items.verticalWritingExtendedText
        }
    },
    nonLinearModalFeedbacks: {
        label: 'Non-Linear ModalFeedbacks',
        test: nonLinearModalFeedbacks,
        items: {
            item1: items.spaceShuttle,
            item2: items.planets,
            item3: items.frenchWords,
            item4: items.weights,
            item5: items.photo,
            item6: items.rich3
        }
    },
    itemsVerticalWriting: {
        label: 'Items Vertical Writing',
        test: itemsVerticalWriting,
        items: {
            item1: items.verticalWritingExtendedText,
            item2: items.verticalWritingTextEntry,
            item3: items.verticalWritingInlineChoice,
            item4: items.verticalWritingChoice
        }
    }
};
