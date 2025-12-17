// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import pluginFactory from 'taoTests/runner/plugin';
import { testSessionStatus } from '../../../session/sessionStates.js';
import { getTestSessionStatusStore } from '../../../testsStateStore.js';
import ReviewNavigator from './ReviewNavigator.svelte';
import OverlayHeaderBar from '../../../layout/overlay/OverlayHeaderBar.svelte';
import TestOverviewContent from './overview/TestOverviewContent.svelte';
import TestOverviewBottomBar from './overview/TestOverviewBottomBar.svelte';
import { __ } from '@oat-sa-private/ui-core';
import { tick } from 'svelte';

/**
 * the navigator plugin handles :
 *  - the next/previous buttons
 *  - the progress visualization
 *  - the overview
 */
export default pluginFactory({
    name: 'reviewNavigator',

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        const options = testRunner.getOptions();

        /**
         * Set the session status to "overlay"
         */
        this.setOverlayStatus = () => {
            getTestSessionStatusStore(testConfig.serviceCallId).set(testSessionStatus.overlay);
        };

        /**
         * Check whether the current status is overlay
         * @returns {Boolean}
         */
        this.isOverlayStatus = () =>
            getTestSessionStatusStore(testConfig.serviceCallId).get() === testSessionStatus.overlay;

        /**
         * Check whether the current status is loading
         * @returns {Boolean}
         */
        this.isLoadingStatus = () =>
            getTestSessionStatusStore(testConfig.serviceCallId).get() === testSessionStatus.loading;

        /**
         * Take control of the TestLayout's Overlay
         * Create and inject the components which make up the Overview
         */
        this.createOverview = () => {
            // inject the Overlay content in defined slots
            const areaBroker = this.getAreaBroker();
            const headerSlot = areaBroker.getOverlayHeaderArea();
            const contentSlot = areaBroker.getOverlayContentArea();
            const footerSlot = areaBroker.getOverlayFooterArea();
            areaBroker.clearAreasContent(['overlayHeader', 'overlayContent', 'overlayFooter']);

            const overviewTitle = __('Overview');

            this.overlayHeader = new OverlayHeaderBar({
                target: headerSlot,
                props: {
                    heading: overviewTitle.toUpperCase()
                }
            });
            this.overlayContent = new TestOverviewContent({
                target: contentSlot,
                props: {
                    serviceCallId: testConfig.serviceCallId,
                    showScore: options.review && options.review.showScore
                }
            });
            this.overlayFooter = new TestOverviewBottomBar({
                target: footerSlot,
                props: {
                    isFinalDelivery: !testConfig?.batteryContext?.nextDeliveryExecutionUrl?.length
                }
            });

            // listen to Overlay content events
            this.overlayHeader.$on('close', () => {
                this.toggleOverview(false);
            });
            this.overlayContent.$on('move', e => {
                const { position } = e.detail;
                if (testRunner.getTestContext().itemPosition !== position) {
                    testRunner.jump(position);
                }
                this.toggleOverview(false);
            });
            this.overlayFooter.$on('close', () => {
                this.toggleOverview(false);
            });
            this.overlayFooter.$on('finish', () => {
                testRunner.finish();
            });
        };

        /**
         * Destroy the Overview components
         */
        this.destroyOverview = () => {
            if (this.overlayHeader) {
                this.overlayHeader.$destroy();
            }
            if (this.overlayContent) {
                this.overlayContent.$destroy();
            }
            if (this.overlayFooter) {
                this.overlayFooter.$destroy();
            }
            this.overlayHeader = null;
            this.overlayContent = null;
            this.overlayFooter = null;
        };

        /**
         * Open/close overview.
         * Do not call it when navigating away with jump/next.
         * @param {boolean} open
         */
        this.toggleOverview = open => {
            const testContext = testRunner.getTestContext();
            const itemIdentifier = testContext.itemIdentifier;
            const areaBroker = testRunner.getAreaBroker();

            // open from any status
            if (open) {
                testRunner.on('disableitem.overview', () => {
                    testRunner.off('disableitem.overview');

                    this.setOverlayStatus(); // opens Overlay
                    this.createOverview();

                    areaBroker.getOverlayHeaderArea().querySelector('h2').focus();
                });
                testRunner.disableItem(itemIdentifier);

                // close
            } else if (this.isOverlayStatus()) {
                testRunner.on('enableitem.overview', () => {
                    testRunner.off('enableitem.overview');

                    tick().then(() => this.destroyOverview());

                    const overviewButton = areaBroker.getNavigationArea().querySelector('button[name="overview"]');
                    if (overviewButton) {
                        overviewButton.focus();
                    }
                });
                testRunner.enableItem(itemIdentifier); //it restores testSessionStatus itself
            }
        };
    },

    init() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const navigationArea = areaBroker.getNavigationArea();
        const testConfig = testRunner.getConfig();
        const testSessionStatusStore = getTestSessionStatusStore(testConfig.serviceCallId);

        testRunner
            .on('enablenav', () => {
                this.enable();
            })
            .on('disablenav', () => {
                this.disable();
            });

        this.unsubscribeFromStatusChanges = testSessionStatusStore.subscribe(status => {
            /**
             * Hide navigation from screenreader, when overlay is open.
             * The functionality is here, because empty <nav /> should be hidden by default.
             */
            if (navigationArea) {
                if (status === testSessionStatus.overlay) {
                    navigationArea.setAttribute('aria-hidden', 'true');
                } else {
                    navigationArea.removeAttribute('aria-hidden');
                }
            }
        });
    },

    render() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const testConfig = testRunner.getConfig();
        const options = testRunner.getOptions();

        //render the navigator component
        this.reviewNavigator = new ReviewNavigator({
            target: areaBroker.getNavigationArea(),
            props: {
                serviceCallId: testConfig.serviceCallId,
                disabled: true,
                showScore: options.review && options.review.showScore,
                isFinalDelivery: !testConfig?.batteryContext?.nextDeliveryExecutionUrl?.length
            }
        });

        //listen to events from navigator component
        this.reviewNavigator.$on('move', e => {
            const { direction, scope, position } = e.detail;
            if (direction === 'next') {
                testRunner.next(scope);
            } else if (direction === 'previous') {
                testRunner.previous(scope);
            } else {
                if (testRunner.getTestContext().itemPosition !== position) {
                    testRunner.jump(position);
                }
            }
        });
        this.reviewNavigator.$on('overview', () => {
            this.toggleOverview(true);
        });
        this.reviewNavigator.$on('finish', () => {
            testRunner.finish();
        });
    },

    enable() {
        if (this.reviewNavigator) {
            this.reviewNavigator.$set({ disabled: false });
        }
    },

    disable() {
        if (this.reviewNavigator) {
            this.reviewNavigator.$set({ disabled: true });
        }
    },

    destroy() {
        if (this.unsubscribeFromStatusChanges) {
            this.unsubscribeFromStatusChanges();
        }
        if (this.reviewNavigator) {
            this.reviewNavigator.$destroy();
        }
        this.destroyOverview();
    }
});
