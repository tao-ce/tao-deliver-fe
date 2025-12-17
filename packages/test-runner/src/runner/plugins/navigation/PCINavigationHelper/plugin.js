// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { getTestStateStore } from '../../../testsStateStore.js';
import { disableNavReasons } from '../navigator/constants.js';
import itemSessionStatus from 'taoQtiNuiItem/runner/itemSessionStatus.js';

const defaultConfig = {
    qtiItemContainerSelector: '.qti-item',
    pciContainerSelector: '.qti-customInteraction > div', // div is created by the CustomInteraction
    allowedMoves: {
        next: ['item', 'section', 'testPart', 'test'],
        previous: ['item'] // only item is supported for now
    },
    disableDisableNavigationWithDirection: false // feature flag, should be deprecated in the future
};

export default pluginFactory({
    name: 'PCINavigationHelper',

    install() {
        const testRunner = this.getTestRunner();
        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        const pluginConfig = { ...defaultConfig, ...providedConfig };
        this.setConfig(pluginConfig);

        const { serviceCallId } = testRunner.getConfig();
        const testStateStore = getTestStateStore(serviceCallId);
        const { allowedMoves, disableDisableNavigationWithDirection } = pluginConfig;

        /**
         * Indicates if timeout has been reached and navigation should not be blocked
         */
        this.timeout = false;

        /**
         * Resets the navigation state
         */
        this.resetNavigationState = () => {
            this.navigationDisabled = {
                all: false,
                previous: false,
                next: false
            };
        };

        /**
         * Handles navigate events from the PCI
         * @param {CustomEvent<{direction: string, scope: string}>} e
         */
        this.handleNavigate = e => {
            e.stopPropagation();
            const { direction, scope } = e.detail;
            const item = testStateStore.getCurrentItem();
            const testPart = testStateStore.getCurrentTestPart();

            if (
                allowedMoves[direction] &&
                allowedMoves[direction].includes(scope) &&
                (direction !== 'previous' || item.position - testPart.position > 0)
            ) {
                testRunner[direction](scope);
            }
        };

        /**
         * Disables navigation
         * @param {CustomEvent<{direction: string}>} e
         */
        this.disableNavigation = e => {
            e.stopPropagation();
            const { direction } = e.detail || {};
            if (direction) {
                this.navigationDisabled[direction] = true;
                if (!disableDisableNavigationWithDirection) {
                    testRunner.trigger('disablenav', {
                        detail: { direction },
                        reason: disableNavReasons.pciControlsNav
                    });
                }
            } else {
                this.navigationDisabled.all = true;
                testRunner.trigger('disablenav', { reason: disableNavReasons.pciControlsNav });
            }
        };

        /**
         * Enables navigation
         * @param {CustomEvent<{direction: string}>} e
         */
        this.enableNavigation = e => {
            e.stopPropagation();
            const { direction } = e.detail || {};

            if (direction) {
                this.navigationDisabled[direction] = false;
                if (!disableDisableNavigationWithDirection) {
                    testRunner.trigger('enablenav', {
                        detail: { direction },
                        reason: disableNavReasons.pciControlsNav
                    });
                }
            } else {
                this.navigationDisabled.all = false;
                testRunner.trigger('enablenav', { reason: disableNavReasons.pciControlsNav });
            }
        };

        /**
         * Adds event listeners to the PCI containers
         */
        this.addPCIEventListeners = () => {
            if (this.pciContainers) {
                this.pciContainers.forEach(pciContainer => {
                    pciContainer.addEventListener('navigate', this.handleNavigate);
                    pciContainer.addEventListener('disableNavigation', this.disableNavigation);
                    pciContainer.addEventListener('enableNavigation', this.enableNavigation);
                });
            }
        };

        /**
         * Removes event listeners from the PCI containers
         */
        this.removePCIEventListeners = () => {
            if (this.pciContainers) {
                this.pciContainers.forEach(pciContainer => {
                    pciContainer.removeEventListener('navigate', this.handleNavigate);
                    pciContainer.removeEventListener('disableNavigation', this.disableNavigation);
                    pciContainer.removeEventListener('enableNavigation', this.enableNavigation);
                });

                this.pciContainers = null;
            }
        };

        /**
         * Dispatches a custom event to the PCIs
         * @param {String} eventName
         * @param {Object} detail
         */
        this.dispatchEventForPCIs = (eventName, detail) => {
            if (this.pciContainers) {
                [...this.pciContainers].forEach(pciContainer => {
                    pciContainer.dispatchEvent(new CustomEvent(eventName, { detail }));
                });
            }
        };

        /**
         * Dispatches a navigation event to the PCIs
         * @param {Object} detail
         * @param {String} detail.direction - 'next' or 'previous'
         * @param {String} detail.scope - 'item', 'section', 'testPart', 'test'
         * @returns {Boolean|void} true if the event was prevented by at least one of the PCIs
         */
        this.dispatchNavigationEventForPCIs = ({ direction, scope }) => {
            if (this.pciContainers) {
                const events = [...this.pciContainers].map(pciContainer => {
                    const event = new CustomEvent('navigation', { detail: { direction, scope }, cancelable: true });
                    pciContainer.dispatchEvent(event);
                    return event;
                });

                if (this.timeout) {
                    return false;
                }
                return events.some(event => event.defaultPrevented);
            }
        };
    },

    init() {
        this.hasOtherBeforeMoveHandler = false;
        this.resetNavigationState();

        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();

        const { qtiItemContainerSelector, pciContainerSelector } = this.getConfig();
        const getPCIContainers = () => {
            const itemContainer = areaBroker.getContentArea().querySelector(qtiItemContainerSelector);
            return itemContainer?.querySelectorAll(pciContainerSelector) || [];
        };

        testRunner
            .before('timeout', () => {
                this.timeout = true;
            })
            .before('move', (event, direction = 'next', scope = 'item', ref) => {
                const isNavigationPrevented = this.dispatchNavigationEventForPCIs({ direction, scope });
                if (
                    !this.timeout &&
                    (this.navigationDisabled.all || this.navigationDisabled[direction] || isNavigationPrevented)
                ) {
                    return Promise.reject();
                }
                if (this.hasOtherBeforeMoveHandler) {
                    return new Promise((resolve, reject) => {
                        //customer plugin may need to do something before move, but only after this plugin's handler
                        testRunner.on(`PCINavigationHelper-beforemove-handled.${this.getName()}`, ({ proceed }) => {
                            testRunner.off(`PCINavigationHelper-beforemove-handled.${this.getName()}`);
                            if (proceed) {
                                resolve();
                            } else {
                                reject();
                            }
                        });
                        testRunner.trigger('PCINavigationHelper-beforemove', { event, direction, scope, ref });
                    });
                }
            })
            .on('renderitem', () => {
                this.timeout = false;
                this.pciContainers = getPCIContainers();

                this.addPCIEventListeners();
                this.dispatchEventForPCIs('renderitem');

                // in order to prevent missed event listeneters after item re-rendered
                // we need to re-initialize event listeners in the itemRunner container
                // and remove the old ones as they do not belong to this container more
                testRunner.itemRunner?.on('render', () => {
                    this.removePCIEventListeners();
                    this.pciContainers = getPCIContainers();
                    this.addPCIEventListeners();
                    this.dispatchEventForPCIs('renderitem');
                });

                testRunner.itemRunner?.on('close', () => {
                    this.dispatchEventForPCIs('itemsessionstatus', itemSessionStatus.closed);
                });
            })
            .on('unloaditem', () => {
                this.removePCIEventListeners();
                this.resetNavigationState();
                this.timeout = false;
                testRunner.trigger('enablenav', { reason: disableNavReasons.pciControlsNav });
            })
            .on(`PCINavigationHelper-beforemove-register.${this.getName()}`, () => {
                //this event may be used by customer plugin
                this.hasOtherBeforeMoveHandler = true;
            });
    },

    destroy() {
        this.removePCIEventListeners();
        this.getTestRunner().off(`.${this.getName()}`);
    }
});
