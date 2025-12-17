// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { isPlainText } from '../../blocks/blockTreeBuilder.js';

/**
 * Properties mapper for the GapMatch interaction
 */
export default {
    /**
     * Prepare interaction props
     * - move math blocks into choices
     * - set gaps data
     * - calculate cardinality based on gaps number
     * @param {object} properties - GapMatch properties
     * @param {object} element - GapMatch description
     * @param {string} element.body - GapMatch body
     * @returns {object} mapped properties
     */
    mapProperties(properties, { body } = {}) {
        if (properties.choices) {
            properties.choices.forEach(choice => {
                choice.isComplexContent = !isPlainText(choice.blockTree);
                const mathMlBlocks = choice.blockTree.filter(
                    block => block.props && block.props.attributes && block.props.attributes.mathML
                );
                mathMlBlocks.forEach(block => {
                    choice.content = choice.content.replace(
                        `{{${block.content}}}`,
                        `<math xmlns="http://www.w3.org/1998/Math/MathML">${block.props.attributes.mathML}</math>`
                    );
                });
            });
        }

        const elements = body && body.elements ? body.elements : {};
        properties.gaps = Object.values(elements).filter(el => el.qtiClass === 'gap').map(el => el.attributes);

        if (!properties.cardinality || typeof properties.cardinality !== 'string') {
            const cardinality = Object.keys(elements).length > 1 ? 'multiple' : 'single';
            return Object.assign({}, properties, { cardinality });
        }
        return properties;
    }
};
