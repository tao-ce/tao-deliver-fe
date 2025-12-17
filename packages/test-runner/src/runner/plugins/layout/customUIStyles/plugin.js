// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';

const defaultConfig = {
    qtiItemContainerSelector: '.qti-item'
};
/**
 * This plugin scales the item to fit the container
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
        const customUiId = config && config.options && config.options.customUiId;
        //for each item add the identifier to container and custom ui classes
        testRunner.on('renderitem', itemIdentifier => {
            const testRunnerArea = areaBroker.getTestRunnerArea();
            testRunnerArea.classList.add('custom-ui');
            testRunnerArea.classList.add(customUiId);
            const itemContainer = areaBroker.getContentArea().querySelector(this.getConfig().qtiItemContainerSelector);
            itemContainer.dataset['itemIdentifier'] = itemIdentifier;
            itemContainer.firstElementChild?.classList.add(customUiId);
        });
    },

    /**
     * add styles to document head
     */
    render() {
        const config = this.getTestRunner().getConfig();
        const customUiId = config && config.options && config.options.customUiId;
        const pluginConfig = this.getConfig();
        const customStyles = pluginConfig[customUiId];

        //add styles directly to document's head;
        this.styleTag = document.createElement('style');
        this.styleTag.innerHTML = customStyles;
        document.head.appendChild(this.styleTag);
    },

    /**
     * Destroys the plugin
     */
    destroy() {
        if (this.styleTag) {
            this.styleTag.remove();
        }
    }
});
