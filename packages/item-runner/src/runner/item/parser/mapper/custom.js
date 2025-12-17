// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Properties mapper for Custom Interaction element
 */
export default {
    /**
     * Map math QTI block custom properties into attributes
     * @param {object} props - Block properties
     * @param {object} element - Block description
     * @param {string} element.typeIdentifier - Type identifier of PCI
     * @param {string} element.version - version of PCI
     * @param {string} element.properties - PCI configuration properties
     * @param {string} element.markup - Initial PCI markup
     * @returns {object} mapped properties
     */
    mapProperties(props, { typeIdentifier, version, properties, markup } = {}) {
        return Object.assign({}, props, {
            typeIdentifier,
            version,
            markup,
            properties: {
                ...properties,
                ...props.properties
            }
        });
    }
};
