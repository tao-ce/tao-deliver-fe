// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2019-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * OVERRIDES the moduleLoader from @oat-sa/tao-core-sdk-fe
 * in order to use webpack's dynamic import (based on static anaylis)
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
import _ from 'lodash';

/**
 * The data required by the modules loader
 *
 * @typedef {Object} moduleDefinition
 * @property {String} module - module name
 * @property {String} category - the module category
 * @property {String} [bundle] - module name of the bundle that should contain the module
 * @property {String} [name] - the module name
 * @property {String|Number} [position = 'append'] - append, prepend or arbitrary position within the category
 */

/**
 * Creates a loader with the list of required modules
 * @param {Object} requiredModules - A collection of mandatory modules, where the key is the category and the value are an array of loaded modules
 * @param {Function} [validate] - A validator function, by default the module should be an object
 * @param {Object} [specs] - Some extra methods to assign to the loader instance
 * @returns {loader} the provider loader
 * @throws TypeError if something is not well formatted
 */
export default function moduleLoaderFactory(requiredModules, validate, specs) {
    /**
     * The list of loaded modules
     */
    const loaded = {};

    /**
     * Retains the modules to load
     */
    const modules = {};

    /**
     * The modules to exclude
     */
    const excludes = [];

    /**
     * Bundles to require
     */
    const bundles = [];

    /**
     * The module loader
     * @typedef {loader}
     */
    const loader = {
        /**
         * Adds a list of dynamic modules to load
         * @param {moduleDefinition[]} moduleList - the modules to add
         * @returns {loader} chains
         * @throws {TypeError} misuse
         */
        addList: function addList(moduleList) {
            _.forEach(moduleList, def => {
                this.add(def);
            });
            return this;
        },

        /**
         * Adds a dynamic module to load
         * @param {moduleDefinition} def - the module to add
         * @returns {loader|void} chains
         * @throws {TypeError} misuse
         */
        add(def) {
            if (def === null) {
                return;
            }
            if (!_.isPlainObject(def)) {
                throw new TypeError('The module definition module must be an object');
            }
            if (_.isEmpty(def.module) || !_.isString(def.module)) {
                throw new TypeError('A module must be defined');
            }
            if (_.isEmpty(def.category) || !_.isString(def.category)) {
                const identifyModule = def.id || def.name || def.module;
                throw new TypeError(`The module '${identifyModule}' must belong to a category`);
            }

            modules[def.category] = modules[def.category] || [];

            if (_.isNumber(def.position)) {
                modules[def.category][def.position] = def.module;
            } else if (def.position === 'prepend' || def.position === 'before') {
                modules[def.category].unshift(def.module);
            } else {
                modules[def.category].push(def.module);
            }

            if (def.bundle && !_.includes(bundles, def.bundle)) {
                bundles.push(def.bundle);
            }
            return this;
        },

        /**
         * Appends a dynamic module
         * @param {moduleDefinition} def - the module to add
         * @returns {loader} chains
         * @throws {TypeError} misuse
         */
        append(def) {
            return this.add(_.merge({ position: 'append' }, def));
        },

        /**
         * Prepends a dynamic module to a category
         * @param {moduleDefinition} def - the module to add
         * @returns {loader} chains
         * @throws {TypeError} misuse
         */
        prepend(def) {
            return this.add(_.merge({ position: 'prepend' }, def));
        },

        /**
         * Removes a module from the loading stack
         * @param {String} module - the module's module
         * @returns {loader} chains
         * @throws {TypeError} misuse
         */
        remove: function remove(module) {
            excludes.push(module);
            return this;
        },

        /**
         * Loads the dynamic modules : trigger the dependency resolution
         * @param {Boolean} [loadBundles=false] - does load the bundles
         * @returns {Promise}
         */
        load(loadBundles) {
            //compute the providers dependencies
            const dependencies = _(modules).values().flatten().uniq().difference(excludes).value();

            /**
             * Loads modules and wrap then into a Promise
             * @param {String[]} amdModules - the list of modules to require
             * @returns {Promise} resolves with the loaded modules
             */
            const loadModules = function loadModules(amdModules = []) {
                if (_.isArray(amdModules) && amdModules.length) {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            //to prevent bug in Safari ios 13.2 where memory hangs when loading
                            Promise.all(
                                amdModules.map(mod => {
                                    /**
                                     *  (Item Runner, Test Runner, Previewer) - "dynamic" dynamic imports, resolved by their parent package
                                     */
                                    if (mod.startsWith('taoQtiNuiTest/')) {
                                        return import('taoQtiNuiTest/loader.js')
                                            .then(({ importModule }) => importModule(mod));
                                    }
                                    if (mod.startsWith('taoQtiNuiItem/')) {
                                        return import('taoQtiNuiItem/loader.js')
                                            .then(({ importModule }) => importModule(mod));
                                    }
                                    if (mod.startsWith('taoQtiNuiPreviewer/')) {
                                        return import('taoQtiNuiPreviewer/loader.js')
                                            .then(({ importModule }) => importModule(mod));
                                    }

                                    /**
                                     * All other "static" dynamic imports
                                     */
                                    if (mod === 'core/logger/console') {
                                        return import('core/logger/console');
                                    }
                                })
                            )
                                .then(loadedModules => {
                                    resolve(loadedModules.map(res => res && res.default));
                                })
                                .catch(err => reject(err));
                        }, 1);
                    });
                }
                return Promise.resolve();
            };

            // 1. load bundles
            // 2. load dependencies
            // 3. add them to the modules list
            return loadModules(loadBundles ? bundles : [])
                .then(() => loadModules(dependencies))
                .then(loadedModules => {
                    _.forEach(dependencies, (dependency, index) => {
                        const module = loadedModules[index];
                        const category = _.findKey(modules, val => _.includes(val, dependency));

                        if (typeof validate === 'function' && !validate(module)) {
                            throw new TypeError(`The module '${dependency}' is not valid`);
                        }

                        if (_.isString(category)) {
                            loaded[category] = loaded[category] || [];
                            loaded[category].push(module);
                        }
                    });
                    return this.getModules();
                });
        },

        /**
         * Get the resolved list of modules.
         * Load needs to be called before to have the dynamic modules.
         * @param {String} [category] - to get the modules for a given category, if not set, we get everything
         * @returns {Object[]} the modules
         */
        getModules(category) {
            if (_.isString(category)) {
                return loaded[category] || [];
            }

            return _(loaded).values().flatten().uniq().value();
        },

        /**
         * Get the module categories
         * @returns {String[]} the categories
         */
        getCategories() {
            return _.keys(loaded);
        }
    };

    //verify and add the required modules
    _.forEach(requiredModules, function (moduleList, category) {
        if (_.isEmpty(category) || !_.isString(category)) {
            throw new TypeError('Modules must belong to a category');
        }

        if (!_.isArray(moduleList)) {
            throw new TypeError('A list of modules must be an array');
        }

        if (!_.every(moduleList, validate)) {
            throw new TypeError('The list does not contain valid modules');
        }

        if (loaded[category]) {
            loaded[category] = loaded[category].concat(moduleList);
        } else {
            loaded[category] = moduleList;
        }
    });

    // let's extend the instance with extra methods
    if (specs) {
        _(specs)
            .functions()
            .forEach(function (method) {
                loader[method] = function delegate(...args) {
                    return specs[method].apply(loader, [].slice.call(args));
                };
            });
    }

    return loader;
}
