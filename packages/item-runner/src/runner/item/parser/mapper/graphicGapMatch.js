// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Properties mapper for the GraphicGapMatchInteraction and its choices
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

        return choiceProperties;
    },

    /**
     * Map itemData properties to interaction props
     * @param {Object} properties
     * @param {object} element
     * @param {string} element.gapImgs
     * @returns {Object} mapped properties
     */
    mapProperties(properties, { gapImgs } = {}) {
        //for clarity, move the image object under a more expressive property name
        if (properties.object) {
            properties.imgObject = properties.object;
            delete properties.object;
        }
        //for clarity, rename collection of associable hotspots
        if (properties.choices) {
            properties.gaps = properties.choices;
            delete properties.choices;
        }
        //parse gapImgs, the collection of images; and for clarity, rename
        if (typeof gapImgs === 'object') {
            const gapImgSets = [].concat(gapImgs);
            properties.choices = gapImgSets.map(gapImgSet => {
                const gapImgSetProperties = Object.values(gapImgSet).map(gapImg => {
                    //flatten 'gapImg.attributes' and 'gapImg.object.attributes'; rename 'identifier' to 'key'
                    let gapImgProperties = Object.assign({}, gapImg.attributes);
                    if (gapImgProperties.identifier) {
                        gapImgProperties.key = gapImgProperties.identifier;
                        delete gapImgProperties.identifier;
                    }
                    if (gapImg.object) {
                        gapImgProperties = Object.assign(gapImgProperties, gapImg.object.attributes);
                    }
                    return gapImgProperties;
                });
                return gapImgSetProperties;
            });
            // flatten choices array if there was only 1 choice set
            if (gapImgSets.length === 1) {
                properties.choices = properties.choices[0];
            }
        }

        return properties;
    }
};
