// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { writable } from 'svelte/store';
import { generateElementId } from '@oat-sa-private/ui-core';

/**
 * Share data between interaction and interaction's children
 * @returns {SvelteStore}
 */
export default function createStateStore() {
    const defaultState = {
        selected: [], //must not be used to store values directly, just sync with 'interactionStateStore'.
        selectedGaps: [], // collect gap ids which is filled. Filtered from 'selected' property
        selectedChoices: {}, // {choiceid: choicesNumber}. Choices can be used more than 1 time, so store with counter. Filtered from 'selected' property
        draggableGroupKey: generateElementId('gapMatchInteraction'),
        ariaDescribedByContainerIdForUnselectedOptions: generateElementId('ariaDescribedBy'),
        ariaDescribedByContainerIdForEmptyGap: generateElementId('ariaDescribedBy'),
        ariaDescribedByContainerIdForMatchedGap: generateElementId('ariaDescribedBy'),
        confirmation: '',
        gapsNumber: 0,
        gapRequiredAttribute: {}, // store 'required' attribute of gap
        firstChoice: null, // contains id of first choice in answer area from tor
        disabled: false,
        isDragging: false,
        gapDimensions: {}
    };

    const { subscribe, update, set } = writable({});

    return {
        subscribe,
        init: data => set(Object.assign({}, data, defaultState)),
        setSelected: selected =>
            update(store => {
                if (!selected || selected.length === 0) {
                    return Object.assign(store, {
                        selected: defaultState.selected,
                        selectedGaps: defaultState.selectedGaps,
                        selectedChoices: defaultState.selectedChoices
                    });
                }
                const formattedPairs = [];
                const selectedChoices = {};
                const selectedGaps = [];
                if (typeof selected[0] === 'string') {
                    formattedPairs.push({ choiceId: selected[0], gapId: selected[1] });
                    selectedChoices[selected[0]] = 1;
                    selectedGaps.push(selected[1]);
                } else {
                    selected.forEach(pair => {
                        formattedPairs.push({ choiceId: pair[0], gapId: pair[1] });
                        selectedGaps.push(pair[1]);
                        if (selectedChoices[pair[0]]) {
                            selectedChoices[pair[0]] += 1;
                        } else {
                            selectedChoices[pair[0]] = 1;
                        }
                    });
                }

                // We allow in store update only selected choices
                return Object.assign(store, {
                    selected: formattedPairs,
                    selectedGaps,
                    selectedChoices
                });
            }),
        addGap: () =>
            update(store => {
                store.gapsNumber += 1;
                return store;
            }),
        setConfirmation: message =>
            update(store => {
                store.confirmation = message;
                return store;
            }),
        setDisabledState: disabled =>
            update(store => {
                store.disabled = disabled;
                return store;
            }),
        addGapRequireAttribute: ({ identifier, required }) =>
            update(store => {
                store.gapRequiredAttribute[identifier] = required;
                return store;
            }),
        setChoiceZeroIndex: choiceId =>
            update(store => {
                store.firstChoice = choiceId;
                return store;
            }),
        setDragging: state =>
            update(store => {
                store.isDragging = state;
                return store;
            }),
        setGapDimensions: (width, height) =>
            update(store => {
                store.gapDimensions = { width, height };
                return store;
            })
    };
}
