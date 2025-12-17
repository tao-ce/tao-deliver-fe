// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * An area broker let's you access some predefined areas of a layout.
 * This areaBroker is compatible with @oat-sa/tao-core-sdk/core/areaBroker
 */

/**
 * Get area alias name :
 *  - from 'content' to 'getContentArea'
 *  - from 'header'  to 'getHeaderArea'
 * @param {string} areaKey - the area identifier
 * @param {string} [prefix='get'] - prefix
 * @returns {string} the alias name
 */
function createAlias(areaKey, prefix = 'get') {
    return `${prefix}${areaKey.charAt(0).toUpperCase() + areaKey.slice(1)}Area`;
}

/**
 * Register aliases to the broker for the given areas
 * @param {Object} broker - the areaBroker
 * @param {string[]} areaKeys - the areas identfiers
 */
function registerAliases(broker, areaKeys = []) {
    if (broker && typeof broker.getArea === 'function') {
        for (let areaKey of areaKeys) {
            broker[createAlias(areaKey, 'get')] = () => broker.getArea(areaKey);
            broker[createAlias(areaKey, 'clear')] = () => broker.clearAreaContent(areaKey);
        }
    }
}

/**
 * Un-register aliases to the broker for the given areas
 * @param {Object} broker - the areaBroker
 * @param {string[]} areaKeys - the areas identfiers
 */
function unregisterAliases(broker, areaKeys) {
    if (broker) {
        for (let areaKey of areaKeys) {
            delete broker[createAlias(areaKey, 'get')];
            delete broker[createAlias(areaKey, 'clear')];
        }
    }
}

/**
 * This factory creates an areaBroker that support setting the areas later.
 *
 * @param {HTMLElement} container - the main container
 * @returns {Object} the areaBroker
 * @throws {TypeError} if the container is not set
 */
export default function areaBrokerFactory(container) {
    let areas = {};

    return {
        /**
         * Access the main container
         * @returns {HTMLElement}
         */
        getContainer() {
            return container;
        },

        /**
         * Define the areas
         * @param {Object.<string, HTMLElement>} newAreas - the areas
         */
        setAreas(newAreas = {}) {
            unregisterAliases(this, Object.keys(areas));

            areas = newAreas;

            registerAliases(this, Object.keys(newAreas));
        },

        /**
         * Get the given area
         * @param {String} areaKey - the key of the area
         * @returns {HTMLElement?} the area element
         */
        getArea(areaKey) {
            if (areas && areas[areaKey] instanceof HTMLElement) {
                return areas[areaKey];
            }
            return null;
        },

        /**
         * Clears the content of the given area
         * @param {String} areaKey - the key of the area
         */
        clearAreaContent(areaKey) {
            if (areas && areas[areaKey] instanceof HTMLElement) {
                areas[areaKey].innerHTML = '';
            }
        },

        /**
         * Clears the content of a list of given areas
         * @param {String[]} areaKeys - the keys of the areas
         */
        clearAreasContent(areaKeys = []) {
            for (let areaKey of areaKeys) {
                this.clearAreaContent(areaKey);
            }
        }
    };
}
