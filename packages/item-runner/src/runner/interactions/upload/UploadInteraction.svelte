<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2025 (original work) Open Assessment Technologies SA ;
    import { getContext, onDestroy } from 'svelte';
    import { FileSelect, Loading } from '@oat-sa-private/ui-components';
    import { __, generateElementId } from '@oat-sa-private/ui-core';
    import Prompt from '../Prompt.svelte';
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { getItemPendingOperationsStore } from '../../itemsPendingOperationsStore.js';
    import { compareResponseValues } from './responseFileFormatHelper.js';
    import {
        uploadServiceStatuses,
        defaultGetAttachmentsUploadData,
        attachmentsServiceFactory
    } from '../../services/upload/attachmentsService.js';
    import { getFile, getLink } from '../../services/upload/util.js';
    import UploadProgress from '../../services/upload/UploadProgress.svelte';
    import itemSessionStatus from '../../itemSessionStatus.js';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import { DeferredPromise } from '../util/promise.js';
    import AtomicAriaLive from '../AtomicAriaLive.svelte';

    const qtiClass = 'qti-uploadInteraction';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    export let disabled = false;

    // interaction-level QTI attributes:
    export let type; // mime type

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let classes = '';
    export let dir;

    // data attributes
    export let dataAttrs = {};

    export let prompt;

    //max allowed size in Bytes (1MB by default)
    export let maxSize = 1000 * 1000;

    //upload timeout config (5min by default)
    export let timeout = 5 * 60 * 1000;

    /**
     * The selected file
     * @type {File}
     */
    let value = null;

    /**
     * Displays a custom error message
     * @type {string}
     */
    let customValidity = '';

    /**
     * The FileSelect link
     * @type {string}
     */
    let link;

    let destroyed = false;

    // pendingOperationsStore entry (to prevent navigation away during uploading)
    const uploadKey = generateElementId('uploadKey');

    const itemContext = getContext(itemIdentifier);
    const logger = itemContext?.getLogger();
    const instructionsLang = itemContext?.getInstructionsLang();

    // aria live
    let ariaLiveAnnouncement = {};
    const ariaLiveContainerId = generateElementId('live');
    const ariaLiveStrings = Object.freeze({
        started: __('Upload started.'),
        completed: __('Upload completed.'),
        cancelled: __('Upload cancelled.'),
        reset: __('Response file cleared.')
    });

    //stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
    const pendingOperationsStore = getItemPendingOperationsStore(itemIdentifier);

    // Response format:
    const cardinality = 'single';
    let baseType = 'file';

    let notificationKeys = [];

    // prepare the attachmentsService to be used later
    const attachmentsService = attachmentsServiceFactory({
        getAttachmentsUploadData: itemContext?.getGetAttachmentsUploadData?.() || defaultGetAttachmentsUploadData,
        itemIdentifier,
        responseIdentifier,
        timeout
    });
    let uploadServiceStatus = uploadServiceStatuses.initial;

    const uploadStats = { bytesLoaded: 0, bytesTotal: 0 };

    // do initial response definition
    if (!interactionStateStore.hasResponse()) {
        storeResponse(null);
    }

    $: $interactionStateStore && loadResponse();

    $: isLoading = uploadServiceStatus === uploadServiceStatuses.loading;
    $: isUploading = uploadServiceStatus === uploadServiceStatuses.uploading;
    $: uploadServiceStatusDisabled = isLoading || isUploading;
    $: isDisabled = disabled || uploadServiceStatusDisabled || $itemSessionStatusStore === itemSessionStatus.closed;

    /**
     * Loads response from store and set value
     */
    function loadResponse() {
        if (interactionStateStore.getValidity() === false) {
            return;
        }

        let storedValue = interactionStateStore.getResponseValue();
        if (storedValue) {
            if (value === null && storedValue instanceof Promise) {
                //if the loaded response is resolving, we restore the local state
                //while the service finishes to upload the file.
                const { resolvingValue } = interactionStateStore.get();
                if (resolvingValue) {
                    value = resolvingValue;
                }
            }

            Promise.all([getLink(storedValue), getFile(storedValue)])
                .then(result => {
                    link = result[0];
                    value = result[1];
                })
                .catch(err => {
                    customValidity = __('Unable to access the uploaded file');
                    if (logger) {
                        logger.error(err);
                    }
                });
        }
    }

    /**
     * Format and store value in the interactionStateStore
     * @param {File} newValue
     * @param {boolean} validity
     */
    function storeResponse(newValue, validity) {
        const updateResponse = responseValue => {
            // We save in the state the local version while the service uploads it.
            // If the item is restored while uploading, the interaction can display the correct state.
            if (responseValue && responseValue instanceof Promise) {
                interactionStateStore.set({ qtiClass, resolvingValue: value });
            } else {
                interactionStateStore.set({ qtiClass });
            }

            interactionStateStore.setResponseValue(
                {
                    cardinality,
                    baseType,
                    value: responseValue
                },
                responseValue === null || validity
            );
        };

        if (newValue === null) {
            updateResponse(null);
            if (attachmentsService.uploadService) {
                attachmentsService.uploadService.cancel(); //we don't need to handle the promise
            }
        } else {
            let storedValue = interactionStateStore.getResponseValue();
            let storedValidity = interactionStateStore.getValidity();
            if (storedValidity !== validity || !compareResponseValues(storedValue, newValue)) {
                uploadServiceStatus = uploadServiceStatuses.loading;

                // Upload is a 2-phase async process: the service init and then the upload request.
                // Init is done as late as possible to keep the UI enabled longer. Successfully inited service can be used again on next storeResponse.
                // Failure of either phase must be handled, and shown in UI.

                let initPromise = Promise.resolve();

                if (!attachmentsService.uploadService) {
                    initPromise = attachmentsService.initializeUploadService();
                }

                // While the phases run, attempted navigation away must be delayed, for this we keep a Promise reference here.
                // Placing this Promise temporarily into the response will cause any actions requests to wait for it.
                const deferredPromise = new DeferredPromise();
                updateResponse(deferredPromise.promise);
                pendingOperationsStore.add(uploadKey);

                const uploadOptions = {
                    onProgress(bytesLoaded, bytesTotal) {
                        uploadStats.bytesLoaded = bytesLoaded;
                        uploadStats.bytesTotal = bytesTotal;
                    }
                };

                initPromise
                    .then(() => {
                        baseType = attachmentsService.uploadService.getBaseType() || 'file';
                        uploadServiceStatus = uploadServiceStatuses.uploading;
                        ariaLiveAnnouncement.text = ariaLiveStrings.started;
                    })
                    .then(() => attachmentsService.uploadService.upload(newValue, uploadOptions))
                    .then(resolvedValue => {
                        if (resolvedValue) {
                            updateResponse(resolvedValue);
                        }
                        deferredPromise.resolve(resolvedValue);
                        ariaLiveAnnouncement.text = ariaLiveStrings.completed;
                    })
                    .catch(err => {
                        if (destroyed && !itemSessionStatusStore.isSuspended) {
                            // We are already leaving the item so can't show interaction or item error - make endItemSession fail instead
                            deferredPromise.reject(err);
                            return;
                        }

                        const userCancelled = uploadServiceStatus === uploadServiceStatuses.userCancelled;
                        if (!userCancelled) {
                            logger?.error(err);

                            notificationKeys.push(
                                itemContext.showItemNotification(
                                    {
                                        message: __(
                                            'Unable to upload the selected file. Please try again or refresh the page.'
                                        ),
                                        hierarchy: 'alert',
                                        closeable: true
                                    },
                                    'persistent'
                                )
                            );
                        }
                        ariaLiveAnnouncement.text = ariaLiveStrings.cancelled;

                        // Restore or reset response and UI so user sees correct value
                        if (storedValue) {
                            updateResponse(storedValue);
                            // value and link will follow from loadResponse
                        } else {
                            updateResponse(null);
                            value = null;
                            link = null;
                        }
                    })
                    .finally(() => {
                        uploadServiceStatus = uploadServiceStatuses.ready;
                        pendingOperationsStore.delete(uploadKey);

                        uploadStats.bytesLoaded = 0;
                        uploadStats.bytesTotal = 0;
                    });
            }
        }
    }

    /**
     * Store the response whenever the value changes
     * @param {CustomEvent} e
     */
    function handleChange(e) {
        const file = e.detail.value;
        const validity = e.detail.validity;
        customValidity = '';
        itemContext?.clearItemNotificationsByKeys?.(notificationKeys);
        notificationKeys = [];
        uploadStats.bytesLoaded = 0;
        uploadStats.bytesTotal = 0;

        if (validity && file instanceof File) {
            storeResponse(
                {
                    name: file.name,
                    mime: file.type,
                    data: file
                },
                true
            );
        } else {
            storeResponse(null, validity);
            ariaLiveAnnouncement.text = ariaLiveStrings.reset;
        }
    }

    /**
     * Handle when the user wants to cancel the upload
     */
    function handleCancelUpload() {
        uploadServiceStatus = uploadServiceStatuses.userCancelled;
        attachmentsService.uploadService?.cancel();
    }

    onDestroy(() => {
        destroyed = true;
        attachmentsService.abortController.abort('destroyed');
        attachmentsService.uploadService?.cancel('destroyed');
        pendingOperationsStore.delete(uploadKey);
        itemContext?.clearItemNotificationsByKeys?.(notificationKeys);
        notificationKeys = [];
    });
</script>

<style>
    :global([data-layouts~='hideFeedbacksLayout']) {
        & .qti-uploadInteraction {
            & :global(.expected-formats) {
                display: none;
            }
            & :global(.selected-file-container.invalid) {
                display: none;
            }
        }
    }
    .qti-uploadInteraction {
        & .wrap {
            position: relative;
        }
        & .loading {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(255, 255, 255, 0.5);
            z-index: 100;
        }
        & :global(.expected-formats) {
            margin: 0 0 1rem 0;
        }
    }
</style>

<div
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}
>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}
    <div class="wrap">
        {#if isLoading}
            <div class="loading">
                <Loading text={__('Loading')} />
            </div>
        {/if}
        <div class="uploading" class:hidden={value === null}>
            {#if isUploading}
                <UploadProgress {...uploadStats} on:cancel={handleCancelUpload} />
            {/if}
        </div>
        <FileSelect
            bind:value
            {link}
            {maxSize}
            {customValidity}
            validMimeTypes={type}
            disabled={isDisabled}
            lang={instructionsLang}
            on:change={handleChange}
        />
    </div>
    <AtomicAriaLive id={ariaLiveContainerId} announcement={ariaLiveAnnouncement} lang={instructionsLang} />
</div>
