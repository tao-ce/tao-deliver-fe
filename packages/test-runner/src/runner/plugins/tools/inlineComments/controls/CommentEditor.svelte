<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;
    import { __, focusTrap, getActualKey } from '@oat-sa-private/ui-core';
    import { createEventDispatcher } from 'svelte';
    import { Button, ButtonLink, Textarea } from '@oat-sa-private/ui-elements';
    import { Loading, Notification, DraggableModal } from '@oat-sa-private/ui-components';
    /**
     * Inline Popup component for commenting on text
     * @property {Boolean} isEditorOpen - for Flyout, which will accept either type (anything having getBoundingClientRect)
     * @property {number?} clientX - mouse event coords, if editor is opened with mouse click; empty if with keyboard
     * @property {number?} clientY - mouse event coords, if editor is opened with mouse click; empty if with keyboard
     * @property {string} commentValue - set as editable text
     * @property {object} notificationProps - { title: string, message: string, hierarchy: string } displayed and alerted to user if set
     * @property {Boolean} disabled - applies to all form elements
     * @property {Boolean} submitting - makes loading spinner show
     */
    export let isEditorOpen;
    export let clientX;
    export let clientY;
    export let commentValue = '';
    export let notificationProps;
    export let disabled = false;
    export let submitting = false;

    const maxlength = 10000; //just a sanity check

    const dispatch = createEventDispatcher();

    let containerElt;
    let needsFocus = false;
    let hasChanges = false;
    let internalComment;

    let modalX;
    let modalY;

    const modalMinHeight = 277;
    const modalWidth = 422; // rem to px converter
    const modalMouseEventOffsetX = 8;
    const modalMouseEventOffsetY = 8;
    const modalScreenBorderOffset = 16;
    //careful with reactiveness!
    $: if (isEditorOpen) {
        internalComment = commentValue || '';
        hasChanges = false;
        setModalXY();
    }
    // Best UX is when focus goes into the textarea ASAP
    $: containerElt && needsFocus && focusField();

    function setModalXY() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        if (typeof clientX === 'number' && typeof clientY === 'number') {
            modalX = Math.max(
                Math.min(clientX + modalMouseEventOffsetX, windowWidth - modalWidth - modalScreenBorderOffset),
                modalScreenBorderOffset
            );
            modalY = Math.max(
                Math.min(clientY + modalMouseEventOffsetY, windowHeight - modalMinHeight - modalScreenBorderOffset),
                modalScreenBorderOffset
            );
        } else {
            modalX = Math.trunc((windowWidth - modalWidth) / 2);
            modalY = Math.trunc((windowHeight - modalMinHeight) / 2);
        }
    }

    /**
     * Focus on the text input immediately (or after reactive update)
     */
    export function focusField() {
        needsFocus = true;
        if (containerElt) {
            containerElt.querySelector('textarea')?.focus({ preventScroll: true });
            needsFocus = false;
        }
    }

    function handleChange(e) {
        internalComment = e.detail.value;
        hasChanges = (commentValue || '') !== internalComment.trim();
        dispatch('change', { hasChanges });
    }

    /**
     * Handle click of "Save" button.
     * In case handling it is asynchronous, consumer can do 3 steps:
     * - Set disabled & submitting props
     * - Save or delete data
     * - Reset props when saving is completed. Can also set the error message to be shown.
     * @param {CustomEvent} e
     * @fires 'save'
     * @fires 'delete'
     * @fires 'close'
     */
    function handleSave(e) {
        const { event } = e.detail;
        event.preventDefault(); //submit

        if (disabled) {
            return;
        }
        notificationProps = null;
        if (internalComment.trim()) {
            // create or update value
            dispatch('save', { commentValue: internalComment.trim() });
        } else {
            if (commentValue) {
                // edited to empty value = delete
                dispatch('delete', {});
            } else {
                // no printable characters added = ignore
                dispatch('close', {});
            }
        }
    }

    function handleDeleteClick(e) {
        //don't redirect to `href="#"`
        e.preventDefault();
        handleDelete();
    }

    function handleDeleteKeypress(e) {
        const key = getActualKey(e);
        if (key === 'enter' || key === 'space') {
            handleDelete();
            if (key === 'space') {
                e.preventDefault(); // don't scroll page
            }
        }
    }

    function handleDelete() {
        if (disabled) {
            return;
        }
        notificationProps = null;
        dispatch('delete', {});
    }

    function handleCancel() {
        if (disabled) {
            return;
        }
        notificationProps = null;
        dispatch('close', {});
    }
</script>

<style>
    .comment-editor {
        padding: 2.5rem;
        height: 100%;
        display: flex;
        flex-direction: column;
        flex: 1;
        margin: 0;
        resize: both;
        box-sizing: border-box;

        & :global(label) {
            flex: 1;
        }

        & :global(.positioning-wrapper) {
            height: 100%;
            padding-bottom: 3rem;
        }

        & :global(.notification-wrapper + label) {
            margin-top: 1rem;
        }

        & :global(textarea:read-only) {
            background: var(--color-gs-light-alternative-bg);
        }

        & :global(textarea) {
            width: 100%;
            height: 100%;
            min-height: 109px;
            resize: none;
            box-sizing: border-box;
            overflow-y: auto;
            outline: none;
        }

        & .comment-editor-actions {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            margin-top: auto;
            & .saving {
                order: -1;
                flex-grow: 1;
                display: inline-flex;
                align-items: center;

                /* smallest Loading spinner needs these tweaks to display its text */
                & :global(.loading-wrapper) {
                    flex-direction: row;
                    margin-inline: 1rem;

                    & :global(.content .text) {
                        opacity: 1;
                        transform: none;
                    }
                }
            }

            & > :global(a.button-link) {
                order: -1;
                flex-grow: 1;
                font-weight: bold;
            }
        }
    }
    .comment-highlight-editor-flyout :global(.flyout.flyout) {
        z-index: var(--layer-4);
    }
</style>

<div class="comment-highlight-editor-flyout">
    <!-- the #key block ensures that with each new isEditorOpen, the Flyout instantiates its Popper in the correct place -->
    {#if isEditorOpen}
        {#key isEditorOpen}
            <DraggableModal
                on:close={() => {
                    isEditorOpen = false;
                    dispatch('close', {});
                }}
                left={modalX}
                top={modalY}
                width={modalWidth}
                minHeight={modalMinHeight}
                trigger="manual"
                title={__('Edit feedback')}>
                <form class="comment-editor" bind:this={containerElt} use:focusTrap>
                    {#if notificationProps}
                        <Notification {...notificationProps} />
                    {/if}
                    <Textarea
                        value={internalComment}
                        fullwidth={true}
                        resizable="none"
                        readonly={disabled}
                        {maxlength}
                        on:change={handleChange} />
                    <div class="comment-editor-actions">
                        <Button
                            name="cancel-comment"
                            label={__('Cancel')}
                            shape="pill"
                            skin="secondary"
                            size="small"
                            {disabled}
                            on:click={handleCancel} />
                        <Button
                            name="save-comment"
                            label={__('Save')}
                            shape="pill"
                            skin="primary"
                            size="small"
                            type="submit"
                            disabled={!hasChanges || disabled}
                            on:click={handleSave} />
                        {#if submitting}
                            <span class="saving">
                                <Loading size="smallest" text={__('Saving...')} />
                            </span>
                        {:else if commentValue}
                            <ButtonLink
                                title={__('Delete feedback')}
                                {disabled}
                                on:click={handleDeleteClick}
                                on:keypress={handleDeleteKeypress} />
                        {/if}
                    </div>
                </form>
            </DraggableModal>
        {/key}
    {/if}
</div>
