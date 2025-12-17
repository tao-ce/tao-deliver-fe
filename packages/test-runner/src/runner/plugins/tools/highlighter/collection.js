// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Highlighter Collection - stores an array of highlighters, with different purposes,
 * any of which could be enabled/disabled on a given item
 */

import highlighterFactory from './itemHighlighter.js';

/**
 * @typedef {highlighterCollection}
 * @returns {Object} API for managing & querying the collection
 */
export function highlighterCollection() {
    /**
     * @type {Array} highlighters - Highlighters collection
     * We can run multiple instances of the highlighter plugin on one page, for example:
     * - one for item-level highlights
     * - others for passage-level highlights
     */
    let highlighters = [];

    return {
        /**
         * Instantiates new highlighter and adds it to array
         * @param {Object} options
         * @param {String} options.className - class applied to highlighted spans
         * @param {String} options.containerSelector - selector for the unique root DOM node the HL will work on
         * @param {Array}  options.containersBlackList - list of children which should not receive highlights
         * @param {String} options.id - the highlighterId
         * @returns {Object} a highlighter instance
         */
        addHighlighter(options) {
            const hl = highlighterFactory(options);
            highlighters.push(hl);
            return hl;
        },

        /**
         * Retrieves one highlighter from the collection by matching its id
         * @param {String} id
         * @returns {Object} highlighter instance
         */
        getHighlighterById(id) {
            return highlighters.find(function (hl) {
                return hl.id === id;
            });
        },

        /**
         * Retrieves the full array of highlighters from the collection
         * @returns {Array}
         */
        getAllHighlighters() {
            return highlighters;
        },

        /**
         * Retrieves the first highlighter in the collection
         * By convention, the first is used as Item (top of hierarchy) highlighter, as this can be present on all items
         * @returns {Object} highlighter instance
         */
        getItemHighlighter() {
            return highlighters[0];
        },

        /**
         * Retrieves the full array of highlighters from the collection, minus the first one
         * @returns {Array} highlighter instance
         */
        getElementHighlighters() {
            return highlighters.slice(1);
        },

        /**
         * Gets length of the highlighter collection
         * @returns {Integer}
         */
        getLength() {
            return highlighters.length;
        },

        /**
         * Empties the highlighter collection
         * @returns {Object}
         */
        empty() {
            highlighters = [];
            return this;
        },

        /**
         * Aggregate the count of highlights for each enabled highlighter in the collection
         * @returns {Object} e.g. { yellow: 1, pink: 2, blue: 0 }
         */
        getAggregatedHighlightsCount() {
            const counts = {};
            highlighters.forEach(instance => {
                if (instance.enabled) {
                    const newCount = instance.getHighlightsCount();
                    for (const [key, value] of Object.entries(newCount)) {
                        if (!Number.isInteger(value)) {
                            continue;
                        }
                        if (Number.isInteger(counts[key])) {
                            counts[key] += value;
                        } else {
                            counts[key] = value;
                        }
                    }
                }
            });
            return counts;
        },

        /**
         * Convenience methods to call functions on all highlighters in the collection
         */
        all: {
            /**
             * Proxy-calls highlightSelection in each enabled highlighter in the collection
             * @param {String} colorKey
             */
            highlightSelection(colorKey) {
                highlighters.forEach(instance => {
                    if (instance.enabled) {
                        instance.highlightSelection(colorKey);
                    }
                });
            },

            /**
             * Proxy-calls eraseSelection in each enabled highlighter in the collection
             */
            eraseSelection() {
                highlighters.forEach(instance => {
                    if (instance.enabled) {
                        instance.eraseSelection();
                    }
                });
            },

            /**
             * Proxy-calls attachListeners in each enabled highlighter in the collection
             */
            attachListeners() {
                highlighters.forEach(instance => {
                    if (instance.enabled) {
                        instance.attachListeners();
                    }
                });
            },

            /**
             * Proxy-calls detachListeners in each enabled highlighter in the collection
             */
            detachListeners() {
                highlighters.forEach(instance => {
                    if (instance.enabled) {
                        instance.detachListeners();
                    }
                });
            },

            /**
             * Proxy-calls toggleHighlighting in each enabled highlighter in the collection
             * @param {Boolean} on
             * @param {String} colorKey
             */
            toggleHighlighting(on, colorKey) {
                highlighters.forEach(instance => {
                    if (instance.enabled) {
                        instance.toggleHighlighting(on, colorKey);
                    }
                });
            },

            /**
             * Proxy-calls toggleErasing in each enabled highlighter in the collection
             * @param {Boolean} on
             */
            toggleErasing(on) {
                highlighters.forEach(instance => {
                    if (instance.enabled) {
                        instance.toggleErasing(on);
                    }
                });
            },

            /**
             * Proxy-calls clearHighlights in each enabled highlighter in the collection
             */
            clearHighlights() {
                highlighters.forEach(instance => {
                    if (instance.enabled) {
                        instance.clearHighlights();
                    }
                });
            }
        }
    };
}
