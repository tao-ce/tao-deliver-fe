// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { withUnit } from '../../../util/size.js';

/**
 * Properties mapper for the Figure static element
 */
export default {
    /**
     * Map QTI custom properties into attributes
     * @param {Object} properties
     * @param {Object} element
     * @returns {Object} mapped properties
     */
    mapProperties(properties, element) {
        if (properties.blockTree) {
            const elementsImage = Object.values(element.body.elements).find(node => node && node.qtiClass === 'img');
            const itemBlocksImage = properties.blockTree.find(
                node => node.type === 'element' && node.content === (elementsImage && elementsImage.serial)
            );

            // If there is a nested image which has a `width`, move this `width` up to the figure.
            // Image's `height` can stay.
            // Note: figure with multiple nested images is not yet supported in terms of styling.
            if (itemBlocksImage && elementsImage && elementsImage.attributes) {
                if (elementsImage.attributes.width) {
                    properties.imageElementWidth = withUnit(elementsImage.attributes.width); //should be set as 'style="width"' of <figure>
                    properties.imageElementHeight = withUnit(elementsImage.attributes.height);
                    itemBlocksImage.props.attributes ||= {};
                    itemBlocksImage.props.attributes.width = '100%';
                } else {
                    properties.class = `${properties.class || ''} auto-width`;
                }
            }
        }
        return properties;
    }
};
