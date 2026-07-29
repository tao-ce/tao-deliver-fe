// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import toolsStoreHandler from '../util/toolsStoreHandler.js';

/**
 * Reload current page.
 */
export default pluginFactory({
    name: 'refresh',

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        this.toolsStoreHandler = toolsStoreHandler(testConfig.serviceCallId, this.getName());
        this.reload = () => {
            window.location.reload();
        };
    },

    init() {
        this.show();
        this.getTestRunner().on('toolbaraction.refresh', key => {
            if (key === this.getName()) {
                this.reload();
            }
        });
    },

    show() {
        this.toolsStoreHandler.set('visible', true);
    },

    hide() {
        this.toolsStoreHandler.set('visible', false);
    },

    destroy() {
        this.getTestRunner().off('toolbaraction.refresh');
    }
});
