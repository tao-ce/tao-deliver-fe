// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { testSessionStatus } from '../../session/sessionStates.js';
import { getTestSessionStatusStore } from '../../testsStateStore.js';
import OverlayHeaderBar from '../../layout/overlay/OverlayHeaderBar.svelte';
import SettingsContent from './SettingsContent.svelte';
import { __ } from '@oat-sa-private/ui-core';
import settingsKeys from './settingsKeys.js';
import { getTestSessionUserDataService } from '../../session/testSessionUserDataService.js';
import { getItemProperty } from '../../util/testMap.js';
import { mount, unmount } from 'svelte';

// The settingsKeys represented in this plugin's SettingsContent component
const panelSettingsKeys = {
    [settingsKeys.choiceAnswerMasking]: settingsKeys.choiceAnswerMasking,
    [settingsKeys.choiceElimination]: settingsKeys.choiceElimination
};

/**
 * This plugin provides the settings content
 */
export default pluginFactory({
    name: 'settings',

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();

        const sessionStatus = getTestSessionStatusStore(testConfig.serviceCallId);
        const testSessionUserDataService = getTestSessionUserDataService(testConfig.serviceCallId);

        this.settingsStore = testSessionUserDataService.getSettingsStore();
        this.toolsStore = testSessionUserDataService.getToolsStore();

        /**
         * Set the session status to "overlay"
         */
        this.setOverlayStatus = () => {
            sessionStatus.set(testSessionStatus.overlay);
        };

        /**
         * Check whether the current status is overlay
         * @returns {boolean}
         */
        this.isOverlayStatus = () => sessionStatus.get() === testSessionStatus.overlay;

        /**
         * Check whether the current status is loading
         * @returns {boolean}
         */
        this.isLoadingStatus = () => sessionStatus.get() === testSessionStatus.loading;

        /**
         * Set the session status to "loading"
         */
        this.setLoadingStatus = () => {
            sessionStatus.set(testSessionStatus.loading);
        };

        /**
         * Open/close settings (disables/enables item)
         * @param {boolean} open - opens if true
         */
        this.toggleSettings = open => {
            const testContext = testRunner.getTestContext();
            const itemIdentifier = testContext.itemIdentifier;

            if (open) {
                this.disableOverlayCloseBtn(false);

                // open from another Overlay content (overview)
                if (this.isOverlayStatus()) {
                    // no item state change
                    this.show();

                    //open during a transition
                } else if (this.isLoadingStatus()) {
                    this.setState('transition', true);
                    this.show();

                    //block the item loading while the settings is open during a transition,
                    //closing it will release the loading
                    testRunner.before('loaditem.settings', () => {
                        testRunner.off('loaditem.settings');

                        if (this.getState('open')) {
                            return new Promise(resolve => {
                                this.pendingResolver = resolve;
                            }).then(() => (this.pendingResolver = null));
                        }
                    });

                    //opens during an item session
                } else {
                    testRunner.on('disableitem.settings', () => {
                        testRunner.off('disableitem.settings');

                        this.show();
                    });
                    testRunner.disableItem(itemIdentifier);
                }

                // close
            } else if (this.isOverlayStatus()) {
                this.disableOverlayCloseBtn(true);

                //during a transition
                if (this.getState('transition') === true) {
                    this.hide();

                    //we release the pending promise
                    if (this.pendingResolver) {
                        this.pendingResolver();

                        //or get back to the loading status
                    } else {
                        testRunner.off('loaditem.settings');
                        this.setLoadingStatus();
                    }
                } else {
                    testRunner.after('enableitem.settings', () => {
                        testRunner.off('enableitem.settings');
                        this.hide();
                    });
                    testRunner.enableItem(itemIdentifier);
                }
            }
        };

        this.disableOverlayCloseBtn = disableCloseBtn => {
            if (this.overlayHeader) {
                this.overlayHeader.$set({ disableCloseBtn });
            }
        };

        /**
         * Destroy overlay heading and content
         */
        this.destroyOverlay = () => {
            if (this.overlayHeader) {
                unmount(this.overlayHeader);
            }
            if (this.overlayContent) {
                unmount(this.overlayContent);
            }
            this.overlayHeader = null;
            this.overlayContent = null;
        };

        /**
         * Check if settings should be visible
         * @returns {boolean} - true is visible / false is hidden
         */
        this.shouldVisible = () => {
            const allKeys = Object.keys(panelSettingsKeys);

            if (allKeys.length > 0) {
                const disabledKeys = this.settingsStore.getDisabledSettings();

                return allKeys.length - disabledKeys.length > 0;
            }
            return false;
        };

        this.settingsStoreUnsubscribe = this.settingsStore.subscribe(() => {
            this.toolsStore.setTestToolState(this.getName(), {
                visible: this.shouldVisible()
            });
        });
    },

    init() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        const dataHolder = testRunner.getDataHolder();
        const sessionStatus = getTestSessionStatusStore(testConfig.serviceCallId);

        /**
         * Actually close component.
         * Once test-runner decides that settings/overlay can be closed, it will change session status and we can destroy the component
         * (Currently this can happen on timer timeout, of it happened while settings were open)
         */
        let prevTestSessionStatus = sessionStatus.get();
        this.unsubscribeFromStatusChanges = sessionStatus.subscribe(status => {
            if (prevTestSessionStatus === testSessionStatus.overlay && status !== testSessionStatus.overlay) {
                //'testSessonStatus.overlay' may have been used by other caller, like navigation overview.
                //so this may be called even if overview components are not actually rendered.
                this.hide();
            }
            prevTestSessionStatus = status;
        });

        // Listen for menu trigger event from test runner
        testRunner
            .on('toolbaraction.settings', key => {
                if (key === 'settings') {
                    this.toggleSettings(this.getState('open') !== true);
                }
            })
            .on('loaditem.settings', itemIdentifier => {
                const testMap = testRunner.getTestMap();
                const testPart = dataHolder.getCurrentTestPart();
                const section = dataHolder.getCurrentSection();
                const categories = getItemProperty(testMap, testPart.id, section.id, itemIdentifier, 'categories');

                //FIXME usage of plugin content should be moved to plugins
                if (categories.indexOf('x-tao-option-eliminator') >= 0) {
                    this.settingsStore.enableSetting(settingsKeys.choiceElimination);
                } else {
                    this.settingsStore.disableSetting(settingsKeys.choiceElimination);
                }
                if (categories.indexOf('x-tao-option-answerMasking') >= 0) {
                    this.settingsStore.enableSetting(settingsKeys.choiceAnswerMasking);
                } else {
                    this.settingsStore.disableSetting(settingsKeys.choiceAnswerMasking);
                }
            })
            .on('enableitem renderitem', () => {
                this.setState('transition', false);
                this.setState('open', false);
            });
    },

    render() {
        // Nothing to render, initially
    },

    /**
     * Take control of the TestLayout's Overlay
     * Create and show settings content in it
     */
    show() {
        // inject the Overlay content in defined slots
        const areaBroker = this.getAreaBroker();
        const headerSlot = areaBroker.getOverlayHeaderArea();
        const contentSlot = areaBroker.getOverlayContentArea();
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();

        areaBroker.clearAreasContent(['overlayHeader', 'overlayContent', 'overlayFooter']);

        this.setOverlayStatus(); // opens Overlay

        this.overlayHeader = mount(OverlayHeaderBar, {
            target: headerSlot,
            props: {
                heading: __('Test Configuration')
            }
        });
        this.overlayContent = mount(SettingsContent, {
            target: contentSlot,
            props: {
                serviceCallId: testConfig.serviceCallId
            }
        });

        // listen to settings events
        this.overlayHeader.$on('close', () => {
            this.toggleSettings(false);
        });

        this.overlayContent.$on('change', ({ detail }) => {
            this.settingsStore.update(store => {
                if (detail && detail.key) {
                    store[detail.key] = detail.value;

                    if (detail.key === settingsKeys.choiceElimination && detail.value === false) {
                        // switching the choice elimination off, we remove all saved data
                        this.toolsStore.getItems().forEach(storedItemIdentifier => {
                            this.toolsStore.setItemToolState(storedItemIdentifier, settingsKeys.choiceElimination, {});
                        });
                    }
                    if (detail.key === settingsKeys.choiceAnswerMasking && detail.value === false) {
                        // switching the choice answer masking off, we remove all saved data
                        this.toolsStore.getItems().forEach(storedItemIdentifier => {
                            this.toolsStore.setItemToolState(
                                storedItemIdentifier,
                                settingsKeys.choiceAnswerMasking,
                                {}
                            );
                        });
                    }
                }

                return store;
            });
        });

        this.setState('open', true);

        const headerTitle = headerSlot.querySelector('h2');
        if (headerTitle) {
            headerTitle.focus();
        }
    },

    /**
     * Remove settings content from the TestLayout's Overlay slot
     */
    hide() {
        const areaBroker = this.getAreaBroker();
        const topBarSlot = areaBroker.getTopBarArea();

        this.destroyOverlay();

        this.setState('open', false);

        const settingsButton = topBarSlot.querySelector('.end button');
        if (settingsButton) {
            settingsButton.focus();
        }
    },

    /**
     * Destroys the plugin
     */
    destroy() {
        this.destroyOverlay();
        this.getTestRunner().off('toolbaraction.settings loaditem.settings');
        if (typeof this.settingsStoreUnsubscribe === 'function') {
            this.settingsStoreUnsubscribe();
        }
        if (this.unsubscribeFromStatusChanges) {
            this.unsubscribeFromStatusChanges();
        }
    }
});
