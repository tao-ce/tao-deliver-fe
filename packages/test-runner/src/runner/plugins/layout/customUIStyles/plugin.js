// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';

const defaultConfig = {
    qtiItemContainerSelector: '.qti-item'
};

/**
 * Coerce the customUiId to an array of strings
 * (both this format and single string are supported in the config, for backward compatibility)
 * @param {Object} testRunnerConfiguration
 * @returns {String[]} ids
 */
function getCustomUiIds(testRunnerConfiguration) {
    const customUiId = testRunnerConfiguration?.options?.customUiId;
    if (!customUiId) {
        return [];
    }
    if (Array.isArray(customUiId)) {
        return customUiId;
    }
    return [customUiId];
}

/**
 * This plugin applies to the test and item containers
 * some custom CSS classes and styles defined in the testRunnerConfiguration.
 */
export default pluginFactory({
    name: 'customUIStyles',

    install() {
        const providedConfig = this.getTestRunner().getPluginConfig(this.getName()) || {};
        const pluginConfig = { ...defaultConfig, ...providedConfig };
        this.setConfig(pluginConfig);
    },

    init() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const config = testRunner.getConfig();
        const customUiIds = getCustomUiIds(config);

        /** @type {{String, HTMLStyleElement}} */
        this.styleTags = {};

        //for each item add the identifier to container and custom ui classes
        testRunner.on('renderitem', itemIdentifier => {
            const testRunnerArea = areaBroker.getTestRunnerArea();
            testRunnerArea.classList.add('custom-ui');
            customUiIds.forEach(uiId => testRunnerArea.classList.add(uiId));

            const itemContainer = areaBroker.getContentArea().querySelector(this.getConfig().qtiItemContainerSelector);
            itemContainer.dataset['itemIdentifier'] = itemIdentifier;
            customUiIds.forEach(uiId => itemContainer.firstElementChild?.classList.add(uiId));
        });
    },

    /**
     * Adds style tags to document head
     */
    render() {
        const config = this.getTestRunner().getConfig();
        const customUiIds = getCustomUiIds(config);
        const pluginConfig = this.getConfig();

        customUiIds.forEach(customUiId => {
            const customStyles = pluginConfig[customUiId];

            if (!customStyles) {
                return;
            }

            this.styleTags[customUiId] = document.createElement('style');
            this.styleTags[customUiId].innerHTML = customStyles;
            this.styleTags[customUiId].dataset.customUiId = customUiId;
            document.head.appendChild(this.styleTags[customUiId]);
        });
    },

    /**
     * Removes added style tags when the plugin is destroyed
     */
    destroy() {
        Object.values(this.styleTags).forEach(styleTag => styleTag.remove());
    }
});
