<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;
    import { getContext, tick } from 'svelte';
    import {
        remToPx,
        dragScrollable,
        __,
        generateElementId,
        getActualKey,
        arrowKeysFocusLoop
    } from '@oat-sa-private/ui-core';
    import Prompt from '../../Prompt.svelte';
    import Svg from '../Svg.svelte';
    import AssociableHotspot from './AssociableHotspot.svelte';
    import { getInteractionStateStore } from '../../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../../itemSessionStatus.js';
    import { hasClass } from '../../util/attributes.js';
    import { getScaledCoords } from '../util/scaling.js';
    import Choice from './Choice.svelte';
    import { isRTLElement, sortChoicesByBoundingBox } from '../util/focusorder.js';
    import preventSpaceScroll from '../../util/actions/preventSpaceScroll.js';
    import resizeObserve from '../../util/actions/resizeObserve.js';
    import dropAreaRegistryFactory from './util/dropAreaRegistry.js';
    import setupDroparea from './util/actions/setupDroparea.js';
    import ariaHelperFactory from './util/ariaHelper.js';
    import sizingHelperFactory from './util/sizingHelper.js';
    import matchesHelperFactory from './util/matchesHelper.js';
    import { getPlacedAnswers, getInitialAnswers } from './util/answerPlacement.js';
    import AtomicAriaLive from '../../AtomicAriaLive.svelte';
    import ChoiceFeedbackBlock from '../../feedback/ChoiceFeedbackBlock.svelte';
    import { DeferredPromise } from '../../util/promise.js';
    import { resolveImage } from '../util/resolveImage.js';
    import RenderingError from 'core/error/RenderingError';
    import { areas, getAreasOrder, getPositioning, isHorizontalPosition } from '../../util/sharedVocabulary';

    const qtiClass = 'qti-graphicGapMatchInteraction';

    // response format
    const cardinality = 'multiple';
    const baseType = 'directedPair';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let dir;

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};

    // data attributes
    export let dataAttrs = {};
    const maxSelectionMessage = dataAttrs['data-max-selections-message'];
    const minSelectionMessage = dataAttrs['data-min-selections-message'];

    // interaction-level QTI attributes:
    export let minAssociations = 0;
    export let maxAssociations = 0;
    export let disabled = false;
    export let prompt;
    export let classes = '';

    /**
     * @typedef Choice (from qti 'gapImg')
     * @property {String} key
     * @property {String} data - img src
     * @property {Number} width
     * @property {Number} height
     * @property {String} objectLabel - aria-label
     * @property {Number} matchMin
     * @property {Number} matchMax
     */
    /**
     * @type {Choice[]} - from (from qti 'gapImgs')
     */
    export let choices = [];

    /**
     * @typedef Gap (from qti 'associableHotspot')
     * @property {String} key
     * @property {String} shape
     * @property {String} coords
     * @property {String} hotspotLabel - aria-label
     * @property {Number} matchMin
     * @property {Number} matchMax
     * @property {Object} [svg] - not passed, but set by interaction
     * @property {Number} [cx] - not passed, but set by interaction
     * @property {Number} [cy] - not passed, but set by interaction
     */
    /**
     * @type {Gap[]} - from (from qti 'choices')
     */
    export let gaps = [];

    /**
     * @typedef ImgObject - background image of the graphic interaction
     * @property {String} data - equivalent to src
     * @property {Number} width
     * @property {Number} height
     */
    /**
     * @type {ImgObject}
     */
    export let imgObject;

    const itemContext = getContext(itemIdentifier);

    const instructionsLang = itemContext && itemContext.getInstructionsLang();

    //register image load
    const backgroundImageLoadingPromise = new DeferredPromise();
    itemContext.registerLoadingElement(backgroundImageLoadingPromise.promise);
    const imgSrc = resolveImage(itemContext, imgObject.data);

    //Map of choice keys to their loading DeferredPromise objects
    const choiceImageLoadingPromises = new Map();
    //Map of choice keys to resolved urls
    const resolvedChoiceSrcs = new Map();

    choices.forEach(choice => {
        const choiceImageLoadingPromise = new DeferredPromise();
        choiceImageLoadingPromises.set(choice.key, choiceImageLoadingPromise);
        itemContext.registerLoadingElement(choiceImageLoadingPromise.promise);
        resolvedChoiceSrcs.set(choice.key, resolveImage(itemContext, choice.data));
    });

    const unselectedHidden = hasClass(classes, 'qti-unselected-hidden');
    const allowChoiceResize = hasClass(classes, 'qti-resizable-choice');

    // presentation information from the shared vocabulary
    $: qtiPosition = getPositioning(classes);

    // set in which order the choices and answers areas are displayed
    $: areasOrder = getAreasOrder(qtiPosition);

    const draggableGroupKey = generateElementId('gapmatch');
    const bayLabelId = generateElementId('bay-label');
    let announcement;
    let isInteractionFocused = false; // becomes true when interaction is focused for the first time
    let isGapsMounted = false;
    let dragging = false;
    let selectedChoice = null; //object: {key, gapKey}
    let targetedChoice = null; //object: {key, gapKey}
    let targetedGap = null; //string: key
    let targetedBay = false;

    //design constants
    const choiceGap = remToPx(2.5); //gap between choices in choice-area
    const choiceScrollPadding = remToPx(4); //padding on 'scrollbar' side of choice-area, so user has anchor for touch-scroll
    const choiceAreaPadding = remToPx(1.5); //padding on 3 other sides of choice-area, so selected/targeted/focused choices don't go outside container
    const choiceAreaBottomMargin = remToPx(2.5); //margin on bottom of answer area, only for vertical layout; it's used in css too
    const choiceAreaMaxPortion = 0.333; //how much of container's size can choice-area take at most
    const choiceMaxSizeMobile = remToPx(15); //for choice in choice-area, max size on smaller side, on small screens
    const choiceMaxSizeDesktop = remToPx(20); //for choice in choice-area, max size on smaller side, on big screens
    const choiceMinSize = remToPx(8); //for choice in choice-area, min size on smaller side
    const answerMinSize = allowChoiceResize ? remToPx(2) : remToPx(8); //min size of choice in answer-area
    const choiceBorderSize = remToPx(0.25); //shared with Choice.svelte
    const outerBorderSize = remToPx(0.75); //shared with AssociableHotspot.svelte & Choice.svelte

    //utils
    const dropareaRegistry = dropAreaRegistryFactory();
    const matchesHelper = matchesHelperFactory();
    const ariaHelper = ariaHelperFactory();
    const sizingHelper = sizingHelperFactory(choices, {
        choiceGap,
        choiceScrollPadding,
        choiceAreaPadding,
        choiceAreaBottomMargin,
        choiceAreaMaxPortion,
        choiceMaxSizeMobile,
        choiceMaxSizeDesktop,
        choiceMinSize,
        choiceBorderSize
    });

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
    $: disabledBySession = $itemSessionStatusStore === itemSessionStatus.closed;

    //matches
    let matches = []; //response: choice-gap association: matches[i] = [choiceKey, gapKey]
    let placedAnswers = [];

    // do initial response definition
    if (!interactionStateStore.hasResponse()) {
        interactionStateStore.merge({ qtiClass });
        storeResponse();
    }

    // load the response when the store changed
    $: if ($interactionStateStore) {
        loadResponse();
    }

    //derived from matches
    $: freeChoices = choices.filter(c => matchesHelper.getChoiceRemainingAmount(c, matches) !== 0);
    $: freeGaps = gaps.filter(g => matchesHelper.isGapFree(g.key, matches, gaps));

    // scroll
    // TODO: when forwarding event listeners and actions to components gets implemented - replace with ScrollableWrapper component
    const availableScrollDistance = {
        left: null,
        right: null,
        top: null,
        bottom: null
    };

    /**
     * Load the interaction response
     */
    function loadResponse() {
        let storedResponse = interactionStateStore.getResponseValue();
        if (typeof storedResponse === 'undefined' || storedResponse === null) {
            storedResponse = [];
        }
        matches = storedResponse;
    }
    /**
     * Format and store selected value in interactionStateStore
     */
    function storeResponse() {
        const value = matches.length > 0 ? matches : null;
        const response = {
            cardinality,
            baseType,
            value
        };
        interactionStateStore.setResponseValue(response, getValidity());
    }
    /**
     * Get the validity of the current state
     * @returns {Boolean}
     */
    function getValidity() {
        //interaction
        let validity = validateUsageCount(matches.length, minAssociations, maxAssociations);
        //choices
        if (validity) {
            validity = choices.every(choice => {
                const choiceValid = validateUsageCount(
                    matchesHelper.getChoiceUsageCount(choice.key, matches),
                    choice.matchMin,
                    choice.matchMax
                );
                return choiceValid;
            });
        }
        //gaps
        if (validity) {
            validity = gaps.every(gap => {
                const gapValid = validateUsageCount(
                    matchesHelper.getGapUsageCount(gap.key, matches),
                    gap.matchMin,
                    gap.matchMax
                );
                return gapValid;
            });
        }
        return validity;
    }

    /**
     * Get the validity of usage count according to min/max constraints
     * @param {Number} usageCount - usage count of choice or number of associations in interaction
     * @param {Number} min - matchMin/minAssotiations
     * @param {Number} max - matchMax/maxAssotiations
     * @returns {Boolean}
     */
    function validateUsageCount(usageCount, min, max) {
        if ((min > 0 && usageCount < min) || (max > 0 && usageCount > max)) {
            return false;
        }
        return true;
    }

    /**
     * Command to update response: swap choice/answer with another choice/answer
     * @param {String} sourceKey - choice key of choice/answer to move to new place
     * @param {String} [sourceGapKey] - gap key of answer to move to new place, empty for choice
     * @param {String} targetKey  - choice key of choice/answer to swap with
     * @param {String} [targetGapKey] - gap key of answer to swap with, empty for choice
     */
    function swapMatches(sourceKey, sourceGapKey, targetKey, targetGapKey) {
        matches = matchesHelper.swap(sourceKey, sourceGapKey, targetKey, targetGapKey, matches);
        storeResponse();
    }

    /**
     * Command to update response: add answer or move existing answer to another gap
     * @param {String} sourceKey - choice key of choice/answer to move to new place
     * @param {String} [sourceGapKey] - gap key of answer to move to new place, empty for choice
     * @param {String} targetGapKey - gap key to which to add/move our choice/answer
     */
    function addOrMoveMatch(sourceKey, sourceGapKey, targetGapKey) {
        matches = matchesHelper.addOrMove(sourceKey, sourceGapKey, targetGapKey, matches);
        storeResponse();
    }

    /**
     * Command to update response: remove answer
     * @param {String} choiceKey - choice key of answer to remove
     * @param {String} gapKey - gap key of answer to remove
     */
    function removeMatch(choiceKey, gapKey) {
        matches = matchesHelper.remove(choiceKey, gapKey, matches);
        storeResponse();
    }

    //sizing
    let interactionElement;
    let bayScrollboxElement;
    let answerAreaElement;
    let containerWidth;
    let windowHeight;
    let isHorizontal;
    let bayMaxWidth;
    let bayMaxHeight;
    let choiceWidth;
    let choiceHeight;
    let bayWidth;
    let bayHeight;
    let bayColumns;
    let bayScrollHeight;
    let imgScalingFactor;
    let imgWidth = 10; //needs intital value: otherwise Image.svelte will render later than onMount in Item.svelte, and image won't be registered as loading
    let imgHeight = 10;
    $: isRTL = interactionElement && isRTLElement(interactionElement);
    $: containerMaxHeight = sizingHelper.getContainerMaxHeight(windowHeight);
    $: if (containerMaxHeight && containerWidth) {
        isHorizontal = sizingHelper.getIsHorizontal(isHorizontalPosition(qtiPosition), {
            containerMaxHeight,
            containerWidth
        });
    }
    $: if (containerMaxHeight && containerWidth) {
        ({ bayMaxWidth, bayMaxHeight } = sizingHelper.getBayMaxSize({
            isHorizontal,
            containerWidth,
            containerMaxHeight
        }));
    }
    $: if (bayMaxWidth) {
        ({ choiceWidth, choiceHeight } = sizingHelper.getChoiceSize({
            isHorizontal,
            containerWidth,
            bayMaxWidth,
            bayMaxHeight
        }));
    }
    $: if (choiceWidth) {
        ({ bayColumns, bayWidth, bayHeight } = sizingHelper.getBayContainerSize({
            isHorizontal,
            choiceWidth,
            choiceHeight,
            bayMaxWidth,
            bayMaxHeight,
            containerWidth
        }));
        tick().then(updateAvailableScrollDistance);
    }
    $: if (choiceWidth) {
        bayScrollHeight = sizingHelper.getBayScrollHeight(freeChoices, {
            isHorizontal,
            choiceWidth,
            choiceHeight,
            bayMaxWidth,
            bayMaxHeight,
            containerWidth
        });
        tick().then(updateAvailableScrollDistance);
    }
    $: if (bayWidth) {
        ({ imgScalingFactor, imgWidth, imgHeight } = sizingHelper.getImageSize(imgObject, {
            isHorizontal,
            bayWidth,
            bayHeight,
            containerWidth,
            containerMaxHeight
        }));
    }

    //placedAnswers
    $: if (!isGapsMounted) {
        //all images should be rendered onMount, not after, because this is how image loading registration works (see Choice.svelte)
        //we will place them properly after a few 'tick's.
        placedAnswers = getInitialAnswers(gaps, choices, matches);
    }
    $: if (isGapsMounted && containerWidth && containerMaxHeight) {
        //wait for gap polygon to redraw and for 'center' event of AssociableHotspot to fire
        tick().then(() => {
            if (interactionElement) {
                placedAnswers = getPlacedAnswers(
                    gaps,
                    choices,
                    matches,
                    choiceWidth,
                    choiceHeight,
                    answerMinSize,
                    isRTL,
                    outerBorderSize,
                    choiceBorderSize,
                    allowChoiceResize
                );
            }
        });
    }

    //focus
    let choiceAreaHasFocus = false;
    let lastFocusedChoiceKey;
    let answerAreaHasFocus = false;
    let lastFocusedAnswerKey;
    let lastFocusedGapKey;
    let answerAreaArrowKeysOptions;

    $: choiceKeysInTabOrder = freeChoices.map(c => c.key);
    $: answerKeysInTabOrder = Array.from(placedAnswers)
        .sort((a, b) => a.tabOrder - b.tabOrder)
        .map(a => [getAnswerFocusKey(a.key, a.gapKey), `remover_${getAnswerFocusKey(a.key, a.gapKey)}`])
        .reduce((flattened, val) => flattened.concat(val), []);
    $: gapKeysInAriaOrder = isGapsMounted ? sortChoicesByBoundingBox(gaps, isRTL) : []; //this is not for focus, but for aria-labels
    $: gapKeysInTabOrder = gapKeysInAriaOrder.filter(
        gKey => freeGaps.some(g => g.key === gKey) && (!selectedChoice || selectedChoice.gapKey !== gKey)
    );
    $: {
        if (selectedChoice) {
            answerAreaArrowKeysOptions = {
                focusByKey: focusGapWithKey,
                keysInTabOrder: gapKeysInTabOrder,
                lastFocusedKey: lastFocusedGapKey,
                isRTL
            };
        } else {
            answerAreaArrowKeysOptions = {
                focusByKey: focusAnswerWithKey,
                keysInTabOrder: answerKeysInTabOrder,
                lastFocusedKey: lastFocusedAnswerKey,
                isRTL
            };
        }
    }
    $: shadowVisibility = {
        left: availableScrollDistance.left > 0,
        right: availableScrollDistance.right > 0,
        top: availableScrollDistance.top > 0,
        bottom: availableScrollDistance.bottom > 0
    };

    /**
     * Updates available scroll distance
     */
    function updateAvailableScrollDistance() {
        if (!bayScrollboxElement) {
            return;
        }

        const { scrollLeft, scrollTop, scrollWidth, scrollHeight } = bayScrollboxElement;
        const { clientWidth, clientHeight } = bayScrollboxElement;

        availableScrollDistance.left = Math.ceil(scrollLeft);
        availableScrollDistance.right = Math.floor(scrollWidth - clientWidth - scrollLeft);
        availableScrollDistance.top = Math.ceil(scrollTop);
        availableScrollDistance.bottom = Math.floor(scrollHeight - clientHeight - scrollTop);
    }

    /**
     * Focus choice in choice-area
     * @param {String} focusKey - choice key to focus
     */
    function focusChoiceWithKey(focusKey) {
        const choiceIndex = freeChoices.findIndex(c => c.key === focusKey);
        const choiceElements = Array.from(bayScrollboxElement.querySelectorAll('.choice .drag-anchor'));
        if (choiceIndex !== -1 && choiceIndex < choiceElements.length) {
            choiceElements[choiceIndex].focus();
        }
        lastFocusedChoiceKey = focusKey;
    }

    /**
     * Get single string key for answer, to use it in focus utils
     * @param {String} choiceKey - choice key of answer
     * @param {String} gapKey - gap key of answer
     * @returns {String} answerFocusKey
     */
    function getAnswerFocusKey(choiceKey, gapKey) {
        const answer = placedAnswers.find(a => a.key === choiceKey && a.gapKey === gapKey);
        return answer.concatenatedKey;
    }

    /**
     * Focus answer in answer-area
     * @param {String} focusKey - answer key to focus (use getAnswerFocusKey to get it from choice key & gap key)
     */
    function focusAnswerWithKey(focusKey) {
        const answerIndex = placedAnswers.findIndex(a => getAnswerFocusKey(a.key, a.gapKey) === focusKey);
        if (answerIndex !== -1) {
            const answerElements = Array.from(answerAreaElement.querySelectorAll('.choice .drag-anchor'));
            if (answerIndex < answerElements.length) {
                answerElements[answerIndex].focus();
            }
        } else if (focusKey.startsWith('remover_')) {
            const focusKeyForRemover = focusKey.substring('remover_'.length);
            const removerIndex = placedAnswers.findIndex(
                a => getAnswerFocusKey(a.key, a.gapKey) === focusKeyForRemover
            );
            if (removerIndex !== -1) {
                const removerElements = Array.from(answerAreaElement.querySelectorAll('.choice .remover'));
                if (removerIndex < removerElements.length) {
                    removerElements[removerIndex].focus();
                }
            }
        }
        lastFocusedAnswerKey = focusKey;
    }

    /**
     * Focus gap
     * @param {String} focusKey - gap key to focu
     */
    function focusGapWithKey(focusKey) {
        const gap = gaps.find(g => g.key === focusKey);
        const focusableSvg = gap && gap.svg && gap.svg.parent('.associable-hotspot');
        if (focusableSvg) {
            focusableSvg.node.focus();
        }
        lastFocusedGapKey = focusKey;
    }

    /**
     * Handler for background image load event
     */
    function handleBackgroundImageLoad() {
        backgroundImageLoadingPromise.resolve();
    }

    /**
     * Handler for background image load error
     * @param {CustomEvent} e - {detail: Error}
     */
    function handleBackgroundImageError(e) {
        backgroundImageLoadingPromise.reject(e.detail);
    }

    /**
     * Choice image load event handler
     * @param {String} key
     */
    function handleChoiceImageLoad(key) {
        choiceImageLoadingPromises.get(key).resolve();
    }

    /**
     * Choice image load error event handler
     * @param {String} key
     */
    function handleChoiceImageError(key) {
        choiceImageLoadingPromises
            .get(key)
            .reject(new RenderingError(`choice image "${resolvedChoiceSrcs.get(key)}" could not be loaded`));
    }

    /**
     * Handle mouse click on choice/answer
     * @param {CustomEvent} e
     */
    function handleChoiceClick(e) {
        const { key, gapKey } = e.detail;

        if (selectedChoice) {
            if (canChoiceBeTargeted(selectedChoice.key, selectedChoice.gapKey, key, gapKey)) {
                swapMatches(selectedChoice.key, selectedChoice.gapKey, key, gapKey);
                clearSelectedTargeted();
            } else if (!selectedChoice.gapKey && !gapKey && selectedChoice.key !== key) {
                //choice to another choice
                selectedChoice = { key, gapKey };
            } else {
                clearSelectedTargeted();
            }
        } else {
            selectedChoice = { key, gapKey };
        }
    }

    /**
     * Handle keyboard click on choice/answer
     * @param {CustomEvent} e
     */
    function handleChoiceKeySelect(e) {
        const { key, gapKey } = e.detail;

        if (!selectedChoice) {
            if (gapKeysInTabOrder.length > 0) {
                selectedChoice = { key, gapKey };
                tick().then(() => focusGapWithKey(gapKeysInTabOrder[0]));
            } else {
                announcement = ariaHelper.announceFull(!!gapKey);
            }
        }
    }

    /**
     * Handle mouse click on answer remove button
     * @param {CustomEvent} e
     */
    function handleChoiceClickRemove(e) {
        const { key, gapKey } = e.detail;
        removeMatch(key, gapKey);
        reorderAfterRemove(key);
        announcement = ariaHelper.announceRemoved(key, choices);
        //do not focus removed item - it would cause autoscroll
    }

    /**
     * Handle keyboard click on answer remove button
     * @param {CustomEvent} e
     */
    function handleChoiceKeyRemove(e) {
        const { key, gapKey } = e.detail;
        removeMatch(key, gapKey);
        reorderAfterRemove(key);
        announcement = ariaHelper.announceRemoved(key, choices);
        tick().then(() => focusChoiceWithKey(key));
    }

    /**
     * Handle dragStart on choice/answer
     * @param {CustomEvent} e
     */
    function handleChoiceDragStart(e) {
        const { key, gapKey } = e.detail;
        selectedChoice = { key, gapKey };
        dragging = true;
    }

    /**
     * Handle dragStop on choice/answer
     */
    function handleChoiceDragStop() {
        dragging = false;
        clearSelectedTargeted();
    }

    /**
     * Handle drop on choice/answer
     * @param {CustomEvent} e
     */
    function handleChoiceDrop(e) {
        const { key, gapKey, dropareaKey, dropareaGapKey } = e.detail;
        if (!dropareaGapKey && gapKey && key === dropareaKey) {
            removeMatch(key, gapKey);
            reorderAfterRemove(key);
        } else if (canChoiceBeTargeted(key, gapKey, dropareaKey, dropareaGapKey)) {
            swapMatches(key, gapKey, dropareaKey, dropareaGapKey);
        }
        clearSelectedTargeted();
    }

    /**
     * Handle dragOver on choice/answer
     * @param {CustomEvent} e
     */
    function handleChoiceDragOver(e) {
        const { key, gapKey, dropareaKey, dropareaGapKey } = e.detail;
        if (!dropareaGapKey && gapKey && key === dropareaKey) {
            targetedBay = true;
        } else if (canChoiceBeTargetedVisually(key, gapKey, dropareaKey, dropareaGapKey)) {
            targetedChoice = { key: dropareaKey, gapKey: dropareaGapKey };
        }
    }

    /**
     * Handle dragOut on choice/answer
     */
    function handleChoiceDragOut() {
        targetedChoice = null;
        targetedBay = false;
    }

    /**
     * Handle hover over choice/answer
     * @param {CustomEvent} e
     */
    function handleChoiceHoverOver(e) {
        if (!dragging && selectedChoice) {
            const { key, gapKey } = e.detail;
            if (canChoiceBeTargetedVisually(selectedChoice.key, selectedChoice.gapKey, key, gapKey)) {
                targetedChoice = { key, gapKey };
            }
        }
    }

    /**
     * Handle hover out on choice/answer
     */
    function handleChoiceHoverOut() {
        if (!dragging && targetedChoice) {
            targetedChoice = null;
        }
    }

    /**
     * Get if choice/answer is targetable/targeted - if it can accept drop/dragOver etc. events
     * @param {String} sourceKey - choice key of choice/answer that is selected/dragged
     * @param {String} [sourceGapKey] - gap key of answer that is selected/dragged, empty if choice is
     * @param {String} targetKey  - choice key of our choice/answer
     * @param {String} [targetGapKey] - gap key of our answer, empty it's a choice
     * @returns {Boolean}
     */
    function canChoiceBeTargeted(sourceKey, sourceGapKey, targetKey, targetGapKey) {
        if (targetGapKey) {
            //choice to answer & answer to answer
            return !matchesHelper.isGapUsedByChoice(targetGapKey, sourceKey, matches);
        } else if (sourceGapKey && !targetGapKey) {
            //answer to choice
            return sourceKey !== targetKey;
        } else {
            //choice to choice
            return false;
        }
    }

    /**
     * Get if choice/answer should look as if it is targetable/targeted
     * @param {String} sourceKey - choice key of choice/answer that is selected/dragged
     * @param {String} [sourceGapKey] - gap key of answer that is selected/dragged, empty if choice is
     * @param {String} targetKey  - choice key of our choice/answer
     * @param {String} [targetGapKey] - gap key of our answer, empty it's a choice
     * @returns {Boolean}
     */
    function canChoiceBeTargetedVisually(sourceKey, sourceGapKey, targetKey, targetGapKey) {
        if (targetGapKey) {
            //choice to answer & answer to answer
            return sourceKey !== targetKey || sourceGapKey !== targetGapKey;
        } else if (sourceGapKey && !targetGapKey) {
            //answer to choice
            return sourceKey !== targetKey;
        } else {
            //choice to choice
            return false;
        }
    }

    /**
     * Handle mouse click on gap
     * @param {CustomEvent} e
     */
    function handleGapClick(e) {
        const { key } = e.detail;
        if (selectedChoice) {
            if (canGapBeTargeted(key, selectedChoice.key)) {
                addOrMoveMatch(selectedChoice.key, selectedChoice.gapKey, key);
            }
        }
        clearSelectedTargeted();
    }

    /**
     * Handle keyboard click on gap
     * @param {CustomEvent} e
     */
    function handleGapKeySelect(e) {
        const { key } = e.detail;
        if (selectedChoice) {
            if (canGapBeTargeted(key, selectedChoice.key)) {
                const selectedChoiceKey = selectedChoice.key;
                addOrMoveMatch(selectedChoiceKey, selectedChoice.gapKey, key);
                announcement = ariaHelper.announcePlaced(
                    selectedChoiceKey,
                    key,
                    choices,
                    freeChoices,
                    gaps,
                    gapKeysInAriaOrder
                );
                tick()
                    .then(tick)
                    .then(() => focusAnswerWithKey(getAnswerFocusKey(selectedChoiceKey, key)));
            }
        }
        clearSelectedTargeted();
    }

    /**
     * Handle drop on gap
     * @param {CustomEvent} e
     */
    function handleGapDrop(e) {
        const { key, areaKey, dropareaKey } = e.detail;
        if (canGapBeTargeted(dropareaKey, key)) {
            addOrMoveMatch(key, areaKey, dropareaKey);
        }
        clearSelectedTargeted();
    }

    /**
     * Handle dragOver on gap
     * @param {CustomEvent} e
     */
    function handleGapDragOver(e) {
        const { key, areaKey, dropareaKey } = e.detail;
        if (canGapBeTargetedVisually(dropareaKey, key, areaKey)) {
            targetedGap = dropareaKey;
        }
    }

    /**
     * Handle dragOut on gap
     */
    function handleGapDragOut() {
        targetedGap = null;
    }

    /**
     * Handle hover over gap
     * @param {CustomEvent} e
     */
    function handleGapHoverOver(e) {
        if (!dragging && selectedChoice) {
            const { key } = e.detail;
            if (canGapBeTargetedVisually(key, selectedChoice.key, selectedChoice.gapKey)) {
                targetedGap = key;
            }
        }
    }

    /**
     * Handle hover out on gap
     */
    function handleGapHoverOut() {
        if (!dragging && targetedGap) {
            targetedGap = null;
        }
    }

    /**
     * Handle mount event of gap,
     * to set the reference to underlying svg object, and to know when we are ready to draw answers
     * @param {CustomEvent} e
     */
    function handleGapMount(e) {
        const { key, svgGroup } = e.detail;
        const gap = gaps.find(g => g.key === key);
        gap.svg = svgGroup;
        if (!isGapsMounted && !gaps.some(g => !g.svg)) {
            isGapsMounted = true;
        }
    }

    /**
     * Handle center event of gap,
     * to set the reference to center of polygon, which is needed for answer placement calculations
     * @param {CustomEvent} e
     */
    function handleGapCenter(e) {
        const { key, cx, cy } = e.detail;
        const gap = gaps.find(g => g.key === key);
        gap.cx = cx;
        gap.cy = cy;
        //we intentionally do not update 'gaps', no need to cause redraw
    }

    /**
     * Get if gap is targetable/targeted - if it can accept drop/dragOver etc. events
     * @param {String} gapKey - key of our gap
     * @param {String} choiceKey - choice key of choice/answer that is selected/dragged
     * @returns {Boolean}
     */
    function canGapBeTargeted(gapKey, choiceKey) {
        return (
            matchesHelper.isGapFree(gapKey, matches, gaps) &&
            !matchesHelper.isGapUsedByChoice(gapKey, choiceKey, matches)
        );
    }

    /**
     * Get if gap should look as if it is targetable/targeted
     * @param {String} gapKey - key of our gap
     * @param {String} choiceKey - choice key of choice/answer that is selected/dragged
     * @param {String} [choiceGapKey] - gap key of answer that is selected/dragged, empty if it's choice
     * @returns {Boolean}
     */
    function canGapBeTargetedVisually(gapKey, choiceKey, choiceGapKey) {
        return gapKey === choiceGapKey || canGapBeTargeted(gapKey, choiceKey);
    }

    /**
     * Handle drop on bay (choice list)
     * @param {CustomEvent} e
     */
    function handleBayDrop(e) {
        const { key, areaKey: gapKey } = e.detail;
        if (gapKey) {
            removeMatch(key, gapKey);
            reorderAfterRemove(key);
        }
        clearSelectedTargeted();
    }

    /**
     * Handle dragOver on bay (choice list)
     * @param {CustomEvent} e
     */
    function handleBayDragOver(e) {
        const { areaKey: gapKey } = e.detail;
        if (gapKey) {
            targetedBay = true;
        }
    }

    /**
     * Handle dragOut on bay (choice list)
     */
    function handleBayDragOut() {
        targetedBay = false;
    }

    /**
     * Handle click on window to cancel ongoing operation
     */
    function handleWindowClick() {
        if (selectedChoice) {
            const selectedKey = selectedChoice.key;
            clearSelectedTargeted();
            announcement = ariaHelper.announceCancelled(selectedKey, choices, freeChoices);
        }
    }

    /**
     * Handle keydown on container to cancel ongoing operation,
     * if 'escape' or 'tab' is pressed ('tab' equals blur of either choice-area or answer-area)
     * @param {KeyboardEvent} e
     */
    function handleContainerKeydown(e) {
        const pressedKey = getActualKey(e);
        if (pressedKey === 'esc') {
            if (selectedChoice) {
                const selectedKey = selectedChoice.key;
                const selectedGapKey = selectedChoice.gapKey;
                clearSelectedTargeted();
                announcement = ariaHelper.announceCancelled(selectedKey, choices, freeChoices);
                if (selectedGapKey) {
                    tick()
                        .then(tick)
                        .then(() => {
                            focusAnswerWithKey(getAnswerFocusKey(selectedKey, selectedGapKey));
                        });
                } else {
                    tick().then(() => {
                        focusChoiceWithKey(selectedKey);
                    });
                }
            }
        } else if (pressedKey === 'tab') {
            if (selectedChoice) {
                const selectedKey = selectedChoice.key;
                clearSelectedTargeted();
                announcement = ariaHelper.announceCancelled(selectedKey, choices, freeChoices);
            }
        }
    }

    /**
     * Measure interaction container's width
     * @param {CustomEvent} e
     */
    function handleContainerResized(e) {
        const { width } = e.detail;
        if (width) {
            containerWidth = width;
        }
    }

    /**
     * Reset variables that store which element is selected/targeted
     */
    function clearSelectedTargeted() {
        selectedChoice = null;
        targetedChoice = null;
        targetedGap = null;
        targetedBay = false;
    }

    /**
     * Modifies 'choices': removed choice should go to the bottom of choice list.
     * @param {String} choiceKey
     */
    function reorderAfterRemove(choiceKey) {
        if (!freeChoices.some(c => c.key === choiceKey)) {
            const index = choices.findIndex(c => c.key === choiceKey);
            choices.push(choices[index]);
            choices.splice(index, 1);
            choices = choices;
        }
    }

    /**
     * Handle dragScroll on choice-area to programmatically scroll bay (choice list) content
     * @param {CustomEvent} e
     */
    function handleDragscroll(e) {
        //because of delay, 'dragging' can be set too late, and draggable-mirror gets misplaced
        //so this check is not enough
        //so in Choice we prevent dragScroll start (=stop propagating mousedown)
        if (!dragging) {
            bayScrollboxElement.scrollTop = bayScrollboxElement.scrollTop - e.detail.dy;
        }
    }

    /**
     * Handle focusin on choice area, to make it not tabbable and to prepare state for arrow key navigation
     */
    function handleChoiceAreaFocusin() {
        if (!choiceAreaHasFocus) {
            choiceAreaHasFocus = true;
            lastFocusedChoiceKey = lastFocusedChoiceKey || choiceKeysInTabOrder[0]; //same index as in tabindex props
        }
    }

    /**
     * Handle focusin on answer area, to make it not tabbable and to prepare state for arrow key navigation
     */
    function handleAnswerAreaFocusin() {
        if (!answerAreaHasFocus) {
            answerAreaHasFocus = true;
            lastFocusedAnswerKey =
                lastFocusedAnswerKey || (answerKeysInTabOrder.length ? answerKeysInTabOrder[0] : null); //same key as in tabindex props
            lastFocusedGapKey = lastFocusedGapKey || (gapKeysInTabOrder.length ? gapKeysInTabOrder[0] : null); //same key as in tabindex props
        }
    }

    /**
     * Flag that focus jumps inside interaction
     */
    function handleInteractionFocusIn() {
        isInteractionFocused = true;
    }

    /**
     * Handle focusin on window, to detect when focus goes outside choice-area/answer-area,
     * to make them tabbable again
     * @param {Event} event
     */
    function handleWindowFocusin(event) {
        if (choiceAreaHasFocus) {
            if (
                bayScrollboxElement &&
                bayScrollboxElement !== event.target &&
                !bayScrollboxElement.contains(event.target)
            ) {
                choiceAreaHasFocus = false;
                lastFocusedChoiceKey = null;
            }
        }
        if (answerAreaHasFocus) {
            if (answerAreaElement && answerAreaElement !== event.target && !answerAreaElement.contains(event.target)) {
                answerAreaHasFocus = false;
                lastFocusedAnswerKey = null;
                lastFocusedGapKey = null;
            }
        }
    }
</script>

<style>
    .qti-flow-container {
        --choice-scroll-padding: 4rem;
        --choice-area-padding: 1.5rem;
        --choice-area-bottom-margin: 2.5rem;

        user-select: none;

        &.horizontal {
            display: flex;
        }
        /* manage drag cursor */
        &.dragging {
            cursor: grabbing;

            & :global(.choice),
            & :global(.associable-hotspot) {
                cursor: unset;
            }
        }
    }

    .choice-area {
        pointer-events: auto; /* it was unset by .scroll-shadows */
        min-width: var(--bay-width);
        width: var(--bay-width);
        height: var(--bay-height);
        overflow: auto; /* in Firefox, need to add tabindex=-1 because of it */
        outline: none;

        /* hide scrollbar as we use dragScroll; see TabGroup */
        scrollbar-width: none; /* Firefox */
        &::-webkit-scrollbar {
            display: none; /* Safari and Chrome */
        }

        & .bay-content {
            /* this also sets droparea styles (so min-height & overflow) */
            position: relative;
            width: calc(100% - (var(--choice-scroll-padding) - var(--choice-area-padding)));
            height: var(--bay-scroll-height);
            min-height: 100%;
            overflow: visible;
        }

        &.targeted .bay-content {
            /*dashed border shouldn't increase element's size*/
            &:before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border: var(--border-medium-plus) dashed var(--color-border-active);
                border-radius: var(--radius-large);
                background-color: var(--color-bg-selection);
            }
        }
    }

    .horizontal {
        &.position-right .choice-area {
            display: flex;
            align-items: flex-end;
            flex-direction: column;
        }
    }

    .vertical {
        &.position-top .choice-area {
            margin-bottom: var(--choice-area-bottom-margin);
        }
        &.position-bottom .choice-area {
            margin-top: var(--choice-area-bottom-margin);
        }
        &.dragging .choice-area {
            /* prevent autoscroll by https://github.com/Shopify/draggable/tree/master/src/Draggable/Plugins/Scrollable , only when cursor is over choice-area */
            overflow: hidden;
        }
        & .bay-content {
            width: 100%;
        }
    }

    .scroll-shadows {
        position: relative;
        pointer-events: none; /* because bay droparea is inside, and we want it to activate when cursor is on shadow */
    }

    .shadow {
        --shadow-size: 1.5rem;
        --shadow-color: hsla(0, 0%, 12%, 25%);

        position: absolute;
        background-repeat: no-repeat;
        background-color: var(--color-bg-default-trans);
        z-index: var(--layer-1);

        &.left {
            left: 0;
            top: 0;
            width: var(--shadow-size);
            height: 100%;
            background: linear-gradient(to right, var(--shadow-color), var(--color-bg-default-trans));
        }
        &.right {
            right: 0;
            top: 0;
            width: var(--shadow-size);
            height: 100%;
            background: linear-gradient(to left, var(--shadow-color), var(--color-bg-default-trans));
        }
        &.top {
            left: 0;
            top: 0;
            height: var(--shadow-size);
            width: 100%;
            background: linear-gradient(to bottom, var(--shadow-color), var(--color-bg-default-trans));
        }
        &.bottom {
            left: 0;
            bottom: 0;
            height: var(--shadow-size);
            width: 100%;
            background: linear-gradient(to top, var(--shadow-color), var(--color-bg-default-trans));
        }
        &.hidden {
            opacity: 0;
        }
    }

    .answer-area {
        position: relative; /* answer-choices are absolute-positioned */
    }
</style>

<svelte:window
    bind:innerHeight={windowHeight}
    on:focusin={handleWindowFocusin}
    on:click={handleWindowClick}
    on:resize={updateAvailableScrollDistance} />
<div
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    bind:this={interactionElement}
    on:focusin|once={handleInteractionFocusIn}
    aria-disabled={disabled || disabledBySession ? true : void 0}
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}

    <ChoiceFeedbackBlock
        maxChoices={maxAssociations}
        minChoices={minAssociations}
        type="associations"
        qtiMaxChoicesMessage={maxSelectionMessage}
        qtiMinChoicesMessage={minSelectionMessage}
        {isInteractionFocused}
        {interactionElement}
        selectedNumber={matches.length}
        lang={instructionsLang} />

    <AtomicAriaLive {announcement} lang={instructionsLang} />

    <div
        class="qti-flow-container position-{qtiPosition}"
        class:dragging
        class:horizontal={isHorizontal}
        class:vertical={!isHorizontal}
        style="--bay-width:{bayWidth}px;--bay-height:{bayHeight}px;--bay-scroll-height:{bayScrollHeight}px;"
        use:resizeObserve={handleContainerResized}
        on:keydown={handleContainerKeydown}>
        {#each areasOrder as area (area)}
            {#if area === areas.choices}
                <div class="scroll-shadows">
                    {#each ['left', 'right', 'top', 'bottom'] as bound}
                        <div class="shadow {bound}" class:hidden={!shadowVisibility[bound]} />
                    {/each}
                    <div
                        class="choice-area"
                        class:targetable={dragging && selectedChoice && !!selectedChoice.gapKey}
                        class:targeted={targetedBay}
                        tabindex="-1"
                        bind:this={bayScrollboxElement}
                        use:dragScrollable
                        on:dragscroll={handleDragscroll}
                        use:preventSpaceScroll
                        use:arrowKeysFocusLoop={{
                            focusByKey: focusChoiceWithKey,
                            keysInTabOrder: choiceKeysInTabOrder,
                            lastFocusedKey: lastFocusedChoiceKey,
                            isRTL
                        }}
                        on:focusin={handleChoiceAreaFocusin}
                        on:scroll={updateAvailableScrollDistance}>
                        <div
                            class="bay-content"
                            aria-labelledby={bayLabelId}
                            role="application"
                            use:setupDroparea={{ dropareaRegistry, key: draggableGroupKey }}
                            on:drop={handleBayDrop}
                            on:dragOver={handleBayDragOver}
                            on:dragOut={handleBayDragOut}>
                            <span id={bayLabelId} class="hidden"
                                >{__('Available options, %d items', freeChoices.length)}</span>
                            {#each freeChoices as choice, i (choice.key)}
                                <Choice
                                    {itemIdentifier}
                                    key={choice.key}
                                    {dropareaRegistry}
                                    {draggableGroupKey}
                                    imgSrc={resolvedChoiceSrcs.get(choice.key)}
                                    x={sizingHelper.getChoiceX(i, bayColumns, choiceWidth)}
                                    y={sizingHelper.getChoiceY(i, bayColumns, choiceHeight)}
                                    width={choiceWidth}
                                    height={choiceHeight}
                                    ariaLabel={ariaHelper.getChoiceAriaLabel(choice, freeChoices)}
                                    ariaDescribedBy={ariaHelper.getChoiceDescribedBy()}
                                    tabindex={!choiceAreaHasFocus && i === 0 ? '0' : '-1'}
                                    placed={false}
                                    selected={!dragging &&
                                        selectedChoice &&
                                        selectedChoice.key === choice.key &&
                                        !selectedChoice.gapKey}
                                    targetable={selectedChoice &&
                                        matches &&
                                        canChoiceBeTargeted(
                                            selectedChoice.key,
                                            selectedChoice.gapKey,
                                            choice.key,
                                            null
                                        )}
                                    targeted={targetedChoice &&
                                        targetedChoice.key === choice.key &&
                                        !targetedChoice.gapKey}
                                    amount={matchesHelper.getChoiceRemainingAmount(choice, matches)}
                                    disabled={disabled || disabledBySession}
                                    on:load={() => handleChoiceImageLoad(choice.key)}
                                    on:error={() => handleChoiceImageError(choice.key)}
                                    on:click={handleChoiceClick}
                                    on:keySelect={handleChoiceKeySelect}
                                    on:dragStart={handleChoiceDragStart}
                                    on:dragStop={handleChoiceDragStop}
                                    on:drop={handleChoiceDrop}
                                    on:dragOver={handleChoiceDragOver}
                                    on:dragOut={handleChoiceDragOut}
                                    on:hoverOver={handleChoiceHoverOver}
                                    on:hoverOut={handleChoiceHoverOut} />
                            {/each}
                        </div>
                    </div>
                </div>
            {:else if area === areas.answers}
                <div
                    class="answer-area"
                    aria-label={__('Answer area')}
                    role="application"
                    bind:this={answerAreaElement}
                    use:preventSpaceScroll
                    use:arrowKeysFocusLoop={answerAreaArrowKeysOptions}
                    on:focusin={handleAnswerAreaFocusin}>
                    <Svg
                        {itemIdentifier}
                        {imgWidth}
                        {imgHeight}
                        {imgSrc}
                        on:backgroundImageLoad={handleBackgroundImageLoad}
                        on:backgroundImageError={handleBackgroundImageError}>
                        <g slot="content">
                            {#if imgScalingFactor}
                                {#each gaps as gap (gap.key)}
                                    <AssociableHotspot
                                        identifier={gap.key}
                                        {dropareaRegistry}
                                        coords={getScaledCoords(gap.coords, imgScalingFactor)}
                                        shape={gap.shape}
                                        invisible={unselectedHidden}
                                        instructions="{isGapsMounted
                                            ? ariaHelper.getGapAriaLabel(
                                                  gap,
                                                  gapKeysInAriaOrder,
                                                  matchesHelper.getGapUsageCount(gap.key, matches)
                                              )
                                            : null}. {ariaHelper.getGapDescribedBy()}"
                                        {instructionsLang}
                                        tabindex={!answerAreaHasFocus &&
                                        selectedChoice &&
                                        isGapsMounted &&
                                        gap.key === gapKeysInTabOrder[0]
                                            ? '0'
                                            : '-1'}
                                        targetable={selectedChoice &&
                                            matches &&
                                            canGapBeTargetedVisually(
                                                gap.key,
                                                selectedChoice.key,
                                                selectedChoice.gapKey
                                            )}
                                        targeted={targetedGap === gap.key}
                                        disabled={disabled || disabledBySession}
                                        on:mount|once={handleGapMount}
                                        on:center={handleGapCenter}
                                        on:dragOver={handleGapDragOver}
                                        on:dragOut={handleGapDragOut}
                                        on:drop={handleGapDrop}
                                        on:click={handleGapClick}
                                        on:keySelect={handleGapKeySelect}
                                        on:hoverOver={handleGapHoverOver}
                                        on:hoverOut={handleGapHoverOut} />
                                {/each}
                            {/if}
                        </g>
                    </Svg>
                    {#each placedAnswers as answer, i (answer.concatenatedKey)}
                        <Choice
                            {itemIdentifier}
                            key={answer.key}
                            gapKey={answer.gapKey}
                            {dropareaRegistry}
                            {draggableGroupKey}
                            imgSrc={resolvedChoiceSrcs.get(answer.choice.key)}
                            x={answer.x}
                            y={answer.y}
                            width={answer.width}
                            height={answer.height}
                            ariaLabel={isGapsMounted
                                ? ariaHelper.getAnswerAriaLabel(answer.gap, answer.choice, gapKeysInAriaOrder)
                                : null}
                            ariaDescribedBy={ariaHelper.getAnswerDescribedBy()}
                            removerAriaLabel={ariaHelper.getRemoveAriaLabel(answer.choice)}
                            tabindex={!answerAreaHasFocus && !selectedChoice && answer.tabOrder === 0 ? '0' : '-1'}
                            placed={true}
                            selected={!dragging &&
                                selectedChoice &&
                                selectedChoice.key === answer.key &&
                                selectedChoice.gapKey === answer.gapKey}
                            targetable={selectedChoice &&
                                matches &&
                                canChoiceBeTargetedVisually(
                                    selectedChoice.key,
                                    selectedChoice.gapKey,
                                    answer.key,
                                    answer.gapKey
                                )}
                            targeted={targetedChoice &&
                                targetedChoice.key === answer.key &&
                                targetedChoice.gapKey === answer.gapKey}
                            amount={1}
                            disabled={disabled || disabledBySession}
                            on:load={() => handleChoiceImageLoad(answer.choice.key)}
                            on:error={() => handleChoiceImageError(answer.choice.key)}
                            on:click={handleChoiceClick}
                            on:keySelect={handleChoiceKeySelect}
                            on:clickRemove={handleChoiceClickRemove}
                            on:keyRemove={handleChoiceKeyRemove}
                            on:dragStart={handleChoiceDragStart}
                            on:dragStop={handleChoiceDragStop}
                            on:drop={handleChoiceDrop}
                            on:dragOver={handleChoiceDragOver}
                            on:dragOut={handleChoiceDragOut}
                            on:hoverOver={handleChoiceHoverOver}
                            on:hoverOut={handleChoiceHoverOut} />
                    {/each}
                </div>
            {/if}
        {/each}
    </div>
</div>
