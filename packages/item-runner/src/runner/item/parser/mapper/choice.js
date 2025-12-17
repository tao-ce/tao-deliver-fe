// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Properties mapper for the Choice interaction's choices.
 */

import blockTypes from '../../blocks/blockTypes.js';
import Img from '../../../static/Img.svelte';

/**
 * Extract the caption choice properties from the
 * blockTree of a choice
 * @param {Object[]} blockTree - the choice blockTree
 * @returns {?{image: Object, text : string}} the extracted image and text
 */
function extractCaptionChoice(blockTree = []) {
    const onlyImageAndText = blockTree.every(
        block =>
            (!block.children || block.children.length === 0) &&
            (block.component === Img || block.type === blockTypes.text)
    );

    if (onlyImageAndText) {
        const images = blockTree.filter(block => block.component === Img);
        const texts = blockTree.filter(block => block.type === blockTypes.text && block.content.trim().length > 0);
        if (images.length === 1) {
            return {
                image: images[0].props.attributes,
                text: texts.map(block => block.content).join(' ')
            };
        }
    }
    return null;
}

/**
 * Export the mapper
 */
export default {
    /**
     * Map the received choice properties
     * @param {Object} choiceProperties - received properties
     * @returns {Object} mapped properties
     */
    mapChoiceProperties(choiceProperties = {}) {
        //the component expect the choice identifier under the `key` property
        if (choiceProperties.identifier) {
            choiceProperties.key = choiceProperties.identifier;
            delete choiceProperties.identifier;
        }
        if (choiceProperties.content || choiceProperties.content === '') {
            choiceProperties.label = choiceProperties.content;
            delete choiceProperties.content;
        }

        if (Array.isArray(choiceProperties.blockTree)) {
            //configure the caption choices based on their content
            const extract = extractCaptionChoice(choiceProperties.blockTree);
            if (extract) {
                const { image, text } = extract;
                if (image) {
                    choiceProperties.image = image;
                }
                if (text) {
                    choiceProperties.label = text;
                } else {
                    choiceProperties.label = false;
                }
            }
        }

        return choiceProperties;
    }
};
