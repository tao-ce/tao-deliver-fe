// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Mapper for the Object static element
 */
export default {
    /**
     * Pass 'serial' property to use as identifier of this element in itemsStateStore
     * @param {Object} properties
     * @param {Object} element
     * @returns {Object} mapped properties
     */
    mapProperties(properties, element) {
        properties.serial = element.serial;
        return properties;
    }
};
