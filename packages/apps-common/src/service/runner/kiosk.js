// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { semverCompare } from '../../util/semver.js';
import { wait } from '../../core/async.js';
import KioskError from '../../core/error/KioskError.js';

let kioskServiceInstance;

/**
 * @typedef {Object} ProcessInfo
 * @property {string} name - process key; same key is used in the provider api
 * @property {string} label - user-friendly process name
 */
/**
 * @typedef {(e: {
 *      deviceInfo: string[]|null,
 *      processList: string[]|null
 * }) => void} BreachEventCallback
 */
/**
 * @typedef {Object} KioskConfig
 * @property {string} minVersion
 * @property {string} [providerId]
 * @property {Array<ProcessInfo>} [processDenyList]
 */
/**
 * @typedef {Object} KioskService
 * @property {() => Promise<void>} validateMinVersion
 * @property {() => Promise<void>} validateProcessDenyList
 * @property {(callback: BreachEventCallback) => void} addBreachListener
 * @property {() => void} removeBreachListener
 * @property {() => void} exit
 */

const providers = {
    kiosked: 'kiosked'
};

function createValidationError() {
    const err = new KioskError('Kiosk validation error');
    return err;
}

/**
 * Lockdown (kiosk) browser api
 * @param {KioskConfig} config
 * @returns {KioskService?}
 */
export default function kioskServiceFactory(config) {
    if (kioskServiceInstance) {
        return kioskServiceInstance;
    }

    let { minVersion, providerId } = config;
    if (!providerId) {
        providerId = providers.kiosked;
    }
    if (!Object.values(providers).includes(providerId)) {
        throw new TypeError('Specify known provider for kiosk');
    }
    if (!minVersion) {
        throw new TypeError('Specify minVersion for kiosk');
    }

    if (providerId === providers.kiosked) {
        kioskServiceInstance = kioskedFactory(config);
    }
    return kioskServiceInstance;
}

/**
 * 'KioskED' provider api
 * @param {KioskConfig} config
 * @returns {KioskService}
 */
function kioskedFactory({ minVersion, processDenyList } = {}) {
    const providerApi = window.kiosked;
    const timeout = 5000;
    let breachListener;

    return {
        /**
         * Checks if app runs in the lockdown (kiosk) browser, and browser version matches requirements
         * @throws {KioskError} - if not valid
         * @returns {Promise<void>}
         */
        async validateMinVersion() {
            if (providerApi) {
                if (typeof providerApi.getDeviceInfo === 'function') {
                    const deviceInfo = await Promise.race([providerApi.getDeviceInfo(), wait(timeout)]);
                    if (deviceInfo?.app?.version) {
                        if (semverCompare(deviceInfo.app.version, minVersion) >= 0) {
                            return;
                        } else {
                            const err = createValidationError();
                            err.requiredVersion = minVersion;
                            err.detectedVersion = deviceInfo.app.version;
                            throw err;
                        }
                    }
                }
            }
            throw createValidationError();
        },

        /**
         * Using browser api, checks if user doesn't run prohibited processes on his machine
         * @throws {KioskError} - if not valid
         * @returns {Promise<void>}
         */
        async validateProcessDenyList() {
            if (providerApi) {
                if (!processDenyList) {
                    return;
                }
                if (typeof providerApi.getProcessList === 'function') {
                    let actualProcessKeys = await Promise.race([providerApi.getProcessList(), wait(timeout)]);
                    if (
                        actualProcessKeys &&
                        Array.isArray(actualProcessKeys) &&
                        actualProcessKeys.every(key => typeof key === 'string')
                    ) {
                        actualProcessKeys = new Set(actualProcessKeys.map(key => key.toLowerCase()));
                        const denyProcessKeys = new Set(processDenyList.map(obj => obj.name.toLowerCase()));
                        const actualDeniedKeys = actualProcessKeys.intersection(denyProcessKeys);
                        if (actualDeniedKeys.size === 0) {
                            return;
                        } else {
                            const err = createValidationError();
                            /**
                             * @type {ProcessInfo[]}
                             */
                            err.denyProcesses = processDenyList.filter(obj =>
                                actualDeniedKeys.has(obj.name.toLowerCase())
                            );
                            throw err;
                        }
                    }
                }
            }
            throw createValidationError();
        },

        /**
         * Add listener for "breach" event.
         * "Breach" is triggered by the lockdown browser when suspicious activity is detected.
         * @param {BreachEventCallback} callback
         */
        addBreachListener(callback) {
            breachListener = async e => {
                if (typeof e.preventDefault === 'function') {
                    e.preventDefault(); // otherwise browser will show its own dialog
                }
                const details = await Promise.race([
                    Promise.all([providerApi.getDeviceInfo(), providerApi.getProcessList()]),
                    wait(timeout)
                ]);

                callback({
                    deviceInfo: details?.[0],
                    processList: details?.[1]
                });
            };
            providerApi.addEventListener('breach', breachListener);
        },

        /**
         * Remove listener for "breach" event.
         */
        removeBreachListener() {
            if (breachListener) {
                providerApi.removeEventListener('breach', breachListener);
            }
        },

        /**
         * Close the browser
         */
        exit() {
            providerApi.exit();
        }
    };
}

export function clearKioskServiceInstance() {
    kioskServiceInstance = null;
}
