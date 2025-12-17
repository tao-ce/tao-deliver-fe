<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;

    import { createEventDispatcher } from 'svelte';
    import { __, generateElementId, getActualKey } from '@oat-sa-private/ui-core';
    import { Icon } from '@oat-sa-private/ui-elements';
    import ItemBlocks from '../../item/blocks/ItemBlocks.svelte';
    import Localize from '../Localize.svelte';

    export let choices;
    export let firstColumnHeader = '';
    export let isHiddenHeader;
    export let disabled;
    export let pairs;
    export let prompt;
    export let instructionsLang;
    export let maxAssociations;
    export let boldTableHeader;

    const dispatch = createEventDispatcher();
    const elementId = generateElementId('tabularMatch');

    // Radio buttons should be grouped by column
    const isRadioX = !choices[0].find(choice => choice.matchMax !== 1);
    // Radio buttons should be grouped by row
    const isRadioY = !choices[1].find(choice => choice.matchMax !== 1);
    // Radio buttons should be used
    const isRadio = isRadioX || isRadioY;

    /**
     * It is an array, but it can have 1 or 2 dimensions.
     * x is always index of first choice set (choices[0]) and y is index of second choice set (choices[1])
     * Radio button mode:
     *   X axis: matches[x] = y
     *   Y axis: matches[y] = x
     * Checkbox mode (!Radio mode):
     *   matches[x][y] = true/false
     */
    let matches;
    updateMatchesFromPairs(pairs); // this call is necessary to have initial values in matches

    $: updateMatchesFromPairs(pairs); // update matches if pairs are changed

    /**
     * Convert 2 dimensions match array to pairs of choice key
     * @param {boolean[][]} matrix matches
     * @returns {[string, string][]} - pairs of choice key
     */
    function convertMatchMatrixToPairs(matrix) {
        return matrix.reduce((result, rows, x) => {
            rows.forEach((match, y) => {
                if (match) {
                    result.push([choices[0][x].key, choices[1][y].key]);
                }
            });

            return result;
        }, []);
    }

    /**
     * Convert 1 dimension match array to pairs of choice key
     * Index of matchArray is the index of one of the choice set (radioX -> choice[0], radioY -> choice[1])
     * Value of matchArray is the index of the other choice set (radioX -> choice[1], radioY -> choice[0])
     * @param {number[]} matchArray list of matched choices
     * @returns {[string, string][]} - pairs of choice key
     */
    function convertMatchArrayToPairs(matchArray) {
        return matchArray.reduce((result, match, i) => {
            if (typeof match !== 'undefined' && match !== null) {
                if (isRadioX) {
                    result.push([choices[0][i].key, choices[1][match].key]);
                } else {
                    result.push([choices[0][match].key, choices[1][i].key]);
                }
            }

            return result;
        }, []);
    }

    /**
     * Convert pairs to 1 dimension match array
     * @param {[string, string][]}  matchPairs choice pairs
     * @returns {number[]} - match array
     */
    function convertPairsToMatchArray(matchPairs) {
        const result = [];

        matchPairs.forEach(match => {
            const x = choices[0].findIndex(choice => choice.key === match[0]);
            const y = choices[1].findIndex(choice => choice.key === match[1]);

            if (isRadioX) {
                result[x] = y;
            } else {
                result[y] = x;
            }
        });

        return result;
    }

    /**
     * Convert pairs to 2 dimension match array
     * @param {[string, string][]} matchPairs pairs
     * @returns {boolean[][]} - match matrix
     */
    function convertPairsToMatchMatrix(matchPairs) {
        const result = choices[0].map(() => choices[1].map(() => false));

        matchPairs.forEach(match => {
            const x = choices[0].findIndex(choice => choice.key === match[0]);
            const y = choices[1].findIndex(choice => choice.key === match[1]);
            result[x][y] = true;
        });

        return result;
    }

    /**
     * Update matches variable from the provided pairs array
     * @param {[string, string][]} matchPairs choice pairs
     */
    function updateMatchesFromPairs(matchPairs) {
        matches = isRadio ? convertPairsToMatchArray(matchPairs) : convertPairsToMatchMatrix(matchPairs);
    }

    /**
     * Handle click event on input container
     * @param {Event} e
     * @param {number} x index of choice in choices[0] set
     * @param {number} y index of choice in choices[1] set
     * @fires 'change'
     */
    function handleInputOnClick(e, x, y) {
        if (isRadioX && isRadioY) {
            if (matches[x] === y) {
                //uncheck this choice
                matches[x] = void 0;
            } else {
                //check this choice, uncheck others in this row & col;
                //  if maxAssociations === 1, uncheck all others
                for (const xi in matches) {
                    if (matches[xi] === y || maxAssociations === 1) {
                        matches[xi] = void 0;
                    }
                }
                matches[x] = y;
            }
            pairs = convertMatchArrayToPairs(matches);
        } else if (isRadioX) {
            matches[x] = matches[x] === y ? void 0 : y;
            pairs = convertMatchArrayToPairs(matches);
        } else if (isRadioY) {
            matches[y] = matches[y] === x ? void 0 : x;
            pairs = convertMatchArrayToPairs(matches);
        } else {
            const newValue = !matches[x][y];
            matches[x][y] = newValue;
            pairs = convertMatchMatrixToPairs(matches);
        }

        /* eslint-disable indent */
        dispatch('change', {
            type: e.type,
            target: e.target,
            qtiChoiceIdentifier: [choices[0][x].key, choices[1][y].key],
            pressedKey: e.key,
            position:
                e.type === 'click'
                    ? {
                          clientX: e.clientX,
                          clientY: e.clientY,
                          screenX: e.screenX,
                          screenY: e.screenY
                      }
                    : void 0
        });
        /* eslint-enable indent */
    }

    /**
     * Handle keydown event on input container
     * @param {KeyboardEvent} e
     * @param {number} x index of choice in choices[0] set
     * @param {number} y index of choice in choices[1] set
     */
    function handleKeyDown(e, x, y) {
        const pressedKey = getActualKey(e);
        switch (pressedKey) {
            case 'enter':
            case 'space':
                handleInputOnClick(e, x, y);
                break;
        }
    }
</script>

<style>
    .match-tabular {
        & table {
            border-bottom: solid var(--border-thin) var(--color-border-info);
            border-inline-end: solid var(--border-thin) var(--color-border-info);
            width: 100%;
            table-layout: fixed;
        }

        & th,
        & td {
            border: solid var(--border-thin) var(--color-border-info);
            height: 1px;
            min-height: 6rem;
        }

        & td {
            position: relative;
            padding: var(--space-1x);
            cursor: pointer;

            &:hover label,
            &:hover input:checked ~ label,
            & input:focus ~ label {
                background-color: var(--color-bg-active);
                & .control:before {
                    border-color: var(--color-border-active);
                }
            }
        }

        & th {
            text-align: center;
            background-color: var(--color-bg-table-heading);

            &.font-weight-normal {
                font-weight: normal;
            }

            &.header-y {
                text-align: start;
            }

            &.borderless {
                border: none;
                background-color: transparent;
            }
        }

        & .match-tabular-header-cell {
            padding: var(--space-1x5) var(--space-2x);
        }

        &.radio-x td {
            border-top: none;
            border-bottom: none;
        }

        &.radio-y td {
            border-left: none;
            border-right: none;
        }

        & input {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0;
        }

        & label {
            width: 100%;
            height: 100%;
            text-align: center;
            display: block;
            border-radius: var(--radius-large);
            cursor: pointer;
        }

        & :global(input:focus-visible ~ label) {
            outline: none;
            @add-mixin outline-focus-after 0.5rem;

            &::after {
                border-radius: var(--radius-large);
            }
        }

        & .control {
            /* The empty checkbox OR radio */
            &::before {
                content: '';
                display: block;
                position: absolute;
                border: solid var(--border-medium) var(--color-border-default);
                border-radius: var(--radius-medium);
                background-color: var(--color-bg-default);
                width: 2rem;
                height: 2rem;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
            }
        }

        /* The label surrounding the input */
        & input:checked ~ label {
            background-color: var(--color-bg-selected);

            & .control {
                color: var(--color-border-selected);

                &:before {
                    border-color: var(--color-border-selected);
                }
            }
        }

        &:not(.radio) {
            & .control {
                /* The checkbox check (when hidden) */
                & :global(svg) {
                    display: none;
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: 1.5rem;
                    height: 1.5rem;
                    z-index: 10;
                    color: var(--color-bg-selected);
                }
            }
            & input:checked ~ label .control {
                & :global(svg) {
                    display: block;
                }
            }
        }

        &.radio {
            /* The empty radio button */
            & .control:before {
                border-radius: var(--radius-circular);
            }

            /* The small circle inside a selected radio */
            & input:checked ~ label .control:after {
                content: '';
                display: block;
                position: absolute;
                background-color: var(--color-bg-selected);
                border: solid var(--border-thin) var(--color-bg-default);
                border-radius: var(--radius-circular);
                width: 1rem;
                height: 1rem;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
        }

        /* Reset fieldset styles */
        & :global(fieldset) {
            border: 0px transparent;
            margin: 0;
            padding: 0;
        }
    }

    /* Target only firefox and set label display to table to have full height */
    @media screen and (min--moz-device-pixel-ratio: 0) {
        .match-tabular {
            & label {
                display: table;
            }
        }
    }
</style>

<div class="match-tabular" class:radio={isRadio} class:radio-x={isRadioX} class:radio-y={isRadioY}>
    <fieldset>
        <legend class="visually-hidden">
            <ItemBlocks blockTree={prompt} />
        </legend>
        <table>
            <thead>
                <tr>
                    <th
                        class="borderless match-tabular-header-cell"
                        class:font-weight-normal={!boldTableHeader}
                        scope="col">
                        {isHiddenHeader ? '' : firstColumnHeader}
                    </th>
                    {#each choices[0] as choiceX (choiceX.key)}
                        <th class="match-tabular-header-cell" class:font-weight-normal={!boldTableHeader} scope="col">
                            <ItemBlocks blockTree={choiceX.blockTree} />
                        </th>
                    {/each}
                </tr>
            </thead>

            <tbody>
                {#each choices[1] as choiceY, y (choiceY.key)}
                    <tr>
                        <th
                            class="header-y match-tabular-header-cell"
                            class:font-weight-normal={!boldTableHeader}
                            scope="row">
                            <ItemBlocks blockTree={choiceY.blockTree} />
                        </th>
                        {#each choices[0] as choiceX, x (choiceX.key)}
                            <td on:keydown={e => handleKeyDown(e, x, y)} on:click={e => handleInputOnClick(e, x, y)}>
                                {#if isRadioX}
                                    <input
                                        id={`${elementId}_${x}_${y}`}
                                        data-test-id={`tabular_match_${x}_${y}`}
                                        type="radio"
                                        name={`${elementId}_${x}`}
                                        value={y}
                                        aria-labelledby={`${elementId}_${x}_${y}_label`}
                                        bind:group={matches[x]}
                                        on:keyup|preventDefault
                                        {disabled} />
                                {:else if isRadioY}
                                    <input
                                        id={`${elementId}_${x}_${y}`}
                                        data-test-id={`tabular_match_${x}_${y}`}
                                        type="radio"
                                        name={`${elementId}_${y}`}
                                        value={x}
                                        aria-labelledby={`${elementId}_${x}_${y}_label`}
                                        bind:group={matches[y]}
                                        on:keyup|preventDefault
                                        {disabled} />
                                {:else}
                                    <input
                                        id={`${elementId}_${x}_${y}`}
                                        data-test-id={`tabular_match_${x}_${y}`}
                                        type="checkbox"
                                        checked={matches[x][y]}
                                        aria-labelledby={`${elementId}_${x}_${y}_label`}
                                        on:keyup|preventDefault
                                        {disabled} />
                                {/if}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <label for={`${elementId}_${x}_${y}`} on:click|preventDefault>
                                    <div class="control">
                                        {#if !isRadio}
                                            <Icon name="checkbox-check-16" ariaHidden={true} />
                                        {/if}
                                    </div>
                                </label>
                                <span class="hidden" id={`${elementId}_${x}_${y}_label`}>
                                    <Localize
                                        value={{
                                            text: __('%s matches %s'),
                                            params: [choices[0][x].content, choices[1][y].content]
                                        }}
                                        let:content={localizedContent}
                                        lang={instructionsLang}>
                                        {@html localizedContent}
                                    </Localize>
                                </span>
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </fieldset>
</div>
