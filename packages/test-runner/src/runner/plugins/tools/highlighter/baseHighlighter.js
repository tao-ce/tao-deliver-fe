// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { defaults, isEqual } from 'lodash';
import { generateElementId, highlighterFactory as selectionHighlighterFactory } from '@oat-sa-private/ui-core';

/**
 * Highlighter factory
 * @param {Object} options
 *
 * @param {String} options.id - internal value used as store key for this highlighter's highlights
 * @param {Function} options.onUpdatedCallback - notify caller that highlights were created/removed (subscription to changes)
 * @param {String?} options.containerSelector - to select the root Node in which highlighting is allowed. Ether this or `containerElement` must be set.
 * @param {HTMLElement?} options.containerElement - use instead of `containerSelector` if this element isn't attached to the `document`
 *
 * @param {String} options.baseClassName - created highlights will have this class.
 * @param {Object} options.toggledModeClassPerColor - class to apply to container in `isHighlighting` mode: `{[color]: 'cssClassName'}`
 * @param {String?} options.defaultColor - which color to choose initially
 * @param {String?} options.eraserColor - which color behaves as Eraser
 *
 * @param {String[]} options.containersBlackList - additional blacklist selectors to be added to module instance's blacklist
 * @param {String} options.containersWhiteList - whitelist selectors
 * @param {Boolean} options.keepEmptyNodes
 * @param {String?} options.keepEmptyNodesIgnoreSelector
 *
 * @returns {Object} wrapper over ui-core highlighter instance, extended with new methods
 */
export default function baseHighlighterFactory(options) {
    /**
     * `highlightHelper` options
     */
    const defaultOptions = {
        id: generateElementId('highlighter'),
        onUpdatedCallback: () => {},
        containerSelector: null,
        containerElement: null,

        baseClassName: null,
        toggledModeClassPerColor: {},
        defaultColor: null,
        eraserColor: null,

        containersBlackList: [], //sync these selectors with css styles for `::selection`
        containersWhiteList: [], //sync these selectors with css styles for `::selection`
        keepEmptyNodes: true,
        keepEmptyNodesIgnoreSelector: null,
        transientSelector: null
    };

    options = defaults(options, defaultOptions);

    const documentSelection = window.getSelection(); //reference to browser `Selection` object

    /**
     * Is this highlighter enabled or disabled?
     * @type {boolean}
     */
    let enabled = true;

    let isErasing = false; //'eraser' button is toggled on: each new selection is automatically erased without having to press any button

    let isHighlighting = false; //'color' button is toggled on: each new selection is automatically highlighted without having to press any button

    let activeColorKey = options.defaultColor; //color to use when highlighting in `isHighlighting` mode

    let isTouchSelection = false; //workaround touch device issues

    let prevTouchSelection = null; //`Array<Range>` needed because iOS clears selection before 'click' on highlighter button

    /**
     * @typedef HighlightEntry - data of one highlight kept in the `model`.
     * There are other properties in this object, but they are for internal use.
     * This is a description of highlight's DOM node in a format that survives DOM recreation and can be serialized.
     * @property {String} c - color key of this highlight
     */
    /**
     * List of highlight datas -
     * Get it with `highlightHelper.getHighlightIndex()`,
     * then use `highlightHelper.highlightFromIndex(model)` to restore highlights after item re-render.
     * Can also be used to count number of highlights.
     * @type {Array<HighlightEntry>|null}
     */
    let model = null;

    /**
     * The helper that does actual highlighting by wrapping selection in `<span>`s
     */
    let highlightHelper = selectionHighlighterFactory(options);
    highlightHelper.setActiveColor(activeColorKey);

    /**
     * Convert current user `Selection` to `Array<Range>`
     * @returns {Array<Range>}
     */
    function getDocumentSelectionRanges() {
        let allRanges = [];
        for (let i = 0; i < documentSelection.rangeCount; i++) {
            const range = documentSelection.getRangeAt(i);
            if (!range.collapsed) {
                allRanges.push(range);
            }
        }
        return allRanges;
    }

    /**
     * Clone array of ranges, so that its `Range` objects won't get modifed by reference
     * @param {Array<Range>} rangesArray
     * @returns {Array<Range>}
     */
    function cloneSelectionRanges(rangesArray) {
        return rangesArray.map(range => range.cloneRange());
    }

    /**
     * Get array of ranges for current user selection, with respect for touch device issues
     * Assumed to be called on click of external button, or on mouseup/touchend if we are in highlighting/erasing mode
     * @returns {Range[]}
     */
    function getSelectionRangesOnEvent() {
        return !documentSelection.isCollapsed ? getDocumentSelectionRanges() : prevTouchSelection;
    }

    /**
     * Discards the global text selection from the browser (window.selection)
     */
    function discardSelection() {
        // Enqueue discarding, to allow multiple highlighters to process the selection before it's gone
        setTimeout(() => {
            if (documentSelection.rangeCount > 0) {
                documentSelection.removeAllRanges();
            }
        }, 1);
    }

    /**
     * Execute after highlight nodes were added/removed, or after model was restored.
     * Update model and reattach click listeners
     * @param {Boolean} removeOnly - if nodes were only removed, no need to reattach click listeners
     */
    function onHighlightsUpdated(removeOnly = false) {
        const modelAndNodes = highlightHelper.getHighlightIndex();
        model = modelAndNodes ? modelAndNodes.highlightModel : null;

        //if new nodes may have been created, reattach remove-on-click listeners
        if (!removeOnly && modelAndNodes && modelAndNodes.wrapperNodes) {
            for (let i = 0; i < modelAndNodes.wrapperNodes.length; i++) {
                const elem = modelAndNodes.wrapperNodes[i];
                elem.removeEventListener('click', onClick);
                elem.addEventListener('click', onClick);
            }
        }

        options.onUpdatedCallback(options.id, model);
    }

    /**
     * Highlight the current selection if there is any.
     * New highlight node may be created, or existing nodes may be merged/widened in the process.
     * @param {String} [colorKey] - highlight in this color; if not specified, active color will be used
     * @param {Boolean} [discardSelectionAfterwards] - may need to keep user selection on touch devices
     */
    function highlightSelection(colorKey = null, discardSelectionAfterwards = true) {
        const ranges = getSelectionRangesOnEvent();

        if (ranges && ranges.length) {
            const prevIndex = highlightHelper.getHighlightIndex();

            highlightHelper.setActiveColor(colorKey || activeColorKey);
            highlightHelper.highlightRanges(ranges);
            if (colorKey) {
                highlightHelper.setActiveColor(activeColorKey);
            }

            // compare highlight index to see if anything changed
            const currentIndex = highlightHelper.getHighlightIndex();
            const highlightModelChanged = !isEqual(
                currentIndex && currentIndex.highlightModel,
                prevIndex && prevIndex.highlightModel
            );

            if (highlightModelChanged) {
                onHighlightsUpdated();
            }
            if (discardSelectionAfterwards) {
                discardSelection();
            }
        }
    }

    /**
     * Erase the current selection if there is any.
     * Existing highlight node may be removed, or existing nodes may be split/cut in the process.
     * @param {Boolean} discardSelectionAfterwards - may need to keep user selection on touch devices
     * @param {Boolean} restoreSelection - restore document selection after erasing, so that selection includes content of erased highlights
     */
    function eraseSelection(discardSelectionAfterwards = true, restoreSelection = false) {
        const ranges = getSelectionRangesOnEvent();

        if (ranges && ranges.length) {
            const prevIndex = highlightHelper.getHighlightIndex();

            highlightHelper.setActiveColor(options.eraserColor);
            highlightHelper.highlightRanges(ranges);
            const erasedRanges = highlightHelper.clearHighlights(options.eraserColor);
            highlightHelper.setActiveColor(activeColorKey);

            // compare highlight index to see if anything changed
            const currentIndex = highlightHelper.getHighlightIndex();
            const highlightModelChanged = !isEqual(
                currentIndex && currentIndex.highlightModel,
                prevIndex && prevIndex.highlightModel
            );

            if (highlightModelChanged) {
                onHighlightsUpdated();
            }
            if (discardSelectionAfterwards) {
                discardSelection();
            }
            if (restoreSelection && erasedRanges.length) {
                const erasedRange = new Range();
                const firstRange = erasedRanges[0];
                const lastRange = erasedRanges[erasedRanges.length - 1];
                erasedRange.setStart(firstRange.startContainer, firstRange.startOffset);
                erasedRange.setEnd(lastRange.endContainer, lastRange.endOffset);

                documentSelection.removeAllRanges();
                documentSelection.addRange(erasedRange);
            }
        }
    }

    /**
     * Remove one highlight
     * @param {Object} e - `{target: node}`, where `node` is highlight to remove
     */
    function clearSingleHighlight(e) {
        highlightHelper.clearSingleHighlight(e);
        onHighlightsUpdated(true);
    }

    /**
     * Mousend handler to automatically highlight/erase the recently made selection, if highlight/erase mode is on
     */
    function onMouseUp() {
        if (!enabled) {
            return;
        }
        if (isHighlighting) {
            highlightSelection(null);
        } else if (isErasing) {
            eraseSelection();
        }
    }

    /**
     * Touchend handler to automatically highlight/erase the recently made selection, if highlight/erase mode is on
     */
    function onTouchEnd() {
        if (!enabled) {
            return;
        }
        if (isHighlighting) {
            highlightSelection(null, false);
        } else if (isErasing) {
            eraseSelection(false);
        } else if (isTouchSelection) {
            // iOS devices clear selection before click on highlight button, so we store previous selection
            prevTouchSelection = !documentSelection.isCollapsed
                ? cloneSelectionRanges(getDocumentSelectionRanges())
                : null;
            isTouchSelection = false;
        }
    }

    /**
     * Click handler to automatically remove targeted highlight
     * @param {Event} e
     */
    function onClick(e) {
        if (!enabled) {
            return;
        }
        if (isErasing) {
            clearSingleHighlight(e);
        }
    }

    /**
     * Selectionchange handler
     */
    function onSelectionChange() {
        isTouchSelection = true;
    }

    /**
     * Keyboard handler to automatically highlight/erase the recently made selection, if highlight/erase mode is on
     * @param {Event} e
     */
    function onKeyPress(e) {
        if (!enabled) {
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            if (isHighlighting) {
                highlightSelection(null, false);
            } else if (isErasing) {
                eraseSelection(false);
            }
        }
    }

    /**
     * Toggle highlighting mode on and off
     * @param {Boolean} on - wanted state
     * @param {String} colorKey - if `on`, highlight in this color
     */
    function toggleHighlighting(on, colorKey) {
        isHighlighting = on;

        // ensure containerArea still exists, and toggle classes on it
        const containerArea = document.querySelector(options.containerSelector);
        if (containerArea) {
            Object.values(options.toggledModeClassPerColor).forEach(modeClass =>
                containerArea.classList.remove(modeClass)
            );
            if (isHighlighting) {
                toggleErasing(false);
                activeColorKey = colorKey;
                if (options.toggledModeClassPerColor[colorKey]) {
                    containerArea.classList.add(options.toggledModeClassPerColor[colorKey]);
                }
            }
        }
    }

    /**
     * Toggle erasing mode on and off
     * @param {Boolean} on - wanted state
     */
    function toggleErasing(on) {
        isErasing = on;

        // ensure containerArea still exists, and toggle classes on it
        const containerArea = document.querySelector(options.containerSelector);
        if (containerArea) {
            if (isErasing) {
                toggleHighlighting(false);
                if (options.toggledModeClassPerColor[options.eraserColor]) {
                    containerArea.classList.add(options.toggledModeClassPerColor[options.eraserColor]);
                }
            } else {
                if (options.toggledModeClassPerColor[options.eraserColor]) {
                    containerArea.classList.remove(options.toggledModeClassPerColor[options.eraserColor]);
                }
            }
        }
    }

    /**
     * Attach this instance's DOM listeners
     */
    function attachListeners() {
        // detach old ones (if any) first, to avoid making duplicate listeners
        detachListeners();
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('selectionchange', onSelectionChange);
        document.addEventListener('keypress', onKeyPress);
    }

    /**
     * Detach this instance's DOM listeners
     */
    function detachListeners() {
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('selectionchange', onSelectionChange);
        document.removeEventListener('keypress', onKeyPress);
    }

    /**
     * The highlighter instance
     */
    return {
        /**
         * Attach this instance's DOM listeners
         */
        attachListeners,

        /**
         * Detach this instance's DOM listeners
         */
        detachListeners,

        /**
         * Toggle highlighting mode on and off
         */
        toggleHighlighting,

        /**
         * Toggle erasing mode on and off
         */
        toggleErasing,

        /**
         * Add highlight based on current user selection
         */
        highlightSelection,

        /**
         * Remove highlight based on current user selection
         */
        eraseSelection,

        /**
         * Remove highlight based on highlight node
         * (if node belongs to group, whole group will be removed)
         * @param {Object} e - {target: Node}
         */
        clearSingleHighlight,

        /**
         * Remove all highlights, or remove highlights for given color
         * @param {String?} colorKey
         */
        clearHighlights(colorKey = null) {
            highlightHelper.clearHighlights(colorKey);
            onHighlightsUpdated(true);
        },

        /**
         * Check if something is currently selected by user
         * @returns {Boolean}
         */
        getHasSelection() {
            return (getSelectionRangesOnEvent() || []).length > 0;
        },

        /**
         * Get number of highlights
         * @returns {Object} - key: colorKey, value: count
         */
        getHighlightsCount() {
            return (model || []).reduce(function (acc, h) {
                const color = h.c;
                if (color && color !== options.eraserColor) {
                    if (!acc[color]) {
                        acc[color] = 0;
                    }
                    acc[color] += 1;
                }
                return acc;
            }, {});
        },

        /**
         * Get colorKey from highlight element
         * @param {Node} highlightNode
         * @returns {String}
         */
        getColorKeyForHighlight(highlightNode) {
            return highlightHelper.getColorKeyForHighlight(highlightNode);
        },

        /**
         * Restore the highlights from the data model.
         * Updates DOM tree.
         * @param {Object|null} fromModel
         */
        restoreFromDataModel(fromModel) {
            if (fromModel) {
                highlightHelper.highlightFromIndex(fromModel);
            }
            onHighlightsUpdated();
        },

        /**
         * Update `model` based on what actually exists in html. Then can get updated model with `getDataModel`.
         * (For the case where html is modified by external source, not by highlighter)
         */
        rebuildDataModel() {
            onHighlightsUpdated();
        },

        /**
         * Get the current data model (list of highlights)
         * @returns {Array<Object>|null} model
         */
        getDataModel() {
            return model;
        },

        /**
         * The instance's id
         * @type {String}
         */
        id: options.id,

        /**
         * Is this instance currently enabled?
         * @type {Boolean}
         */
        get enabled() {
            return enabled;
        },

        /**
         * Enable this instance
         */
        enable() {
            enabled = true;
        },

        /**
         * Disable this instance
         */
        disable() {
            enabled = false;
            toggleErasing(false);
            toggleHighlighting(false);
        }
    };
}
