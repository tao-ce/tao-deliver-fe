// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Properties mapper for Math QTI static element
 */
export default {
    /**
     * Map math QTI block custom properties into attributes
     * @param {object} properties - Math block properties
     * @param {object} element - Math block description
     * @param {string} element.mathML - MathML description
     * @returns {object} mapped properties
     */
    mapProperties(properties, { mathML } = {}) {
        return Object.assign({}, properties, { mathML });
    }
};
