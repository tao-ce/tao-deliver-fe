// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Mapper for the Tooltip static element
 */
export default {
    /**
     * Pass `content` property to be used as `text` among the attributes
     * @param {Object} properties
     * @param {Object} element
     * @returns {Object} mapped properties
     */
    mapProperties(properties, element) {
        properties.text = element.content;
        return properties;
    }
};
