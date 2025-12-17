// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { defaults } from 'lodash';

const defaultConfig = {
    exclude: []
};

export default pluginFactory({
    name: 'sharePCIState',

    install() {
        /**
         * Store states for PCIs, where key is typeIdentifier.
         */
        this.stateStore = {};

        const testRunner = this.getTestRunner();
        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        const pluginConfig = defaults({}, providedConfig, defaultConfig);
        const { exclude } = pluginConfig;

        this.cancelStateChangeListener = () => {
            //unsubscribe from state update listening
            if (testRunner.itemRunner) {
                testRunner.itemRunner.off(`statechange.${this.getName()}`);
            }
        };

        /**
         * Check if PCI should share state.
         * @param {string} typeIdentifier
         * @returns {boolean}
         */
        this.shouldPCIShareState = typeIdentifier => !exclude.includes(typeIdentifier);
    },

    init() {
        /**
         * Maps responseIdentifier (key) with PCI typeIdentifier (value) for the actual item.
         */
        let responseIdentifiers = {};

        const testRunner = this.getTestRunner();

        testRunner
            .on(`loaditem.${this.getName()}`, (itemRef, itemData) => {
                const elements = itemData.itemData.data.body.elements;

                /**
                 * Loop on elements of the item
                 */
                for (let elementId in elements) {
                    const { qtiClass, typeIdentifier, attributes } = elements[elementId];

                    if (qtiClass === 'customInteraction' && this.shouldPCIShareState(typeIdentifier)) {
                        const { responseIdentifier } = attributes;

                        // map responseIdentifer with PCI typeIdentifier
                        responseIdentifiers[responseIdentifier] = typeIdentifier;

                        // extends itemState with state from stateStore
                        itemData.itemState = {
                            ...itemData.itemState,
                            [responseIdentifier]: {
                                ...itemData.itemState?.[responseIdentifier],
                                state: {
                                    ...itemData.itemState?.[responseIdentifier]?.state,
                                    ...this.stateStore[typeIdentifier]
                                }
                            }
                        };
                    }
                }
            })
            .on(`unloaditem.${this.getName()}`, () => {
                this.cancelStateChangeListener();
                // clear mapping
                responseIdentifiers = {};
            });

        testRunner.after(`renderitem.${this.getName()}`, () => {
            testRunner.itemRunner.on(`statechange.${this.getName()}`, newState => {
                for (let responseIdentifier in newState) {
                    const typeIdentifier = responseIdentifiers[responseIdentifier];
                    if (typeIdentifier && this.shouldPCIShareState(typeIdentifier)) {
                        // save state to store
                        this.stateStore[typeIdentifier] = {
                            ...this.stateStore[typeIdentifier],
                            ...newState[responseIdentifier].state
                        };
                    }
                }
            });
        });
    },

    destroy() {
        const testRunner = this.getTestRunner();
        // unsubscribe from runner events
        testRunner.off(`.${this.getName()}`);

        this.cancelStateChangeListener();
        this.stateStore = {};
    }
});
