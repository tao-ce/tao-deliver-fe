// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getReadableContent } from '../../../interactions/util/aria.js';

/**
 * Properties mapper for the Match interaction
 */

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
        //for screenreaders
        if (choiceProperties.content) {
            choiceProperties.plainText = getReadableContent(choiceProperties.content);
        }
        if (choiceProperties.blockTree) {
            const mathMlBlocks = choiceProperties.blockTree.filter(
                block => block.props && block.props.attributes && block.props.attributes.mathML
            );
            mathMlBlocks.forEach(block => {
                choiceProperties.content = choiceProperties.content.replace(
                    `{{${block.content}}}`,
                    `<math xmlns="http://www.w3.org/1998/Math/MathML">${block.props.attributes.mathML}</math>`
                );
            });
        }
        return choiceProperties;
    },

    /**
     * Map itemData properties to interaction props
     * @param {Object} properties
     * @returns {Object} mapped properties
     */
    mapProperties(properties) {
        // extend all choices with their list positions
        if (properties.choices && properties.choices.length === 2) {
            properties.choices.forEach(list => {
                list.forEach((choice, n) => {
                    choice.position = n + 1;
                });
            });
        }
        return properties;
    }
};
