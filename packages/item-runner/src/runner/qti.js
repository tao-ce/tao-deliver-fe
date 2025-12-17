// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getLocale } from './util/locale.js';
import itemSessionStatus from './itemSessionStatus.js';
import { getItemStateStore } from './itemsStateStore.js';
import { getItemSettingsStore, releaseItemSettingsStore } from './itemsSettingsStore.js';
import { getItemToolsStateStore, releaseItemToolsStateStore } from './itemsToolsStateStore.js';
import { getItemSessionStatusStore } from './itemsSessionStatusStore.js';
import { getItemPendingOperationsStore } from './itemsPendingOperationsStore.js';
import { releaseItemSequentialInteractionsStore } from './itemsSequentialInteractionsStore.js';
import itemDataParser from './item/parser/itemDataParser.js';
import Item from './item/Item.svelte';
import ItemPreviewer from './ItemPreviewer/ItemPreviewer.svelte';
import { getRenderer } from './renderer';
import { prepareRubricBlock } from './item/parser/helpers.js';
import { getModalFeedbackItemData, getModalFeedbackQueueData } from './item/modalFeedback/modalFeedbackParser.js';
import ModalFeedbackNavigator from './item/modalFeedback/ModalFeedbackNavigator.svelte';
import { hasClass } from './interactions/util/attributes.js';
import { cancelAllExtendedTextUploads } from './interactions/extendedText/uploadAdapter.js';
import { cancelAllServicesUploads } from './services/upload/uploadService.js';

export const providerName = 'qtinui';

export default {
    name: providerName,

    /**
     * Initialize QTI item provider
     * @param {Object} itemData - QTI item data
     * @param {() => void} done - done callback
     */
    init(itemData, done) {
        this.itemData = itemData;
        const { itemIdentifier, itemState, baseUrl } = itemData;
        const assets = itemData && itemData.itemData && itemData.itemData.assets;

        this.itemIdentifier = itemIdentifier;
        this.stateStore = getItemStateStore(itemIdentifier);
        this.settingsStore = getItemSettingsStore(itemIdentifier);
        this.sessionStatusStore = getItemSessionStatusStore(itemIdentifier);
        this.toolsStateStore = getItemToolsStateStore(itemIdentifier);
        this.pendingOperationsStore = getItemPendingOperationsStore(itemIdentifier);

        //configure the asset manager
        this.assetManager.setData('baseUrl', baseUrl);
        this.assetManager.setData('assets', assets);

        // set up the initial data
        this.stateStore.set(itemState);

        // set up the initial settings
        if (this.options.settings) {
            this.settingsStore.set(this.options.settings);
        }
        //set up the initial tools data if any
        if (this.options.toolsState) {
            this.toolsStateStore.set(this.options.toolsState);
        }

        // set up the initial session status
        this.sessionStatusStore.set(itemSessionStatus.initial);

        // ensure default item renderer
        if (!this.options.renderer) {
            this.options.renderer = 'common';
        }

        // listen for changes
        this.unsubscribeFromStore = this.stateStore.subscribe(newState => {
            if (this.item && this.sessionStatusStore.isInteracting) {
                this.trigger('statechange', newState);
                this.trigger('responsechange', this.stateStore.getItemResponses());
            }
        });

        this.toolsStateStore.subscribe(toolsState => {
            if (this.item && this.sessionStatusStore.isInteracting) {
                /**
                 * @event toolsstatechange
                 * @param {Object} toolsState
                 */
                this.trigger('toolsstatechange', toolsState);
            }
        });

        let prevPendingOperationsKeys = [];
        this.pendingOperationsStore.subscribe(storeValue => {
            const { operationKeys, lastAddedKey, lastDeletedKey } = storeValue;

            if (prevPendingOperationsKeys.length < operationKeys.length) {
                this.trigger('pendingoperationschange', { addedKey: lastAddedKey, size: operationKeys.length });
            } else if (prevPendingOperationsKeys.length > operationKeys.length) {
                this.trigger('pendingoperationschange', { deletedKey: lastDeletedKey, size: operationKeys.length });
            }
            prevPendingOperationsKeys = [...operationKeys];
        });

        this.needsReRender = false;

        /**
         * Re-render the item from its current data
         * (use for example if data had been changed by re-fetching)
         * @returns {Promise} resolves when item ready again
         */
        this.reRender = () =>
            new Promise(resolve => {
                this.on('render.rerender', () => {
                    this.off('render.rerender');
                    this.needsReRender = false;
                    resolve();
                });

                // In terms of subcomponent asset loaders,
                // simplest is to destroy Item component and set a new one
                this.item.$destroy();

                this.sessionStatusStore.set(itemSessionStatus.initial);

                this.render(this.container, this.options);
            });

        if (typeof done === 'function') {
            done();
        }

        /**
         * If test-runner layout needs to change based onWW item content,
         * notify test-runner (for example, by adding css class on body)
         * @param {Object} parsedData
         */
        this.setGlobalLayoutClasses = parsedData => {
            this.destroyGlobalLayoutClasses = () => {};

            if (hasClass(parsedData.itemClassList, 'writing-mode-vertical-rl')) {
                document.body.classList.add('item-writing-mode-vertical-rl');
                this.destroyGlobalLayoutClasses = () => {
                    document.body.classList.remove('item-writing-mode-vertical-rl');
                };
            }
        };

        /**
         * Cancel and clear ongoing uploads from subcomponents
         * The subcomponents should also delete their pendingOperationsStore entries
         * test-runner's proctoring plugin may call this on proctor-reset/proctor-terminate
         */
        this.cancelAllUploads = () => {
            // ExtendedText's UploadAdapter
            cancelAllExtendedTextUploads();
            // all other upload services (UploadInteraction, PCIs...)
            cancelAllServicesUploads();
        };
    },

    /**
     * Renders QTI item
     * @param {HTMLElement} container - item container
     * @param {() => void} done - done callback
     * @param {object} options - render options
     * @returns {void}
     */
    render(container, done, options = {}) {
        // store render params, in case re-render needed
        this.container = container;
        this.options = options;
        const { itemRunnerConfig, renderer, testContext = {} } = options;
        const previewerMode = itemRunnerConfig && itemRunnerConfig.previewerMode;
        this.itemData = prepareRubricBlock(this.itemData, testContext.rubricBlock);

        let parsedData;
        try {
            const dataToParse = this.modalFeedbackItemData || this.itemData;
            parsedData = itemDataParser(dataToParse, itemRunnerConfig, interactionName => {
                const interactions = getRenderer(renderer).getInteractions();
                return interactions[interactionName] || null;
            });
        } catch (e) {
            return this.trigger('error', e);
        }

        if (this.setGlobalLayoutClasses) {
            this.setGlobalLayoutClasses(parsedData);
        }

        const ItemComponent = previewerMode ? ItemPreviewer : Item;

        this.item = new ItemComponent({
            target: container,
            intro: true,
            props: Object.assign(parsedData, {
                assetManager: this.assetManager,
                userLang: getLocale(),
                options,
                extraData: this.itemData.extraData
            })
        });

        this.item.$on('error', e => {
            this.sessionStatusStore.set(itemSessionStatus.closed);
            this.trigger('error', e.detail);
        });

        this.item.$on('close', () => {
            this.sessionStatusStore.set(itemSessionStatus.closed);
            this.trigger('close');
        });

        this.item.$on('sequence-ended-nav-next', () => {
            this.trigger('sequence-ended-nav-next');
        });

        const offReady = this.item.$on('ready', () => {
            offReady();

            this.sessionStatusStore.set(
                this.sessionStatusToResume === itemSessionStatus.modalFeedback
                    ? itemSessionStatus.modalFeedback
                    : itemSessionStatus.interacting
            );

            this.needsReRender = false;

            //the item is rendered only when it is considered as ready
            //by the Item component
            if (typeof done === 'function') {
                done();
            }
        });
    },

    /**
     * Provider clears that destroys item and unsubscribes from listeners
     * @param {HTMLElement} container - item container
     * @param {() => void} done - done callback
     */
    clear(container, done) {
        this.sessionStatusStore.set(itemSessionStatus.closed);

        // destroy item
        if (this.item) {
            this.item.$destroy();
        }

        // unsubscribe from changes
        if (typeof this.unsubscribeFromStore === 'function') {
            this.unsubscribeFromStore();

            this.unsubscribeFromStore = null;
        }

        // clean state store
        if (this.stateStore) {
            this.stateStore.clear();
        }

        // clean settings store
        if (this.settingsStore) {
            releaseItemSettingsStore(this.itemIdentifier);
            this.settingsStore = null;
        }

        if (this.toolsStateStore) {
            releaseItemToolsStateStore(this.itemIdentifier);
            this.toolsStateStore = null;
        }

        // clean session status store
        if (this.sessionStatusStore) {
            this.sessionStatusStore.clear();
        }

        if (this.pendingOperationsStore) {
            this.pendingOperationsStore.clear();
            this.trigger('pendingoperationschange', { cleared: true, size: 0 });
        }

        releaseItemSequentialInteractionsStore(this.itemIdentifier);

        delete this.sessionStatusToResume;
        delete this.modalFeedbackItemData;

        if (this.destroyGlobalLayoutClasses) {
            this.destroyGlobalLayoutClasses();
        }

        if (typeof done === 'function') {
            done();
        }
    },

    /**
     * Returns with item state
     * @returns {object|void} item state
     */
    getState() {
        // request item to update response if it is necessary
        if (this.item && this.item.trigger) {
            this.item.trigger('stateupdate');
        }
        if (this.stateStore) {
            return this.stateStore.get();
        }
    },

    /**
     * Replaces item state with provider new state
     * @param {object} newState - new item state
     * @param {boolean} isInitialStateRestore - is it an initial state restore
     */
    setState(newState, isInitialStateRestore) {
        if (this.stateStore) {
            if (isInitialStateRestore) {
                this.stateStore.set(Object.assign({}, this.stateStore.get(), newState));
            } else {
                this.stateStore.set(newState);
            }
        }
    },

    /**
     * Replaces item data and item assets
     * @param {Object} itemData
     * @returns {Promise}
     */
    setData(itemData) {
        this.itemData = itemData;
        const assets = itemData && itemData.itemData && itemData.itemData.assets;
        this.assetManager.setData('assets', assets);
        this.needsReRender = true;
        return Promise.resolve();
    },

    /**
     * Replaces runner's options
     * @param {Object} options - the new options
     */
    setOptions(options) {
        //if the options contains settings we update the settings store
        if (options.settings && typeof options.settings === 'object') {
            this.settingsStore.set(options.settings);
        }
    },

    /**
     * Returns with QTI item responses
     * @returns {object|void} item responses
     */
    getResponses() {
        // request item to update response if it is necessary
        if (this.item && this.item.trigger) {
            this.item.trigger('stateupdate');
        }
        if (this.stateStore) {
            return this.stateStore.getItemResponses();
        }
    },

    /**
     * Suspend the item
     * @returns {Promise}
     */
    suspend() {
        this.sessionStatusStore.set(itemSessionStatus.suspended);
        return Promise.resolve();
    },

    /**
     * Close the item
     * @returns {Promise}
     */
    close() {
        this.sessionStatusStore.set(itemSessionStatus.closed);
        this.trigger('close');
        return Promise.resolve();
    },

    /**
     * Resume suspended item
     * @returns {Promise}
     */
    resume() {
        if (this.sessionStatusStore.isSuspended || this.sessionStatusStore.isClosed) {
            if (this.needsReRender) {
                return this.reRender(); // re-render will also set interacting status
            }
            this.sessionStatusStore.set(
                this.sessionStatusToResume === itemSessionStatus.modalFeedback
                    ? itemSessionStatus.modalFeedback
                    : itemSessionStatus.interacting
            );
        }
        return Promise.resolve();
    },

    /**
     * Render QTI modalFeedback elements for the item's responses
     * @param {Object} feedbacks - key-value dictionary of feedbacks, value includes feeback content & title
     * @param {Object} itemSession - includes info about which of those feedbacks need to be shown
     * @param {Function?} itemSession.onBeforeRenderFeedbacks - `() => Promise` -
     *    it's possible that `renderFeedbacks` was called, and when parsing data it found that no modalFeedbacks will actually need to be shown;
     *    but consumer may want to execute some code only before modalFeedbacks are actually rendered;
     *    then consumer can use this callback for such code.
     * @param {Function?} done - callback to notify consumer that method has finished (used in cases where consumer doesn't await returned promise)
     * @returns {Promise} - resolves when all feedbacks have been shown
     */
    async renderFeedbacks(feedbacks, itemSession, done) {
        const modalQueue = getModalFeedbackQueueData(feedbacks, itemSession);
        if (modalQueue.length) {
            if (typeof itemSession.onBeforeRenderFeedbacks === 'function') {
                //suspend/resume or only resume may be called here
                await itemSession.onBeforeRenderFeedbacks();
            }
            //suspend/resume may be called while renderFeedbacks promise is pending
            this.sessionStatusToResume = itemSessionStatus.modalFeedback;

            let navigatorComponent;
            for (const modal of modalQueue) {
                this.modalFeedbackItemData = getModalFeedbackItemData(modal, this.itemData);
                await this.reRender();

                if (!navigatorComponent) {
                    const navigatorArea = itemSession.modalFeedbackNavigatorArea;
                    if (navigatorArea) {
                        navigatorComponent = new ModalFeedbackNavigator({ target: navigatorArea });
                    }
                }

                let unsubscribeContinueEvent;
                await new Promise(resolve => {
                    unsubscribeContinueEvent = navigatorComponent.$on('modalFeedbackContinue', () => {
                        resolve();
                    });
                });
                unsubscribeContinueEvent();
            }

            delete this.sessionStatusToResume;
            delete this.modalFeedbackItemData;
            this.needsReRender = true;

            if (navigatorComponent) {
                navigatorComponent.$destroy();
            }
        }

        if (typeof done === 'function') {
            done();
        }
    }
};
