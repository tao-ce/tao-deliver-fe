// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import MenuPanelContent from './MenuPanelContent.svelte';

/**
 * This plugin provides the delt panel content
 */
export default pluginFactory({
    name: 'menuPanel',

    init() {
        //mandatory
    },

    /**
     * Renders to the menu panel
     */
    render() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const options = testRunner.getOptions();
        const theme = testRunner.getTheme();
        const menuProperties = {
            exitUrl: options && options.exitUrl
        };
        if (theme && theme.menu) {
            if (Array.isArray(theme.menu.links)) {
                menuProperties.links = theme.menu.links;
            }
            if (theme.menu.footer) {
                menuProperties.footer = theme.menu.footer;
            }
        }

        //render the plugin component
        this.menuPanelContent = new MenuPanelContent({
            target: areaBroker.getPanelArea(),
            props: menuProperties
        });
    },

    /**
     * Destroys the plugin
     */
    destroy() {
        if (this.menuPanelContent) {
            this.menuPanelContent.$destroy();
        }
    }
});
