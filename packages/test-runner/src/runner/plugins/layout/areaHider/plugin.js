// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import pluginFactory from 'taoTests/runner/plugin';
import { getItemProperty } from '../../../util/testMap.js';

// Identifier for the plugin
const pluginName = 'areaHider';

const categoryToAreaIdPrefix = 'x-tao-option-areaHider-';

/**
 * @typedef HiddenAreaDescriptor
 * @property {string} id id of area in areaBroker
 * @property {HTMLElement} areaElementRef reference to the layout element
 * @property {string} initialDisplayValue display property initial value of a hidden element
 */

/**
 * Restores the initial value of display property for hidden areas
 * @param {HiddenAreaDescriptor[]} hiddenAreasArray array
 */
function restoreInitialDisplayValue(hiddenAreasArray) {
    hiddenAreasArray.forEach(hiddenAreaDescriptor => {
        hiddenAreaDescriptor.areaElementRef.style.display = hiddenAreaDescriptor.initialDisplayValue;
    });
}

/**
 * Merges plugin config and provided item categories to the array of area ids to hide
 * @param {String[]} categories categories of the item
 * @returns {String[]} array of area ids to hide
 */
function getHiddenAreaIds(categories) {
    let hiddenAreas = [];
    if (categories) {
        categories.forEach(category => {
            const areaId = category.replace(categoryToAreaIdPrefix, '');
            hiddenAreas.push(areaId);
        });
    }

    return hiddenAreas;
}

/**
 * the areaHider plugin allows to hide areas of testRunner layout defined in areaBroker
 */
export default pluginFactory({
    name: pluginName,

    /**
     * Prepares the plugin, adding API
     */
    install() {
        const testRunner = this.getTestRunner();
        const pluginConfig = testRunner.getPluginConfig(this.getName());
        this.hiddenAreas = pluginConfig && pluginConfig.hiddenAreas;

        //array of areas descriptors disabled by item categories
        this.itemHiddenAreas = [];
    },

    /**
     * Starts the behavior, listening to events that will activate the plugin
     */
    init() {
        const testRunner = this.getTestRunner();
        /**
         * When loading item, hide the required areas
         */
        testRunner
            .on(`loaditem.${pluginName}`, () => {
                const { testPartId, sectionId, itemIdentifier } = testRunner.getTestContext();
                const testMap = testRunner.getTestMap();
                const categories = getItemProperty(testMap, testPartId, sectionId, itemIdentifier, 'categories');
                const areaBroker = this.getAreaBroker();
                const hiddenAreaIds = getHiddenAreaIds(categories);

                //set css display value of area to 'none' and store its initial state
                hiddenAreaIds.forEach(areaId => {
                    const areaElementRef = areaBroker.getArea(areaId);
                    if (areaElementRef) {
                        const initialDisplayValue = window.getComputedStyle(areaElementRef).display;
                        areaElementRef.style.display = 'none';
                        this.itemHiddenAreas.push({ id: areaId, areaElementRef, initialDisplayValue });
                    }
                });
            })
            /**
             * When leaving item, make sure the tool is closed
             */
            .on(`unloaditem.${pluginName}`, () => {
                restoreInitialDisplayValue(this.itemHiddenAreas);
                //prevent memory leak
                this.itemHiddenAreas = [];
            });
    },

    /**
     * Destroy the plugin and its components. Normally called only at the end of a test session.
     */
    destroy() {
        restoreInitialDisplayValue(this.itemHiddenAreas);
        this.getTestRunner().off(`.${pluginName}`);
        //prevent memory leak
        this.itemHiddenAreas = [];
    }
});
