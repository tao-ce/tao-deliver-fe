// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Properties mapper for Media element
 */
export default {
    /**
     * Map media QTI block custom properties into attributes
     * @param {object} properties - Media block properties
     * @param {object} element - Media block description
     * @param {object} element.object - Object description
     * @param {object} element.object.attributes - Player attributes
     * @returns {object} mapped properties
     */
    mapProperties(properties, { object: { attributes } = {} } = {}) {
        return Object.assign({}, properties, attributes);
    }
};
