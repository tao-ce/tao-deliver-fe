// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import spaceShuttle from './space-shuttle.choice.json';
import dagon from './dagon.json';
import americaDiscovery from './americaDiscovery.json';
import equation from './equation.json';
import zombieland from './zombieland.json';
import spanishFood from './spanish-food.json';
import schengen from './schengen.json';
import breakingWater from './breakingWater.json';
import arithmetic from './arithmetic.json';
import math from './math.json';
import arabic from './arabic.json';
import clarimonde1 from './clarimonde1.json';
import clarimonde2 from './clarimonde2.json';
import photo from './photo.json';
import introduction from './introduction.json';
import frenchWords from './french-words.json';
import customStyles from './custom-styles.json';
import weights from './weights.order.json';
import weightsHorizontal from './weights-horizontal.order.json';
import weightsVertical from './weights-vertical.order.json';
import paintings from './paintings.order.json';
import animals from './animals.json';
import gridLayout from './grid-layout.json';
import planets from './planets.associate.json';
import extendedInteraction from './extended-interaction.json';
import marketplace from './marketplace.extendedText.json';
import mathentry from './mathentry.extendedText.json';
import shakespeare from './shakespeare.match.json';
import languages from './languages.match.json';
import cylinder from './cylinder.match.json';
import magicSquare from './magic-square.json';
import scandinavians from './scandinavians.hotspot.json';
import versailles from './versailles.hotspot.json';
import wally from './wally.selectPoint.json';
import japanAltitude from './japan-altitude.hotspot.json';
import humanBody from './human-body.hotspot.json';
import poet from './baudelaire.gapMatch.json';
import poem from './complex-content.gapMatch.json';
import whales from './whales.gapMatch.json';
import surfing from './surfing.json';
import firstYotube from './first-youtube.json';
import mathOrderAssociate from './math.order-associate.json';
import demoPCI from './demo.pci.json';
import flags from './flags.graphicGapMatch.json';
import flagsPositions from './flags-positions.graphicGapMatch.json';
import vegetarian from './vegetarian.graphicGapMatch.json';
import aspectRatios from './aspect-ratios.graphicGapMatch.json';
import termsOfHundred from './terms-of-hundred.graphicGapMatch.json';
import usPopulation from './us-population.graphicOrder.json';
import kanjiPainting from './kanji-painting.graphicOrder.json';
import slider from './slider.json';
import toolsAndMaterials from './toolsAndMaterials.graphicAssociate.json';
import feedbacksTextEntry from './feedbacks.textentry.json';
import richardThirdStyled from './styled-richard3.inlineChoice.json';
import layout from './layout.json';
import pdf from './pdf.json';
import styledPassage from './styled-passage.json';
import modalFeedback from './modalFeedback.json';
import extendedTextMaxlength from './extendedText.maxlength.json';
import tooltip from './tooltip.choice.json';
import maxSelect2To3 from './max-select-2-to-3.json';
import extendedTextMaxwords from './extendedText.maxwords.json';

export default {
    gapMatch: {
        label: 'Charles Baudelaire',
        // this metadata is only used for full text search in the sandbox UI
        // feel free to add anything which could be searched for
        meta: {
            interactions: 'gapmatch'
        },
        itemData: poet
    },
    poem: {
        label: 'Baudelaire on steroids',
        meta: {
            interactions: 'gapmatch',
            features: 'mathml'
        },
        itemData: poem
    },
    whales: {
        label: 'Whales',
        meta: {
            interactions: 'gapmatch'
        },
        itemData: whales
    },
    shuttle: {
        label: 'Space Shuttle',
        meta: {
            interactions: 'choice'
        },
        itemData: spaceShuttle
    },
    dagon: {
        label: 'Dagon',
        meta: {
            interactions: 'extendedText plain',
            features: 'columns'
        },
        itemData: dagon
    },
    americaDiscovery: {
        label: 'America Discovery',
        meta: {
            interactions: 'textEntry'
        },
        itemData: americaDiscovery
    },
    equation: {
        label: 'Quadratic Equation',
        meta: {
            interactions: 'choice',
            features: 'mathml'
        },
        itemData: equation
    },
    zombieland: {
        label: 'Zombieland',
        meta: {
            interactions: 'choice'
        },
        itemData: zombieland
    },
    spanish: {
        label: 'Spanish Food',
        meta: {
            interactions: 'choice'
        },
        itemData: spanishFood
    },
    schengen: {
        label: 'Schengen Area Flags',
        meta: {
            interactions: 'choice',
            features: 'images'
        },
        itemData: schengen
    },
    breakingWater: {
        label: 'Breaking Water',
        meta: {
            interactions: 'inlineChoice'
        },
        itemData: breakingWater
    },
    richardThirdStyled: {
        label: 'Richard III (styled)',
        meta: {
            interactions: 'inlineChoice',
            features: 'stylesheet'
        },
        itemData: richardThirdStyled
    },
    arithmetic: {
        label: 'Arithmetic & Poetry',
        meta: {
            interactions: 'textEntry',
            features: 'validation'
        },
        itemData: arithmetic
    },
    feedbacksTextEntry: {
        label: 'Feedbacks',
        meta: {
            interactions: 'textEntry',
            features: 'validation feedback'
        },
        itemData: feedbacksTextEntry
    },
    math: {
        label: 'Complex Math Examples',
        meta: {
            features: 'mathml'
        },
        itemData: math
    },
    arabic: {
        label: 'Tokio',
        meta: {
            interactions: 'choice',
            i18n: 'arabic rtl'
        },
        itemData: arabic
    },
    clarimonde1: {
        label: 'Clarimonde 1',
        meta: {
            interactions: 'choice',
            features: 'columns stimulus scrollposition'
        },
        itemData: clarimonde1
    },
    clarimonde2: {
        label: 'Clarimonde 2',
        meta: {
            interactions: 'extendedText plain',
            features: 'columns stimulus scrollposition'
        },
        itemData: clarimonde2
    },
    photo: {
        label: 'Photo',
        meta: {
            interactions: 'fileUpload'
        },
        itemData: photo
    },
    introduction: {
        label: 'Introduction',
        meta: {
            features: 'informational'
        },
        itemData: introduction
    },
    frenchWords: {
        label: 'French Words',
        meta: {
            interactions: 'hottext',
            i18n: 'japanese ruby hebrew rtl'
        },
        itemData: frenchWords
    },
    customStyles: {
        label: 'Custom styles',
        meta: {
            interactions: 'choice',
            features: 'stylesheet'
        },
        itemData: customStyles
    },
    weights: {
        label: 'Weights',
        meta: {
            interactions: 'order'
        },
        itemData: weights
    },
    weightsHorizontal: {
        label: 'Weights (Horizontal)',
        meta: {
            interactions:
                'order qti-orientation-horizontal qti-choices-left qti-choices-right qti-choices-top qti-choices-bottom'
        },
        itemData: weightsHorizontal
    },
    weightsVertical: {
        label: 'Weights (Vertical)',
        meta: {
            interactions:
                'order qti-orientation-vertical qti-choices-left qti-choices-right qti-choices-top qti-choices-bottom'
        },
        itemData: weightsVertical
    },
    paintings: {
        label: 'Paintings Order',
        meta: {
            interactions: 'order',
            features: 'images'
        },
        itemData: paintings
    },
    animals: {
        label: 'Animal Sounds',
        meta: {
            interactions: 'choice',
            features: 'audio columns'
        },
        itemData: animals
    },
    gridLayout: {
        label: 'Grid Layout',
        meta: {
            interactions: 'choice hottext',
            features: 'columns audio stylesheet'
        },
        itemData: gridLayout
    },
    planets: {
        label: 'Planets and Moons',
        meta: {
            interactions: 'associate'
        },
        itemData: planets
    },
    extendedText: {
        label: 'Extended text',
        meta: {
            interactions: 'extendedText'
        },
        itemData: extendedInteraction
    },
    marketplace: {
        label: 'Marketplace',
        meta: {
            interactions: 'extendedText'
        },
        itemData: marketplace
    },
    mathentry: {
        label: 'Math Entry',
        meta: {
            interactions: 'extendedText',
            features: 'mathEntry mathml'
        },
        itemData: mathentry
    },
    shakespeare: {
        label: 'Characters and Plays',
        meta: {
            interactions: 'match tabular'
        },
        itemData: shakespeare
    },
    languages: {
        label: 'Languages & Countries',
        meta: {
            interactions: 'match non-tabular',
            features: 'qti-choices-top'
        },
        itemData: languages
    },
    cylinder: {
        label: 'Cylinder Volume',
        meta: {
            interactions: 'match non-tabular',
            features: 'mathml qti-choices-left'
        },
        itemData: cylinder
    },
    magicSquare: {
        label: 'Magic Square',
        meta: {
            interactions: 'textEntry',
            features: 'table'
        },
        itemData: magicSquare
    },
    scandinavians: {
        label: 'Scandinavians',
        meta: {
            interactions: 'hotspot',
            features: 'graphic'
        },
        itemData: scandinavians
    },
    versailles: {
        label: 'Versailles',
        meta: {
            interactions: 'hotspot',
            features: 'graphic'
        },
        itemData: versailles
    },
    wally: {
        label: 'Wally',
        meta: {
            interactions: 'selectPoint',
            features: 'graphic'
        },
        itemData: wally
    },
    japanAltitude: {
        label: 'Japan Altitude',
        meta: {
            interactions: 'hotspot',
            features: 'graphic'
        },
        itemData: japanAltitude
    },
    humanBody: {
        label: 'Human Body Organs',
        meta: {
            interactions: 'hotspot',
            features: 'graphic'
        },
        itemData: humanBody
    },
    flags: {
        label: 'Flags',
        meta: {
            interactions: 'graphicGapMatch',
            features: 'graphic qti-choices-left'
        },
        itemData: flags
    },
    flagsPositions: {
        label: 'Flags with positions',
        meta: {
            interactions: 'graphicGapMatch',
            features: 'graphic qti-choices-left qti-choices-right qti-choices-top qti-choices-bottom'
        },
        itemData: flagsPositions
    },
    surfing: {
        label: 'Surfing',
        meta: {
            interactions: 'media video'
        },
        itemData: surfing
    },
    firstYotube: {
        label: 'Youtube media',
        meta: {
            interactions: 'media video',
            features: 'youtube'
        },
        itemData: firstYotube
    },
    mathOrderAssociate: {
        label: 'Math',
        meta: {
            interactions: 'order associate',
            features: 'mathml'
        },
        itemData: mathOrderAssociate
    },
    demoPCI: {
        label: 'Demo PCI',
        meta: {
            interactions: 'pci'
        },
        itemData: demoPCI
    },
    vegetarian: {
        label: 'Vegetarian',
        meta: {
            interactions: 'graphicGapMatch',
            features: 'graphic qti-choices-top'
        },
        itemData: vegetarian
    },
    aspectRatios: {
        label: 'Aspect ratios',
        meta: {
            interactions: 'graphicGapMatch',
            features: 'graphic qti-choices-left'
        },
        itemData: aspectRatios
    },
    termsOfHundred: {
        label: 'Terms of hundred',
        meta: {
            interactions: 'graphicGapMatch',
            features: 'graphic qti-choices-left'
        },
        itemData: termsOfHundred
    },
    usPopulation: {
        label: 'U.S. Population',
        meta: {
            interactions: 'graphicOrder',
            features: 'graphic'
        },
        itemData: usPopulation
    },
    kanjiPainting: {
        label: 'Kanji stroke order',
        meta: {
            interactions: 'graphicOrder',
            features: 'graphic'
        },
        itemData: kanjiPainting
    },
    toolsAndMaterials: {
        label: 'Tool Associations',
        meta: {
            interactions: 'graphicAssociate',
            features: 'graphic'
        },
        itemData: toolsAndMaterials
    },
    slider: {
        label: 'Slider',
        meta: {
            interactions: 'slider',
            features: 'horizontal vertical'
        },
        itemData: slider
    },
    layout: {
        label: 'Column Layout',
        meta: {
            features: 'columns'
        },
        itemData: layout
    },
    pdf: {
        label: 'PDF',
        meta: {
            interactions: 'choice',
            features: 'pdf embed'
        },
        itemData: pdf
    },
    styledPassage: {
        label: 'Styled passage',
        meta: {
            features: 'stimulus stylesheet'
        },
        itemData: styledPassage
    },
    modalFeedback: {
        label: 'Modal feedback',
        meta: {
            features: 'modalFeedback'
        },
        itemData: modalFeedback
    },
    extendedTextMaxlength: {
        label: 'ExtendedText Maxlength',
        meta: {
            interactions: 'extendedText',
            features: 'counter maxlength'
        },
        itemData: extendedTextMaxlength
    },
    tooltip: {
        label: 'Tooltips in CSS',
        meta: {
            interactions: 'choice',
            features: 'tooltip'
        },
        itemData: tooltip
    },
    maxSelect2To3: {
        label: 'Max Select 2 to 3',
        meta: {
            interactions: 'choice'
        },
        itemData: maxSelect2To3
    },
    extendedTextMaxwords: {
        label: 'ExtendedText Maxwords',
        meta: {
            interactions: 'extendedText',
            features: 'counter maxwords'
        },
        itemData: extendedTextMaxwords
    }
};
