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
import { tick, mount, unmount } from 'svelte';
import { resetLastVisitedStep } from './nonLinearNavigationHelper.js';
import { isLastItemInCurrentPart } from '../../../util/testMap.js';

const defaultConfig = {
    nonLinearRestricted: false, // was also provided as options.nonLinearRestricted
    linearNavDelayBeforeEnabled: null,
    preventEarlyTestPartSubmission: false
};

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
        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        const pluginConfig = { ...defaultConfig, ...providedConfig };
        this.setConfig(pluginConfig);

        const testConfig = testRunner.getConfig();
        const testStateStore = getTestStateStore(testConfig.serviceCallId);
        const testSessionStatusStore = getTestSessionStatusStore(testConfig.serviceCallId);

        /**
         * Track all navigation disabling reasons.
         * direction:
         *   - null  => global disable
         *   - 'next' => only block forward
         *   - 'previous' => only block backward
         *
         * reason / key are used for concurrency semantics.
         * @type {Array<{reason: (string|null), key: (string|null), direction: ('next'|'previous'|null)}>}
         */
        this.navDisablers = [];

        /**
         * Central function to recalculate navigation props from navDisablers.
         * - Global disabled if there is at least one entry with direction === null
         * - Next/previous disabled if there is at least one entry with that direction
         */
        this.updateNavigatorState = () => {
            const hasGlobalDisable = this.navDisablers.some(disabler => disabler.direction === null);
            const disableNext = this.navDisablers.some(disabler => disabler.direction === 'next');
            const disablePrevious = this.navDisablers.some(disabler => disabler.direction === 'previous');

            [this.testNavigator, this.overlayContent, this.overlayFooter].forEach(component => {
                if (!component) {
                    return;
                }

                const props = {
                    disabled: hasGlobalDisable
                };

                if (component === this.testNavigator) {
                    props.disableNext = disableNext;
                    props.disablePrevious = disablePrevious;
                }

                if (component === this.overlayFooter && !props.disabled) {
                    // disable submit button according to pluginConfig, but still enable it in certain more important conditions
                    const allowSubmissionBecauseContext =
                        this.isLastItemInCurrentPart || this.isAutoOpenOnLastItem || this.isTestPartTimedOut;
                    props.disabled = pluginConfig.preventEarlyTestPartSubmission && !allowSubmissionBecauseContext;
                }

                component.$set(props);
            });
        };

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

            const testOptions = testRunner.getOptions();
            const overviewTitle = __('Overview');
            const testPartTitle = getPartTitle(testStateStore.getCurrentTestPart(), testStateStore.getTestMap(), true);

            let heading = overviewTitle.toUpperCase();
            if (testPartTitle) {
                heading += ` - ${testPartTitle}`;
            }

            this.overlayHeader = mount(OverlayHeaderBar, {
                target: headerSlot,
                props: {
                    heading
                }
            });
            this.overlayContent = mount(TestOverviewContent, {
                target: contentSlot,
                props: {
                    allowBookmarks: !testOptions.hideBookmarks,
                    serviceCallId: testConfig.serviceCallId,
                    nonLinearRestricted: !!(pluginConfig.nonLinearRestricted || testConfig.options?.nonLinearRestricted)
                }
            });
            this.overlayFooter = mount(TestOverviewBottomBar, {
                target: footerSlot
            });
            this.updateNavigatorState();

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
                unmount(this.overlayHeader);
            }
            if (this.overlayContent) {
                unmount(this.overlayContent);
            }
            if (this.overlayFooter) {
                unmount(this.overlayFooter);
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
            .on('loaditem', itemIdentifier => {
                this.isLastItemInCurrentPart = isLastItemInCurrentPart(testRunner.getTestMap(), itemIdentifier);
            })
            /**
             * To disable the test runner nav elements, you should trigger this event, and provide the reason in the param.
             * (It's allowed not to provide a reason, but don't assume that this disablement will last long.)
             * @param {Object?} [params]
             * @param {String?} [params.reason] - one of disableNavReasons
             * @param {String?} [params.key] - optional, to provide extra uniqueness
             */
            .on('disablenav', params => {
                const direction = params?.detail?.direction ?? null;

                // - "disablenav()" (no reason, no direction) is a plain global disable
                // - "disablenav({ reason, key?, detail: { direction? } })" participates
                //   in the concurrency logic.
                if (!params || (!params.reason && !params.key && !direction)) {
                    this.navDisablers.push({
                        reason: null,
                        key: null,
                        direction: null
                    });
                } else {
                    const reason = params.reason || null;
                    const key = params.key || null;

                    this.navDisablers.push({
                        reason,
                        key,
                        direction
                    });
                }

                this.updateNavigatorState();
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
                // Force: clear everything
                if (params?.force) {
                    this.navDisablers = [];
                    this.updateNavigatorState();
                    return;
                }

                const direction = params?.detail?.direction ?? null;

                if (params?.reason) {
                    // reason can be a string or an array of strings
                    const reasons = Array.isArray(params.reason) ? params.reason : [params.reason];

                    reasons.forEach(reason => {
                        if (params.key) {
                            const key = params.key;
                            // Exact match on reason + key; optionally constrained by direction
                            this.navDisablers = this.navDisablers.filter(disabler => {
                                const sameReason = disabler.reason === reason;
                                const sameKey = disabler.key === key;
                                const sameDirection = direction ? disabler.direction === direction : true;

                                return !(sameReason && sameKey && sameDirection);
                            });
                        } else {
                            // No key: remove all entries with this reason; optionally constrained by direction.
                            this.navDisablers = this.navDisablers.filter(disabler => {
                                const sameReason = disabler.reason === reason;
                                const sameDirection = direction ? disabler.direction === direction : true;

                                return !(sameReason && sameDirection);
                            });
                        }
                    });

                    this.updateNavigatorState();
                    return;
                }

                // Only cancels the anonymous global disables created by `disablenav()`
                // without touching the reason-based ones.
                this.navDisablers = this.navDisablers.filter(disabler => {
                    const isAnonymousGlobal =
                        disabler.reason === null && disabler.key === null && disabler.direction === null;

                    return !isAnonymousGlobal;
                });

                this.updateNavigatorState();
            })
            .on('timeout', timer => {
                this.isTestPartTimedOut = ['test', 'testPart'].includes(timer.level);
                if (this.isTestPartTimedOut) {
                    this.updateNavigatorState();
                }
            })
            .on('unloaditem destroy', () => {
                resetLastVisitedStep();

                // Clear per-direction flags when we leave the item,
                // but keep global reasons (direction === null).
                this.navDisablers = this.navDisablers.filter(disabler => disabler.direction === null);

                delete this.isLastItemInCurrentPart;
                delete this.isAutoOpenOnLastItem;

                this.updateNavigatorState();
            }).on('next', level => {
                if (['test', 'testPart'].includes(level)) {
                    delete this.isTestPartTimedOut;
                    this.updateNavigatorState();
                }
            });

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

        const pluginConfig = testRunner.getPluginConfig(this.getName()) || {};

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

        this.testNavigator = mount(TestNavigator, {
            target: navigationArea,
            props: {
                hideBookmarks: !!testOptions.hideBookmarks,
                serviceCallId: testConfig.serviceCallId,
                liteMode: !!testOptions.liteMode,
                disabled: true,
                // nonLinearRestricted was now added to this plugin's config, to replace the old one.
                // testConfig.options.nonLinearRestricted is now deprecated.
                // TODO: Next, update deployed configs, and remove code when safe (not just the line below)
                nonLinearRestricted: !!(pluginConfig.nonLinearRestricted || testOptions.nonLinearRestricted),
                linearNavDelayBeforeEnabled: pluginConfig.linearNavDelayBeforeEnabled
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
        // Clear ALL disablers and recompute
        this.navDisablers = [];
        this.updateNavigatorState();
    },

    disable() {
        this.navDisablers.push({
            reason: null,
            key: null,
            direction: null
        });
        this.updateNavigatorState();
    },

    destroy() {
        if (this.unsubscribeFromStatusChanges) {
            this.unsubscribeFromStatusChanges();
        }
        if (this.testNavigator) {
            unmount(this.testNavigator);
        }
        this.destroyOverview();

        this.navDisablers = [];
    }
});
