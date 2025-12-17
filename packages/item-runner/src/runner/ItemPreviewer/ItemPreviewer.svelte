<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;

    import Item from '../item/Item.svelte';
    import ResponsePanel from './ResponsePanel.svelte';
    import PreviewerHeaderBar from './PreviewerHeaderBar.svelte';
    import { createEventDispatcher } from 'svelte';
    import request from 'core/fetchRequest';
    import { getItemStateStore } from '../itemsStateStore.js';
    import prettyPrint from '../helpers/prettyPrint.js';

    export let options = { itemRunnerConfig: { previewerMode: { submitResponseUrl: '' } } };

    export let itemIdentifier;

    export let itemTitle;

    //svelte binding to item component
    let itemComponent;
    let responses = [];

    let showResponsePanel = false;

    const dispatch = createEventDispatcher();

    const { submitResponseUrl } = options.itemRunnerConfig.previewerMode;

    const stateStore = getItemStateStore(itemIdentifier);

    /**
     * Emits `ready` event
     * @param {CustomEvent} e
     * @emits CustomEvent
     */
    function forwardReadyEvent(e) {
        dispatch('ready', e.detail);
    }

    /**
     * Emits `error` event
     * @param {CustomEvent} e
     * @emits CustomEvent
     */
    function forwardErrorEvent(e) {
        dispatch('error', e.detail);
    }

    /**
     * Emits `close` event
     * @param {CustomEvent} e
     * @emits CustomEvent
     */
    function forwardCloseEvent(e) {
        dispatch('close', e.detail);
    }

    /**
     * Gets the responses object from itemComponent
     * @returns {object|void} item responses object
     */
    function getItemResponses() {
        if (itemComponent && itemComponent.trigger) {
            itemComponent.trigger('stateupdate');
        }
        if (stateStore) {
            return stateStore.getItemResponses();
        }
    }

    /**
     * Updates responses object used by responses panel with score data
     * @param {string} submitId
     * @param {object} scoreResponse submitItem response object.
     *  Response structures:
     * - scoring mode: outcomeDeclaration with SCORE and MAXSCORE
     * - no scoring: display 0 as the fallback
     */
    function updateResponses(submitId, scoreResponse) {
        const currentResponse = responses.find(response => response.submitId === submitId);
        currentResponse.score = getScore(scoreResponse, 'SCORE') || 0;
        currentResponse.maxScore = getScore(scoreResponse, 'MAXSCORE') || 0;
        responses = responses;
    }

    /**
     * Returns score value
     * @param {object} response response object
     * @param {string} scoreType SCORE / MAXSCORE
     * @returns {number|undefined} value of score
     */
    function getScore(response, scoreType) {
        let result;
        if (
            response &&
            response.itemSession &&
            response.itemSession[scoreType] &&
            response.itemSession[scoreType].base
        ) {
            result = response.itemSession[scoreType].base.float;
        }
        return result;
    }

    /**
     * Format response data for ResponsePanel
     * @param {object} itemResponses
     * @returns {object[]} array of responses
     */
    function formatItemResponses(itemResponses) {
        const responseIds = Object.keys(itemResponses);
        return responseIds.map(responseId => ({
            identifier: responseId,
            responseData: prettyPrint(itemResponses[responseId])
        }));
    }

    /**
     * Sends post request to submitResponse endpoint
     */
    function submitItemResponse() {
        const submitId = Symbol('submitId');
        const itemResponses = getItemResponses();

        responses.push({
            submitId,
            itemResponses: formatItemResponses(itemResponses),
            score: null,
            maxScrore: null
        });

        const params = new URLSearchParams();
        params.set('itemResponse', JSON.stringify(itemResponses));

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: params
        };

        request(submitResponseUrl, requestOptions).then(response => {
            updateResponses(submitId, response);
        });
    }

    /**
     * Update the response panel visibility
     */
    function handleToggleResponsePanel() {
        showResponsePanel = !showResponsePanel;
    }
</script>

<style>
    .item-previewer-wrapper {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    .item-preview-header {
        height: 7rem;
        flex-grow: 0;
        flex-shrink: 0;
    }

    .item-preview-body {
        display: flex;
        flex-direction: row-reverse;
        flex-grow: 1;
        align-items: stretch;
        overflow: hidden;
    }

    .item-preview-container {
        display: initial;
        flex-grow: 1;
        background-color: var(--color-bg-default);
        align-items: stretch;
        overflow: scroll;
    }

    .response-panel-container {
        flex: 41.5rem 0 0;
    }

    .hidden {
        display: none;
    }

    :global(.item-preview-container .qti-item) {
        margin: 0 auto;
    }

    @media only screen and (--mq-maxwidth-large) {
        .item-preview-body {
            flex-direction: column-reverse;
            align-items: stretch;
        }

        .item-preview-container {
            flex-grow: 1;
        }

        .response-panel-container {
            height: 39rem 0 0;
        }
    }
</style>

<div class="item-previewer-wrapper">
    <div class="item-preview-header inverted">
        <PreviewerHeaderBar
            {showResponsePanel}
            {itemTitle}
            on:toggleResponsePanel={handleToggleResponsePanel}
            on:close={forwardCloseEvent} />
    </div>

    <div class="item-preview-body">
        <div class="response-panel-container" class:hidden={!showResponsePanel}>
            <ResponsePanel {responses} on:submit={submitItemResponse} />
        </div>
        <div class="item-preview-container">
            <Item {...$$props} on:error={forwardErrorEvent} on:ready={forwardReadyEvent} bind:this={itemComponent} />
        </div>
    </div>
</div>
