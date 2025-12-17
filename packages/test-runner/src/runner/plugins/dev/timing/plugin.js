// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import pluginFactory from 'taoTests/runner/plugin';
import { getTestSessionStatusStore } from '../../../testsStateStore.js';
import { testSessionStatus } from '../../../session/sessionStates.js';
import store from 'core/store';

/**
 * This plugins tracks some time metrics and report them in the console at the end of the test:
 *  - initial loading time: between the navigation start and the 1st item rendered
 *  - waiting time: between the start of the spinning loader and its end
 *  - loading time: between item data are loaded and the item is ready
 *  - transition time: between the click on the "next" button and the item is interactive
 *
 * See https://developer.mozilla.org/fr/docs/Web/API/Performance
 *
 * Be careful, by activating the plugin a new store is created in IndexedDB.
 * This store is NOT cleared at the end of the test.
 * This plugin shouldn't be activated on production environments.
 *
 * TODO support navigating back and recording measures for the same items multiple times
 */
export default pluginFactory({
    name: 'dev-timing',

    install() {
        this.transition = false;
        this.itemloading = false;
        this.waiting = false;

        this.testIdentifier = '';
    },

    init() {
        const testRunner = this.getTestRunner();
        const testSessionStatusStore = getTestSessionStatusStore(testRunner.getConfig().serviceCallId);

        testRunner.on('init', () => {
            //track initial loading time
            testRunner.after('renderitem.initial', itemRef => {
                testRunner.off('renderitem.initial');

                performance.mark('initial-load');
                performance.measure(`initial-${itemRef}`, void 0, 'initial-load');

                this.testIdentifier = testRunner.getTestMap().identifier;
            });

            //track waiting time
            this.unsubscribeFromStatusChanges = testSessionStatusStore.subscribe(status => {
                if (status === testSessionStatus.loading && !this.waiting) {
                    performance.mark('waiting-start');
                    this.waiting = true;
                } else if (status === testSessionStatus.interacting && this.waiting) {
                    performance.mark('waiting-end');
                    this.waiting = false;

                    const itemRef = testRunner.getCurrentItemIdentifier();
                    performance.measure(`waiting-${itemRef}`, 'waiting-start', 'waiting-end');
                }
            });
        });

        //track item loading/rendering
        testRunner.before('loaditem', () => {
            this.itemloading = true;
            performance.mark('loading-start');
        });

        //track full transition
        testRunner.on('enablenav', () => {
            const button = document.querySelector('[name=next],[name=submit]');
            if (button) {
                button.addEventListener(
                    'mousedown',
                    () => {
                        this.transition = true;
                        performance.mark('transition-start');
                    },
                    true
                );
            }
        });

        //once rendered close transition and loading
        testRunner.after('renderitem', itemRef => {
            if (this.transition) {
                performance.mark('transition-end');
                this.transition = false;

                performance.measure(`transition-${itemRef}`, 'transition-start', 'transition-end');
            }
            if (this.itemloading) {
                performance.mark('loading-end');
                this.itemloading = false;

                performance.measure(`loading-${itemRef}`, 'loading-start', 'loading-end');
            }
        });
    },

    destroy() {
        //measures are relative to the navigation start timestamp
        const navStart = performance.timeOrigin;

        // Display each measure using getEntriesByType
        const entries = performance.getEntriesByType('measure');

        // Get mean network performance on fetch and on img for comparison
        const resources = performance.getEntriesByType('resource');
        let actionsRequestAvgDuration = 0;
        let assetsRequestAvgDuration = 0;
        if (resources) {
            //navigation requestes
            const actionsDurations = Object.values(resources)
                .filter(
                    resource =>
                        resource.initiatorType === 'fetch' && /\/actions$/.test(resource.name) && resource.duration > 0
                )
                .map(resource => resource.duration);
            if (actionsDurations.length) {
                actionsRequestAvgDuration =
                    actionsDurations.reduce((sum, duration) => sum + duration, 0) / actionsDurations.length;
            }
            const assetsDurations = resources
                .filter(resource => /\/asset/.test(resource.name) && resource.duration > 0)
                .map(resource => resource.duration);
            if (assetsDurations.length) {
                assetsRequestAvgDuration =
                    assetsDurations.reduce((sum, duration) => sum + duration, 0) / assetsDurations.length;
            }
        }

        const storeItemKey = `measures-${this.testIdentifier}-${new Date().toISOString().split('T')[0]}`;
        store(this.getName()) //do not block the destroy of the test runner
            .then(storeInstance =>
                storeInstance.getItem(storeItemKey).then(previousMeasures => {
                    const measures = {
                        number: previousMeasures ? previousMeasures.length + 1 : 1,
                        'navigation-start': navStart,
                        'actions-requests-avg-duration': actionsRequestAvgDuration,
                        'assets-requests-avg-duration': assetsRequestAvgDuration
                    };
                    for (let entry of entries) {
                        measures[`${entry.name}-start`] = navStart + entry.startTime;
                        measures[`${entry.name}-end`] = navStart + entry.startTime + entry.duration;
                        measures[`${entry.name}-duration`] = parseInt(entry.duration);
                    }

                    window.console.group('Current measures');
                    window.console.table(measures);
                    window.console.groupEnd();

                    performance.clearMarks();
                    performance.clearMeasures();

                    if (previousMeasures && Array.isArray(previousMeasures)) {
                        previousMeasures.push(measures);

                        window.console.group('Aggregated measures');
                        window.console.table(previousMeasures);
                        window.console.log('CSV format:');
                        window.console.log(
                            previousMeasures.reduce((acc, measureEntry, index) => {
                                if (index === 0) {
                                    acc += `${Object.keys(measureEntry).join(',')}\n`;
                                }
                                acc += `${Object.values(measureEntry).join(',')}\n`;
                                return acc;
                            }, '')
                        );
                        window.console.groupEnd();

                        return storeInstance.setItem(storeItemKey, previousMeasures);
                    }
                    return storeInstance.setItem(storeItemKey, [measures]);
                })
            )
            .catch(error => window.console.error(error));
    }
});
