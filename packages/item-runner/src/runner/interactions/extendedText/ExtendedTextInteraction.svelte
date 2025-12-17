<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2025 (original work) Open Assessment Technologies SA ;

    import { __, generateElementId, convertSizeToReadableFormat, getLanguageDirection } from '@oat-sa-private/ui-core';
    import { Textarea, Icon, RichTextEditor } from '@oat-sa-private/ui-elements';
    import { supportsVerticalFormElement } from '@oat-sa-private/ui-elements/input/writingModeSupport.js';
    import Prompt from '../Prompt.svelte';
    import { getInteractionStateStore } from '../../itemsStateStore';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import { getItemPendingOperationsStore } from '../../itemsPendingOperationsStore.js';
    import itemSessionStatus from '../../itemSessionStatus.js';
    import { hasClass, extractFromClasses, extractDataValueList } from '../util/attributes.js';
    import { formatResponseValue, formatInputValue } from '../util/responseType.js';
    import { getRowsValue, getAdditionalSpacing } from '../util/rows.js';
    import { convertPatternMask } from '../util/pattern.js';
    import editorConfigFactory from './editorConfig.js';
    import { getLocale } from '../../util/locale.js';
    import { getContext, tick, onDestroy } from 'svelte';
    import { DeferredPromise } from '../util/promise.js';
    import { MaxSizeExceededError } from './uploadAdapter.js';
    import { wrapWithLogger, createLastPressedKeyListener } from '../util/analytics.js';
    import { tryParseMaxlength, tryParseMaxWords } from '../../util/patternMask.js';
    import { defaultsDeep } from 'lodash';

    const qtiClass = 'qti-extendedTextInteraction';

    const charactersPerLine = 72;

    const itemRunnerConfigContext = getContext('itemRunnerConfig') || {};

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    export let disabled = false;
    export let required = false;

    // Response format:
    let cardinality = 'single'; // only single is supported now
    export let baseType = 'string';

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let classes = '';
    export let dir;
    export let base = 10;

    // interaction-level QTI attributes:
    export let expectedLength;
    export let expectedLines;
    export let placeholderText;
    export let prompt;
    export let format;
    const formats = Object.freeze({
        plain: 'plain',
        preformatted: 'preformatted',
        xhtml: 'xhtml'
    });

    // for image upload, from attributes override
    export let uploadTimeout = 60 * 1000; //1 min
    export let uploadMaxSize = 20 * 1000 * 1000; //20Mb
    export let uploadServiceType; //empty for default or 'sandbox' for no backend

    // Element refs
    let interactionElement;
    let feedbacksRootRef;
    let controlWrapperRef;

    let editorToolbarHeight = 0;
    let feedbacksHeight = 0;
    let additionalSpace = 0;

    const interactionName = 'extendedTextInteraction';

    const hiddenEditorLabel = __('Your answer');

    // data attributes
    export let dataAttrs = {};
    const qtiPatternMaskMessage = dataAttrs['data-patternmask-message'];
    const resizable = dataAttrs['data-resizable'] !== 'false';
    const hasWordCount = dataAttrs['data-word-count'] && dataAttrs['data-word-count'] !== 'false';
    const hasCharCount = dataAttrs['data-character-count'] && dataAttrs['data-character-count'] !== 'false';
    // xhtml-only options
    const hasMathEntry = dataAttrs['data-math-entry'] && dataAttrs['data-math-entry'] !== 'false';
    const mathEntryKeyboards = dataAttrs['data-math-entry-keyboards'];
    const hasImageUpload = dataAttrs['data-image-upload'] && dataAttrs['data-image-upload'] !== 'false';
    const removePlugins = extractDataValueList(dataAttrs['data-remove-plugins']);
    const toolbarRemoveItems = extractDataValueList(dataAttrs['data-toolbar-remove-items']);

    /**
     * spellCheckConfig should ultimately be settable by:
     * 1. tenant config (via propertyOverride of spellCheckConfig) - especially for url, licence etc.
     * 2. LTI claim (via itemRunnerConfigContext) - for customisation by launcher
     * @type {Object} spellCheckConfig
     * @property {Boolean} enabled
     * @property {String} providerId
     * @property {Object} providerConfig - specific to the provider
     */
    // tenant config
    export let spellCheckConfig = {};
    // LTI claim
    const configuredSpellCheckConfig = itemRunnerConfigContext.elements?.ExtendedTextInteraction?.spellCheckConfig || {};

    const finalSpellCheckConfig = defaultsDeep(
        {},
        configuredSpellCheckConfig,
        spellCheckConfig,
        { enabled: true, providerId: 'native' }
    );

    // if plain or preformatted format, maxCharLimit applies to total response characters
    // if xhtml format, maxCharLimit applies to only visible characters, as reported in the count
    const charBoundary = 20000;
    let maxCharLimit = Number.isInteger(dataAttrs['data-max-chars']) ? dataAttrs['data-max-chars'] : charBoundary;
    const specialCharacterSetName = dataAttrs['data-special-characters'];

    const enforceMaxWords = hasClass(classes, 'tao-constrain-maxWords');

    // expected length
    const expectedResponseLength = expectedLength || expectedLines * charactersPerLine || null;

    // Persistent Undo/Redo history
    export let historyLimit = 10;
    let storedEditorHistory = [];
    export let usePersistentUndoRedo = false;

    //patternMask & maxlength validation &  max words validation
    export let patternMask;
    let maxlength;
    let maxWordsLimit;
    let maxWordsSeparators;
    if (patternMask) {
        patternMask = convertPatternMask(patternMask);
        maxlength = tryParseMaxlength(patternMask);
        if (maxlength) {
            if (maxlength > maxCharLimit) {
                maxCharLimit = maxlength;
            }
            patternMask = null;
        } else {
            const maxWordsParseResult = tryParseMaxWords(patternMask);
            if (maxWordsParseResult) {
                maxWordsLimit = maxWordsParseResult.max;
                maxWordsSeparators = maxWordsParseResult.separators;
                patternMask = null;
            }
        }
    }

    // QTI class -> prop conversion maps:
    const counterDirectionTypes = Object.freeze({
        up: 'up',
        down: 'down'
    });

    // interaction-level QTI attributes derived from classes:
    const rows = getRowsValue(expectedLength, expectedLines, maxlength, maxWordsLimit, classes);
    const counterDirection =
        extractFromClasses(classes, 'qti-counter-', val => counterDirectionTypes[val]) || counterDirectionTypes.up;

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
    const pendingOperationsStore = getItemPendingOperationsStore(itemIdentifier);

    const itemContext = getContext(itemIdentifier);
    const logger = itemContext && itemContext.getLogger();
    const userLang = itemContext && itemContext.getUserLang();
    const itemLang = itemContext && itemContext.getItemLang();
    const instructionsLang = itemContext && itemContext.getInstructionsLang();
    const instructionsDir = instructionsLang ? getLanguageDirection(instructionsLang) : void 0;
    const writingMode = itemContext && itemContext.getWritingMode();
    const isVerticalWritingMode = writingMode === 'vertical-rl';
    const isVerticalTextareaSupported = supportsVerticalFormElement();

    let visited = false;

    // do initial response definition
    if (!interactionStateStore.hasResponse()) {
        interactionStateStore.merge({ qtiClass });
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: null
            },
            // validity:
            !required && (!patternMask || new RegExp(patternMask).test(''))
        );
    } else {
        visited = true;
    }
    // subscribe to store value
    $: value = $interactionStateStore ? loadResponse() : '';

    let notificationKeys = [];
    const lastPressedKeyListener = createLastPressedKeyListener();

    /**
     * Tell the host Item to remove all Notifications added by this interaction
     */
    function removeItemNotifications() {
        for (const key of notificationKeys) {
            itemContext.removeItemNotification(key);
        }
        notificationKeys = [];
    }

    // extend config template based on interaction data
    const editorConfig = editorConfigFactory({
        removePlugins,
        toolbarRemoveItems,
        toolbarLang: instructionsLang || userLang,
        inputLang: language || itemLang || userLang,
        hasMathEntry,
        mathEntryKeyboards,
        hasImageUpload,
        specialCharacterSetName,
        spellCheckConfig: finalSpellCheckConfig,
        uploadServiceType,
        uploadTimeout,
        uploadMaxSize,
        responseIdentifier,
        itemIdentifier,
        getAttachmentsUploadData: itemContext.getGetAttachmentsUploadData && itemContext.getGetAttachmentsUploadData(),
        onUploadStarted: uploadKey => {
            //register pending operation in the store, in case consumer wants to wait for upload completion
            pendingOperationsStore.add(uploadKey);
        },
        onUploadFinished: (uploadKey, success, error) => {
            //NB! Do not unmount svelte component until this completes!
            //unregister pending operation in the store; but response will be updated only on next `change` event
            pendingOperationsStore.delete(uploadKey);

            if (error && error.name !== 'AbortError') {
                let uploadErrorMessage;
                if (error instanceof MaxSizeExceededError) {
                    uploadErrorMessage = __(
                        'Your image file is too big. Please insert an image no larger than %s',
                        convertSizeToReadableFormat(uploadMaxSize)
                    );
                } else {
                    uploadErrorMessage = __('Your image failed to upload, please try again');
                    if (logger) {
                        logger.error(error);
                    }
                }
                notificationKeys.push(
                    itemContext.showItemNotification(
                        {
                            message: uploadErrorMessage,
                            hierarchy: 'alert',
                            closeable: true
                        },
                        'persistent'
                    )
                );
            }
        }
    });

    // handle char/word counter
    let count = { words: 0, chars: 0 };

    // error handling
    const elementId = generateElementId(interactionName);
    const editorElementId = generateElementId('extendedText-editor');
    let customValidity = '';
    let validity = {
        store: true, // 'true' value allow avoiding warning messages on initial loading, however itemStore contains actual validity state
        wrongFormatting: false,
        maxWordsExceeded: false,
        valid: true
    };
    /**
     * Used for validation with pattern. Always resolves with boolean value
     * @resolves Boolean
     */
    let validationDeferred;

    // Due to async subcomponents, register a loading Promise with the Item
    let interactionReady = false;
    const editorLoad = new DeferredPromise();
    itemContext.registerLoadingElement(editorLoad.promise);
    const initialValue = $interactionStateStore ? loadResponse() : '';

    /**
     * Screen-reader feedback properties:
     * - set ariaLive: 'assertive' for instant announcement
     * - set ariaLive: 'polite' for deferred announcement
     */
    $: feedbacks = [
        {
            message: __('Maximum characters reached (maximum: %d)', maxlength || maxCharLimit),
            permanent: count?.maxCharLimitExceeded || count?.maxLengthLimitExceeded,
            error: count?.maxCharLimitExceeded || count?.maxLengthLimitExceeded,
            ariaLive: 'assertive'
        },
        {
            message: __('Maximum words reached (maximum: %d)', maxWordsLimit),
            permanent: count?.maxWordsExceeded,
            error: count?.maxWordsExceeded,
            ariaLive: 'assertive'
        },
        // the following 2 are mutually exclusive: tao-constrain-maxWords and data-word-count shouldn't be enabled together
        {
            message: __('<strong>%d</strong> / %d word(s) typed', count?.words || 0, maxWordsLimit),
            permanent: maxWordsLimit,
            error: false
        },
        {
            message: __('<strong>%d</strong> word(s) typed', count?.words || 0),
            permanent: hasWordCount && !maxWordsLimit,
            error: false
        },
        {
            message: __('<strong>%d</strong> character(s) typed', count?.chars || 0),
            permanent: hasCharCount && !maxlength && !expectedResponseLength,
            error: false
        },
        {
            /* eslint-disable indent */
            message:
                counterDirection === counterDirectionTypes.up
                    ? `${__('<strong>%d</strong> character(s) typed', count.chars)} (${__(
                          'recommended: %d',
                          expectedResponseLength
                      )}).`
                    : __('<strong>%d</strong> characters left.', expectedResponseLength - count.chars),
            /*  eslint-enable indent */
            permanent: expectedResponseLength && !maxlength,
            error: false
        },
        {
            message: `<span aria-label="${__('%d out of %d characters typed', count?.chars || 0, maxlength)}">${__(
                '<strong>%d</strong> / %d character(s) typed',
                count?.chars || 0,
                maxlength
            )}</span>`,
            permanent: maxlength,
            error: false
        },
        {
            message: qtiPatternMaskMessage || __('Invalid format, please refer to the instructions.'),
            permanent: typeof qtiPatternMaskMessage !== 'undefined',
            error: visited && validity.patternMismatch,
            ariaLive: 'polite'
        },
        {
            message: __('Answer required.'),
            permanent: required,
            error: visited && validity.valueMissing,
            ariaLive: 'polite'
        }
    ];

    /**
     * Tells if a given feedback should be invisible
     * @param {Object} feedback
     * @returns {Boolean}
     */
    function feedbackInvisible(feedback) {
        return feedback.hide || !(feedback.error || feedback.permanent);
    }

    $: visibleFeedbacks = feedbacks.filter(feedback => !feedbackInvisible(feedback));

    /**
     * Loads state (for word count & validity) from interaction store
     * Loads response from interaction store and formats it
     * @returns {string} Response in the store
     */
    function loadResponse() {
        const state = interactionStateStore.get();
        if (state && state.count) {
            count = state.count;
        }

        if (state && state.history) {
            storedEditorHistory = state.history;
        }

        validity.overallValidity = state.validity;

        const response = interactionStateStore.getResponseValue();

        const storedValue = formatInputValue(response, baseType, base, getLocale());

        return storedValue.toString();
    }

    /**
     * Change event handler
     * - parses new response value (according to locale) from subcomponent event
     * - reads wordcount object from subcomponent event
     * - validates formatting edge case
     * - stores the response
     * @param {CustomEvent} e
     * @param {Object} e.detail
     * @param {String} e.detail.value
     * @param {Object} e.detail.count
     * @param {Number} e.detail.count.words
     * @param {Number} e.detail.count.chars
     */
    function handleChange(e) {
        let parsedValue = null;
        let { value: newValue } = e.detail;
        count = e.detail.count;
        count.maxCharLimitExceeded = maxCharLimit && count?.chars && count?.chars > maxCharLimit;
        count.maxLengthLimitExceeded = maxlength && count?.chars && count?.chars > maxlength;
        count.maxWordsExceeded = maxWordsLimit && count?.words && count?.words > maxWordsLimit;

        validity.maxWordsExceeded = count.maxWordsExceeded; //count: to show feedback after restoring existing itemState; validity: to store with response

        if (patternMask && format !== formats.xhtml) {
            validationDeferred = new DeferredPromise();
        }

        // format value
        validity.wrongFormatting = false;
        try {
            parsedValue = formatResponseValue(newValue, baseType, base, getLocale());
        } catch (error) {
            if (error instanceof TypeError) {
                validity.wrongFormatting = true;
                if (validationDeferred) {
                    // resolve as invalid validity
                    validationDeferred.promise.then(() => {
                        interactionStateStore.setValidity(false);
                    });
                    validationDeferred.resolve();
                }
            }
        }
        /* Rich text editor dispatches `validation` and then `change`
         * that's why item store is not recieving maxWordsExceeded validity on time
         * validity need to be synced here to expose it to `navigation` in a correct state */
        syncValidity(newValue);
        storeResponse(parsedValue);
    }

    /**
     * Validation event handler
     * @param {CustomEvent} e
     */
    function handleValidation(e) {
        if (validationDeferred) {
            validationDeferred.promise.then(() => {
                syncValidity(e.detail);
                interactionStateStore.setValidity(e.detail.valid);
            });
            validationDeferred.resolve();
        } else {
            syncValidity(e.detail);
            let storeValue = interactionStateStore.getResponseValue() || null;
            storeResponse(storeValue);
        }
    }

    /**
     * Sync validity to show correct feedback
     * @param {Object} validityResponse response from validation event
     */
    function syncValidity(validityResponse) {
        validity = Object.assign({}, validity, validityResponse);
        validity.overallValidity = !validity.wrongFormatting && !validity.maxWordsExceeded && validity.valid; //actualize validity store
        if (visited) {
            // set component to invalid state
            customValidity = validity.overallValidity ? '' : 'invalid';
        }
    }

    /**
     * Store value in interactionStateStore
     *
     * validity of this component consists of two parts: validity from 'validation' event and parsing value in 'change' event
     * for getting correct validation state we have to collect info from two events, but we never know in which order it will come
     * variable `storeValue` is used to say: Have we collected data from both events or not
     * @param {string|null} parsedValue - value prepared for adding to store
     */
    function storeResponse(parsedValue) {
        // Note: subscribers to interactionStateStore will see 2 changes back-to-back
        // because of these next calls. (It would be better to do only 1 call.)
        // Response is stored before state is updated because it's the more important part.

        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: parsedValue
            },
            validationDeferred ? validationDeferred.promise : validity.overallValidity
        );
        interactionStateStore.update({
            count
        });
    }

    /**
     * Runs on subcomponent 'ready' event
     * @param {CustomEvent} e
     * @param {Object} e.detail
     * @param {Object} e.detail.count
     * @param {Number} e.detail.count.words
     * @param {Number} e.detail.count.chars
     */
    function handleEditorReady(e) {
        editorLoad.resolve();
        interactionReady = true;

        if (e.detail && e.detail.count) {
            count = e.detail.count;
        }

        /**
         * RichTextEditor not rendered fully at this moment
         * which results in the wrong toolbar height on first render on mobile
         */
        tick().then(() => {
            feedbacksHeight = getFeedbacksRootHeight();
            updateKeyHeights();
        });
    }

    /**
     * Runs if the editor component had an error, either on mount or later.
     * In certain cases the item state should be closed (requiring a reload), therefore we inform the Item
     * @param {CustomEvent} e
     */
    function handleEditorError(e) {
        const editorError = e.detail.error;
        if (editorError.message.includes('WEBSPELLCHECKER')) {
            editorError.recoverable = true;
        }
        if (!interactionReady) {
            // For cases where the Promise was not resolved first
            editorLoad.reject(editorError);
        } else {
            // For async errors, e.g. lazy loading
            itemContext.triggerError(editorError);
        }
    }

    /**
     * Runs if the editor component wants to show a notification.
     * The host Item will handle the creation.
     * @param {CustomEvent} e
     */
    function handleEditorNotify(e) {
        const [notification, persistence, timeout] = e.detail;

        if (notification && (notification.title || notification.message)) {
            notificationKeys.push(itemContext.showItemNotification(notification, persistence, timeout));
        }
    }

    /**
     * Gets rich text editor toolbar height (if present)
     * @returns {Number}
     */
    function getEditorToolbarHeight() {
        const editorToolbar = controlWrapperRef?.querySelector('.ck-editor__top');
        if (!editorToolbar) {
            return 0;
        }
        return isVerticalWritingMode ? editorToolbar.clientWidth : editorToolbar.clientHeight;
    }

    /**
     * Gets feedbacks height
     * @returns {Number}
     */
    function getFeedbacksRootHeight() {
        const clientBlockSize = isVerticalWritingMode ? feedbacksRootRef?.clientWidth : feedbacksRootRef?.clientHeight;
        return clientBlockSize || 0;
    }

    /**
     * Updates values needed for control height calculation
     */
    function updateKeyHeights() {
        editorToolbarHeight = getEditorToolbarHeight();
        if (interactionElement) {
            additionalSpace = getAdditionalSpacing(interactionElement, !!prompt, isVerticalWritingMode);
        }
    }

    function getInteractionElement() {
        return interactionElement;
    }

    const handleFocus = wrapWithLogger({
        interactionStateStore,
        getInteractionElement,
        getDetails() {
            return {
                format
            };
        }
    });

    const handleBlur = wrapWithLogger({
        interactionStateStore,
        getInteractionElement,
        getDetails() {
            return {
                newResponse: interactionStateStore.getResponseValue(),
                format
            };
        }
    });

    /**
     * Logs clipboard events
     */
    const handleClipboard = wrapWithLogger({
        interactionStateStore,
        getInteractionElement,
        handler() {
            return new Promise(resolve => {
                setTimeout(resolve, 0);
            });
        },
        getDetails(event) {
            const { content, replacedContent, position } = event.detail;

            return {
                content,
                replacedContent,
                position,
                format,
                pressedKey: lastPressedKeyListener.lastPressedKey
            };
        }
    });

    /**
     * Logs drag and drop event
     */
    const handleDragDropEvent = wrapWithLogger({
        interactionStateStore,
        getInteractionElement,
        handler() {
            return new Promise(resolve => {
                setTimeout(resolve, 0);
            });
        },
        getDetails(event) {
            const { content, position } = event.detail;

            return {
                content,
                position,
                format
            };
        }
    });

    /**
     * Stores editor history when RichTextEditor provides it
     * @param {CustomEvent} event
     */
    const handleHistoryUpdate = event => {
        interactionStateStore.update({
            history: event?.detail
        });
    };

    onDestroy(() => {
        removeItemNotifications();
    });
</script>

<style>
    .feedbacks {
        margin-inline: 0;
        margin-block: var(--feedbacks-margin-top) 0;
        padding: 0;
        list-style: none;
    }

    .feedback {
        color: var(--color-text-feedback);

        &.error {
            color: var(--color-alert);
        }
        & .bullet {
            display: inline-block;
            text-align: center;
            min-inline-size: 2rem;
            margin-inline-end: var(--space-1x);
        }
    }

    [aria-controls] {
        --feedbacks-margin-top: 0px;
        --base-control-height: min(var(--item-container-inner-block-size), 150rem);
        --row-height: calc(var(--line-height-default) * 1em);

        cursor: auto;

        &.has-feedbacks {
            --feedbacks-margin-top: var(--space-2x);
        }

        &.auto-height {
            & :global(.cke-wrapper) {
                --content-height: calc(var(--control-default-height) - var(--border-medium));
            }

            & :global(textarea) {
                block-size: var(--control-default-height);
                min-block-size: calc(var(--row-height) * 3 + 3rem);
                vertical-align: top;
            }
        }
    }

    :global(.writing-mode-vertical-rl) {
        & [aria-controls] {
            --row-height: calc(var(--line-height-default-ruby) * 1em);
            margin-block-end: 0.25rem;

            & :global(textarea) {
                inline-size: 100%;
                line-height: var(--line-height-default-ruby);
            }

            &.vertical-unsupported {
                & :global(textarea) {
                    writing-mode: horizontal-tb;
                    height: 100%;
                    min-height: 100%;
                    /*if number of rows is set: */
                    width: calc(var(--row-height) * var(--rows-count) + 3rem);
                    min-width: calc(var(--row-height) * 1 + 3rem);
                }

                &.auto-height {
                    & :global(textarea) {
                        width: var(--control-default-height);
                        min-width: calc(var(--row-height) * 3 + 3rem);
                    }
                }

                & :global(.resize-vertical.resize-vertical) {
                    resize: horizontal;
                }
            }
        }
    }

    @media screen and (--mq-minwidth-medium) and (--mq-maxwidth-huge) {
        :global([data-layouts~='dualColumnLayout']) [aria-controls] {
            --base-control-height: var(--grid-row-inner-height);
        }
    }

    :global([data-layouts~='hideFeedbacksLayout']) {
        & .feedbacks {
            display: none;
        }
    }
</style>

<svelte:window on:resize={updateKeyHeights} />
<div
    data-format={format}
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    bind:this={interactionElement}
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}
>
    {#if prompt && prompt.length}
        <Prompt blockTree={prompt} />
    {/if}
    <div
        class:do-not-read={!value}
        bind:this={controlWrapperRef}
        style={`
            --control-default-height: calc(
                var(--base-control-height) - ${
                    editorToolbarHeight + feedbacksHeight
                }px - ${additionalSpace} - var(--feedbacks-margin-top)
            );
            --rows-count: ${rows}
        `}
        aria-controls={elementId}
        class:has-feedbacks={visibleFeedbacks.length > 0}
        class:auto-height={!rows}
        class:vertical-unsupported={!isVerticalTextareaSupported}
        on:keydown={lastPressedKeyListener.saveLastPressedKey}
    >
        {#if format === formats.xhtml}
            <RichTextEditor
                {rows}
                minRows={rows ? 1 : 3}
                value={initialValue}
                {storedEditorHistory}
                {historyLimit}
                {usePersistentUndoRedo}
                placeholder={placeholderText}
                {disabled}
                readonly={$itemSessionStatusStore === itemSessionStatus.closed}
                {required}
                maxlength={maxlength || maxCharLimit}
                resizable={resizable ? 'vertical' : 'none'}
                {editorConfig}
                ariaLabel={hiddenEditorLabel}
                spellcheck={finalSpellCheckConfig.enabled}
                bind:visited
                on:notify={handleEditorNotify}
                on:error={handleEditorError}
                on:ready={handleEditorReady}
                on:change={handleChange}
                on:validation={handleValidation}
                on:focus={handleFocus}
                on:blur={handleBlur}
                on:clipboard={handleClipboard}
                on:dragdrop={handleDragDropEvent}
                on:historyUpdate={handleHistoryUpdate}
            />
        {:else}
            <Textarea
                id={editorElementId}
                {rows}
                {value}
                placeholder={placeholderText}
                {disabled}
                readonly={$itemSessionStatusStore === itemSessionStatus.closed}
                {required}
                maxlength={maxlength || maxCharLimit}
                maxlengthAttrEnabled={!!maxlength}
                resizable={resizable ? 'vertical' : 'none'}
                {customValidity}
                fullwidth
                hiddenLabel={hiddenEditorLabel}
                pattern={patternMask}
                wordSeparators={maxWordsSeparators}
                maxWords={enforceMaxWords && maxWordsLimit}
                spellcheck={finalSpellCheckConfig.enabled}
                bind:visited
                on:ready={handleEditorReady}
                on:change={handleChange}
                on:validation={handleValidation}
                on:focus={handleFocus}
                on:blur={handleBlur}
                on:dragdrop={handleDragDropEvent}
                on:clipboard={handleClipboard}
            />
        {/if}
        <label for={editorElementId}>
            <ul
                bind:this={feedbacksRootRef}
                id={elementId}
                class="feedbacks do-not-read"
                lang={instructionsLang}
                dir={instructionsDir}
            >
                {#each visibleFeedbacks as feedback}
                    <li class="feedback" class:error={feedback.error} aria-live={feedback.ariaLive}>
                        {#if visibleFeedbacks.length > 1 || feedback.error}
                            <span class="bullet" aria-hidden="true">
                                {#if feedback.error}
                                    <Icon name="warning-16" ariaHidden />
                                {:else}•{/if}
                            </span>
                        {/if}
                        <span>{@html feedback.message}</span>
                    </li>
                {/each}
            </ul>
        </label>
    </div>
</div>
