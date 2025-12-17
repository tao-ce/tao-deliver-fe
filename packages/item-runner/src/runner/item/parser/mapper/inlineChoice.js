// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Properties mapper for the InlineChoice interaction
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
        if (choiceProperties.content || choiceProperties.content === '') {
            choiceProperties.label = choiceProperties.content;
            delete choiceProperties.content;
        }

        return choiceProperties;
    }
};
