// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';

/**
 * Prevent drop images to inputs
 */
export default pluginFactory({
    name: 'preventDropToInput',

    install() {
        this.eventHandlers = [];

        this.preventDragAndDrop = event => {
            event.preventDefault();
            event.stopPropagation();
        };

        this.addEventListeners = (elements, events, handler) => {
            elements.forEach(element => {
                events.forEach(event => {
                    element.addEventListener(event, handler);
                    this.eventHandlers.push({ element, type: event, handler });
                });
            });
        };

        this.removeEventListeners = () => {
            this.eventHandlers.forEach(({ element, type, handler }) => {
                element.removeEventListener(type, handler);
            });
            this.eventHandlers = [];
        };
    },

    init() {
        const testRunner = this.getTestRunner();
        const container = testRunner.getAreaBroker().getContainer();

        const prevent = () => {
            const inputs = container.querySelectorAll("input[type='text']");
            const textareas = container.querySelectorAll(
                ".qti-extendedTextInteraction:not([data-format='xhtml']) textarea"
            );
            this.addEventListeners([...inputs, ...textareas], ['drop'], this.preventDragAndDrop);
        };

        const cleanUp = () => {
            this.removeEventListeners();
        };

        testRunner.on('renderitem', prevent);
        testRunner.on('unloaditem', cleanUp);
    },

    destroy() {
        this.removeEventListeners();
    }
});
