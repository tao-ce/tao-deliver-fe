// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { itemPathForPosition } from '../../../util/testMap.js';

export default pluginFactory({
    name: 'lifecycleEvents',

    install() {
        const testRunner = this.getTestRunner();

        /**
         * Fire a lifecycle event
         * @param {string} type
         * @param {string} scope - 'test' or 'item'
         * @param {object} [detail]
         */
        this.fireEvent = (type, scope, detail) => {
            testRunner.trigger('lifecycleEvent', type, scope, detail);
        };
    },

    init() {
        const testRunner = this.getTestRunner();

        testRunner
            .on('init.lifecycleEvents', () => {
                this.fireEvent('init', 'test');
            })
            .before('loaditem.lifecycleEvents', () => {
                this.fireEvent('init', 'item');
            })
            .after('renderitem.lifecycleEvents', () => {
                this.fireEvent('ready', 'item', {
                    screen: {
                        width: screen.width,
                        height: screen.height
                    },
                    window: {
                        width: window.outerWidth,
                        height: window.outerHeight
                    },
                    document: {
                        width: document.documentElement.clientWidth,
                        height: document.documentElement.clientHeight
                    },
                    userAgent: navigator.userAgent
                });
            })
            .on('move.lifecycleEvents', (direction, scope, position) => {
                let itemIdentifier;
                let response;

                if (typeof position === 'number') {
                    const testMap = testRunner.getTestMap();
                    itemIdentifier = itemPathForPosition(testMap, position).itemId;
                }

                const itemRunner = testRunner.itemRunner;
                if (itemRunner) {
                    response = itemRunner.getResponses();
                }

                this.fireEvent('move', 'item', { scope, direction, itemIdentifier, response });
            })
            .on('finish.lifecycleEvents', () => {
                this.fireEvent('finish', 'test');
            });
    },

    destroy() {}
});
