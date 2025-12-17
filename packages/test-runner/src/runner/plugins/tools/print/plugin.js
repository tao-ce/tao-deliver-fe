// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import toolsStoreHandler from '../util/toolsStoreHandler.js';
import { getItemProperty } from '../../../util/testMap.js';
import { testSessionStatus } from '../../../session/sessionStates.js';
import { getTestSessionStatusStore } from '../../../testsStateStore.js';
import { addShowOnPrintStyle, togglePrintInteractionsClass } from './util.js';
import { defaultsDeep } from 'lodash';

const categoryName = 'x-tao-printable';

const defaultPluginConfig = {
    //print interactions/pcis: false - none, true - all, array - some.
    //  prompts are always printed; further customizations can be done with `itemRunnerConfig.itemStyles` or other css override.
    printInteractions: false,
    printPCIs: ['textReaderInteraction'],
    //hide toolbar button:
    //  if `true`, plugin still enables printing with security plugins, and also applies `printInteractions` styles.
    hideToolbarButton: false
};

/**
 * Print the content of the current item
 */
export default pluginFactory({
    name: 'print',

    install() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const testConfig = testRunner.getConfig();
        const pluginConfig = defaultsDeep({}, testRunner.getPluginConfig(this.getName()), defaultPluginConfig);
        this.setConfig(pluginConfig);

        this.toolsStoreHandler = toolsStoreHandler(testConfig.serviceCallId, this.getName());
        this.testSessionStatusStore = getTestSessionStatusStore(testConfig.serviceCallId);

        this.doPrint = () => {
            window.print();
        };
        this.onBeforePrint = () => {
            togglePrintInteractionsClass(
                pluginConfig.printInteractions,
                pluginConfig.printPCIs,
                areaBroker.getContentArea(),
                true
            );
        };
        this.onAfterPrint = () => {
            togglePrintInteractionsClass(
                pluginConfig.printInteractions,
                pluginConfig.printPCIs,
                areaBroker.getContentArea(),
                false
            );
        };
    },

    init() {
        const testRunner = this.getTestRunner();
        testRunner
            .on('toolbaraction.print', key => {
                if (key === 'print' && this.testSessionStatusStore.get() === testSessionStatus.interacting) {
                    this.doPrint();
                }
            })
            .on('loaditem.print', () => {
                const testMap = testRunner.getTestMap();
                const testContext = testRunner.getTestContext();
                const { testPartId, sectionId, itemIdentifier } = testContext;
                const categories = getItemProperty(testMap, testPartId, sectionId, itemIdentifier, 'categories');

                if (Array.isArray(categories) && categories.includes(categoryName)) {
                    this.show();
                } else {
                    this.hide();
                }
            });
    },

    show() {
        const pluginConfig = this.getConfig();
        this.toolsStoreHandler.set('visible', !pluginConfig.hideToolbarButton);

        /**
         * If current item is marked a printable,
         * Override not-printable style set by security plugins
         */
        this.printStyleTag?.remove();
        this.printStyleTag = addShowOnPrintStyle();
        window.addEventListener('beforeprint', this.onBeforePrint);
        window.addEventListener('afterprint', this.onAfterPrint);
    },

    hide() {
        this.toolsStoreHandler.set('visible', false);
        this.printStyleTag?.remove();
        window.removeEventListener('beforeprint', this.onBeforePrint);
        window.removeEventListener('afterprint', this.onAfterPrint);
    },

    destroy() {
        this.getTestRunner().off('.print');
        this.printStyleTag?.remove();
        window.removeEventListener('beforeprint', this.onBeforePrint);
        window.removeEventListener('afterprint', this.onAfterPrint);
    }
});
