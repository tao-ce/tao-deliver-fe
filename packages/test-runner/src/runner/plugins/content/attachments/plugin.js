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
import { openInNewTab } from '../../../util/common.js';
import { tick } from 'svelte';

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
            byId: {}, // keyed by attachment.id; values: { page, zoom, zoomForWidth, scrollTop, scrollLeft }
            byItem: {} // keyed by itemId; values: { selectedAttachmentId }
        };

        /**
         * Load the whole local state from a central store
         */
        this.loadState = () => {
            this.state.ui = this.toolsStoreHandler.get('ui') || this.state.ui;
            this.state.byId = this.toolsStoreHandler.get('byId') || this.state.byId;
        };

        /**
         * Load a particular item's local state from a central store
         * @param {String} itemId
         */
        this.loadStateForItem = itemId => {
            this.state.byItem = {
                ...this.state.byItem,
                [itemId]: this.toolsStoreHandler.getForItem(itemId, 'attachments') || this.state.byItem[itemId]
            };
        };

        /**
         * Save the whole local state to a central store
         */
        this.saveState = () => {
            const itemId = testRunner.getCurrentItemIdentifier();
            this.toolsStoreHandler.set('ui', this.state.ui);
            this.toolsStoreHandler.set('byId', this.state.byId);
            this.toolsStoreHandler.setForItem(itemId, 'attachments', this.state.byItem[itemId]);
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

            this.components.toolbar = new AttachmentsOverlayBox({
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
                        openInNewTab(attachment.url);
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
         */
        this.renderAttachment = attachmentId => {
            testLayoutStore.update(s => ({
                ...s,
                asideStart: this.state.ui.areaName === 'asideStart',
                asideEnd: this.state.ui.areaName === 'asideEnd'
            }));

            if (!attachmentId) {
                return;
            }
            const itemAttachments = this.getItemAttachments();
            const attachment = itemAttachments?.find(a => a.id === attachmentId);
            if (!attachment || attachment.id === this.currentAttachment?.id) {
                return;
            }

            // copy state to component props
            attachment.page = this.state.byId[attachment.id]?.page || 1;
            attachment.zoom = this.state.byId[attachment.id]?.zoom || 1;
            attachment.zoomForWidth = this.state.byId[attachment.id]?.zoomForWidth || 0;
            attachment.scrollTop = this.state.byId[attachment.id]?.scrollTop || 0;
            attachment.scrollLeft = this.state.byId[attachment.id]?.scrollLeft || 0;

            this.currentAttachment = attachment;

            this.components.attachment?.$destroy();
            this.components.attachment = new Attachment({
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
                this.saveState();
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

            this.state.byItem[testRunner.getCurrentItemIdentifier()] = {
                selectedAttachmentId: attachmentId
            };
            this.state.ui.attachmentRendered = true;
            this.updateOpenState();
            this.saveState();

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

            this.components.flyout?.$destroy();
            this.components.flyout = new AttachmentsFlyout({
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
                        openInNewTab(nextAttachment.url);
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
            this.components.toolbar?.$destroy();
            this.components.toolbar = null;
        };

        /**
         * Unmount the Attachment of the item; also restyles TestLayout
         * @param {Boolean} [includeState]
         */
        this.destroyAttachment = (includeState = true) => {
            this.destroyFlyout();

            this.components.attachment?.$destroy();
            this.components.attachment = null;
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
            this.components.flyout?.$destroy();
            this.components.flyout = null;
            this.state.ui.flyoutOpen = false;
        };

        /**
         * Get the attachments from the testMap, for the current item
         * @returns {Object[]}
         */
        this.getItemAttachments = () => testRunner.getDataHolder()?.getCurrentItem()?.attachments || [];
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
                        const itemId = testRunner.getCurrentItemIdentifier();
                        const selectedAttachmentId = this.state.byItem[itemId]?.selectedAttachmentId;
                        const itemAttachments = this.getItemAttachments();

                        if (itemAttachments.length === 1) {
                            this.renderAttachment(itemAttachments[0].id);
                        } else if (itemAttachments.length > 1) {
                            if (selectedAttachmentId) {
                                this.renderAttachment(selectedAttachmentId);
                            } else {
                                this.openToolbar();
                            }
                        }
                    }
                    this.saveState();
                }
            })
            .on(`renderitem.${this.getName()}`, itemId => {
                this.loadStateForItem(itemId);

                const itemAttachments = this.getItemAttachments();
                // build up the full map of attachments in state, preserving the ones already added & modified there
                itemAttachments.forEach(att => {
                    if (!this.state.byId[att.id]) {
                        this.state.byId[att.id] = {};
                    }
                });

                if (itemAttachments.length) {
                    this.setToolbarButtonState('visible', true);
                    this.components.toolbar?.$set({ attachments: itemAttachments });

                    if (this.state.ui.attachmentRendered) {
                        const lastAttachmentId = this.state.byItem[itemId]?.selectedAttachmentId;
                        if (lastAttachmentId && itemAttachments.find(a => a.id === lastAttachmentId)) {
                            this.renderAttachment(lastAttachmentId);
                        } else {
                            this.renderAttachment(itemAttachments[0].id);
                        }
                    }
                } else {
                    this.setToolbarButtonState('visible', false);
                    this.closeToolbar();
                    this.destroyAttachment(false);
                }
                this.saveState();
            })
            .on(`unloaditem.${this.getName()}`, () => {
                this.destroyAttachment(false);
                this.destroyToolbar();
                this.state.ui.toolbarOpen = false;
                this.updateOpenState();
                this.saveState();
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

        this.components.toolbar?.$destroy();
        this.components.attachment?.$destroy();
        this.components.flyout?.$destroy();
    }
});
