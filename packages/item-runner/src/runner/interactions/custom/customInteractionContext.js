// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export default () => {
    /**
     * Interactions implementation
     * @type {Object<string, Object>}
     */
    const interactions = {};

    /**
     * Handler of on register event
     * @type {Function}
     */
    let onRegister;

    return {
        /**
         * Register promise of the context
         */
        registerPromise: new Promise(resolve => {
            onRegister = resolve;
        }),

        /**
         * Register method that will be passed to PCI
         * @param {Object} interaction - Interaction implementation
         */
        register(interaction) {
            interactions[interaction.typeIdentifier] = interaction;
            onRegister();
        },
        /**
         * Runner function that calls getInstance function on interaction
         * @param {string} typeIdentifier - Type identifier of PCI
         * @param {HTMLElement} container - Container of PCI
         * @param {Object} configuration - Configuration of PCI
         * @param {Function} configuration.onready
         * @param {Object} state - Initial state of PCI
         */
        getInstance(typeIdentifier, container, configuration, state) {
            const interaction = interactions[typeIdentifier];
            if (interaction) {
                interaction.getInstance(container, configuration, state);
            } else {
                throw new Error(
                    `Unable to instantiate ${typeIdentifier} PCI, because it is not loaded and registered.`
                );
            }
        }
    };
};
