<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2024 (original work) Open Assessment Technologies SA ;
    import { getActualKey, getPointerEventCoords } from '@oat-sa-private/ui-core';
    import Prompt from '../../Prompt.svelte';
    import Svg from '../Svg.svelte';
    import ChoiceFeedbackBlock from '../../feedback/ChoiceFeedbackBlock.svelte';
    import AtomicAriaLive from '../../AtomicAriaLive.svelte';
    import { getInteractionStateStore } from '../../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../../itemSessionStatus.js';
    import { calculateScalingFactor, getScaledCoords, getUsableHeight } from '../util/scaling.js';
    import { isRTLElement, sortChoicesByBoundingBox } from '../util/focusorder.js';
    import ariaHelperFactory from './util/ariaHelper.js';
    import forwardFocusToChoice from '../util/actions/forwardFocusToChoice.js';
    import arrowKeysFocusLoop from '../util/actions/arrowKeysFocusLoop.js';
    import preventSpaceScroll from '../../util/actions/preventSpaceScroll.js';
    import resizeObserve from '../../util/actions/resizeObserve.js';
    import AssociationLine from './AssociationLine.svelte';
    import HotspotChoice from '../HotspotChoice.svelte';
    import { handlersFactory } from './util/handler.js';
    import { DeferredPromise } from '../../util/promise.js';
    import { getContext } from 'svelte';
    import { resolveImage } from '../util/resolveImage.js';

    const qtiClass = 'qti-graphicAssociateInteraction';

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
    export let dataAttrs = {};

    // interaction-level QTI attributes:
    export let minAssociations = 0;
    export let maxAssociations = 1;
    export let prompt;

    export let classes = '';
    export let disabled = false;

    // response format
    export let cardinality = maxAssociations === 1 ? 'single' : 'multiple';
    const baseType = 'pair';

    /**
     * @typedef HotspotChoice - mapped from QTI HotspotChoice
     * @property {String} key
     * @property {String} shape
     * @property {String} coords
     * @property {Number} matchMin
     * @property {Number} matchMax
     * @property {Boolean} fixed
     * @property {String} hotspotLabel - for SR
     * @property {Object} [svg] - not passed, but set by interaction
     */
    /**
     * @type {HotspotChoice[]} - from itemData choices
     */
    export let choices = [];

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

    const qtiMinAssociationsMessage = dataAttrs['data-min-associations-message'];
    const qtiMaxAssociationsMessage = dataAttrs['data-max-associations-message'];

    /**
     * Collect hotspots pair associated by line in selected state
     * @type {String[]}
     */
    let selectedPair = null;

    //shape center - start or end points of line
    const shapeCenter = choices.reduce(function (result, item) {
        result[item.key] = [];
        return result;
    }, {});

    let pairs = [];

    /**
     * @type {Object[]} pairElements - svg elements of association lines
     */
    let pairElements = [];
    /**
     * @type {String[]} orderedElementsKeys - key of all elements which can be focused (choices and association lines)
     */
    let orderedElementsKeys;
    //selected  choice details. Opposite to 'targeted' - never should be set if 'targeted' is set
    let selectedChoice;
    // choice which is start point of line drawing. Opposite to 'selectedChoice' - never should be set if 'selectedChoice' is set
    let targeted;

    /**
     * @type {String[]} a new list of the choiceKeys, ordered into tabbing order
     * Initially undefined, but set once only, after all the bounding boxes are known
     */
    let orderedChoicesKeys;

    let hasFocus = false;
    let lastFocusedChoiceKey;
    let focusShadowLine = false; // allow focusing 'remove button' asynchronously

    // drawing line by mouse dragging
    let dragging = false; // start drag mouse(we do not use real drag, however user behavior the same).
    let start; // coordinates of start point while drawing line
    let end; // coordinates of end point while drawing line
    let isLineDrawing = false; // start drawing line

    let svgElement;
    let interactionElement;
    $: isRTL = interactionElement && isRTLElement(interactionElement);

    let windowHeight;
    let containerWidth;
    let imgWidth = imgObject.width;
    let imgHeight = imgObject.height;
    let svgLeftCoord = 0; //left coordinate of top left corner of Svg component
    let svgTopCoord = 0; //top coordinate of top left corner of Svg component

    // scaling factor which should be applied to all SVG children
    let scalingFactor = 1;

    /**
     * Calculate the SVG scaling factor based on document dimensions, and set scaled image dimensions.
     * Must only be run with non-zero containerWidth and windowHeight.
     */
    $: if (containerWidth && windowHeight) {
        const usableHeight = getUsableHeight(windowHeight);
        scalingFactor = calculateScalingFactor(imgObject.width, imgObject.height, containerWidth, usableHeight);
        imgWidth = scalingFactor * imgObject.width;
        imgHeight = scalingFactor * imgObject.height;
    }

    let isInteractionFocused = false; // becomes true when interaction is focused for the first time

    // aria
    const ariaHelper = ariaHelperFactory();
    let announcement;

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    const itemContext = getContext(itemIdentifier);

    //lang
    const instructionsLang = itemContext && itemContext.getInstructionsLang();

    //image loading
    const imageLoadingPromise = new DeferredPromise();
    const imgSrc = resolveImage(itemContext, imgObject.data);
    itemContext.registerLoadingElement(imageLoadingPromise.promise);

    $: disabledBySession = $itemSessionStatusStore === itemSessionStatus.closed;
    $: handler = handlersFactory(disabled || disabledBySession);

    // do initial response definition
    if (!interactionStateStore.hasResponse()) {
        interactionStateStore.merge({ qtiClass });
        storeResponse();
    }

    // load the response when the store changed
    $: if ($interactionStateStore) {
        loadResponse();
    }

    /**
     * Validate pairs
     * @returns {Boolean} - validity
     */
    function getPairsValidity() {
        let validity = true;

        const associations = pairs.filter(pair => pair[0] && pair[1]);

        // validate association count
        if (
            (minAssociations > 0 && associations.length < minAssociations) ||
            (maxAssociations > 0 && associations.length > maxAssociations)
        ) {
            validity = false;
        }

        // validate matchMin and matchMax properties of choices
        if (validity) {
            choices.some(choice => {
                const choiceUsageCount = getChoiceUsageCountInCompletedPairs(choice.key);
                if (
                    (choice.matchMin !== 0 && choiceUsageCount < choice.matchMin) ||
                    (choice.matchMax !== 0 && choiceUsageCount > choice.matchMax)
                ) {
                    validity = false;
                }
                return !validity;
            });
        }

        return validity;
    }

    /**
     * Load the interaction response
     */
    function loadResponse() {
        let storedResponse = interactionStateStore.getResponseValue();

        if (!storedResponse) {
            storedResponse = [];
        } else if (cardinality === 'single') {
            storedResponse = [storedResponse];
        }

        pairs = storedResponse;

        const state = interactionStateStore.get();
        if (state.choiceKeys) {
            choices = state.choiceKeys.map(choiceKey => choices.find(choice => choice.key === choiceKey));
        }
    }

    /**
     * Format and store selected value in interactionStateStore
     */
    function storeResponse() {
        const choiceKeys = choices.map(choice => choice.key);
        interactionStateStore.update({ pairs, choiceKeys });
        let responseValue = null;
        if (cardinality === 'single') {
            if (pairs && pairs[0] && pairs[0][0] && pairs[0][1]) {
                responseValue = pairs[0];
            }
        } else {
            //store only pairs that have both identifiers set
            responseValue = pairs.filter(pair => pair.length === 2 && pair[0] && pair[1]);
        }
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: responseValue
            },
            getPairsValidity()
        );
    }

    /**
     * Focuses a choice and sets it as the last focused choice
     * Also arranges it to the front
     * @param {String} choiceKey
     * @returns {Boolean} true if focused
     */
    function focusChoiceWithKey(choiceKey) {
        let focusedElement = choices.find(choice => choice.key === choiceKey);
        //focus hotspots
        if (focusedElement && focusedElement.svg) {
            const parent = focusedElement.svg.parent('.hotspot-choice');
            if (parent) {
                //change order in case of intersections hotspots
                parent.front();
            }
            selectedPair = null; // if we focusing hotspots we have to unselect all lines
            focusedElement.svg.node.focus();
            return true;
        }
        // focus lines
        if (!focusedElement) {
            focusedElement = pairElements.find(link => link.key === choiceKey);
            if (focusedElement) {
                selectedPair = [focusedElement.pair[0], focusedElement.pair[1]];
                clearSelectedChoice();
                focusShadowLine = true;
                return true;
            }
        }
        return false;
    }

    /**
     * Actualize 'orderedElementsKeys' variable in case of adding/removing pairs
     */
    function updateOrderedKeysList() {
        if (!orderedChoicesKeys) {
            return;
        }
        const orderedAssociations = sortChoicesByBoundingBox(pairElements, isRTL);
        orderedElementsKeys = [...orderedChoicesKeys, ...orderedAssociations];
    }

    /**
     * Focus remove button after association line fully rendered
     * @param {Event} e
     */
    function handleDrawShadowLine(e) {
        if (focusShadowLine) {
            const lineElement = e.detail.svgGroup;
            lineElement.node.querySelector('.button-container').focus();
            focusShadowLine = false;
        }
    }

    /**
     * Test that user tap on html element, but not drag
     * @param {HTMLElement} touchStartEl - element for touchstart event
     * @param {HTMLElement} touchEndEl - element for touchend event
     * @returns {Boolean} true if user tap on element
     */
    function isTap(touchStartEl, touchEndEl) {
        return touchStartEl.isSameNode(touchEndEl);
    }

    /**
     * Calculate next element in an array of keys by cycle
     * @param {String} currentChoiceKey key of current choice
     * @param {Array} elements - array of keys
     * @returns {String} next key
     */
    function getNextOrderedKey(currentChoiceKey, elements) {
        if (!elements.length) {
            return currentChoiceKey;
        }
        const currentIndex = elements.indexOf(currentChoiceKey);
        const nextIndex = (currentIndex + 1) % elements.length;
        return elements[nextIndex];
    }

    /**
     * Gets aria label for a choice depending on cardinality
     * @param {Object} choice
     * @returns {String}
     */
    function getChoiceAriaLabel(choice) {
        return cardinality === 'single' ? getChoiceSingleAriaLabel(choice) : getChoiceMultiAriaLabel(choice);
    }

    /**
     * Gets from a helper the full aria label for a choice with cardinality 'multiple'
     * @param {Object} choice
     * @returns {String}
     */
    function getChoiceMultiAriaLabel(choice) {
        let label = '';
        let pairedKeys = [];
        pairs.forEach(pair => {
            if (pair[0] === choice.key) {
                pairedKeys.push(getChoiceById(pair[1]));
            }
            if (pair[1] === choice.key) {
                pairedKeys.push(getChoiceById(pair[0]));
            }
        });
        if (choiceValidByMatchMax(choice)) {
            let describedBy = ariaHelper.getChoiceDescribedBy();
            if (selectedChoice && selectedChoice.key === choice.key) {
                describedBy = ariaHelper.getSelectedChoiceDescribedBy();
            }
            if (selectedChoice && selectedChoice.key !== choice.key) {
                describedBy = ariaHelper.getAssociationCreationDescribedBy();
            }
            if (isChoiceDisabled(choice)) {
                describedBy = ariaHelper.getDisabledChoiceDescribedBy();
            }
            label = [ariaHelper.getChoiceAriaLabel(choice, pairedKeys, orderedChoicesKeys), describedBy].join(' ');
        } else {
            let describedBy = ariaHelper.getFulfilledChoiceDescribedBy();
            if (isChoiceInactive(choice)) {
                describedBy = ariaHelper.getInactiveChoiceDescribedBy();
            }
            label = [ariaHelper.getChoiceMaxAssociationLabel(choice, pairedKeys, orderedChoicesKeys), describedBy].join(
                ' '
            );
        }

        return label;
    }

    /**
     * Gets from a helper the full aria label for a choice with cardinality 'single'
     * @param {Object} choice
     * @returns {String}
     */
    function getChoiceSingleAriaLabel(choice) {
        let pairedKeys = [];
        let describedBy = ariaHelper.getChoiceDescribedBy();
        pairs.forEach(pair => {
            if (pair[0] === choice.key) {
                pairedKeys.push(getChoiceById(pair[1]));
            }
            if (pair[1] === choice.key) {
                pairedKeys.push(getChoiceById(pair[0]));
            }
        });
        if (pairs.length === 1 && isChoiceDisabled(choice)) {
            describedBy = ariaHelper.getDisabledChoiceDescribedBy();
        }
        if (pairs.length === 1 && isChoiceInactive(choice)) {
            describedBy = ariaHelper.getInactiveChoiceDescribedBy();
        }

        return [ariaHelper.getChoiceAriaLabel(choice, pairedKeys, orderedChoicesKeys), describedBy].join(' ');
    }

    /**
     * Gets label for remove button in association line
     * @param {Array} pair
     * @returns {String}
     */
    function getRemoveButtonAriaLabel(pair) {
        return ariaHelper.getRemoveButtonAriaLabel(getChoiceById(pair[0]), getChoiceById(pair[1]), orderedChoicesKeys);
    }

    /***** pairs helpers ****/

    /**
     * Generate pair key
     * @param {Array} pair
     * @returns {String}
     */
    function getPairKey(pair) {
        return `${pair[0]}_${pair[1]}`;
    }

    /**
     * Test that choice key belongs to any pair
     * @param {String} key - id of choice to test
     * @returns {boolean}
     */
    function choiceInPair(key) {
        return pairs.some(pair => pair[0] === key || pair[1] === key);
    }

    /**
     * Test that pairs consists of two keys
     * @param {Array} pair - existing pair of choices
     * @param {String} firstKey - id of choice in a pair
     * @param {String} secondKey - id of choice in a pair
     * @returns {Boolean}
     */
    function isPair(pair, firstKey, secondKey) {
        return (pair[0] === firstKey && pair[1] === secondKey) || (pair[1] === firstKey && pair[0] === secondKey);
    }

    /**
     * Test that association between two choices exists
     * @param {String} firstKey - id of choice in a pair
     * @param {String} secondKey - id of choice in a pair
     * @returns {Boolean} exists pair or not
     */
    function isPairExists(firstKey, secondKey) {
        return Boolean(pairs.filter(pair => isPair(pair, firstKey, secondKey)).length);
    }

    /**
     * Remove a pair
     * @param {Array} pair
     */
    function removePair(pair) {
        pairs = pairs.filter(item => !(pair[0] === item[0] && pair[1] === item[1]));
        storeResponse();
        pairElements = pairElements.filter(link => link.key !== getPairKey(pair));
        selectedPair = null; // unselect association
        updateOrderedKeysList(); //recalculate list of focusable elements
        announcement = ariaHelper.announceRemoved(getChoiceById(pair[0]), getChoiceById(pair[1]), orderedChoicesKeys);
    }

    /**
     * Add item in new pair
     * @param {string} firstKey id of choice
     * @param {string} secondKey id of choice
     */
    function addPair(firstKey, secondKey) {
        pairs.push([firstKey, secondKey]);
        storeResponse();
        announcement = ariaHelper.announceAdded(getChoiceById(firstKey), getChoiceById(secondKey), orderedChoicesKeys);
    }

    /**** choice helpers *****/

    /**
     * Get array of choices objects
     * @param {Array} selectedKeys - array of choice keys related with selected line
     * @returns {Array}
     */
    function getSelectedChoices(selectedKeys) {
        return selectedKeys.map(key => getChoiceById(key));
    }

    /**
     * Count choice usage in *completed* pairs (for validity)
     * @param {string} choiceId
     * @returns {number}
     */
    function getChoiceUsageCountInCompletedPairs(choiceId) {
        return pairs
            .filter(pair => pair[0] && pair[1])
            .reduce((total, pair) => total + (pair[0] === choiceId) + (pair[1] === choiceId), 0);
    }

    /**
     * @param {String} choiceId
     * @returns {Array|null} choice details, or null if choice not found
     */
    function getChoiceById(choiceId) {
        if (!choiceId) {
            return null;
        }
        return choices.find(choice => choice.key === choiceId) || null;
    }

    /**
     * Set selected choice
     * @param {String} key choice key
     */
    function setSelectedChoice(key) {
        selectedChoice = choices.filter(choice => choice.key === key).pop();
    }

    /**
     * Unset selected choice
     */
    function clearSelectedChoice() {
        selectedChoice = null;
    }

    /**
     * Test that current choice is a start point of drawing line
     * @param {String} key - choice key
     * @returns {Boolean} choice is a starting hotspot for drawing line
     */
    function choiceIsStartPointOfDrawingLine(key) {
        return targeted && targeted.key === key;
    }

    /**
     * Test that association is permitted for the choice
     * @param {String} choiceKey - key for choice which is target for finalizing current action (e.g. second choice for drawing line)
     * @returns {Boolean} can hotspot be a target of association creation
     */
    function associationAllowed(choiceKey) {
        // check that first and second choices of association are the same choice (click/tap)
        const theSameChoice = selectedChoice && selectedChoice.key === choiceKey;

        // only end choice can be a targeted while drawing line (drawing)
        const isStartPoint = choiceIsStartPointOfDrawingLine(choiceKey);

        //first and second choices shouldn't be already paired
        const isChoicePairedWithSelected = selectedChoice && isPairExists(selectedChoice.key, choiceKey);

        // check that choice allowed for targeting according to matchMin and matchMax limitations
        let isPermitted = true;
        //start hotspot in case of 'click-click' interacting
        if (selectedChoice) {
            isPermitted = choiceValidByMatchMax(selectedChoice);
        }
        //start hotspot in case of 'draw start - draw end' interacting
        if (targeted && isPermitted) {
            isPermitted = choiceValidByMatchMax(targeted);
        }
        //end hotspot for both the interacting
        if (choiceKey && isPermitted) {
            isPermitted = choiceValidByMatchMax(getChoiceById(choiceKey));
        }

        return !theSameChoice && !isStartPoint && !isChoicePairedWithSelected && isPermitted;
    }

    /**
     * Test hotspot in inactive state - hotspot reached max associations and
     * @param {Object} choice
     * @returns {Boolean} state
     */
    function isChoiceInactive(choice) {
        let inactive;
        if (cardinality === 'single') {
            inactive = pairs.length === 1 && choiceInPair(choice.key);
        } else {
            inactive = !choiceValidByMatchMax(choice);
        }
        return inactive;
    }

    /**
     * Test hotspot in disabled state - hotspot have not reached max associations but not available for interaction
     * @param {String} choiceKey
     * @returns {Boolean} state
     */
    function isChoiceDisabled(choiceKey) {
        let disabledState = false;
        if (cardinality === 'single') {
            disabledState = pairs.length === 1 && !choiceInPair(choiceKey);
        }
        return disabledState;
    }

    /**
     * Test that choice is permitted for association according to matchMax
     * @param {Object} choice
     * @returns {Boolean} allowed or not
     */
    function choiceValidByMatchMax(choice) {
        // 1 mean one addition association which we are going to create
        const additionalAssociation = 1;
        const choiceUsageCount = getChoiceUsageCountInCompletedPairs(choice.key) + additionalAssociation;
        return choice.matchMax === 0 || choiceUsageCount <= choice.matchMax;
    }

    /**** handlers *****/

    /**
     * Handler for background image load event
     */
    function handleBackgroundImageLoad() {
        imageLoadingPromise.resolve();
    }

    /**
     * Handler for background image load error
     * @param {CustomEvent} e - {detail: Error}
     */
    function handleBackgroundImageError(e) {
        imageLoadingPromise.reject(e.detail);
    }

    /**
     * Adds or removes the actioned choice from the 'selected' list
     * @param {Event} event
     */
    function handleChoiceChange(event) {
        const choiceKey = event.detail.key;
        const choice = getChoiceById(choiceKey);
        if (isChoiceInactive(choice) || isChoiceDisabled(choice.key)) {
            clearSelectedChoice();
            return;
        }
        if (!selectedChoice) {
            setSelectedChoice(choiceKey);
            //allow focus only non-paired choices
            if (Array.isArray(orderedElementsKeys)) {
                orderedElementsKeys = orderedChoicesKeys.filter(key => {
                    const orderedChoice = getChoiceById(key);
                    return (
                        !isPairExists(key, selectedChoice.key) &&
                        choiceValidByMatchMax(orderedChoice) &&
                        !isChoiceDisabled(key)
                    );
                });
            }
        } else {
            if (
                !isPairExists(selectedChoice.key, choiceKey) &&
                choiceKey !== selectedChoice.key &&
                choiceValidByMatchMax(selectedChoice)
            ) {
                addPair(choiceKey, selectedChoice.key);
            }
            clearSelectedChoice();
            updateOrderedKeysList();
        }
    }

    /**
     * Measure interaction container's width
     * @param {CustomEvent} event
     */
    function handleInteractionResized(event) {
        const { width } = event.detail;
        if (width) {
            containerWidth = width;
        }
    }

    /**
     * Remove association
     * @param {Event} e
     * @param {Array} pair - pair of choice's keys associated to each other
     */
    function handleRemoveAssociation(e, pair) {
        removePair(pair);
    }

    /**
     * Handle choice keyup
     * @param {KeyboardEvent} e
     * @param {Array} pair - pair of associated choices
     */
    function handleRemoveAssociationByKey(e, pair) {
        const actualKey = getActualKey(e);
        if (actualKey === 'space' || actualKey === 'enter') {
            e.preventDefault();
            const nextKey = getNextOrderedKey(lastFocusedChoiceKey, orderedElementsKeys);
            removePair(pair);
            if (focusChoiceWithKey(nextKey)) {
                lastFocusedChoiceKey = nextKey;
            }
        }
    }

    /**
     * Start process drawing association line
     * Touch on hotspot also starts here
     * @param {String} key - choice key where drawing started
     */
    function startDrawingLine(key) {
        targeted = getChoiceById(key); //it will be reset on 'finishDrawingLine' or 'handleTouchEnd'
        if (isChoiceInactive(targeted) || isChoiceDisabled(key)) {
            clearState();
            clearSelectedChoice();
            return;
        }
        // if choice is selected it is not a drawing
        if (selectedChoice) {
            return;
        }
        dragging = true;
        end = shapeCenter[key];
        start = shapeCenter[key];
        //actualize coordinates of top-left corner of svg
        const { top, left } = svgElement.getBoundingClientRect();
        svgLeftCoord = left;
        svgTopCoord = top;
    }

    /**
     * Finish drawing association line
     * @param {String} key - choice key where drawing finished
     */
    function finishDrawingLine(key) {
        if (dragging && isLineDrawing && key !== targeted.key) {
            setSelectedChoice(targeted.key); //required for correct call of 'handleChoiceChange'
            handleChoiceChange({ detail: { key } });
            clearSelectedChoice();
        }
        clearState();
    }

    /**
     * Drawing association line
     * @param {Event} e
     */
    function drawingLine(e) {
        if (dragging) {
            e.preventDefault();
            const { x: mouseX, y: mouseY } = getPointerEventCoords(e);
            // calculate mouse coordinates relative to svg area
            const xCoord = mouseX - svgLeftCoord;
            const yCoord = mouseY - svgTopCoord;
            isLineDrawing = true;
            end = [xCoord, yCoord];
        }
    }

    /**
     * Finish drawing line if mouseup fired out of association hotspot
     * @param {Event} e
     */
    function cancelDrawingLine(e) {
        const element = e.target.closest('.hotspot-choice');
        if ((dragging && isLineDrawing) || (selectedChoice && !element)) {
            clearSelectedChoice();
            clearState();
        }
    }

    /**
     * Clear global variables used for drawing line
     */
    function clearState() {
        dragging = false;
        end = null;
        start = null;
        isLineDrawing = false;
        targeted = null;
    }

    /**
     * Handle stop drawing association line
     * @param {Event} e
     */
    function handleTouchEnd(e) {
        e.preventDefault();
        const { x: mouseX, y: mouseY } = getPointerEventCoords(e);
        let key = targeted.key;
        const target = document.elementFromPoint(mouseX, mouseY);
        const choiceEl = target.closest('.hotspot-choice');
        // try to get choice key related with hotspot where touch move was released
        if (choiceEl) {
            key = choiceEl.dataset.choiceKey;
        }
        //if it tap on hotspot - select hotspot
        if (isTap(e.target, target)) {
            //1 condition test select->deselect the same hotspot
            //2 condition test start and end hotspots of drawing line are the same
            if ((selectedChoice && selectedChoice.key === key) || (targeted && targeted.key === key && isLineDrawing)) {
                clearSelectedChoice();
            } else {
                handleChoiceChange({ detail: { key } });
            }
        }
        finishDrawingLine(key);
    }

    /**
     * Collect centers of each association hotspot
     * @param {Event} e
     */
    function handleCenter(e) {
        const { key, cx, cy } = e.detail;
        shapeCenter[key] = [cx, cy];
    }

    /**
     * Add or remove selected state for association line if line was clicked
     * @param {String} firstChoice
     * @param {String} secondChoice
     */
    function handleLineClick(firstChoice, secondChoice) {
        if (selectedPair) {
            selectedPair = null;
            pairs = pairs;
        } else {
            selectedPair = [firstChoice, secondChoice];
            clearSelectedChoice();
        }
    }

    /**
     * Get link on svg element
     * @param {Event} e
     */
    function handleMount(e) {
        svgElement = e.detail && e.detail.svgElement;
    }

    /**
     * Get focusable choices keys in defined order
     * @param {CustomEvent} e
     */
    function handleChoiceKeyInTabOrder(e) {
        orderedChoicesKeys = e.detail;
        updateOrderedKeysList();
    }

    /**
     * Collect association line objects once after draw
     * @param {Event} e
     * @param {Array} pair
     */
    function handleAssociationDraw(e, pair) {
        pairElements.push({
            key: getPairKey(pair),
            svg: e.detail.svgGroup.findOne('rect.remove-button-hitbox'),
            pair
        });
        updateOrderedKeysList(); //recalculate list of focusable elements
    }

    /**
     * Reset any unfinished action
     * @param {KeyboardEvent} e
     */
    function resetState(e) {
        const pressedKey = getActualKey(e);
        if (pressedKey === 'esc' && (selectedChoice || targeted)) {
            clearState();
            clearSelectedChoice();
            updateOrderedKeysList(); //recalculate list of focusable elements
            announcement = ariaHelper.announceCancelled();
        }
    }

    /**
     * Handle focusing interaction by keyboard
     * @param {Event} e
     */
    function handleSetFocus(e) {
        hasFocus = e.detail;
        if (!isInteractionFocused) {
            isInteractionFocused = true;
        }
        // Cleanup state if focus jump out of interaction
        if (!hasFocus) {
            selectedPair = null;
        }
    }
</script>

<style>
    .qti-flow-container {
        &:focus {
            outline: none;
        }
        &:focus-visible {
            @add-mixin simple-outline;
        }
        & .qti-block {
            & :global(.inactive g:hover > .shape-inner-border) {
                stroke: var(--color-brand);
                stroke-width: 0.25rem;
            }
        }
    }
    .glass-layer {
        fill: black;
        opacity: 0.35;
    }
</style>

<svelte:window
    bind:innerHeight={windowHeight}
    on:keydown={resetState}
    on:mouseup={cancelDrawingLine}
    on:touchcancel={cancelDrawingLine} />

<div
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    lang={language}
    bind:this={interactionElement}
    use:resizeObserve={handleInteractionResized}
    {id}
    {dir}
    {role}
    aria-disabled={disabled || disabledBySession}
    {...ariaAttrs}
    {...dataAttrs}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}

    <ChoiceFeedbackBlock
        maxChoices={maxAssociations}
        minChoices={minAssociations}
        type="associations"
        qtiMinChoicesMessage={qtiMinAssociationsMessage}
        qtiMaxChoicesMessage={qtiMaxAssociationsMessage}
        {isInteractionFocused}
        {interactionElement}
        selectedNumber={pairs.length}
        lang={instructionsLang} />

    <AtomicAriaLive {announcement} lang={instructionsLang} />

    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div class="qti-flow-container" tabindex={hasFocus ? '0' : '-1'}>
        <!-- The inner tabstop takes you inside, and the outer tabstop is for getting back out -->
        <div
            class="qti-block"
            tabindex={hasFocus ? '-1' : '0'}
            use:forwardFocusToChoice={{
                choices,
                choiceKeysInTabOrder: orderedElementsKeys,
                lastFocusedChoiceKey,
                focusChoiceWithKey,
                hasFocus,
                isRTL
            }}
            on:setHasFocus={handleSetFocus}
            on:setChoiceKeysTabOrder|once={handleChoiceKeyInTabOrder}
            on:setLastFocusedChoiceKey={e => (lastFocusedChoiceKey = e.detail)}>
            <Svg
                {itemIdentifier}
                {imgWidth}
                {imgHeight}
                on:backgroundImageLoad={handleBackgroundImageLoad}
                on:backgroundImageError={handleBackgroundImageError}
                on:mousemove={handler(drawingLine)}
                on:touchmove={handler(drawingLine)}
                on:mount|once={handleMount}
                {imgSrc}>
                <g
                    slot="content"
                    use:arrowKeysFocusLoop={{
                        focusChoiceWithKey,
                        choiceKeysInTabOrder: orderedElementsKeys,
                        lastFocusedChoiceKey,
                        isRTL
                    }}
                    use:preventSpaceScroll
                    on:setHasFocus
                    on:setLastFocusedChoiceKey>
                    {#each choices as choice (choice.key)}
                        <HotspotChoice
                            key={choice.key}
                            shape={choice.shape}
                            classes={isChoiceInactive(choice, pairs) ? 'inactive' : ''}
                            coords={getScaledCoords(choice.coords, scalingFactor)}
                            selected={choiceInPair(choice.key)}
                            activated={selectedChoice && selectedChoice.key === choice.key}
                            disabled={disabled || disabledBySession || isChoiceDisabled(choice.key, pairs)}
                            checkmark={pairs && choiceInPair(choice.key)}
                            targeted={choiceIsStartPointOfDrawingLine(choice.key, targeted)}
                            targetable={!(disabled || disabledBySession) &&
                                !isChoiceInactive(choice, pairs) &&
                                (selectedChoice || targeted) &&
                                associationAllowed(choice.key)}
                            hoverable={false}
                            instructions={getChoiceAriaLabel(choice, orderedChoicesKeys, selectedChoice)}
                            {instructionsLang}
                            on:center={handleCenter}
                            on:mousedown={handler(() => startDrawingLine(choice.key))}
                            on:touchstart={handler(() => startDrawingLine(choice.key))}
                            on:mouseup={handler(() => finishDrawingLine(choice.key))}
                            on:touchend={handler(handleTouchEnd)}
                            on:mount|once={event => (choice.svg = event.detail.svgGroup)}
                            on:change={handleChoiceChange} />
                    {/each}
                    {#each pairs as pair (getPairKey(pair))}
                        <AssociationLine
                            disabled={disabled || disabledBySession}
                            activeLineStart={shapeCenter[pair[0]]}
                            activeLineEnd={shapeCenter[pair[1]]}
                            selected={false}
                            ariaLabel={getRemoveButtonAriaLabel(pair)}
                            on:draw|once={e => handleAssociationDraw(e, pair)}
                            on:lineClick={() => handleLineClick(pair[0], pair[1])}
                            on:keyup={handler(e => handleRemoveAssociationByKey(e, pair))}
                            on:remove={e => handleRemoveAssociation(e, pair)} />
                    {/each}
                    {#if !disabled && isLineDrawing && dragging && start && end}
                        <AssociationLine activeLineStart={start} activeLineEnd={end} disablePointerEvents />
                    {/if}
                    {#if selectedPair !== null}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <rect
                            class="glass-layer"
                            x="0"
                            y="0"
                            height={imgHeight}
                            width={imgWidth}
                            on:click={handleLineClick} />
                        {#each getSelectedChoices(selectedPair) as choice}
                            <HotspotChoice
                                key={choice.key}
                                shape={choice.shape}
                                classes={isChoiceInactive(choice, pairs) ? 'inactive' : ''}
                                coords={getScaledCoords(choice.coords, scalingFactor)}
                                selected
                                disabled={disabled || disabledBySession || isChoiceDisabled(choice.key, pairs)}
                                checkmark={pairs && choiceInPair(choice.key)}
                                hoverable={false}
                                on:change={handleLineClick} />
                        {/each}
                        <AssociationLine
                            disabled={disabled || disabledBySession}
                            activeLineStart={shapeCenter[selectedPair[0]]}
                            activeLineEnd={shapeCenter[selectedPair[1]]}
                            selected
                            ariaLabel={getRemoveButtonAriaLabel(selectedPair)}
                            on:draw={handleDrawShadowLine}
                            on:lineClick={() => handleLineClick(selectedPair[0], selectedPair[1])}
                            on:keyup={handler(e => handleRemoveAssociationByKey(e, selectedPair))}
                            on:remove={e => handleRemoveAssociation(e, selectedPair)} />
                    {/if}
                </g>
            </Svg>
        </div>
    </div>
</div>
