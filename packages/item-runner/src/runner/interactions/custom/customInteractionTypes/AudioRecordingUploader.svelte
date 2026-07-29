<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { getContext, onDestroy } from 'svelte';
    import { __, generateElementId } from '@oat-sa-private/ui-core';
    import { Loading } from '@oat-sa-private/ui-components';
    import { getInteractionStateStore } from '../../../itemsStateStore.js';
    import { getItemPendingOperationsStore } from '../../../itemsPendingOperationsStore.js';
    import {
        uploadServiceStatuses,
        defaultGetAttachmentsUploadData,
        attachmentsServiceFactory
    } from '../../../services/upload/attachmentsService.js';
    import { getFile, bufferToBase64 } from '../../../services/upload/util.js';
    import UploadProgress from '../../../services/upload/UploadProgress.svelte';
    import AudioRecordingInteractionImpl from './AudioRecordingInteractionImpl.svelte';
    import AtomicAriaLive from '../../AtomicAriaLive.svelte';

    const qtiClass = 'qti-customInteraction';

    // only accessed props are detailed here; all others are passed through as $$props
    export let itemIdentifier;
    export let responseIdentifier;
    export let properties = {};
    export let typeIdentifier;

    export let isInitialMount = true;
    export let doNotPlayMedia = false;

    //upload timeout config (1min by default)
    export let timeout = 60 * 1000;

    // Got to override property with isInitialMount: false so that CustomInteraction can always mount
    // without registerLoadingElement process, because its mount now awaits the download of a remote file.
    // Therefore this component may not work well with sequential interactions.
    isInitialMount = false;

    /**
     * @typedef {Object} FileData
     * @property {string} data
     * @property {string} name
     * @property {string} mime
     */
    /**
     * @typedef {Object} FileHashData - what the upload service will return
     * @property {string} data
     * @property {string} name
     * @property {string} mime
     * @property {string} id
     * @property {string} version
     * @property {string} downloadUrl
     * @property {File|Object} [localFile]
     */
    /**
     * @typedef {Object} FileResponse - what the PCI returns, and what we'll save if we can't upload
     * @property {Object|null} base
     * @property {FileData} [base.file]
     */
    /**
     * @typedef {Object} FileHashResponse - what we'll save if we uploaded the file
     * @property {Object|null} base
     * @property {FileHashData} [base.fileHash] - represents a reference to a remote file
     */

    /**
     * Main code runs BEFORE CustomInteractionDefault's main code
     */

    // pendingOperationsStore entries (to prevent navigation away during recording or uploading)
    const recordKey = generateElementId('recordKey');
    const uploadKey = generateElementId('uploadKey');

    const itemContext = getContext(itemIdentifier);
    const logger = itemContext?.getLogger();
    const instructionsLang = itemContext?.getInstructionsLang();

    /** @type {HTMLElement} reference to PCI container */
    let container;

    const pciEvents = {
        recorderStart: 'recorder-start',
        recorderStop: 'recorder-stop',
        recorderReset: 'recorder-reset',
        playbackEnd: 'playback-end'
    };

    // aria live
    let ariaLiveAnnouncement = {};
    const ariaLiveContainerId = generateElementId('live');
    const ariaLiveStrings = Object.freeze({
        started: __('Upload started.'),
        completed: __('Upload completed.'),
        cancelled: __('Upload cancelled.'),
        reset: __('Response file cleared.')
    });

    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
    const pendingOperationsStore = getItemPendingOperationsStore(itemIdentifier);

    // Response format:
    const cardinality = 'single';
    // There are 2 baseTypes: 'file' becomes 'fileHash' after a file is successfully uploaded
    let baseType = 'file';

    // There are 2 response value types:
    let responseValueFile = null; // value required by the PCI contract
    let responseValueFileHash = null; // once created, will be the value saved in the interactionStateStore, and sent to the server

    function isFileHashFormat(responseValue) {
        return !!responseValue?.downloadUrl;
    }

    let destroyed = false;
    let notificationKeys = [];

    // prepare the attachmentsService to be used for upload later
    const attachmentsService = attachmentsServiceFactory({
        getAttachmentsUploadData: itemContext?.getGetAttachmentsUploadData?.() || defaultGetAttachmentsUploadData,
        itemIdentifier,
        responseIdentifier,
        timeout
    });

    let uploadServiceStatus = uploadServiceStatuses.initial;
    $: isUploading = uploadServiceStatus === uploadServiceStatuses.uploading;

    const uploadStats = { bytesLoaded: 0, bytesTotal: 0 };

    /**
     * Do initial response definition.
     * Load the interactionStateStore response value into local variables, so that the store is decoupled from the CustomInteraction,
     * and the CustomInteraction will not instantiate the PCI until we have a 'file' type response.
     * If the baseType is 'fileHash', download the file from its downloadUrl,
     * so the PCI can be initialized with that response for playback.
     * If the basetype is 'file', the respnse value is already ready for the PCI.
     */
    async function initResponse() {
        if (!interactionStateStore.hasResponse()) {
            storeResponse(null);
        } else {
            /** @type {FileHashResponse|FileResponse} */
            const storedValue = interactionStateStore.getResponseValue();

            if (isFileHashFormat(storedValue)) {
                // fileHash is the desired response format, but we need to download the file for the PCI
                baseType = 'fileHash';
                responseValueFileHash = { ...storedValue };
                const downloadedFileResponse = await downloadFile(
                    responseValueFileHash.downloadUrl,
                    responseValueFileHash
                );
                if (downloadedFileResponse) {
                    // response has now been converted from 'fileHash' type to 'file' type
                    responseValueFile = { ...downloadedFileResponse };
                }
            } else if (storedValue?.data) {
                // file is the secondary response format, but we can try to upload it now
                responseValueFile = { ...storedValue };
                await uploadFile();
            }
        }
    }
    const initPromise = initResponse();
    itemContext?.registerLoadingElement(initPromise);

    /**
     * Handle the PCI state whenever it is extracted from the PCI (e.g. on recording stop and on destroy)
     * The state.response.baseType will always be 'file' at this point, so we discard it in favour of the last one stored
     * @param {Object} state
     */
    function handleState(state) {
        interactionStateStore.merge({
            state: {
                ...state,
                response: interactionStateStore.getResponse()
            }
        });
    }

    /**
     * Handle the response whenever it is extracted from the PCI.
     * @param {FileResponse} response
     */
    function handleResponse(response) {
        responseValueFile = response.base?.file || null;
        // interactionStateStore response should receive its update after the response file is uploaded
    }

    /**
     * (CustomInteraction prop) Provides the response value which the CustomInteraction will use to initialize the PCI
     * The downloadFile() must ensure that responseValueFile is ready beforehand
     * @returns {FileResponse}
     */
    function getInitialResponse() {
        if (responseValueFile) {
            return {
                base: {
                    file: responseValueFile
                }
            };
        }
        return { base: null };
    }

    /**
     * (CustomInteraction prop) Provides the state value which the CustomInteraction will use to initialize the PCI
     * @returns {Object}
     */
    function getInitialState() {
        const state = interactionStateStore.get().state;
        return {
            ...state,
            ...getInitialResponse()
        };
    }

    /**
     * (CustomInteraction prop) Update the PCI's state in the state store
     * But we will in fact ignore the response within the state the PCI gives us, as it will not always have the right baseType
     * @param {Object} state
     */
    function doInitialStateUpdate(state) {
        interactionStateStore.merge({
            qtiClass,
            typeIdentifier,
            state: {
                ...state,
                response: interactionStateStore.getResponse()
            }
        });
    }

    /**
     * Update the state and response values in the items state store
     * @param {FileData|FileHashData|null} responseValue
     */
    function storeResponse(responseValue) {
        if (destroyed) {
            return;
        }
        if (responseValue) {
            if (isFileHashFormat(responseValue)) {
                baseType = attachmentsService.uploadService.getBaseType();
                responseValueFileHash = responseValue;
            } else {
                baseType = 'file';
                responseValueFile = responseValue;
            }
        }

        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: responseValue
            },
            true
        );
        // Merge latest state captured from the PCI, with response just set from local responseValue
        interactionStateStore.merge({
            state: {
                ...interactionStateStore.get().state,
                response: interactionStateStore.getResponse()
            }
        });
    }

    /**
     * Fetch a remote file from cloud storage, encode its contents as base64,
     * and prepare it with its metadata for using as the PCI response
     * @param {string} url
     * @param {FileData} fileMetadata
     * @returns {Promise<FileData|null>}
     */
    async function downloadFile(url, fileMetadata) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const buf = await response.arrayBuffer();
                const data = bufferToBase64(buf);
                return {
                    data,
                    name: fileMetadata.name,
                    mime: fileMetadata.mime
                };
            } else {
                throw new Error(`Failed to fetch file: ${url}`);
            }
        } catch (err) {
            logger?.error(err);
            notificationKeys.push(
                itemContext?.showItemNotification(
                    {
                        message: __('Unable to restore the uploaded audio file. Please reload the page to try again.'),
                        hierarchy: 'alert',
                        closeable: false,
                        actions: [
                            {
                                type: 'link',
                                title: __('Reload'),
                                action: event => {
                                    event.preventDefault();
                                    window.location.reload();
                                }
                            }
                        ]
                    },
                    'persistent'
                )
            );
            return null;
        }
    }

    /**
     * Upload the response file to cloud storage.
     * Update the response value in the state store if successful.
     */
    async function uploadFile() {
        // Before upload, convert the response's FileData object to a File
        const file = await getFile(responseValueFile);
        if (file) {
            // Upload is a 2-phase async process: the service init and then the upload request.
            // Init is done as late as possible to keep the UI enabled longer. Successfully inited service can be used again on next upload.
            // Failure of either phase must be handled, and shown in UI.

            // While the phases run, attempted navigation away must be delayed
            pendingOperationsStore.add(uploadKey);

            togglePciDisabled(true);

            const uploadOptions = {
                onProgress(bytesLoaded, bytesTotal) {
                    uploadStats.bytesLoaded = bytesLoaded;
                    uploadStats.bytesTotal = bytesTotal;
                }
            };

            try {
                if (!attachmentsService.uploadService) {
                    uploadServiceStatus = uploadServiceStatuses.loading;
                    await attachmentsService.initializeUploadService();
                }

                uploadServiceStatus = uploadServiceStatuses.uploading;
                ariaLiveAnnouncement.text = ariaLiveStrings.started;

                const uploadResult = await attachmentsService.uploadService.upload({ data: file }, uploadOptions);
                if (uploadResult) {
                    storeResponse(uploadResult);
                    ariaLiveAnnouncement.text = ariaLiveStrings.completed;
                }
            } catch (err) {
                // if we cannot upload and produce a baseType:"fileHash" response,
                // we'll submit the already-stored baseType:"file" response
                logger?.error(err);
                ariaLiveAnnouncement.text = ariaLiveStrings.completed;
            }
            uploadServiceStatus = uploadServiceStatuses.ready;
            pendingOperationsStore.delete(uploadKey);

            uploadStats.bytesLoaded = 0;
            uploadStats.bytesTotal = 0;

            togglePciDisabled(false);
        }
    }

    /**
     * Toggle the PCI's disabled state by sending it an event
     * @param {Boolean} value
     */
    function togglePciDisabled(value) {
        properties.isDisabled = !!value;
        if (container) {
            container.dispatchEvent(
                new CustomEvent('config-change', {
                    detail: {
                        isDisabled: properties.isDisabled
                    }
                })
            );
        }
    }

    /**
     * Handle the PCI's recorder-start event.
     */
    function handleRecorderStart() {
        itemContext?.clearItemNotificationsByKeys(notificationKeys);
        notificationKeys = [];
        pendingOperationsStore.add(recordKey);
    }

    /**
     * Handle the PCI's recorder-stop event.
     * This handles manual stop-button and end-of-recording-time situations (but not page unload).
     */
    async function handleRecorderStop() {
        // extract the response from the PCI to upload it
        itemContext?.trigger('stateupdate');
        storeResponse(responseValueFile);

        await uploadFile();
        pendingOperationsStore.delete(recordKey);
    }

    /**
     * Handle the PCI's recorder-reset event.
     * This acts as a deletion of the value (null response will be submitted on next navigation).
     */
    function handleRecorderReset() {
        responseValueFile = null;
        responseValueFileHash = null;
        storeResponse(null);
        ariaLiveAnnouncement.text = ariaLiveStrings.reset;
    }

    /**
     * Called AFTER CustomInteractionDefault's onMount
     * Therefore `container` is already bound
     */
    function handleMount() {
        if (container) {
            container.addEventListener(pciEvents.recorderStart, handleRecorderStart);
            container.addEventListener(pciEvents.recorderStop, handleRecorderStop);
            container.addEventListener(pciEvents.recorderReset, handleRecorderReset);
        }
    }

    /**
     * Called BEFORE CustomInteractionDefault's onDestroy
     */
    onDestroy(() => {
        if (container) {
            container.removeEventListener(pciEvents.recorderStart, handleRecorderStart);
            container.removeEventListener(pciEvents.recorderStop, handleRecorderStop);
            container.removeEventListener(pciEvents.recorderReset, handleRecorderReset);
        }
        destroyed = true;
        attachmentsService.abortController.abort('destroyed');
        attachmentsService.uploadService?.cancel('destroyed');
        pendingOperationsStore.delete(recordKey);
        pendingOperationsStore.delete(uploadKey);
        itemContext?.clearItemNotificationsByKeys(notificationKeys);
        notificationKeys = [];
    });
</script>

<style>
    .audio-recording-uploader {
        position: relative;
    }
    .saving {
        position: relative;
        bottom: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
    }
</style>

<div class="audio-recording-uploader upload-{uploadServiceStatus}">
    <!-- potential file download must complete before rendering the PCI -->
    {#await initPromise}
        <Loading text={__('Loading...')} />
    {:then}
        <div class="uploading" class:hidden={responseValueFile === null}>
            {#if isUploading}
                <!-- don't allow user to cancel ongoing upload, as we don't have a retry flow -->
                <UploadProgress {...uploadStats} cancelable={false} />
            {/if}
        </div>
        {#key doNotPlayMedia && !isInitialMount}
            {#if !doNotPlayMedia || isInitialMount}
                <AudioRecordingInteractionImpl
                    {...$$restProps}
                    {typeIdentifier}
                    {itemIdentifier}
                    {responseIdentifier}
                    {properties}
                    {isInitialMount}
                    {doNotPlayMedia}
                    {handleState}
                    {handleResponse}
                    {getInitialState}
                    {getInitialResponse}
                    {doInitialStateUpdate}
                    on:mount={handleMount}
                    bind:container />
            {/if}
        {/key}
        <AtomicAriaLive id={ariaLiveContainerId} announcement={ariaLiveAnnouncement} lang={instructionsLang} />
    {/await}
</div>
