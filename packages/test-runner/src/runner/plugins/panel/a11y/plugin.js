// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import defaultPluginConfig from './pluginConfig.js';
import { getTestSessionUserDataService } from '../../../session/testSessionUserDataService.js';
import MenuPanel from './MenuPanel.svelte';
import settingsKeys from '../../settings/settingsKeys.js';
import queueFactory from '../../integration/eventsForwarder/queue.js';
import { defaultsDeepNoArrayMerge } from '../../../util/common.js';
import { mount, unmount } from 'svelte';

/**
 * This plugin provides the accessibility panel content
 */
export default pluginFactory({
    name: 'a11yMenuPanel',

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();

        const pluginConfig = defaultsDeepNoArrayMerge(
            {},
            testRunner.getPluginConfig(this.getName()),
            defaultPluginConfig
        );
        this.setConfig(pluginConfig);

        //const sessionStatus = getTestSessionStatusStore(testConfig.serviceCallId);
        const testSessionUserDataService = getTestSessionUserDataService(testConfig.serviceCallId);

        this.settingsStore = testSessionUserDataService.getSettingsStore();

        //ui-log
        queueFactory({
            id: `${this.getName()}.${testRunner.getConfig().serviceCallId}`,
            bufferSize: 10,
            flush(events) {
                return testRunner.getProxy().callTestAction('ui-log', { events });
            }
        }).then(eventsQueue => {
            this.eventsQueue = eventsQueue;
        });
        this.eventsQueueEnqueue = (domEventType, metadata) => {
            if (pluginConfig.eventLog?.enabled) {
                this.eventsQueue.enqueue({
                    domEventType,
                    itemIdentifier: testRunner.getTestContext().itemIdentifier,
                    metadata: {
                        timeStamp: Date.now(),
                        component: `plugin-${this.getName()}`,
                        ...metadata
                    }
                });
            }
        };
        this.panelOpen = false;
    },

    init() {
        const testRunner = this.getTestRunner();
        const pluginConfig = this.getConfig();

        testRunner.on('unloaditem itemModalFeedback', () => {
            this.eventsQueue.flush();
        });

        testRunner.on('proctor-reset', async () => {
            if (this.eventsQueue) {
                await this.eventsQueue.clear();
            }

            this.settingsStore.setSetting(settingsKeys.a11yMenuPanel, {});
            Object.keys(pluginConfig).forEach(key => {
                this.settingsStore.setSetting(key, null);
            });

            this.panelOpen = false;
        });

        //add to settings to pass to item-runner
        const a11ySetting = this.settingsStore.getSetting(settingsKeys.a11yMenuPanel) || {};
        a11ySetting.convertPxToRem = pluginConfig.convertPxToRem;
        this.settingsStore.setSetting(settingsKeys.a11yMenuPanel, a11ySetting);
    },

    /**
     * Renders the a11y menu panel contents
     */
    render() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const pluginConfig = this.getConfig();

        // retrieve previously saved config from settingsStore
        const initialSettingsState = Object.keys(pluginConfig).reduce((acc, key) => {
            acc[key] =
                this.settingsStore.getSetting(settingsKeys.a11yMenuPanel)?.[key] || this.settingsStore.getSetting(key);
            return acc;
        }, {});

        //render the plugin component
        this.menuPanel = mount(MenuPanel, {
            target: areaBroker.getA11yMenuPanelArea(),
            props: {
                areaBroker,
                pluginConfig,
                initialSettingsState
            }
        });
        // register changes from settings components
        this.menuPanel.$on('change', event => {
            const { key: toolKey, state: toolState } = event.detail;
            // store user's latest changes for a future rendering
            this.settingsStore.setSetting(toolKey, {
                toolState
            });

            // enqueue a ui-log event
            this.eventsQueueEnqueue('change', {
                toolKey,
                toolState
            });
        });
        // track Details components opening/closing
        this.menuPanel.$on('toggle', event => {
            const groupSetting = this.settingsStore.getSetting(settingsKeys.a11yMenuPanel) || {};
            groupSetting[event.detail.key] = {
                collapsed: event.detail.collapsed
            };
            this.settingsStore.setSetting(settingsKeys.a11yMenuPanel, groupSetting);
        });
        // Changes from Panel interior
        this.menuPanel.$on('open', () => {
            this.panelOpen = true;

            this.eventsQueueEnqueue('custom', {
                type: 'panel-open'
            });
        });
        this.menuPanel.$on('close', () => {
            this.panelOpen = false;

            this.eventsQueueEnqueue('custom', {
                type: 'panel-close'
            });
        });
        // Changes from runner lifecycle
        testRunner
            .on('renderitem.a11yMenuPanel.first', () => {
                testRunner.off('renderitem.a11yMenuPanel.first');
                if (pluginConfig.openOnStart) {
                    this.show();
                }
            })
            .on('toolbaraction.a11yMenuPanel', key => {
                if (key === 'a11yMenuPanel') {
                    if (this.panelOpen) {
                        this.hide();
                    } else {
                        this.show();
                    }
                }
            })
            .on('timeout pause finish error', () => {
                this.hide();
            });
    },

    show() {
        this.menuPanel?.$set({
            open: true
        });
    },

    hide() {
        this.menuPanel?.$set({
            open: false
        });
    },

    /**
     * Destroys the plugin
     */
    destroy() {
        if (this.menuPanel) {
            unmount(this.menuPanel);
        }

        this.eventsQueue?.flush();

        if (typeof this.settingsStoreUnsubscribe === 'function') {
            this.settingsStoreUnsubscribe();
        }
        if (this.unsubscribeFromStatusChanges) {
            this.unsubscribeFromStatusChanges();
        }
    }
});
