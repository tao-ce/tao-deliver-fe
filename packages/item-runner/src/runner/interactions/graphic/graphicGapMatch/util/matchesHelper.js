// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Helper object that is responsible for updating & getting info on matches for GraphicGapMatch.
 * For update commands, need to add 'matches = matches' & 'storeResponse()' in svelte component.
 * @returns {Object}
 */
export default function matchesHelperFactory() {
    function addIfNotExists(choiceKey, gapKey, matches) {
        if (!matches.some(([cKey, gKey]) => cKey === choiceKey && gKey === gapKey)) {
            //it's important to add to the end of 'matches' array: when placing answers we rely on 'matches' keeping history, so that the latest added choice is on the bottom
            matches.push([choiceKey, gapKey]);
        }
    }
    function remove(choiceKey, gapKey, matches) {
        const matchIndex = matches.findIndex(([cKey, gKey]) => choiceKey === cKey && gapKey === gKey);
        matches.splice(matchIndex, 1);
    }

    return {
        /**
         * Swap choice/answer with another choice/answer
         * @param {String} sourceKey - choice key of choice/answer to move to new place
         * @param {String} [sourceGapKey] - gap key of answer to move to new place, empty for choice
         * @param {String} targetKey  - choice key of choice/answer to swap with
         * @param {String} [targetGapKey] - gap key of answer to swap with, empty for choice
         * @param {Array} matches
         * @returns {Array} matches - modified matches array
         */
        swap(sourceKey, sourceGapKey, targetKey, targetGapKey, matches) {
            if (!sourceGapKey && targetGapKey) {
                //choice to answer
                remove(targetKey, targetGapKey, matches);
                addIfNotExists(sourceKey, targetGapKey, matches);
            } else if (sourceGapKey && targetGapKey) {
                //answer to answer
                remove(targetKey, targetGapKey, matches);
                remove(sourceKey, sourceGapKey, matches);
                addIfNotExists(sourceKey, targetGapKey, matches);
                addIfNotExists(targetKey, sourceGapKey, matches);
            } else if (sourceGapKey && !targetGapKey) {
                //answer to choice
                remove(sourceKey, sourceGapKey, matches);
                addIfNotExists(targetKey, sourceGapKey, matches);
            }
            return matches;
        },
        /**
         * Add answer or move existing answer to another gap
         * @param {String} sourceKey - choice key of choice/answer to move to new place
         * @param {String} [sourceGapKey] - gap key of answer to move to new place, empty for choice
         * @param {String} targetGapKey - gap key to which to add/move our choice/answer
         * @param {Array} matches
         * @returns {Array} matches - modified matches array
         */
        addOrMove(sourceKey, sourceGapKey, targetGapKey, matches) {
            if (sourceGapKey) {
                remove(sourceKey, sourceGapKey, matches);
            }
            addIfNotExists(sourceKey, targetGapKey, matches);
            return matches;
        },
        /**
         * Remove answer
         * @param {String} choiceKey - choice key of answer to remove
         * @param {String} gapKey - gap key of answer to remove
         * @param {Array} matches
         * @returns {Array} matches - modified matches array
         */
        remove(choiceKey, gapKey, matches) {
            remove(choiceKey, gapKey, matches);
            return matches;
        },
        /**
         * Get how many matches are made with this gap
         * @param {String} gapKey
         * @param {Array} matches
         * @returns {Number} gapUsageCount
         */
        getGapUsageCount(gapKey, matches) {
            return matches.filter(([, gKey]) => gapKey === gKey).length;
        },
        /**
         * Get if new matches can still be made for this gap
         * @param {String} gapKey
         * @param {Array} matches
         * @param {Object[]} gaps
         * @returns {Number}
         */
        isGapFree(gapKey, matches, gaps) {
            const gap = gaps.find(g => g.key === gapKey);
            const gapRemainingAmount = gap.matchMax > 0 ? gap.matchMax - this.getGapUsageCount(gap.key, matches) : -1;
            return gapRemainingAmount !== 0;
        },
        /**
         * Get if there's already a match made with this choice & gap
         * @param {String} gapKey
         * @param {String} choiceKey
         * @param {Array} matches
         * @returns {Number}
         */
        isGapUsedByChoice(gapKey, choiceKey, matches) {
            return matches.some(([cKey, gKey]) => gKey === gapKey && cKey === choiceKey);
        },
        /**
         * Get how many matches are made with this choice
         * @param {String} choiceKey
         * @param {Array} matches
         * @returns {Number} choiceUsageCount
         */
        getChoiceUsageCount(choiceKey, matches) {
            return matches.filter(([cKey]) => choiceKey === cKey).length;
        },
        /**
         * Get how many matches can still be made with this choice
         * @param {Object} choice
         * @param {Array} matches
         * @returns {Number} choiceRemainingAmount
         */
        getChoiceRemainingAmount(choice, matches) {
            return choice.matchMax > 0 ? choice.matchMax - this.getChoiceUsageCount(choice.key, matches) : -1;
        }
    };
}
