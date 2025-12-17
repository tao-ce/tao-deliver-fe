// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-22 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import pluginFactory from 'taoTests/runner/plugin';
import HighlighterBar from './HighlighterBar.svelte';
import { getTestSessionUserDataService } from '../../../session/testSessionUserDataService.js';
import { testSessionStatus } from '../../../session/sessionStates.js';
import { getTestSessionStatusStore } from '../../../testsStateStore.js';
import { actionKeys } from './highlighterActionKeys.js';
import { highlighterCollection } from './collection.js';
import { getTextItemPassagesHrefs } from '@oat-sa-private/tao-item-runner-qtinui/src/runner/util/passage.js';
import { tick } from 'svelte';
import { getItemProperty } from '../../../util/testMap.js';
import toolsStoreHandler from '../util/toolsStoreHandler.js';
import { isMutuallyExclusiveTool } from '../../../layout/toolbarItems.js';
import { commentsContainerSelector } from '../inlineComments/selectors.js';

const itemHighlighterId = 'item-highlighter';

export const highlighterPlugin = {
    name: 'highlighter',

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        const pluginConfig = testRunner.getPluginConfig(this.getName());
        const colors = pluginConfig.colors || [
            actionKeys.highlightYellow,
            actionKeys.highlightBlue,
            actionKeys.highlightPink
        ];
        const isReview = !!testConfig.options?.review;
        const areaBroker = this.getAreaBroker();
        const toolsStore = getTestSessionUserDataService(testConfig.serviceCallId).getToolsStore();
        const statusStore = getTestSessionStatusStore(testConfig.serviceCallId);

        this.toolsStoreHandler = toolsStoreHandler(testConfig.serviceCallId, this.getName());

        /**
         * Communication with 'inlineComments' plugin. Review-mode only.
         */
        this.inlineCommentsPlugin = {
            /**
             * Highlights should be restored only after comments.
             * Because comment is always kept, but highlight shpuld be removed if there's overlapping comment in the same place.
             */
            isEnabled: false,
            /**
             * While comment is being created, its element exists in DOM, but its data is not persisted on server yet.
             * During this time stop updating highlights model,
             * otherwise not clear which model to restore if comment creation ended up being cancelled.
             */
            doNotStoreModel: false,
            /**
             * When mode where highlight is created on user selection is set on/off.
             * comments-plugin should remove its own selection listeners while this mode is on.
             * @param {Boolean} toggleOn
             */
            notifyListenerModeToggled: toggleOn => {
                testRunner.trigger('highlighter-inlineComments', {
                    action: 'toggle-listener-mode',
                    payload: { toggleOn }
                });
            }
        };

        this.messageListener = event => {
            if (!event?.data?.event) {
                return;
            }

            switch (event.data.event) {
                case 'highlighter-show':
                case 'highlighter-hide': {
                    // Open/close requested by iframe parent
                    if (this.getOpenState()) {
                        this.close();
                    } else {
                        this.open();
                    }
                    break;
                }
                case 'highlighter-restoreHighlights': {
                    if (event.origin !== window.location.origin && event.data.payload) {
                        // Restore data from iframe parent
                        const currentItemId = testRunner.getTestContext().itemIdentifier;
                        if (currentItemId === event.data.itemId && this.isItemRenderedStatus()) {
                            this.setHighlightsModelState({ [event.data.itemId]: event.data.payload });
                            this.syncPluginState(event.data.itemId, event.data.payload);
                            this.restoreItemHighlights();
                            this.close();
                        }
                    }
                    break;
                }
            }
        };

        // init plugin communication handler with external iframe like ManualScoring and internal events
        window.addEventListener('message', this.messageListener);

        /**
         * Send plugin state to iframe parent
         * @param {type} payload - description of parameter
         */
        this.syncPluginProps = payload => {
            window.parent.postMessage({ event: 'highlighter-deliverHighlights', payload }, '*');
        };

        /**
         * Updates the stored model state based on the highlighterId and model provided.
         *
         * @param {type} highlighterId - description of highlighterId
         * @param {type} model - description of model
         */
        this.syncPluginState = (highlighterId, model) => {
            // update stored model state
            const highlightsModelPerKey = this.getHighlightsModelState();

            if (highlighterId === itemHighlighterId) {
                const itemIdentifier = testRunner.getTestContext().itemIdentifier;
                highlightsModelPerKey[itemIdentifier] = model;
            } else {
                // add non-item highlights to the full model
                highlightsModelPerKey[highlighterId] = model;
            }

            this.setHighlightsModelState(highlightsModelPerKey);

            // count highlights for numeric display
            this.highlightsPerColor = this.highlightersCollection.getAggregatedHighlightsCount();

            this.syncToolbarProps();
        };

        /**
         * Callback function called by any highlighter instance whenever its highlights are updated
         * @param {String} highlighterId - to know which instance is calling back
         * @param {HighlightsModel} model - new highlights model of the instance calling back
         */
        this.onUpdatedCallback = (highlighterId, model) => {
            // item must be rendered to receive updates from user interacting with item
            if (this.isItemRenderedStatus() && !this.inlineCommentsPlugin.doNotStoreModel) {
                this.syncPluginState(highlighterId, model);
                // sync plugin with iframe when there is data in model
                this.syncPluginProps(model || []);
            }
        };

        /**
         * Toolbar component, if mounted
         * @type {Object|null}
         */
        this.toolbar = null;
        /**
         * actionKey of button that is currently active (toggled on)
         * @type {String|null}
         */
        this.activeActionKey = null;
        /**
         * Count of highlighted elements for each color (key is actionKey of this color's button)
         * @type {Object<String, Number}}
         */
        this.highlightsPerColor = {};

        /**
         * Handle click on 'yellow'/'pink/'blue/'green/'orange' toolbar button
         * @param {String} colorKey - highlight in this color; one of `actionKeys`
         */
        const handleHighlightWithColor = colorKey => {
            if (this.activeActionKey === colorKey) {
                this.highlightersCollection.all.toggleHighlighting(false);
                this.onListenerModeToggled(false);
                this.activeActionKey = null;
            } else {
                if (this.highlightersCollection.getItemHighlighter().getHasSelection()) {
                    this.highlightersCollection.all.highlightSelection(colorKey);
                    this.activeActionKey = null;
                } else {
                    this.highlightersCollection.all.toggleHighlighting(true, colorKey);
                    this.onListenerModeToggled(true);
                    this.activeActionKey = colorKey;
                }
            }
        };

        /**
         * Handle click on 'eraser' toolbar button
         */
        const handleEraser = () => {
            if (this.activeActionKey === actionKeys.eraser) {
                this.highlightersCollection.all.toggleErasing(false);
                this.onListenerModeToggled(false);
                this.activeActionKey = null;
            } else {
                if (this.highlightersCollection.getItemHighlighter().getHasSelection()) {
                    this.highlightersCollection.all.eraseSelection();
                    this.activeActionKey = null;
                } else {
                    this.highlightersCollection.all.toggleErasing(true);
                    this.onListenerModeToggled(true);
                    this.activeActionKey = actionKeys.eraser;
                }
            }
        };

        /**
         * Handle click on 'clear all' toolbar button
         */
        const handleClearAll = () => {
            this.highlightersCollection.all.clearHighlights();
            this.highlightersCollection.all.toggleHighlighting(false);
            this.highlightersCollection.all.toggleErasing(false);
            this.onListenerModeToggled(false);

            this.activeActionKey = null;
        };

        /**
         * When the mode where highlight is created on user selection, is set on/off (toggleHighlighting/toggleErasing)
         * @param {Boolean} toggleOn
         */
        this.onListenerModeToggled = toggleOn => {
            this.inlineCommentsPlugin.notifyListenerModeToggled(toggleOn);
        };

        /**
         * Show the highlighter toolbar
         */
        this.open = () => {
            this.setOpenState(true);
            this.renderToolbar();
            this.highlightersCollection.all.attachListeners();
        };

        /**
         * Hide the highlighter toolbar, but do not clear the item's visible highlights.
         */
        this.close = () => {
            this.setOpenState(false);
            this.highlightersCollection.all.detachListeners();
            this.highlightersCollection.all.toggleHighlighting(false);
            this.highlightersCollection.all.toggleErasing(false);
            this.onListenerModeToggled(false);

            this.destroyToolbar();
            this.activeActionKey = null;
        };

        /**
         * Mount highlighter toolbar and listen to its events
         */
        this.renderToolbar = () => {
            if (!this.toolbar) {
                const toolbarContainerSelector = `.toolbar-${this.getName()}`;
                const toolbarContainer = areaBroker.getToolsArea().querySelector(toolbarContainerSelector);
                if (!toolbarContainer) {
                    throw new Error(`No container '${toolbarContainerSelector}' found to render plugin into.`);
                }

                this.toolbar = new HighlighterBar({
                    target: toolbarContainer,
                    props: {
                        serviceCallId: testConfig.serviceCallId,
                        activeActionKey: this.activeActionKey,
                        highlightsPerColor: this.highlightsPerColor,
                        colors
                    }
                });
                this.toolbar.$on('action', e => {
                    const { key } = e.detail;
                    if (
                        key === actionKeys.highlightYellow ||
                        key === actionKeys.highlightPink ||
                        key === actionKeys.highlightBlue ||
                        key === actionKeys.highlightGreen ||
                        key === actionKeys.highlightOrange
                    ) {
                        handleHighlightWithColor(key);
                    } else if (key === actionKeys.eraser) {
                        handleEraser();
                    } else if (key === actionKeys.clearAll) {
                        handleClearAll();
                    }
                    this.syncToolbarProps();
                });
                this.toolbar.$on('close', () => {
                    this.close();
                });
            }
        };

        /**
         * Unmount highlighter toolbar
         */
        this.destroyToolbar = () => {
            if (this.toolbar) {
                this.toolbar.$destroy();
            }
            this.toolbar = null;
        };

        /**
         * When toolbar state changes, propagate changes to the component
         */
        this.syncToolbarProps = () => {
            if (this.toolbar) {
                this.toolbar.$set({
                    activeActionKey: this.activeActionKey,
                    highlightsPerColor: this.highlightsPerColor
                });
            }
        };

        /**
         * Check in toolsStore if highlighter is open
         * @returns {Boolean}
         */
        this.getOpenState = () => {
            const highlighterState = toolsStore.getTestToolState(this.getName());
            return highlighterState && highlighterState.open;
        };

        this.getVisibleState = () => {
            const highlighterState = toolsStore.getTestToolState(this.getName());
            return highlighterState && highlighterState.visible;
        };

        /**
         * Set in toolsStore if highlighter is open
         * @param {Boolean} open
         */
        this.setOpenState = open => {
            const highlighterState = toolsStore.getTestToolState(this.getName()) || {};
            highlighterState.open = open;
            toolsStore.setTestToolState(this.getName(), highlighterState);
        };

        /**
         * @typedef {Array<Object>} HighlightsModel
         */
        /**
         * @typedef {Object<string, HighlightsModel>} highlightsByKey
         * key is a unique string, value is `highlightsModel` for that item or element
         */
        /**
         * Get in toolsStore list of highlights (by unique key (the highlighterId) - can be itemIdentifier or another element property)
         * @returns {highlightsByKey} highlightsByKey
         */
        this.getHighlightsModelState = () => {
            const highlighterState = toolsStore.getTestToolState(this.getName());
            return (highlighterState && highlighterState.highlightsByKey) || {};
        };

        /**
         * Set in toolsStore list of highlights (by unique key (the highlighterId) - can be itemIdentifier or another element property)
         * This state can be used to restore highlights after item is re-rendered.
         * @param {highlightsByKey} highlightsByKey
         */
        this.setHighlightsModelState = highlightsByKey => {
            const highlighterState = toolsStore.getTestToolState(this.getName()) || {};
            highlighterState.highlightsByKey = highlightsByKey;
            toolsStore.setTestToolState(this.getName(), highlighterState);
        };

        /**
         * Check if current status is interacting or feedback (if item is rendered)
         * (Note that sometimes even with loading status, item is already rendered below it,
         *  but it doesn't concern us because renderitem/enableitem fire after loading finishes)
         * @returns {Boolean}
         */
        this.isItemRenderedStatus = () => statusStore.get() === testSessionStatus.interacting;

        /**
         * Restore item highlights from the toolStateStore to the highlight manager
         * Also instantiates any additional highlighters if needed
         */
        this.restoreItemHighlights = () => {
            const itemIdentifier = testRunner.getTestContext().itemIdentifier;
            const highlightsModelPerKey = this.getHighlightsModelState();

            const itemHighlighter = this.highlightersCollection.getItemHighlighter();
            itemHighlighter.enable();
            itemHighlighter.attachListeners();
            // restore item highlights
            itemHighlighter.restoreFromDataModel(highlightsModelPerKey[itemIdentifier]);

            if (!isReview) {
                const passagesHrefs = getTextItemPassagesHrefs(testRunner.itemRunner.getData());

                // instantiate additional highlighters for non-item content
                // They will last the whole lifetime of the plugin and be re-used
                passagesHrefs.forEach(href => {
                    let passageHighlighter = this.highlightersCollection.getHighlighterById(href);

                    // Instantiate, if id not already present in highlighters...
                    if (!passageHighlighter) {
                        passageHighlighter = this.highlightersCollection.addHighlighter({
                            className: 'txt-user-highlight',
                            containerSelector: `#test-main .qti-include[data-href="${href}"]`,
                            id: href,
                            onUpdatedCallback: this.onUpdatedCallback
                        });
                    }
                    passageHighlighter.enable();
                    passageHighlighter.attachListeners();
                    // restore passage highlights
                    passageHighlighter.restoreFromDataModel(highlightsModelPerKey[href]);
                });
            }
        };
    },

    init() {
        const testRunner = this.getTestRunner();
        const testRunnerConfig = testRunner.getConfig();
        const isReview = !!testRunnerConfig.options?.review;
        const dataHolder = testRunner.getDataHolder();

        let containersBlackList = ['.qti-include[data-href]'];
        let containersWhiteList = [
            '.qti-interaction > .qti-prompt',
            '.qti-gapMatchInteraction > .qti-flow-container > .answer-area',
            '.qti-hottextInteraction > .qti-flow-container'
        ];
        let keepEmptyNodesIgnoreSelector = null;
        if (isReview) {
            containersBlackList = [
                ...containersBlackList,
                '.grid-row',
                '.qti-interaction > *',
                '.qti-extendedTextInteraction .math-entry'
            ];
            containersWhiteList = ['.qti-extendedTextInteraction > .text-container'];
            keepEmptyNodesIgnoreSelector = commentsContainerSelector; //inlineComments plugin uses `keepEmptyNodes: false` on this selector
        }

        /**
         * @type {Object} highlightersCollection - Highlighters collection API
         */
        this.highlightersCollection = highlighterCollection();

        // Create the first (item-level) highlighter instance
        // It will last for the full lifetime of the plugin and be re-used on each item
        this.highlightersCollection.addHighlighter({
            className: 'txt-user-highlight',
            containerSelector: '#test-main .qti-item',
            containersBlackList,
            containersWhiteList,
            keepEmptyNodesIgnoreSelector,
            id: itemHighlighterId,
            onUpdatedCallback: this.onUpdatedCallback
        });

        let lastRestoreToken;
        /**
         * Wait for some time as a precaution because some elements may not be rendered immediately,
         * then restore highlights.
         * In some edge cases item may be rendered twice in quick sequence,
         * so ensure old promises don't continue to run and don't restore highlights twice.
         * @param {Symbol} restoreToken
         * @returns {Promise}
         */
        const restoreHighlights = restoreToken =>
            tick()
                .then(tick)
                .then(tick)
                .then(() => {
                    if (restoreToken === lastRestoreToken && this.isItemRenderedStatus()) {
                        this.restoreItemHighlights();
                    }
                    // All highlighters for current item have now been enabled and highlights restored, so it's safe to show toolbar
                    if (this.getOpenState() && this.getVisibleState()) {
                        this.open();
                    }
                });
        /**
         * After navigation finished or overview closed, when item is mounted,
         * restore highlights
         * @param {*} itemRef
         */
        const onItemMounted = itemRef => {
            lastRestoreToken = Symbol();
            restoreHighlights(lastRestoreToken);

            const testMap = testRunner.getTestMap();
            const testPart = dataHolder.getCurrentTestPart();
            const section = dataHolder.getCurrentSection();

            const categories = getItemProperty(testMap, testPart.id, section.id, itemRef, 'categories');

            if (!categories.includes('x-tao-option-highlighter')) {
                this.hide();
            } else {
                this.show();
            }
        };

        /**
         * When unloading item (before navigation away), reset the toolbar's inner state
         * (just counters & mode selection; opened state remains the same)
         */
        const onItemUnload = () => {
            this.highlightersCollection.all.toggleHighlighting(false);
            this.highlightersCollection.all.toggleErasing(false);
            this.onListenerModeToggled(false);
            this.highlightersCollection.all.detachListeners();
            this.highlightersCollection.getAllHighlighters().forEach(hl => {
                hl.disable();
            });

            this.activeActionKey = null;
            this.highlightsPerColor = {};
            this.syncToolbarProps();
        };

        /**
         * Communication with 'inlineComments' plugin. Review-mode only.
         * @param {Object} event
         * @param {String} event.action
         * @param {*} event.payload
         */
        const onInlineCommentsEvents = ({ action, payload }) => {
            switch (action) {
                // first comments should be restored, and only then highlights
                case 'comments-restored': {
                    const { itemRef } = payload;
                    onItemMounted(itemRef);
                    break;
                }
                //if user selection goes over existing highlight - we want to create comment over this highlight.
                //need higlhighter to erase overlapping higlhights and restore selection.
                //assuming this is synchronious.
                case 'erase-overlapping': {
                    const itemHighlighter = this.highlightersCollection.getItemHighlighter();
                    itemHighlighter.eraseSelection(false, true);
                    break;
                }
                // need to know if we should wait for comments-plugin to restore highlights, or shouldn't
                case 'enabled': {
                    this.inlineCommentsPlugin.isEnabled = true;
                    break;
                }
                // stop updating model while comment is being created,
                // or restore previous model if comment creation was cancelled:
                //     if part of existing higlhight was removed by 'erase-overlapping', restore it back
                case 'has-unsaved': {
                    const { hasUnsaved, restorePreviousModel } = payload;
                    if (hasUnsaved) {
                        this.inlineCommentsPlugin.doNotStoreModel = true;
                        this.close();
                    } else {
                        if (restorePreviousModel) {
                            //restore item model - because inlineComments erased our higlhight
                            this.inlineCommentsPlugin.doNotStoreModel = true; //for safety
                            const itemHighlighter = this.highlightersCollection.getItemHighlighter();
                            itemHighlighter.clearHighlights();
                            this.inlineCommentsPlugin.doNotStoreModel = false;
                            this.restoreItemHighlights();
                            //close again because restore attached listeners
                            this.close();
                        } else {
                            //if comment was created, rebuild model to show correct count in the toolbar
                            // (because maybe some higlhights were removed by 'erase-overlapping', but we didn't store that model)
                            this.inlineCommentsPlugin.doNotStoreModel = false;
                            const itemHighlighter = this.highlightersCollection.getItemHighlighter();
                            itemHighlighter.rebuildDataModel();
                            this.onUpdatedCallback(itemHighlighterId, itemHighlighter.getDataModel());
                        }
                    }
                    break;
                }
            }
        };

        testRunner
            .on('proctor-reset', () => {
                this.setHighlightsModelState({});
                this.highlightsPerColor = {};
                this.activeActionKey = null;
                onItemUnload();
            })
            .on('toolbaraction.highlighter', key => {
                if (key === 'highlighter') {
                    if (!this.inlineCommentsPlugin.doNotStoreModel) {
                        if (this.getOpenState()) {
                            this.close();
                        } else {
                            this.open();
                        }
                    }
                } else if (isMutuallyExclusiveTool('highlighter', key)) {
                    if (this.getOpenState()) {
                        this.close();
                    }
                }
            })
            .after('renderitem.highlighter', itemRef => {
                if (!this.inlineCommentsPlugin.isEnabled) {
                    onItemMounted(itemRef);
                }
            })
            .after('enableitem.highlighter', itemRef => {
                if (!this.inlineCommentsPlugin.isEnabled) {
                    onItemMounted(itemRef);
                }
            })
            .on('unloaditem.highlighter', onItemUnload)
            .on('itemModalFeedback.highlighter', () => {
                onItemUnload();
                this.hide();
            })
            .on('inlineComments-highlighter.highlighter', onInlineCommentsEvents);
    },

    /**
     * Shows top bar tool button
     */
    show() {
        this.toolsStoreHandler.set('visible', true);
    },

    /**
     * Hides top bar tool button and closes toolbar
     */
    hide() {
        this.toolsStoreHandler.set('visible', false);
        this.close();
    },

    /**
     * Destroy the plugin and its components. Normally called only at the end of a test session.
     */
    destroy() {
        this.destroyToolbar();
        this.highlightersCollection.all.detachListeners();
        window.removeEventListener('message', this.messageListener);
        this.getTestRunner().off('.highlighter');
    }
};

/**
 * the Highlighter plugin allows to select and highlight text inside item
 */
export default pluginFactory(highlighterPlugin);
