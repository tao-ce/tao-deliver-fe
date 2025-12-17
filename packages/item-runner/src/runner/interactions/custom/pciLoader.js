// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
/* global System */

import 'systemjs/dist/system.js';
import 'systemjs/dist/extras/named-register.js';
import './amd.js';
import qtiCustomInteractionContextFactory from './customInteractionContext';
import store from 'core/store';

/**
 * Flow control of imports. It makes them serial.
 */
let importFlow = Promise.resolve();

/**
 * Gets PCI module store
 * @returns {Store} PCI module store
 */
const getPCIModuleStore = () => store('pciModuleStore', store.backends.memory);

/**
 * @typedef {Object} PCIImportContext
 * @property {Object} pciImportContext - import context that should be defined on window for amd loader
 * @property {Object} qtiCustomInteractionContext - module that will be loaded by PCI
 */

/**
 * Creates a context for PCI AMD modules. The context is based on SystemJS context,
 * but it uses a modified version of systemjs/extras/amd.js, where define is scoped as well.
 * The context has a predefined qtiCustomInteractionContext module, that can be required by PCIs.
 * @returns {PCIImportContext}
 */
const createPCIImportContext = () => {
    const pciImportContext = new System.constructor();
    const qtiCustomInteractionContext = qtiCustomInteractionContextFactory();

    // register qtiCustomInteractionContext module
    pciImportContext.register('qtiCustomInteractionContext', [], _export => ({
        execute: () => {
            // pass only PCI related functions of qtiCustomInteractionContext
            _export({ register: qtiCustomInteractionContext.register });
        }
    }));

    return { pciImportContext, qtiCustomInteractionContext };
};

/**
 * Gets PCI module from store
 * @param {String} pciModulePath path of the PCI module
 * @returns {Promise<PCIModule|null>}
 */
const getPCIModuleFromStore = pciModulePath =>
    getPCIModuleStore().then(pciModuleStore => pciModuleStore.getItem(pciModulePath));

/**
 * Sets PCI module into store
 * @param {String} pciModulePath  path of PCI module
 * @param {Object} pciModule PCI module
 * @returns {Promise<boolean>}
 */
const setPCIModuleToStore = (pciModulePath, pciModule) =>
    getPCIModuleStore().then(pciModuleStore => pciModuleStore.setItem(pciModulePath, pciModule));

/**
 * Loads requested PCI module and returns its registration promise
 * @param {string} pciModulePath - Path of PCI module
 * @returns {Promise<QtiCustomInteractionContext>} qtiCustomInteractionContext instance of the context
 */
export default function (pciModulePath) {
    return new Promise((resolve, reject) => {
        // waits for unfinished imports
        importFlow = importFlow.then(() =>
            getPCIModuleFromStore(pciModulePath).then(pciModule => {
                // return with module, if it was already loaded
                if (pciModule) {
                    return resolve(pciModule);
                }

                const { pciImportContext, qtiCustomInteractionContext } = createPCIImportContext();

                /**
                 * After register, resolve promise with qtiCustomInteractionContext
                 * item runner related functions.
                 */
                qtiCustomInteractionContext.registerPromise.then(() => {
                    pciModule = {
                        getInstance: qtiCustomInteractionContext.getInstance
                    };
                    // set PCI module into store
                    setPCIModuleToStore(pciModulePath, pciModule).then(() => {
                        resolve(pciModule);
                    });
                });

                window.pciImportContext = pciImportContext;

                return pciImportContext
                    .import(pciModulePath)
                    .finally(() => {
                        // clean
                        window.pciImportContext = null;
                    })
                    .catch(err => {
                        if (err?.message?.includes('SystemJS Error#3')) {
                            err.recoverable = true;
                        }
                        return reject(err);
                    });
            })
        );
    });
}
