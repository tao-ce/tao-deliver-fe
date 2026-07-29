// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { testLayoutStore } from '../../../layout/testLayoutStore.js';
import toolsStoreHandler from '../../tools/util/toolsStoreHandler.js';
import AttachmentsOverlayBox from './AttachmentsOverlayBox.svelte';
import Attachment from './Attachment.svelte';
import AttachmentsFlyout from './AttachmentsFlyout.svelte';
import { openUrlInNewTab } from '@oat-sa-private/ui-core';
import { tick, mount, unmount } from 'svelte';

/**
 * @typedef {Object} Attachment
 * @property {String} id - identifier of asset
 * @property {String} url - the attachment's signed url
 * @property {String} name - the attachment's original filename (may contain weird characters!)
 * @property {String} type - the attachment's mime type
 * @property {Number} [page] - in the case of a multi-page pdf attachment
 * @property {Number} [zoom] - in the case of a zoomable attachment
 * @property {Number} [zoomForWidth] - in the case of a zoomable attachment
 * @property {Number} [scrollTop] - in the case of a scrollable attachment
 * @property {Number} [scrollLeft] - in the case of a scrollable attachment
 */

const pluginName = 'attachments';

const defaultConfig = {
    attachmentTarget: 'asideEnd' // or 'asideStart'
};

/**
 * This plugin renders the attachments per item, and their controls
 * and manages their UI state.
 */
export default pluginFactory({
    name: pluginName,

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        const pluginConfig = { ...defaultConfig, ...providedConfig };
        this.setConfig(pluginConfig);

        /**
         * Controls whether attachment renders spatially before or after item; it identifies an areaBroker area
         * @type {String}
         */
        const defaultAreaName = pluginConfig.attachmentTarget || 'asideEnd';

        const areaBroker = this.getAreaBroker();
        this.toolsStoreHandler = toolsStoreHandler(testConfig.serviceCallId, this.getName());

        this.getCurrentItemId = () =>
            this.state?.activeItemContext?.itemId
            || testRunner.getDataHolder()?.getCurrentItem()?.id
            || testRunner.getCurrentItemIdentifier();

        /**
         * Svelte components, all null except when mounted
         */
        this.components = {
            // AttachmentsOverlayBox
            toolbar: null,
            // Attachment
            attachment: null,
            // AttachmentsFlyout (depends on Attachment presence)
            flyout: null
        };

        /**
         * Maintain UI state for save/restore/navigate
         */
        this.state = {
            ui: {
                areaName: defaultAreaName,
                toolbarOpen: false,
                attachmentRendered: false,
                flyoutOpen: false,
                showNewTabLinks: true
            },
            byId: {}, // keyed by attachment id; values: { page, zoom, zoomForWidth, scrollTop, scrollLeft, search }
            byItem: {}, // keyed by itemId; values: { attachmentSignature, selectedAttachmentId }
            activeItemContext: null,
            previousItemContext: null
        };

        /**
         * Load the whole local state from a central store
         */
        this.loadState = () => {
            this.state.ui = this.toolsStoreHandler.get('ui') || this.state.ui;
            this.state.byId = {
                ...this.state.byId,
                ...(this.toolsStoreHandler.get('byId') || {})
            };
        };

        /**
         * Create snapshot of the current item context before it changes
         * @param {?{itemId: String, attachmentSignature: String}} itemContext
         * @returns {?{itemId: String, attachmentSignature: String}}
         */
        this.getItemContextSnapshot = itemContext => (itemContext ? { ...itemContext } : null);

        /**
         * Load a particular item's local state from a central store
         * @param {String} itemId
         */
        this.loadStateForItem = itemId => {
            const resolvedItemId = itemId || this.getCurrentItemId();
            if (!resolvedItemId) {
                return;
            }

            const storedItemState = this.toolsStoreHandler.getForItem(resolvedItemId, 'attachments');
            if (storedItemState && Object.keys(storedItemState).length > 0) {
                if (storedItemState.byId) {
                    this.state.byId = {
                        ...this.state.byId,
                        ...storedItemState.byId
                    };
                }

                const existingItemState = this.state.byItem[resolvedItemId] || {};
                this.state.byItem[resolvedItemId] = {
                    attachmentSignature: storedItemState.attachmentSignature || existingItemState.attachmentSignature,
                    selectedAttachmentId:
                        storedItemState.selectedAttachmentId || existingItemState.selectedAttachmentId || null
                };
            }
        };

        /**
         * Normalize a serialized attachment signature so different authoring order resolves
         * to the same attachment-set signature
         * @param {String} attachmentSignature
         * @returns {String}
         */
        this.normalizeAttachmentSignature = attachmentSignature => {
            if (!attachmentSignature) {
                return attachmentSignature;
            }

            try {
                const parsedSignature = JSON.parse(attachmentSignature);
                return Array.isArray(parsedSignature) ? JSON.stringify([...parsedSignature].sort()) : attachmentSignature;
            } catch {
                return attachmentSignature;
            }
        };

        /**
         * Get a normalized signature for the current attachment configuration
         * @param {Attachment[]} [itemAttachments]
         * @returns {String}
         */
        this.getAttachmentSignature = (itemAttachments = this.getItemAttachments()) =>
            JSON.stringify(itemAttachments.map(attachment => attachment.id).sort());

        /**
         * Get normalized state for an item and migrate legacy item-scoped state if needed
         * @param {String} itemId
         * @param {Attachment[]} [itemAttachments]
         * @returns {{attachmentSignature: String, selectedAttachmentId: ?String}}
         */
        this.getItemState = (itemId, itemAttachments = this.getItemAttachments()) => {
            const resolvedItemId = itemId || this.getCurrentItemId();
            const attachmentSignature = this.getAttachmentSignature(itemAttachments);

            if (!resolvedItemId) {
                return {
                    attachmentSignature,
                    selectedAttachmentId: null
                };
            }

            const existingItemState = this.state.byItem[resolvedItemId];
            const isCompatibleState =
                !!existingItemState &&
                (!existingItemState.attachmentSignature
                    || this.normalizeAttachmentSignature(existingItemState.attachmentSignature) === attachmentSignature);

            if (!existingItemState || !isCompatibleState) {
                this.state.byItem[resolvedItemId] = {
                    attachmentSignature,
                    selectedAttachmentId: isCompatibleState ? existingItemState.selectedAttachmentId || null : null
                };
            } else if (existingItemState.attachmentSignature !== attachmentSignature) {
                this.state.byItem[resolvedItemId] = {
                    ...existingItemState,
                    attachmentSignature
                };
            }

            return this.state.byItem[resolvedItemId];
        };

        /**
         * Copy attachment selection from one item to another when both items share
         * the same attachment set, regardless of authoring order
         * @param {String} sourceItemId
         * @param {String} targetItemId
         * @param {Attachment[]} [itemAttachments]
         */
        this.copyAttachmentSelectionBetweenItems = (
            sourceItemId,
            targetItemId,
            itemAttachments = this.getItemAttachments()
        ) => {
            if (!sourceItemId || !targetItemId) {
                return;
            }

            const sourceItemState = this.getItemState(sourceItemId, itemAttachments);
            const targetItemState = this.getItemState(targetItemId, itemAttachments);

            targetItemState.selectedAttachmentId = sourceItemState.selectedAttachmentId;
        };

        /**
         * Get the selected attachment id for an item, if it still exists in current attachments
         * @param {String} itemId
         * @param {Attachment[]} [itemAttachments]
         * @returns {?String}
         */
        this.getSelectedAttachmentId = (itemId, itemAttachments = this.getItemAttachments()) => {
            const selectedAttachmentId = this.getItemState(itemId, itemAttachments).selectedAttachmentId;
            return selectedAttachmentId && itemAttachments.find(a => a.id === selectedAttachmentId)
                ? selectedAttachmentId
                : null;
        };

        /**
         * Persist the selected attachment id for an item in local state
         * @param {String} itemId
         * @param {String} attachmentId
         * @param {Attachment[]} [itemAttachments]
         */
        this.setSelectedAttachmentIdForItem = (itemId, attachmentId, itemAttachments = this.getItemAttachments()) => {
            if (!itemId || !attachmentId) {
                return;
            }

            this.getItemState(itemId, itemAttachments).selectedAttachmentId = attachmentId;
        };

        /**
         * Save the whole local state to a central store
         * @param {?String} [itemIdOverride]
         */
        this.saveState = itemIdOverride => {
            const itemId = itemIdOverride || this.getCurrentItemId();
            this.toolsStoreHandler.set('ui', this.state.ui);
            this.toolsStoreHandler.set('byId', this.state.byId);
            if (itemId && this.state.byItem[itemId]) {
                this.toolsStoreHandler.setForItem(itemId, 'attachments', this.state.byItem[itemId]);
            }
        };

        /**
         * Set in toolsStore if attachments toolbar button is enabled/visible
         * @param {String} key
         * @param {Boolean} value
         */
        this.setToolbarButtonState = (key, value) => {
            this.toolsStoreHandler.set(key, value);
        };

        /**
         * Ensure the button state is correct according to visible components
         */
        this.updateOpenState = () => {
            this.setToolbarButtonState('open', this.state.ui.toolbarOpen || this.state.ui.attachmentRendered);
        };

        /**
         * Show the main attachments toolbar
         */
        this.openToolbar = () => {
            if (!this.components.toolbar) {
                this.renderToolbar();
            }
            this.state.ui.toolbarOpen = true;
            this.updateOpenState();
        };

        /**
         * Hide the main attachments toolbar
         */
        this.closeToolbar = () => {
            this.destroyToolbar();
            this.state.ui.toolbarOpen = false;
            this.updateOpenState();
            this.saveState();
        };

        /**
         * Mount AttachmentsOverlayBox (toolbar) component and listen to its events
         */
        this.renderToolbar = () => {
            const itemAttachments = this.getItemAttachments();

            this.components.toolbar = mount(AttachmentsOverlayBox, {
                target: this.toolbarContainer,
                props: {
                    serviceCallId: testConfig.serviceCallId,
                    attachments: itemAttachments,
                    showNewTabLinks: this.state.ui.showNewTabLinks
                }
            });
            this.components.toolbar.$on('click', e => {
                const { id, inNewTab } = e.detail;
                const attachment = itemAttachments.find(a => a.id === id);
                if (attachment) {
                    if (!inNewTab) {
                        this.renderAttachment(attachment.id);
                        this.closeToolbar();
                    } else {
                        openUrlInNewTab(attachment.url);
                    }
                }
            });
            this.components.toolbar.$on('action', e => {
                const { key } = e.detail;
                if (key === 'close') {
                    this.closeToolbar();
                    this.getToolbarButton()?.focus();
                }
            });
            this.components.toolbar.$on('close', () => {
                this.closeToolbar();
                this.getToolbarButton()?.focus();
            });
        };

        /**
         * Mount the Attachment of the item in the designated area; also restyles TestLayout
         * @param {String} attachmentId
         * @param {String} [itemId]
         */
        this.renderAttachment = (attachmentId, itemId = this.getCurrentItemId()) => {
            testLayoutStore.update(s => ({
                ...s,
                asideStart: this.state.ui.areaName === 'asideStart',
                asideEnd: this.state.ui.areaName === 'asideEnd'
            }));

            if (!attachmentId) {
                return;
            }
            const itemAttachments = this.getItemAttachments(itemId);
            const attachment = itemAttachments?.find(a => a.id === attachmentId);
            if (!attachment || attachment.id === this.currentAttachment?.id) {
                return;
            }
            const attachmentState = this.state.byId[attachment.id] || {};

            // copy state to component props
            attachment.page = attachmentState.page || 1;
            attachment.zoom = attachmentState.zoom || 1;
            attachment.zoomForWidth = attachmentState.zoomForWidth || 0;
            attachment.scrollTop = attachmentState.scrollTop || null;
            attachment.scrollLeft = attachmentState.scrollLeft || null;
            attachment.search = attachmentState.search;

            this.currentAttachment = attachment;

            if (this.components.attachment) {
                unmount(this.components.attachment);
            }
            this.components.attachment = mount(Attachment, {
                target: areaBroker.getArea(this.state.ui.areaName),
                props: {
                    serviceCallId: testConfig.serviceCallId,
                    attachment,
                    assetManager: testRunner.getAssetManager(),
                    openInNewTab: this.state.ui.showNewTabLinks
                }
            });
            // Attachment events
            this.components.attachment.$on('mount', e => {
                this.renderFlyout(e.detail.flyoutAnchorElt);
            });
            this.components.attachment.$on('toggle-menu', () => {
                if (this.components.flyout) {
                    this.state.ui.flyoutOpen = !this.state.ui.flyoutOpen;
                    this.components.attachment.$set({ isFlyoutOpen: this.state.ui.flyoutOpen });
                }
            });
            this.components.attachment.$on('close', () => {
                this.destroyAttachment();
                this.getToolbarButton()?.focus();
            });
            // DocumentViewer events
            this.components.attachment.$on('pagechange', e => {
                this.state.byId[attachment.id] = {
                    ...this.state.byId[attachment.id],
                    page: e.detail
                };
                this.saveState(itemId);
            });
            this.components.attachment.$on('zoomchange', e => {
                this.state.byId[attachment.id] = {
                    ...this.state.byId[attachment.id],
                    zoom: e.detail.zoom,
                    zoomForWidth: e.detail.zoomForWidth
                };
            });
            this.components.attachment.$on('scrollchange', e => {
                this.state.byId[attachment.id] = {
                    ...this.state.byId[attachment.id],
                    scrollTop: e.detail.scrollTop,
                    scrollLeft: e.detail.scrollLeft
                };
            });
            this.components.attachment.$on('searchchange', e => {
                this.state.byId[attachment.id] = {
                    ...this.state.byId[attachment.id],
                    search: e.detail
                };
                this.saveState(itemId);
            });

            this.setSelectedAttachmentIdForItem(itemId, attachmentId, itemAttachments);
            this.state.ui.attachmentRendered = true;
            this.updateOpenState();
            this.saveState(itemId);

            tick().then(() => {
                testRunner.trigger('layoutchange');
            });
        };

        /**
         * Mount AttachmentsFlyout component (invisible) waiting to be activated
         * Unmount is handled when Attachment unmounts
         * @param {DOMElement} reference
         */
        this.renderFlyout = reference => {
            const itemAttachments = this.getItemAttachments();

            if (this.components.flyout) {
                unmount(this.components.flyout);
            }
            this.components.flyout = mount(AttachmentsFlyout, {
                target: areaBroker.getArea(this.state.ui.areaName),
                props: {
                    serviceCallId: testConfig.serviceCallId,
                    attachments: itemAttachments,
                    reference,
                    showNewTabLinks: this.state.ui.showNewTabLinks
                }
            });
            this.components.flyout.$on('show', () => {
                this.state.ui.flyoutOpen = true;
                this.components.attachment?.$set({ isFlyoutOpen: true });
            });
            this.components.flyout.$on('hide', () => {
                this.state.ui.flyoutOpen = false;
                this.components.attachment?.$set({ isFlyoutOpen: false });
            });
            this.components.flyout.$on('click', e => {
                const { id, inNewTab } = e.detail;
                if (id === this.currentAttachment?.id && !inNewTab) {
                    // no need to re-render rendered attachment
                    return;
                }
                const nextAttachment = itemAttachments.find(a => a.id === id);
                if (nextAttachment) {
                    if (!inNewTab) {
                        this.state.ui.flyoutOpen = false;
                        this.components.attachment.$set({ isFlyoutOpen: false });
                        this.renderAttachment(nextAttachment.id);
                    } else {
                        openUrlInNewTab(nextAttachment.url);
                    }
                }
            });
            this.components.flyout.$on('close', () => {
                this.destroyFlyout();
            });
        };

        /**
         * Unmount AttachmentsOverlayBox (toolbar) component
         */
        this.destroyToolbar = () => {
            if (this.components.toolbar) {
                unmount(this.components.toolbar);
            }
            this.components.toolbar = null;
        };

        /**
         * Unmount the Attachment of the item; also restyles TestLayout
         * @param {Boolean} [includeState]
         */
        this.destroyAttachment = (includeState = true) => {
            this.destroyFlyout();

            if (this.components.attachment) {
                unmount(this.components.attachment);
                this.components.attachment = null;
            }
            this.currentAttachment = null;

            testLayoutStore.update(s => ({ ...s, [this.state.ui.areaName]: false }));

            if (includeState) {
                // state change is optional, we skip it when navigating
                // so the Attachment can disappear and come back if some items shouldn't show it
                this.state.ui.attachmentRendered = false;
                this.updateOpenState();
                this.saveState();
            }
            tick().then(() => {
                testRunner.trigger('layoutchange');
            });
        };

        /**
         * Unmount the AttachmentsFlyout component
         */
        this.destroyFlyout = () => {
            if (this.components.flyout) {
                unmount(this.components.flyout);
                this.components.flyout = null;
            }
            this.state.ui.flyoutOpen = false;
        };

        /**
         * Get the attachments from the testMap, for the current item
         * @param {String} [itemId]
         * @returns {Object[]}
         */
        this.getItemAttachments = (itemId = this.getCurrentItemId()) => {
            const dataHolder = testRunner.getDataHolder();
            const currentSectionId = dataHolder?.getCurrentSection()?.id || testRunner.getTestContext()?.sectionId;
            const currentTestPartId = dataHolder?.getCurrentTestPart()?.id || testRunner.getTestContext()?.testPartId;
            const item = itemId
                ? dataHolder?.getItem?.(itemId, currentSectionId, currentTestPartId)
                : dataHolder?.getCurrentItem();

            return item?.attachments || [];
        };
    },

    init() {
        const testRunner = this.getTestRunner();
        testRunner
            .on(`render.${this.getName()}`, () => {
                // hide new tab links if we have security plugins, because the new tab likely triggers security
                const plugins = testRunner.getPlugins();
                if ('pauseOnBlur' in plugins || 'forceFullscreen' in plugins) {
                    this.state.ui.showNewTabLinks = false;
                }

                this.loadState();
                this.state.ui.toolbarOpen = false;
                this.updateOpenState();
            })
            // when main plugin button is clicked
            .on(`toolbaraction.${this.getName()}`, key => {
                if (key === 'attachments') {
                    if (this.state.ui.attachmentRendered) {
                        // close everything
                        this.destroyAttachment();
                        this.closeToolbar();
                        this.getToolbarButton()?.focus();
                    } else if (this.state.ui.toolbarOpen) {
                        this.closeToolbar();
                        this.getToolbarButton()?.focus();
                    } else {
                        // open toolbar or previously opened attachment or first attachment, depending on amount
                        const itemId = this.getCurrentItemId();
                        const itemAttachments = this.getItemAttachments(itemId);

                        if (itemAttachments.length === 1) {
                            this.renderAttachment(itemAttachments[0].id, itemId);
                        } else if (itemAttachments.length > 1) {
                            const selectedAttachmentId = this.getSelectedAttachmentId(itemId, itemAttachments);
                            if (selectedAttachmentId) {
                                this.renderAttachment(selectedAttachmentId, itemId);
                            } else {
                                this.openToolbar();
                            }
                        }
                    }
                    this.saveState();
                }
            })
            .on(`renderitem.${this.getName()}`, itemId => {
                const currentItemId = itemId || this.getCurrentItemId();
                this.loadStateForItem(currentItemId);

                const itemAttachments = this.getItemAttachments(currentItemId);
                const currentAttachmentSignature = this.getAttachmentSignature(itemAttachments);

                if (currentItemId && this.state.activeItemContext?.itemId !== currentItemId) {
                    this.state.previousItemContext = this.getItemContextSnapshot(this.state.activeItemContext);
                }
                this.getItemState(currentItemId, itemAttachments);

                if (itemAttachments.length) {
                    this.setToolbarButtonState('visible', true);
                    this.components.toolbar?.$set({ attachments: itemAttachments });

                    if (this.state.ui.attachmentRendered) {
                        if (this.state.previousItemContext?.attachmentSignature === currentAttachmentSignature) {
                            this.copyAttachmentSelectionBetweenItems(
                                this.state.previousItemContext.itemId,
                                currentItemId,
                                itemAttachments
                            );
                        }

                        const attachmentIdToRender = this.getSelectedAttachmentId(currentItemId, itemAttachments)
                            || itemAttachments[0].id;

                        this.renderAttachment(attachmentIdToRender, currentItemId);
                        this.setSelectedAttachmentIdForItem(currentItemId, attachmentIdToRender, itemAttachments);
                    }
                } else {
                    this.setToolbarButtonState('visible', false);
                    this.closeToolbar();
                    this.destroyAttachment(false);
                }
                this.state.activeItemContext = currentItemId
                    ? {
                          itemId: currentItemId,
                          attachmentSignature: currentAttachmentSignature
                      }
                    : null;
                this.saveState(currentItemId);
            })
            .on(`unloaditem.${this.getName()}`, itemId => {
                const currentItemId = itemId || this.state.activeItemContext?.itemId || this.getCurrentItemId();
                this.state.previousItemContext = this.getItemContextSnapshot(this.state.activeItemContext);
                this.destroyAttachment(false);
                this.destroyToolbar();
                this.state.ui.toolbarOpen = false;
                this.updateOpenState();
                this.saveState(currentItemId);
            });
    },

    render() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();

        this.getToolbarButton = () => areaBroker.getTopBarArea().querySelector('#attachments-toolbar-btn');

        // find where the toolbar must go
        const toolbarContainerSelector = `.toolbar-${this.getName()}`;
        const toolbarContainer = areaBroker.getToolsArea().querySelector(toolbarContainerSelector);
        if (!toolbarContainer) {
            throw new Error(`No container '${toolbarContainerSelector}' found to render plugin into.`);
        }
        this.toolbarContainer = toolbarContainer;
    },

    destroy() {
        const testRunner = this.getTestRunner();
        testRunner.off(`.${this.getName()}`);

        if (this.components.toolbar) {
            unmount(this.components.toolbar);
        }
        if (this.components.attachment) {
            unmount(this.components.attachment);
        }
        if (this.components.flyout) {
            unmount(this.components.flyout);
        }
    }
});
