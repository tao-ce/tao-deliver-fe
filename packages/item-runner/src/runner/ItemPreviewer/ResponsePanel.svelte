<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;

    import { Button } from '@oat-sa-private/ui-elements';
    import { __ } from '@oat-sa-private/ui-core';
    import { createEventDispatcher, tick } from 'svelte';

    export let responses;

    let listContainer;

    //scroll to bottom once the result array is updated
    $: if (responses) {
        tick().then(scrollToBottom);
    }

    /**
     * Scrolls list container to the bottom to show the newest response
     */
    function scrollToBottom() {
        listContainer.scroll({ top: listContainer.scrollHeight });
    }

    const dispatch = createEventDispatcher();
    function handleSubmit() {
        dispatch('submit');
    }
</script>

<style>
    .response-panel {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        overflow: hidden;
    }

    .submit-response-container {
        flex: 9rem 0 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .responses-container {
        height: 100%;
        overflow: auto;
        display: flex;
        flex-direction: column;

        & ul {
            margin: 0;
            padding: 0;
            display: flex;
            flex: 1 1 0;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-end;

            & li:nth-child(odd) {
                background-color: var(--color-gs-dark-alternative-bg);
            }

            & li {
                padding: var(--space-2x) var(--space-2x5);
                list-style: none;
                font-size: var(--fontsize-body-s);
                display: flex;
                flex-direction: column;
                align-items: stretch;
                gap: var(--space-1x);

                & .response-entry {
                    flex: 2.5rem 1 0;
                    font-weight: 700;
                    display: flex;
                    flex-wrap: wrap;
                    gap: var(--space-1x);
                }

                & .response-label {
                    font-weight: 400;
                }

                & .score {
                    letter-spacing: var(--space-half);
                }
            }
        }
    }

    @media only screen and (--mq-maxwidth-large) {
        .response-panel {
            width: 100%;
            height: 39rem;
        }
    }
</style>

<div class="response-panel inverted">
    <div class="responses-container" bind:this={listContainer}>
        <ul>
            {#each responses as response (response.submitId)}
                <li>
                    {#each response.itemResponses as interactionResponse}
                        <div class="response-entry">
                            <div class="response-label">{interactionResponse.identifier}:</div>
                            <div>{interactionResponse.responseData}</div>
                        </div>
                    {/each}
                    <div class="response-entry">
                        <div class="response-label">{__('Item score: ')}</div>
                        <div class="score">{response.score}/{response.maxScore}</div>
                    </div>
                </li>
            {/each}
        </ul>
    </div>
    <div class="submit-response-container">
        <Button
            label={__('SUBMIT RESPONSE')}
            name={__('SUBMIT RESPONSE')}
            type="button"
            shape="pill"
            size="small"
            inverted="true"
            dataTestId="submit-response"
            on:click={handleSubmit} />
    </div>
</div>
