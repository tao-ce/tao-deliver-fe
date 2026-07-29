<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;

    /**
     * Component is used to show navigation feedback dialog. All configuration is passed to it from outside.
     * Doesn't control opened/closed state, so it should be mounted/unmounted when it needs to be opened/closed.
     * @property {HTMLElement?} callerElement - position dialog against this element
     * @property {String?} anchoring - position dialog relative to which of callerElement's corners ('top left', 'bottom right')
     * @property {Object} config - content of dialog
     * @property {String} [config.heading] - heading text
     * @property {String|String[]} [config.message] - message text
     * @property {Object[]} config.buttons - array of button objects in format expected by ModalDialog component
     * @fires 'done' event containing 'action' string: it represents the result of dialog call
     */
    import { createEventDispatcher } from 'svelte';
    import { ModalDialog } from '@oat-sa-private/ui-components';
    import { actions } from './navigationFeedbackConfigs.js';

    const dispatch = createEventDispatcher();

    export let callerElement;
    export let anchoring;
    export let config = {
        buttons: []
    };

    //don't dispatch ModalDialog's 'close' event if button was clicked
    $: buttons = config.buttons.map(btn => Object.assign({}, btn, { autoClose: false }));

    /**
     * Handle dialog button click
     * @param {CustomEvent} e
     * @fires done with action attached to button
     */
    function handleAction(e) {
        dispatch('done', { action: e.detail.key });
    }
    /**
     * Handle dialog close by ESC key or by overlay click
     * @fires done with default cancel action
     */
    function handleClose() {
        dispatch('done', { action: actions.cancel });
    }
</script>

<ModalDialog
    open={true}
    heading={config.heading}
    message={config.message}
    {buttons}
    disableClosing={buttons.length === 1 || config.type === 'timeout'}
    disableEscape={buttons.length === 1 || config.type === 'timeout'}
    caller={callerElement}
    {anchoring}
    on:close={handleClose}
    on:action={handleAction} />
