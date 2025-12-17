// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { writable, get } from 'svelte/store';
import { getItemStateStore } from './itemsStateStore.js';

//keep settings stores by item
const sequentialInteractionsStores = new Map();

/**
 * This factory creates a sequence manager with an API.
 * It is used when an item has interactions which must be started one after another (e.g. with conditions or delays):
 *   1. all sequential interactions register themselves in order
 *   2. first interaction calls start() on this API (OR: Item calls start())
 *   3.   currentResponseIdentifier value is now the first interaction's
 *   4. later, first interaction calls finish() on this API, which advances the internal pointer
 *   5.   currentResponseIdentifier value is now the second interaction's
 *   6. second interaction, observing this, can run its start code
 *   ...
 * To skip an interaction from the sequence based on some condition,
 * that interaction should call finish() as soon as its responseIdentifier is set.
 *
 * The sequence state is also saved to and restored from the parent item's itemState.
 *
 * @param {String} itemIdentifier
 * @returns {Observable} Store API, with subscribe and other methods
 */
export function getItemSequentialInteractionsStore(itemIdentifier) {
    if (!itemIdentifier) {
        throw new TypeError(`An "itemIdentifier" is required to get the items' sequential interactions store`);
    }

    if (sequentialInteractionsStores.has(itemIdentifier)) {
        return sequentialInteractionsStores.get(itemIdentifier);
    }

    const itemStateStore = getItemStateStore(itemIdentifier);

    // each item can only have a single sequence, so the key doesn't need to be unique
    const stateKey = 'interaction_sequence';

    // Array of responseIdentifiers
    let sequence = [];

    const currentResponseIdentifier = writable(null);
    let completedTimes = 0;

    /**
     * Check itemStateStore for previous saved sequence state
     */
    function loadState() {
        const initialSequenceState = itemStateStore.getItemElementState(stateKey) || {};
        currentResponseIdentifier.set(initialSequenceState.currentResponseIdentifier || null);
        completedTimes = initialSequenceState.completedTimes || 0;
    }

    loadState();

    /**
     * Save sequence state (current responseIdentifier) to itemStateStore
     */
    function saveState() {
        const sequenceState = {
            currentResponseIdentifier: get(currentResponseIdentifier),
            completedTimes
        };
        itemStateStore.setItemElementState(stateKey, sequenceState);
    }

    const sequentialInteractionsStore = {
        loadState,

        saveState,

        currentResponseIdentifier,

        get completedTimes() {
            return completedTimes;
        },

        // controlled by sequence interactions - but should be reset on each item load
        didStart: false,

        /**
         * Get the length of the sequence
         * @returns {Number}
         */
        get length() {
            return sequence.length;
        },

        /**
         * Register an interaction to the sequence
         * @param {String} responseIdentifier
         */
        register(responseIdentifier) {
            if (sequence.includes(responseIdentifier)) {
                throw new Error(`responseIdentifier '${responseIdentifier}' was already registered`);
            }
            sequence.push(responseIdentifier);
        },

        /**
         * Trigger start for a sequence entry
         * @param {String} responseIdentifier
         */
        start(responseIdentifier) {
            if (sequence.includes(responseIdentifier)) {
                // case 1: start at a known interaction
                currentResponseIdentifier.set(responseIdentifier);
            } else {
                // case 2: force-start sequence from beginning
                if (sequence.length && get(currentResponseIdentifier) === null) {
                    currentResponseIdentifier.set(sequence[0]);
                }
            }
            saveState();
        },

        /**
         * Trigger finish for a sequence entry
         * Advances sequence to next interaction
         * @param {String} responseIdentifier
         */
        finish(responseIdentifier) {
            if (sequence.includes(responseIdentifier) && get(currentResponseIdentifier) === responseIdentifier) {
                // move stored currentResponseIdentifier to next in sequence
                let currentIndex = sequence.indexOf(responseIdentifier);
                if (++currentIndex < sequence.length) {
                    const newResponseIdentifier = sequence[currentIndex];
                    this.start(newResponseIdentifier);
                } else {
                    currentResponseIdentifier.set(null);
                    completedTimes++;
                    saveState();
                }
            }
        },

        /**
         * Clear sequence entries
         */
        clear() {
            sequence = [];
            currentResponseIdentifier.set(null);
            this.didStart = false;
        }
    };

    sequentialInteractionsStores.set(itemIdentifier, sequentialInteractionsStore);

    return sequentialInteractionsStore;
}

/**
 * Release the store for this item so next time you'll get a new one.
 * @param {string} itemIdentifier
 */
export function releaseItemSequentialInteractionsStore(itemIdentifier) {
    if (itemIdentifier && sequentialInteractionsStores.has(itemIdentifier)) {
        sequentialInteractionsStores.delete(itemIdentifier);
    }
}
