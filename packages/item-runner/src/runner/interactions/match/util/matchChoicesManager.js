// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { cloneDeep } from 'lodash';

/**
 * @typedef choice
 * @property {String} key
 * @property {String} content
 */

/**
 * Collection of helper functions which provide information about choices and pairs
 * @param {choice[][]} choices - static value, originally defined in itemData
 * @param {choice[][]} pairs - dynamic during interaction lifecycle, must be updated through API
 * @returns {Object} API
 */
export default function MatchChoicesManagerFactory(choices, pairs) {
    this.pairs = pairs || [];

    return {
        /**
         * Setter for pairs. Should be used to update pairs inside this helper when the value has changed outside.
         * Pairs are not modified here, and there should be no need to read these pairs from outside.
         * @param {choice[][]} newPairs
         */
        setPairs(newPairs) {
            this.pairs = cloneDeep(newPairs);
        },

        /**
         * Get all choices from choices[0] who are currently paired with a given key from choices[1]
         * @param {String} yKey
         * @returns {choice[]}
         */
        getChoicesPairedWithKey(yKey) {
            const choicesPresent = choices[0].filter(choice => this.areKeysPaired(choice.key, yKey));
            return choicesPresent;
        },

        /**
         * Get the empty item placeholders to render in a bucket
         * @param {choice} bucket
         * @param {String} bucket.key
         * @param {Number} bucket.matchMax
         * @returns {choice[]}
         */
        getPlaceholderChoices({ key, matchMax = 0 }) {
            const choicesAbsent = choices[0].filter(choice => !this.areKeysPaired(choice.key, key));
            if (matchMax > 0) {
                const membersAmount = this.getChoiceYUsageCount(key);
                const placeholdersAmount = Math.max(0, matchMax - membersAmount);
                return choicesAbsent.slice(0, placeholdersAmount);
            }
            return choicesAbsent;
        },

        /**
         * Get all choices from choices[0], and sort to the top those who remain not all used
         * @param {Boolean} minify - remove all absent choices from list, except 1
         * @returns {choice[]}
         */
        getSortedUnusedChoices(minify = false) {
            const choicesPresent = choices[0].filter(choice => this.getChoiceXStackSize(choice.key) !== 0);
            let choicesAbsent = choices[0].filter(choice => this.getChoiceXStackSize(choice.key) === 0);
            //decreasing drop area size in choice list
            if (minify && choicesAbsent.length > 1) {
                choicesAbsent = choicesAbsent.pop();
            }
            return choicesPresent.concat(choicesAbsent);
        },

        /**
         * Count choiceX usage in pairs
         * @param {String} xKey
         * @returns {Number}
         */
        getChoiceXUsageCount(xKey) {
            return this.pairs.filter(pair => pair[0] === xKey).length;
        },

        /**
         * Count choiceY usage in pairs
         * @param {String} yKey
         * @returns {Number}
         */
        getChoiceYUsageCount(yKey) {
            return this.pairs.filter(pair => pair[1] === yKey).length;
        },

        /**
         * Get the number of copies of a choice remaining in choices list ("Set A")
         * @param {String} xKey
         * @returns {Number}
         */
        getChoiceXStackSize(xKey) {
            const thisChoice = choices[0].find(choice => choice.key === xKey);
            if (thisChoice.matchMax === 0) {
                return -1; // unlimited stack
            }
            return thisChoice.matchMax - this.getChoiceXUsageCount(thisChoice.key);
        },

        /**
         * Count total items remaining in choices list ("Set A")
         * @returns {Number}
         */
        getChoicesPresentItemCount() {
            return choices[0].reduce((count, choice) => {
                if (choice.matchMax === 0 || choice.matchMax > this.getChoiceXUsageCount(choice.key)) {
                    return count + 1;
                }
                return count;
            }, 0);
        },

        /**
         * Check if keys x (from "Set A") and y (from "Set B") have been connected as a pair
         * @param {String} xKey
         * @param {String} yKey
         * @returns {Boolean} true if pair exists
         */
        areKeysPaired(xKey, yKey) {
            return Boolean(this.pairs.find(pair => pair[0] === xKey && pair[1] === yKey));
        },

        /**
         * Check if a bucket (yKey) can receive a choice (xKey) based on capacity and current pairs
         * @param {String} xKey
         * @param {String} yKey
         * @returns {Boolean} true if can receive
         */
        canReceiveChoice(xKey, yKey) {
            const bucket = choices[1].find(choice => choice.key === yKey);
            const full = bucket.matchMax > 0 && this.getChoiceYUsageCount(yKey) >= bucket.matchMax;
            return !full && !this.areKeysPaired(xKey, yKey);
        },

        /**
         * Check if the given bucket (entry in "Set B") is valid according to its own constraints
         * @param {choice} bucket
         * @param {String} bucket.key
         * @param {Number} bucket.matchMax
         * @param {Number} bucket.matchMin
         * @returns {Boolean} true if valid
         */
        isValidBucket({ key, matchMax, matchMin }) {
            const members = this.getChoiceYUsageCount(key);
            const tooMany = matchMax > 0 && members > matchMax;
            const tooFew = matchMin > 0 && members < matchMin;
            return !tooMany && !tooFew;
        }
    };
}
