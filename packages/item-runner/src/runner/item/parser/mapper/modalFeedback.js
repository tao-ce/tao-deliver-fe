// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

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
        const rootBodyHtml = element.body?.body || '';
        const styleClasses = ['x-tao-modalFeedback-positive', 'x-tao-modalFeedback-negative'];
        properties.styleClass = styleClasses.find(s => rootBodyHtml.includes(s));
        return properties;
    }
};
