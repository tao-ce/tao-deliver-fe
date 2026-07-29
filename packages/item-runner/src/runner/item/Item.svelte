<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2020-2025 (original work) Open Assessment Technologies SA ;
    /* eslint-disable svelte/valid-compile */ // because of CSS mixin

    import { afterUpdate, createEventDispatcher, onDestroy, onMount, setContext } from 'svelte';
    import { fade } from 'svelte/transition';
    import { getItemSessionStatusStore } from '../itemsSessionStatusStore.js';
    import ItemBlocks from './blocks/ItemBlocks.svelte';
    import loggerFactory from 'core/logger';
    import { getKeyboardFocusableElements } from '@oat-sa-private/ui-core/dom/dom.js';
    import { withUnit } from '../util/size.js';
    import StylesheetsLoader from './stylesheets/StylesheetsLoader.svelte';
    import { DeferredPromise } from '../interactions/util/promise.js';
    import { addScrollShadows } from '../util/scroll.js';
    import { NotificationContainer, removeNotification, showNotification } from '@oat-sa-private/ui-components';
    import {
        getItemSequentialInteractionsStore,
        releaseItemSequentialInteractionsStore
    } from '../itemsSequentialInteractionsStore.js';
    import { getItemSettingsStore } from '../itemsSettingsStore.js';
    import 'construct-style-sheets-polyfill'; // for CSSStyleSheet.replaceSync
    import { getLanguageDirection } from '@oat-sa-private/ui-core';
    import { hasClass } from '../interactions/util/attributes.js';

    const dispatch = createEventDispatcher();

    export let itemIdentifier;

    //the language/locale code defined in the item (content language)
    export let itemLang;

    //the language/locale code of the application user
    export let userLang;

    //"rtl" or undefined (default)
    export let itemDir;

    // classes on the QTI XML item element
    export let itemClassList = '';
    const separatorBetweenColumns = hasClass(itemClassList, 'separator-between-columns');
    const removeInstructions =
        hasClass(itemClassList, 'remove-instructions') || hasClass(itemClassList, '__custom__remove-instructions');
    const writingMode = hasClass(itemClassList, 'writing-mode-vertical-rl') ? 'vertical-rl' : null;

    export let options = {};

    //the item content as a tree
    export let blockTree = [];

    //list of custom layouts
    export let layouts = [];

    //to handle and resolve assets
    export let assetManager;

    //the current item state
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);

    // stylesheets (from current item's data)
    export let stylesheets = {};

    // PCI definition in item data
    export let pci;

    // Additional data attached to the item
    export let extraData;

    //list of elements' Promises we need to wait
    let loading = [];

    // to track the used hrefs of child Include components
    let xincludeHrefs = [];

    // Boolean which reacts to mounted state of component
    let itemBlocksMounted = false;

    const logger = loggerFactory(`item/${itemIdentifier}`);

    const listeners = {};

    /**
     * Triggers event on subscribed Itemblocks (interactions, etc)
     * The function is exported, so it can be called from outside
     * @param {string} eventName
     * @param {object} parameters
     */
    export const trigger = (eventName, parameters) => {
        const eventListeners = listeners[eventName];
        if (eventListeners) {
            eventListeners.forEach(eventListener => {
                eventListener(parameters);
            });
        }
    };

    /**
     * Suspended state will destroy interactions, so they should be requested
     * to save their states
     */
    $: if ($itemSessionStatusStore && itemSessionStatusStore.isSuspended) {
        trigger('stateupdate');
    }

    // the text direction should be specified together with the item's language, otherwise it is inferred
    $: dir = itemDir || (itemLang && getLanguageDirection(itemLang));
    const isVerticalWritingMode = writingMode === 'vertical-rl';

    let wrapperElement;
    let onDestroyScrollShadows;
    let hasLeftShadow, hasRightShadow;

    // Notifications related to the item
    let itemNotificationKeys = [];

    let sequentialInteractionsStore;
    let currentResponseIdentifier;
    let unsubscribeFromCurrentResponseIdentifier;

    if (options.renderer === 'common') {
        /**
         * API for interactions to use to register as sequential and be synchronised
         * Its previous state must be loaded at this earliest opportunity
         */
        sequentialInteractionsStore = getItemSequentialInteractionsStore(itemIdentifier);
        sequentialInteractionsStore.loadState();

        /** @type {import('svelte/store').Writable<string>} */
        currentResponseIdentifier = sequentialInteractionsStore.currentResponseIdentifier;

        if (options.categories?.includes('x-tao-sequence-ended-nav-next')) {
            unsubscribeFromCurrentResponseIdentifier = currentResponseIdentifier.subscribe(value => {
                if (value === null && sequentialInteractionsStore.didStart) {
                    dispatch('sequence-ended-nav-next');
                }
            });
        }
    }

    const itemSettingsStore = getItemSettingsStore(itemIdentifier);

    /**
     * Create an item context available to
     * all sub components through the item identifier
     */
    setContext(itemIdentifier, {
        /**
         * Get the asset manager to resolve URLs
         * @returns {Object} the asset manager
         */
        getAssetManager() {
            return assetManager;
        },

        /**
         * Register a promise for any element which is loading
         * @param {Promise|Function} loadingPromise - a promise or a function returning a promise
         */
        registerLoadingElement(loadingPromise) {
            loading.push(loadingPromise);
        },

        /**
         * Get an instance of the logger
         * @returns {Object} the logger
         */
        getLogger() {
            return logger;
        },

        /**
         * Get the item language
         * @returns {string} the item lang code
         */
        getItemLang() {
            return itemLang;
        },

        /**
         * Get the user language
         * @returns {string} the user lang code
         */
        getUserLang() {
            return userLang;
        },

        /**
         * Get the language code for the instructions, controls and feedback blocks inside the item.
         * We return a language only if the user language is not the item language
         * @returns {string|undefined} the language code for the instructions
         */
        getInstructionsLang() {
            if (userLang && itemLang && userLang !== itemLang) {
                return userLang;
            }
        },

        /**
         * Get the item's writing mode; applicable to languages which support vertical writing.
         * @returns {string?} `"vertical-rl"` or `null`
         */
        getWritingMode() {
            return writingMode;
        },

        /**
         * Get the item's list of xinclude hrefs
         * @returns {String[]}
         */
        getXIncludeHrefs() {
            return xincludeHrefs;
        },

        /**
         * Get PCI definition
         * @param {string} typeIdentifier - PCI type identifier
         * @returns {object|null} PCI definition
         */
        getPCI(typeIdentifier) {
            const pciDefinition = pci[typeIdentifier];
            // version check can be implemented here
            if (pciDefinition && pciDefinition[0]) {
                return pciDefinition[0];
            }
            return null;
        },

        /**
         * In a review context, get the session substate
         * @returns {String} - question/answer/correct
         */
        getReviewSessionSubstate() {
            return options.reviewSessionSubstate;
        },
        /**
         * Get 'testContext' property from the options
         * @returns {Object}
         */
        getTestContext() {
            return options.testContext;
        },

        /**
         * Get 'extraData' property from the itemData
         * @returns {Object|null}
         */
        getExtraData() {
            return extraData;
        },

        /**
         * From passed options, get callback which is used when uploading attachments
         * @returns {Function} (itemIdentifier: String, responseIdentifier: String) => Promise<{uploadMethod, uploadUrl, downloadUrl, id, uploadServiceType}>
         */
        getGetAttachmentsUploadData() {
            return options.getAttachmentsUploadData;
        },

        /**
         * From passed options, get generic API data fetcher function (usually from a TR proxy).
         * Not guaranteed to exist
         * @returns {Function?}
         */
        getGetData() {
            return options.getData;
        },

        /**
         * Register an event handler for an event
         * @param {string} eventName
         * @param {() => void} listener
         */
        on(eventName, listener) {
            if (!listeners[eventName]) {
                listeners[eventName] = [listener];
            } else {
                listeners[eventName].push(listener);
            }
        },

        /**
         * Unregister an event handler from an event
         * @param {string} eventName
         * @param {() => void} listener
         */
        off(eventName, listener) {
            if (listeners[eventName]) {
                listeners[eventName] = listeners[eventName].filter(handler => handler !== listener);
            }
        },

        /**
         * Trigger an event for the attached listeners
         */
        trigger,

        /**
         * Trigger an error event
         * @param {Error} error
         * @fires error
         */
        triggerError(error) {
            dispatch('error', error);
        },

        showItemNotification,
        removeItemNotification,
        clearItemNotifications,
        clearItemNotificationsByKeys
    });

    // A context dedicated to exposing the static configuration
    setContext('itemRunnerConfig', {
        options: {
            get stylePromptAsHeader() {
                return options?.itemRunnerConfig?.options?.stylePromptAsHeader;
            },
            get hideTooltips() {
                const hideTooltipsOptionValue = options?.itemRunnerConfig?.options?.hideTooltips;
                return hideTooltipsOptionValue ?? true;
            },
            get reRankHeadings() {
                return options?.itemRunnerConfig?.options?.reRankHeadings ?? true;
            }
        },
        elements: {
            get ExtendedTextInteraction() {
                return options?.itemRunnerConfig?.elements?.ExtendedTextInteraction;
            }
        }
    });

    /**
     * Show a Notification in the global NotificationContainer, and keep track of it
     * @see https://github.com/oat-sa/live-design-system/blob/master/packages/components/notification/Notification.svelte
     * @param {Object} notification
     * @param {String} notification.message
     * @param {String} notification.hierarchy
     * @param {Boolean} notification.closeable
     * @param {String} persistence
     * @param {Number} timeout
     * @returns {String} its key
     */
    function showItemNotification(notification, persistence, timeout) {
        const key = showNotification(notification, persistence, timeout);
        itemNotificationKeys.push(key);
        return key;
    }

    /**
     * Remove a single notification
     * @param {String} removalKey
     */
    function removeItemNotification(removalKey) {
        removeNotification(removalKey);
        itemNotificationKeys = itemNotificationKeys.filter(key => key !== removalKey);
    }

    /**
     * Clear all the item's notifications
     */
    function clearItemNotifications() {
        for (const key of itemNotificationKeys) {
            removeNotification(key);
        }
    }

    /**
     * Clear given notifications
     * @param {String[]} keys
     */
    function clearItemNotificationsByKeys(keys = []) {
        for (const key of keys) {
            removeNotification(key);
        }
    }

    const itemScopeSelector = `.qti-item[data-item-id="${itemIdentifier}"]`;

    // resolve item stylesheets hrefs via assetManager - must only be done once
    const resolvedItemStylesheets = Object.values(stylesheets)
        .map(stylesheet => {
            if (assetManager && stylesheet && stylesheet.attributes && stylesheet.attributes.href) {
                const { href, scope } = stylesheet.attributes;

                return {
                    href: assetManager.resolve(href),
                    scope
                };
            }
            return null;
        })
        .filter(s => s);

    // Prepare runner stylesheet for StylesheetsLoader to inject into DOM.
    let itemRunnerStylesheet;
    if (options?.itemRunnerConfig?.itemStyles) {
        itemRunnerStylesheet = new CSSStyleSheet();
        itemRunnerStylesheet.replaceSync(options.itemRunnerConfig.itemStyles);
        itemRunnerStylesheet.scope = itemScopeSelector;
        // its href must remain undefined
    }

    const resolvedStylesheets = [itemRunnerStylesheet, ...resolvedItemStylesheets].filter(Boolean);

    /**
     * Wait for custom stylesheets
     * @type {DeferredPromise} - resolved immediately if no stylesheets, or later by StylesheetsLoader component event
     */
    let stylesheetsPromise;

    /**
     * Load custom stylesheets if any
     * @returns {Promise} resolves once loaded
     */
    function loadCustomStyles() {
        stylesheetsPromise = new DeferredPromise();
        if (stylesheets && Object.keys(stylesheets).length) {
            return stylesheetsPromise.promise.then(() => {
                wrapperElement.dataset.styled = true;
            });
        }
        return Promise.resolve();
    }

    /**
     * Handler for StylesheetsLoader 'complete' event
     */
    function handleStylesheetsComplete() {
        if (stylesheetsPromise) {
            stylesheetsPromise.resolve();
        }
    }

    /**
     * Load item stylesheets and assets registered by components
     * @fires ready
     * @fires error
     */
    function loadAll() {
        itemBlocksMounted = true;
        Promise.all([
            loadCustomStyles(),
            ...loading.map(elementLoading => {
                //execute functions on mount so loading relying on elements are safe
                if (typeof elementLoading === 'function') {
                    return elementLoading();
                }
                return elementLoading;
            })
        ])
            .then(() => {
                // all registered elements are loaded, and should re-register if needed in future
                loading = [];
                dispatch('ready');
            })
            .catch(err => dispatch('error', err));
    }

    let doNotPlayMedia = false;
    let isSubscribedToDoNotPlayMedia = false;

    /**
     * Start the sequence of interactions, if there is one
     */
    function startSequence() {
        sequentialInteractionsStore.didStart = false;
        if (sequentialInteractionsStore?.length && !$currentResponseIdentifier) {
            sequentialInteractionsStore.start();
        }
    }

    function onDoNotPlayMediaChange() {
        if (isSubscribedToDoNotPlayMedia) {
            if (doNotPlayMedia) {
                //store audioRecordingPCI state; audioRecordingPCI shouldn't be destroyed yet!
                trigger('stateupdate', {
                    response: false, //PISA25-697: for PISA Trend item PCIs, getResponse() triggers end of lifecycle
                    state: true
                });
            } else {
                //as on mount
                if (sequentialInteractionsStore) {
                    sequentialInteractionsStore.loadState();
                    startSequence();
                }
            }
        }
    }

    $: {
        let newDoNotPlayMedia = !!$itemSettingsStore.doNotPlayMedia;
        if (doNotPlayMedia !== newDoNotPlayMedia) {
            doNotPlayMedia = newDoNotPlayMedia;
        }
    }
    $: onDoNotPlayMediaChange(doNotPlayMedia);

    afterUpdate(() => {
        // make interactions to not focusable, when no proper review mode is implemented
        if (wrapperElement && options.renderer === 'review') {
            const interactions = wrapperElement.querySelectorAll('.qti-interaction:not(.qti-reviewInteraction)');

            if (interactions) {
                interactions.forEach(interaction => {
                    getKeyboardFocusableElements(interaction).forEach(element => {
                        element.setAttribute('tabindex', '-1');
                    });
                });
            }
        }
    });

    onMount(() => {
        if (sequentialInteractionsStore) {
            if (!doNotPlayMedia) {
                // This starts a registered interaction sequence from its beginning,
                // in the case where no previous state was restored to that sequence.
                startSequence();
            }
            isSubscribedToDoNotPlayMedia = true;
        }

        if (isVerticalWritingMode) {
            onDestroyScrollShadows = addScrollShadows([
                [
                    wrapperElement,
                    (hasLeft, hasRight) => {
                        if (hasLeft !== hasLeftShadow || hasRight !== hasRightShadow) {
                            hasLeftShadow = hasLeft;
                            hasRightShadow = hasRight;
                        }
                    }
                ]
            ]);
        }
    });

    onDestroy(() => {
        clearItemNotifications();
        if (sequentialInteractionsStore) {
            unsubscribeFromCurrentResponseIdentifier?.();
            releaseItemSequentialInteractionsStore(itemIdentifier);
            sequentialInteractionsStore = null;
        }
        onDestroyScrollShadows?.();
    });
</script>

<style>
    /**
     * Generate the column layout
     * @param $number - the column number .qti-layout-col6
     */
    @define-mixin layout-col $number: 12 {
        & .grid-row .offset-$(number),
        & .qti-layout-row .qti-layout-offset$(number) {
            grid-column-start: calc($number + 1);
        }
        & .grid-row .col-$(number),
        & .qti-layout-row .qti-layout-col$(number) {
            position: relative;
            grid-column-end: span $number;
        }
    }

    /**
     * Apply style content to rows
     */
    @define-mixin rows {
        & .grid-row,
        & .qti-layout-row {
            @mixin-content;
        }
        & .colrow {
            margin-block-end: var(--space-4x);
            clear: both;
        }
    }

    /**
     * Apply style content to columns
     */
    @define-mixin cols {
        & [class^='col-'],
        & [class*=' col-'],
        & [class^='qti-layout-col'],
        & [class*=' qti-layout-col'] {
            @mixin-content;
        }
    }

    /**
     * Apply style content only to columns that are direct children of container
     */
    @define-mixin direct-child-cols {
        & > [class^='col-'],
        & > [class*=' col-'],
        & > [class^='qti-layout-col'],
        & > [class*=' qti-layout-col'] {
            @mixin-content;
        }
    }

    @define-mixin scroll-shadow-leftright-base {
        /* nested & is needed otherwise syntax highlighting breaks in template part of file */
        & {
            position: absolute;
            top: 0;
            height: 100%;
            width: 3rem; /* because inset box-shadow is used. 0 otherwise. */
            z-index: var(--layer-2);
            pointer-events: none;
        }
    }

    /**
     * The container into which this component expects to be rendered.
     * This is needed for the @container queries to work.
     * Although `container-type: size` would be desirable for querying its aspect-ratio below,
     * this is not compatible with the TestLayout.
     */
    :global(.qti-item-container) {
        container-type: inline-size;
    }

    /**
     * QTI shared vocabulary classes,
     * TAO custom classes (compatibility layer with the TAO authoring)
     */
    .qti-item {
        min-height: 30rem;

        --item-container-block-size: var(--item-container-height);
        --item-container-inner-block-size: calc(var(--item-container-block-size) - 2rem);
        --item-container-offset-block-start: var(--item-container-offset-top);
        position: relative;
        block-size: 100%;

        /**
         * reduce standard sizes of LDS headings and paragraphs, to the specified sizes for item-runner
         */
        --item-fontsize-heading-xxl: calc(var(--fontsize-heading-xxl) * 0.7); /* 3.5rem */
        --item-fontsize-heading-xl: calc(var(--fontsize-heading-xl) * 0.767); /* 2.875rem */
        --item-fontsize-heading-l: calc(var(--fontsize-heading-l) * 0.95); /* 2.375rem */

        --dir-typography-bold-weight: 700;
        --dir-typography-italic-style: italic;

        & :global-nested {
            /** unset LDS styles which force bold/italic elements to become 'normal' in RTL  */
            & [dir='rtl'],
            & [dir='ltr'] [dir='rtl'],
            & [dir='rtl'] [dir='ltr'] [dir='rtl'],
            & [dir='ltr'] [dir='rtl'] [dir='ltr'] [dir='rtl'] {
                --dir-typography-bold-weight: 700;
                --dir-typography-italic-style: italic;
            }

            & h1 {
                font-size: var(--item-fontsize-heading-xxl);
                line-height: calc(var(--line-height-heading) * 3.333rem);
                margin-inline: 0;
                margin-block: var(--space-4x) var(--space-2x);
            }

            & h2 {
                font-size: var(--item-fontsize-heading-xl);
                line-height: calc(var(--line-height-heading) * 3.333rem);
                margin-inline: 0;
                margin-block: var(--space-3x) var(--space-2x);
            }

            & h3 {
                font-size: var(--item-fontsize-heading-l);
                line-height: calc(var(--line-height-heading) * 2.5rem);
                margin-inline: 0;
                margin-block: var(--space-3x) var(--space-1x);
            }

            & h4,
            & h5,
            & h6 {
                line-height: calc(var(--line-height-heading) * 2.5rem);
                margin-inline: 0;
                margin-block: var(--space-3x) var(--space-1x);
            }

            & p {
                margin-inline: 0;
                margin-block: var(--space-1x);
            }
            & ruby rt span.txt-underline,
            & ruby rt span.txt-dashed,
            & ruby rt span.txt-wavy,
            & ruby rt span.txt-strike {
                /*  hide text decorations on ruby tags (ckeditor fix) */
                text-decoration: none;
            }
            & .qti-underline,
            & .txt-underline {
                text-decoration: underline;
            }
            & .txt-strike {
                text-decoration: line-through;
            }
            & .txt-dashed,
            & .txt-wavy {
                text-decoration-color: currentColor;
                text-decoration-line: underline;
            }
            & .txt-dashed {
                text-decoration-style: dashed;
            }
            & .txt-wavy {
                text-decoration-style: wavy;
            }
            & .qti-italic {
                font-style: italic;
            }
            & .qti-align-center,
            & .txt-ctr {
                text-align: center;
            }
            & .qti-align-left,
            & .txt-lft {
                text-align: left;
            }
            & .qti-align-right,
            & .txt-rgt {
                text-align: right;
            }
            & .txt-jty {
                text-align: justify;
            }
            & .txt-highlight {
                padding-inline: 5px;
                padding-block: 0;
                background: #ff6416;
                color: #ffffff;
            }

            & .tao-full-height,
            & .tao-three-quarters-height,
            & .tao-two-thirds-height,
            & .tao-half-height,
            & .tao-third-height,
            & .tao-quarter-height {
                @mixin direct-child-cols {
                    /* to make nested '.tao-overflow-y' work */
                    display: flex;
                    flex-flow: column nowrap;
                }
            }
            & .qti-fullwidth {
                inline-size: 100%;
            }
            & .tao-overflow-y {
                overflow-y: auto;
            }
            & .tao-overflow-y:focus-visible {
                outline: none;
                @add-mixin simple-outline;
            }
            & blockquote {
                margin-inline: 4rem;
                margin-block: 0 1rem;
                display: block;
            }
            & hr {
                margin-inline: 0;
                margin-block: 1rem;
                padding-inline: 0;
                padding-block: 1rem;
                overflow: hidden;
                &::after {
                    background: none;
                    border-block-start: solid 1px currentcolor;
                }
            }
            & .qti-hidden {
                display: none;
            }
            & .qti-visually-hidden {
                @mixin visually-hidden;
            }
            & .wrap-left {
                float: inline-start;
                margin-inline: 0 2.5rem;
                margin-block: 2.5rem;
            }
            & .wrap-right {
                float: inline-end;
                margin-inline: 2.5rem 0;
                margin-block: 2.5rem;
            }
            & .tao-centered {
                margin-inline: auto;
                margin-block: 2.5rem;
                display: block;
            }

            /* remove top/bottom margin of first/last col- element */
            @mixin cols {
                & > :first-child,
                & > .colrow:first-child > :first-child {
                    margin-block-start: 0;
                }
                & > :last-child,
                & > .colrow:last-child > :last-child {
                    margin-block-end: 0;
                }
            }
        }

        /* Prevent from showing the instructions and the constraints */
        &.remove-instructions {
            & :global(.qti-interaction .qti-instruction-container) {
                display: none;
            }
        }
    }

    .scroll-shadow-left {
        left: 0;
        @add-mixin scroll-shadow-leftright-base;
        @add-mixin shadow-left-inset;
    }
    .scroll-shadow-right {
        right: 0;
        @add-mixin scroll-shadow-leftright-base;
        @add-mixin shadow-right-inset;
    }

    /* make interactions to not clickable, when
        - no proper review mode is implemented
        - in closed status
    */
    .closed {
        pointer-events: none;
        opacity: 0.628;
    }
    section[data-renderer='review'] :global(.qti-interaction:not(.qti-reviewInteraction)) {
        pointer-events: none;
    }

    /* override NotificationContainer's default positioning */
    .notification-container-wrapper {
        writing-mode: horizontal-tb;
        pointer-events: none; /* it may cover interactive elements */
        position: fixed;
        z-index: calc(var(--layer-4) + 2);
        inset-block-start: var(--item-container-offset-top);
        inset-inline-end: 0;
        margin-block: 0;
        margin-inline: 1rem; /* should not cover item scrollbar */

        & :global(.notification-wrapper) {
            pointer-events: initial;
        }
    }

    /* above mobile */
    @container (768px <= width) {
        .qti-item {
            /* container height without padding */
            --item-container-inner-block-size: calc(var(--item-container-block-size) - 4rem);

            & :global-nested {
                @mixin rows {
                    position: relative;
                    display: grid;
                    grid-template-columns: repeat(12, minmax(0.5rem, 1fr));
                    gap: 4rem;

                    padding-inline: 4rem;
                    padding-block: 2rem;
                    margin-inline: auto; /* override [class^="grid-"] style from ui-identity */
                    margin-block: 0; /* override [class^="grid-"] style from ui-identity */
                    grid-auto-flow: column;
                    inline-size: 100%;

                    &:first-child {
                        padding-block-start: 2rem;
                    }

                    @mixin rows {
                        padding-inline: 0;

                        /* if sum of colums gap doesn't let space for content we apply a percentage */
                        gap: 2rem min(calc((100% - 6rem) / 12), 3rem);

                        &:first-child {
                            padding-block-start: 0;
                        }
                        &:last-child {
                            padding-block-end: 0;
                        }
                    }
                }

                @mixin layout-col 1;
                @mixin layout-col 2;
                @mixin layout-col 3;
                @mixin layout-col 4;
                @mixin layout-col 5;
                @mixin layout-col 6;
                @mixin layout-col 7;
                @mixin layout-col 8;
                @mixin layout-col 9;
                @mixin layout-col 10;
                @mixin layout-col 11;
                @mixin layout-col 12;

                /* without grid we add top/bottom margins */
                & > :not(.grid-row):not(.qti-layout-row):not(.qti-modalFeedback) {
                    margin-inline: 4rem;
                    &:first-child {
                        margin-block-start: 2rem;
                    }
                    &:last-child {
                        margin-block-end: 2rem;
                    }
                }

                & .tao-full-height {
                    block-size: var(--item-container-inner-block-size);
                    &.grid-row {
                        block-size: auto; /* support old items authored the wrong way: TRN-571  */
                    }
                }
                & .tao-three-quarters-height {
                    block-size: calc(var(--item-container-inner-block-size) * 0.75);
                }
                & .tao-two-thirds-height {
                    block-size: calc(var(--item-container-inner-block-size) * 0.66);
                }
                & .tao-half-height {
                    block-size: calc(var(--item-container-inner-block-size) * 0.5);
                }
                & .tao-third-height {
                    block-size: calc(var(--item-container-inner-block-size) * 0.33);
                }
                & .tao-quarter-height {
                    block-size: calc(var(--item-container-inner-block-size) * 0.25);
                }
            }

            &.separator-between-columns {
                & > :global-nested(.grid-row) {
                    /* column gap needs to be increased from 4rem to 8rem, but only between col-* columns (where separator appears) */
                    /* using margin for this because if all 11 gaps are 8rem the item will be too wide */
                    @mixin direct-child-cols {
                        position: relative;
                        margin-inline: 2rem;

                        &:first-child {
                            margin-inline-start: 0;
                        }
                        &:last-child {
                            margin-inline-end: 0;
                        }
                    }

                    /* column separator pseudo-element */
                    /* expected layout for this feature is col-6 col-6, but we try to support other variants */
                    & > [class^='col-'] + [class^='col-']::before {
                        content: '';
                        position: absolute;
                        inset-block-start: 0;
                        inset-block-end: 0;
                        inset-inline-start: -4rem;
                        inline-size: var(--border-medium);
                        background: var(--color-border-default);
                    }
                }
            }
        }
    }

    /* above mobile for double column layout*/
    @container (768px <= width) {
        [data-layouts~='dualColumnLayout'] {
            & :global-nested {
                & > .grid-row > [class^='col-'] {
                    block-size: 100%;
                    overflow: hidden;
                }
                & > .grid-row:first-child {
                    padding-top: 0;
                    block-size: var(--item-container-block-size);
                }
                & > .grid-row > [class^='col-'] > .scrollable-container {
                    overflow-x: hidden;
                    overflow-y: auto;
                    block-size: 100%;
                }
                & > .grid-row {
                    block-size: var(--item-container-block-size);
                    gap: 0;
                    grid-gap: 0;
                    padding: 0;

                    & [class^='col-'] .scrollable {
                        margin: 2rem; /* margin because of focus-visible border*/
                    }
                }
            }
            &.closed {
                opacity: unset;
                pointer-events: unset;
                user-select: unset;

                & :global(.scrollable) {
                    pointer-events: none;
                    opacity: 0.5;
                    user-select: none;
                }
            }
        }
    }

    /* tablets + portrait for double column layout */
    @media screen and (orientation: portrait) {
        @container (768px <= width < 1201px) {
            [data-layouts~='dualColumnLayout'] {
                & :global-nested {
                    /* convert each col to vertical grid */
                    & > .grid-row {
                        display: flex;
                        flex-direction: column;

                        @define-mixin layout-row $number: 12 {
                            & > .offset-$(number),
                            & > .qti-layout-offset$(number) {
                                grid-row-start: calc($number + 1);
                                grid-column-start: 1;
                            }
                            & > .col-$(number),
                            & > .qti-layout-col$(number) {
                                --grid-row-height: calc(
                                    var(--item-container-block-size) / 12 * $number - 0.125rem
                                ); /* 0.125 rem - half of space between first and bottom columns*/
                                --grid-row-inner-height: calc(var(--grid-row-height) - 4rem);
                                position: relative;
                                grid-template-rows: repeat($number, minmax(0.5rem, 1fr));
                                grid-auto-flow: row;
                                gap: 0;
                                display: grid;
                                block-size: var(--grid-row-height);

                                & > .scrollable-container {
                                    grid-row-end: span $number;
                                    grid-column-end: 1;
                                }
                            }
                        }

                        @mixin layout-row 1;
                        @mixin layout-row 2;
                        @mixin layout-row 3;
                        @mixin layout-row 4;
                        @mixin layout-row 5;
                        @mixin layout-row 6;
                        @mixin layout-row 7;
                        @mixin layout-row 8;
                        @mixin layout-row 9;
                        @mixin layout-row 10;
                        @mixin layout-row 11;
                        @mixin layout-row 12;

                        & [class^='col-'] .scrollable {
                            margin-inline: 4rem; /* margin because of focus-visible border*/
                            margin-block: 2rem;
                        }

                        /* space between top and bottom cols*/
                        & > [class^='col-']:first-child {
                            margin-block-end: 0.25rem;
                        }

                        /******* following styles fixing issue with expanding dropdown list. Temporary solution *****/

                        /* Notify dropdown by height and offset of container, which limits list height */
                        & [class^='col-']:first-child .scrollable {
                            & .qti-inlineChoiceInteraction {
                                /* --dropdown-total-max-height should be limited by height of top column */
                                --dropdown-total-max-height: var(--grid-row-height);
                                --dropdown-viewport-offset-top: var(--item-container-offset-block-start);
                            }
                        }
                        & [class^='col-']:last-child .scrollable {
                            & .qti-inlineChoiceInteraction {
                                /* --dropdown-total-max-height should be limited by height of top column */
                                --dropdown-total-max-height: calc(
                                    var(--item-container-block-size) + var(--item-container-offset-block-start)
                                );
                                --dropdown-viewport-offset-top: 0px;
                            }
                        }

                        /* Forcibly expand dropdown list downwards. Copied from dropdown element */
                        & .expands-up .listbox-wrapper {
                            position: relative;
                            inset-block-start: calc(-1 * var(--border-thin));
                            z-index: var(--layer-2);
                            inline-size: 100%;
                            max-inline-size: 100%;

                            & .listbox {
                                max-block-size: min(var(--visible-options-height), var(--list-expands-down-max-height));
                            }
                        }

                        /* Fix issue if dropdown places in very bottom of the page and list do not have space to expand */
                        & .scrollable .scroll-last-child {
                            block-size: 8rem;
                        }
                    }
                }
            }
        }
    }

    /**
     * Change from side-by-side columns within each row, to stacked
     * Usually needed for smaller screen sizes
     */
    @define-mixin stacked-cols {
        & :global-nested {
            @mixin rows {
                position: relative;
                display: grid;
                grid-template-columns: minmax(0.5rem, 1fr);
                gap: 2rem;
                padding-inline: 2rem;
                padding-block: 1rem;
                margin-inline: auto; /* override [class^="grid-"] style from ui-identity */
                margin-block: 0;
                grid-auto-flow: row;
                inline-size: 100%;

                @mixin rows {
                    padding: 0;
                }
            }
            @mixin cols {
                grid-column: span 1;
            }

            /* without grid we add top/bottom margins */
            & > :not(.grid-row):not(.qti-layout-row):not(.qti-modalFeedback) {
                margin-inline-start: 2rem;
                margin-inline-end: 2rem;
                &:first-child {
                    margin-block-start: 1rem;
                }
                &:last-child {
                    margin-block-end: 1rem;
                }
            }

            & .tao-overflow-y {
                max-block-size: calc(var(--item-container-block-size) / 2);
            }
        }
    }

    /**
     * Hide added separator
     */
    @define-mixin hide-separator-between-columns {
        & > :global-nested(.grid-row) {
            @mixin direct-child-cols {
                position: relative;
                margin-inline: 0;
            }

            & > [class^='col-'] + [class^='col-']::before {
                content: none;
            }
        }
    }

    /* below large screen size, with high level of a11y zoom applied */
    :global(body[data-zoom-level='200']),
    :global(body[data-zoom-level='175']),
    :global(body[data-zoom-level='150']) {
        @container (width < 1201px) {
            & .qti-item {
                @mixin stacked-cols;

                &.separator-between-columns {
                    @mixin hide-separator-between-columns;
                }
            }
        }
    }

    /* below tablet screen size, with medium level of a11y zoom applied */
    :global(body[data-zoom-level='125']) {
        @container (width < 993px) {
            & .qti-item {
                @mixin stacked-cols;

                &.separator-between-columns {
                    @mixin hide-separator-between-columns;
                }
            }
        }
    }

    /* mobile */
    @media screen {
        :global(:where(body:not(.booklet-export-mode))) {
            @container (width < 768px) {
                & .qti-item {
                    @mixin stacked-cols;

                    &.separator-between-columns {
                        @mixin hide-separator-between-columns;
                    }
                }
            }
        }
    }

    :global(.qti-item-container .qti-item .grid-row .col-6) {
        /* width fix for two line columns */
        inline-size: auto;
    }

    .qti-item.writing-mode-vertical-rl {
        --line-height-default-ruby: 1.8;
        --item-container-block-size: var(--item-container-width);
        --item-container-offset-block-start: var(--item-container-offset-right);

        writing-mode: vertical-rl;
        inline-size: var(--item-container-height);
        overflow-x: auto;
        overscroll-behavior-x: contain;
        text-underline-position: right; /* overlaps ruby tags */
        line-height: var(--line-height-default-ruby); /* because of possible ruby tags [lang dependent] */

        & :global-nested {
            & .tao-overflow-y {
                overflow-y: visible;
                overflow-x: auto;
                position: relative; /* has-left-shadow/has-right-shadow */
            }

            /*underlines and sub/superscript*/
            & .txt-underline {
                text-underline-position: right;
            }
            & .txt-subscript {
                inset-block-start: -0.9em;
                bottom: 0;
            }
            & .txt-superscript {
                inset-block-end: -0.4em;
                top: 0;
            }
            /*special case for ruby text - shift ruby text after underline*/
            & .txt-underline,
            & .txt-dashed,
            & .txt-wavy {
                & ruby rt {
                    position: relative;
                    inset-block-start: -1rem;
                }
            }

            & ruby rt > .txt-wavy {
                position: relative;
                left: 0.7rem;
            }
            /* wavy underline of subscript needs additional space to be shown */
            & .custom-text-box {
                padding-block-start: var(--space-1x5);
            }
        }
    }

    /* mobile vertical-writing-mode:
     stack because 4rem `gap` between 12 grid cols causes row to exceed height of container */
    @media screen and (max-height: 600px) {
        :global(:where(body:not(.booklet-export-mode))) {
            & .qti-item.writing-mode-vertical-rl {
                @mixin stacked-cols;

                &.separator-between-columns {
                    @mixin hide-separator-between-columns;
                }
            }
        }
    }

    @media print {
        .qti-item {
            block-size: auto;
            overflow: visible;

            & :global-nested {
                & .not-printable {
                    display: none !important;
                }

                & .not-printable-interaction > *:not(.qti-prompt) {
                    display: none !important;
                }

                @mixin rows {
                    /* with grid/flex, Firefox may cut lines of text in the middle */
                    display: block !important;

                    @mixin cols {
                        display: block !important;
                    }
                }

                /* scrollable containers */
                & .tao-full-height,
                & .tao-three-quarters-height,
                & .tao-two-thirds-height,
                & .tao-half-height,
                & .tao-third-height,
                & .tao-quarter-height {
                    block-size: auto;
                }
                & .tao-overflow-y {
                    overflow: visible;
                }
                & .dual-column-layout {
                    & .grid-row,
                    & .grid-row > *,
                    & .grid-row > * > .scrollable-container {
                        block-size: auto;
                        overflow: visible;
                    }
                }

                /* adjust styles (risky! can break custom content)
                   which have potential to overflow page-width and cause text in the same container to be cut off  */
                & img {
                    max-inline-size: 100%;
                }
                & table {
                    table-layout: fixed;
                    inline-size: 100%;
                }
            }
        }
    }
</style>

{#if $itemSessionStatusStore && !itemSessionStatusStore.isSuspended}
    {#if isVerticalWritingMode}
        <div class="scroll-shadow-left" class:hidden={!hasLeftShadow} />
    {/if}
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <section
        bind:this={wrapperElement}
        translate="no"
        class="qti-item {$itemSessionStatusStore} notranslate"
        class:separator-between-columns={separatorBetweenColumns}
        class:remove-instructions={removeInstructions}
        class:writing-mode-vertical-rl={writingMode === 'vertical-rl'}
        tabindex={isVerticalWritingMode ? '0' : void 0}
        style="
            --item-container-height: {withUnit(options.itemContainerHeight || '80vh')};
            --item-container-offset-top: {withUnit(options.itemContainerOffsetTop || 0)};
            --item-container-width: calc({withUnit(options.itemContainerWidth || '100vw')});
            --item-container-offset-right: calc({withUnit(options.itemContainerOffsetRight || 0)});
            "
        data-item-id={itemIdentifier}
        data-renderer={options.renderer}
        data-layouts={layouts.length ? layouts.join(' ') : void 0}
        lang={itemLang}
        {dir}
        transition:fade={{ duration: 300 }}>
        <ItemBlocks
            {blockTree}
            on:mount={() => {
                loadAll();
                itemBlocksMounted = true;
            }}
            on:destroy={() => (itemBlocksMounted = false)} />

        <!-- The Item can have a NotificationContainer (enabled by options) in case it is a top-level app,
        but by default the Item expects it is rendered within another application which provides this. -->
        {#if options.hasNotificationContainer}
            <div class="notification-container-wrapper">
                <NotificationContainer />
            </div>
        {/if}
    </section>
    {#if isVerticalWritingMode}
        <div class="scroll-shadow-right" class:hidden={!hasRightShadow} />
    {/if}
    <!-- StylesheetsLoader must wait for ItemBlocks, because it mustn't complete before loadCustomStyles assigns stylesheetsPromise -->
    {#if itemBlocksMounted && resolvedStylesheets.length}
        <StylesheetsLoader
            stylesheets={resolvedStylesheets}
            {itemScopeSelector}
            convertPxToRemOptions={$itemSettingsStore?.a11yMenuPanel?.convertPxToRem}
            on:complete={handleStylesheetsComplete} />
    {/if}
{/if}
