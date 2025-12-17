// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { testSessionStatus } from '../../../session/sessionStates.js';
import { getTestStateStore, getTestSessionStatusStore } from '../../../testsStateStore.js';
import { updateBookmarkInTestMap } from '../../../util/bookmark.js';
import { isSkippableAttemptsItem } from '../../../util/testContext.js';
import { getPartTitle } from '../../../util/testPart.js';
import TestNavigator from './TestNavigator.svelte';
import OverlayHeaderBar from '../../../layout/overlay/OverlayHeaderBar.svelte';
import TestOverviewContent from './overview/TestOverviewContent.svelte';
import TestOverviewBottomBar from './overview/TestOverviewBottomBar.svelte';
import { __ } from '@oat-sa-private/ui-core';
import { tick } from 'svelte';
import { resetLastVisitedStep } from './nonLinearNavigationHelper.js';

/**
 * the navigator plugin handles :
 *  - the next/previous buttons
 *  - the progress visualization
 *  - the overview
 *  - the bookmark function
 */
export default pluginFactory({
    name: 'navigator',

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        const testStateStore = getTestStateStore(testConfig.serviceCallId);
        const testSessionStatusStore = getTestSessionStatusStore(testConfig.serviceCallId);

        /**
         * Track which reasons the navigation should be disabled for
         * @type {Set<String>}
         */
        this.navDisablers = new Set();

        /**
         * Set the session status to "overlay"
         */
        this.setOverlayStatus = () => {
            testSessionStatusStore.set(testSessionStatus.overlay);
        };

        /**
         * Check whether the current status is overlay
         * @returns {Boolean}
         */
        this.isOverlayStatus = () => testSessionStatusStore.get() === testSessionStatus.overlay;

        /**
         * Check whether the current status is loading
         * @returns {Boolean}
         */
        this.isLoadingStatus = () => testSessionStatusStore.get() === testSessionStatus.loading;

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
            const testPartTitle = getPartTitle(testStateStore.getCurrentTestPart(), testStateStore.getTestMap(), true);

            let heading = overviewTitle.toUpperCase();
            if (testPartTitle) {
                heading += ` - ${testPartTitle}`;
            }

            this.overlayHeader = new OverlayHeaderBar({
                target: headerSlot,
                props: {
                    heading
                }
            });
            this.overlayContent = new TestOverviewContent({
                target: contentSlot,
                props: {
                    serviceCallId: testConfig.serviceCallId,
                    nonLinearRestricted: !!testConfig.options?.nonLinearRestricted
                }
            });
            this.overlayFooter = new TestOverviewBottomBar({
                target: footerSlot
            });

            // listen to Overlay content events
            this.overlayHeader.$on('close', () => {
                this.toggleOverview(false);
            });
            this.overlayContent.$on('move', e => {
                const { position } = e.detail;
                const testContext = testRunner.getTestContext();
                if (testContext.itemPosition !== position) {
                    //if we are navigating away from item with remaining attempts,
                    //don't submit the response
                    const skipTheAttempt = isSkippableAttemptsItem(testContext);
                    if (skipTheAttempt || this.isAutoOpenOnLastItem) {
                        testRunner.skip('item', 'jump', position);
                    } else {
                        testRunner.jump(position);
                    }
                } else {
                    this.toggleOverview(false);
                }
            });
            this.overlayFooter.$on('close', () => {
                this.toggleOverview(false);
            });
            this.overlayFooter.$on('submit', () => {
                const testContext = testRunner.getTestContext();
                // submitting the testPart from an item with remaining attempts
                // also doesn't submit its response
                const skipTheAttempt = isSkippableAttemptsItem(testContext);
                if (skipTheAttempt || this.isAutoOpenOnLastItem) {
                    testRunner.skip('testPart', 'next');
                } else {
                    testRunner.next('testPart');
                }
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
         * Close the overview without any item manipulation
         */
        this.closeOverview = () => {
            const wasOverviewOpen = !!this.overlayContent;

            if (wasOverviewOpen) {
                tick().then(() => this.destroyOverview());

                const areaBroker = this.getAreaBroker();
                const navArea = areaBroker && areaBroker.getNavigationArea();
                const overviewButton = navArea && navArea.querySelector('button[name="overview"]');
                if (overviewButton) {
                    overviewButton.focus();
                }
            }
        };

        /**
         * Open/close overview.
         * Do not call it when navigating away with jump/next.
         * @param {boolean} open
         * @param {boolean} isAutoOpenOnLastItem - on last item in non-linear test:
         *   item was already validated and submitted before opening overview, so 'skip' from overview this time
         */
        this.toggleOverview = (open, isAutoOpenOnLastItem = false) => {
            const testContext = testRunner.getTestContext();
            const itemIdentifier = testContext.itemIdentifier;
            const areaBroker = testRunner.getAreaBroker();

            // open from any status
            if (open) {
                this.isAutoOpenOnLastItem = isAutoOpenOnLastItem;
                this.disableOverlayCloseBtn(false);

                const afterItemWasDisabled = () => {
                    this.setOverlayStatus(); // opens Overlay
                    this.createOverview();
                    areaBroker.getOverlayHeaderArea().querySelector('h2').focus();
                };

                if (!testRunner.getItemState(itemIdentifier, 'disabled')) {
                    testRunner.on('disableitem.overview', () => {
                        testRunner.off('disableitem.overview');
                        afterItemWasDisabled();
                    });
                    testRunner.disableItem(itemIdentifier);
                } else {
                    //currently this happens if timer timeout on overview and user chooses 'Review my answers' in feedback
                    //sessionStatus is 'loading' at this moment, so previous overview is closed,
                    //but item is not enabled
                    afterItemWasDisabled();
                }

                // close
            } else if (this.isOverlayStatus()) {
                delete this.isAutoOpenOnLastItem;
                this.disableOverlayCloseBtn(true);

                testRunner.enableItem(itemIdentifier); //it restores testSessionStatus itself
            }
        };

        this.disableOverlayCloseBtn = disableCloseBtn => {
            if (this.overlayHeader) {
                this.overlayHeader.$set({ disableCloseBtn });
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
            /**
             * To disable the test runner nav elements, you should trigger this event, and provide the reason in the param.
             * (It's allowed not to provide a reason, but don't assume that this disablement will last long.)
             * @param {Object?} [params]
             * @param {String?} [params.reason] - one of disableNavReasons
             * @param {String?} [params.key] - optional, to provide extra uniqueness
             */
            .on('disablenav', params => {
                if (params?.reason) {
                    if (params?.key) {
                        params.reason += `:${params.key}`;
                    }
                    this.navDisablers.add(params.reason);
                }
                this.disable();
            })
            /**
             * To enable the nav again, you must also provide the same reason, which matches your reason for disabling.
             * This allows plugins (and the runner) to collaboratively control whether the global navigation is enabled.
             * For an escape hatch, passing multiple reasons - or the {force: true} param - is possible (extreme cases only!)
             * @param {Object?} [params]
             * @param {String?|Array<String>?} [params.reason] - one of disableNavReasons
             * @param {String?} [params.key] - optional, can only be used with single reason
             * @param {Boolean?} [params.force]
             */
            .on('enablenav', params => {
                if (params?.reason) {
                    const reasons = Array.isArray(params.reason) ? params.reason : [params.reason];
                    reasons.forEach(reason => {
                        if (params?.key) {
                            reason += `:${params.key}`;
                            this.navDisablers.delete(reason);
                        } else {
                            // since no specific key, delete all reasons matching reason prefix
                            this.navDisablers.forEach(value => {
                                if (value.startsWith(reason)) {
                                    this.navDisablers.delete(value);
                                }
                            });
                        }
                    });
                } else if (params?.force) {
                    this.navDisablers.clear();
                }
                if (this.navDisablers.size === 0) {
                    this.enable();
                }
            })
            .on('unloaditem destroy', () => resetLastVisitedStep());

        /**
         * Actually close overview component.
         * Once test-runner decides that overview/overlay can be closed, it will change session status and we can destroy the component
         * (This status change should happen inside `testRunner.enableItem/jump/next` methods)
         */
        let prevTestSessionStatus = testSessionStatusStore.get();
        this.unsubscribeFromStatusChanges = testSessionStatusStore.subscribe(status => {
            if (prevTestSessionStatus === testSessionStatus.overlay && status !== testSessionStatus.overlay) {
                //'testSessonStatus.overlay' may have been used by other caller, like settings plugin.
                //so this may be called even if overview components are not actually rendered.
                this.closeOverview();
            }
            prevTestSessionStatus = status;

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
        const testOptions = testRunner.getOptions();

        /**
         * Bookmark/unbookmark the current item
         * @returns {Promise}
         */
        this.bookmarkCurrentItem = () => {
            const testStateStore = getTestStateStore(testConfig.serviceCallId);
            const item = testStateStore.getCurrentItem();
            if (!item) {
                return Promise.resolve();
            }
            const position = item.position;
            const bookmarked = !item.flagged;
            return testRunner
                .getProxy()
                .callTestAction('flagItem', {
                    position: position.toString(),
                    flag: bookmarked
                })
                .then(() => {
                    const testMap = testRunner.getTestMap();
                    testRunner.setTestMap(updateBookmarkInTestMap(testMap, position, bookmarked));
                })
                .catch(err => {
                    testRunner.trigger('error', err);
                });
        };

        //render the navigator component
        const navigationArea = areaBroker.getNavigationArea();
        if (!navigationArea) {
            throw new Error('NavigationArea is required for TestNavigator component');
        }

        this.testNavigator = new TestNavigator({
            target: navigationArea,
            props: {
                serviceCallId: testConfig.serviceCallId,
                liteMode: !!testOptions.liteMode,
                disabled: true,
                nonLinearRestricted: !!testConfig.options?.nonLinearRestricted,
                linearNavDelayBeforeEnabled: testConfig.options?.plugins?.navigator?.linearNavDelayBeforeEnabled
            }
        });

        //listen to events from navigator component
        this.testNavigator.$on('move', e => {
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
        this.testNavigator.$on('skip', e => {
            const { direction, scope, position } = e.detail;
            if (direction === 'next') {
                testRunner.skip(scope, 'next');
            } else if (direction === 'previous') {
                testRunner.skip(scope, 'previous');
            } else {
                if (testRunner.getTestContext().itemPosition !== position) {
                    testRunner.skip('item', 'jump', position);
                }
            }
        });
        this.testNavigator.$on('overview', () => {
            this.toggleOverview(true);
        });
        this.testNavigator.$on('review', () => {
            let didJump = false; //jump wasn't cancelled by validation dialogs or something else
            testRunner
                .on('unloaditem.review', () => {
                    testRunner.off('unloaditem.review');
                    didJump = true;
                })
                .after('move.review', () =>
                    new Promise(resolve => {
                        testRunner.off('move.review');
                        testRunner.off('unloaditem.review');

                        if (this.isLoadingStatus()) {
                            testRunner.on('renderitem.review', () => {
                                testRunner.off('renderitem.review');
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    }).then(() => {
                        if (didJump) {
                            this.toggleOverview(true, true);
                        }
                    })
                )
                .jump(testRunner.getTestContext().itemPosition); // navigate to the same item to save it
        });
        this.testNavigator.$on('bookmark', () => {
            this.testNavigator.$set({ bookmarkDisabled: true });
            this.bookmarkCurrentItem().then(() => {
                this.testNavigator.$set({ bookmarkDisabled: false });
            });
        });

        // listen to events passed via host
        testRunner.on('open-overview', () => {
            this.toggleOverview(true);
        });

        // TestNavigator needs to check itemSessionStatus value
        testRunner.on('renderitem', () => {
            this.testNavigator.$set({ itemSessionStatusStore: testRunner.itemRunner?.sessionStatusStore });
        });
    },

    enable() {
        [this.testNavigator, this.overlayContent, this.overlayFooter].forEach(component => {
            if (component) {
                component.$set({ disabled: false });
            }
        });
    },

    disable() {
        [this.testNavigator, this.overlayContent, this.overlayFooter].forEach(component => {
            if (component) {
                component.$set({ disabled: true });
            }
        });
    },

    destroy() {
        if (this.unsubscribeFromStatusChanges) {
            this.unsubscribeFromStatusChanges();
        }
        if (this.testNavigator) {
            this.testNavigator.$destroy();
        }
        this.destroyOverview();
        this.navDisablers.clear();
    }
});
