// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { defaultsDeep } from 'lodash';
import { reviewResponseDisplays } from '../../../session/reviewResponseDisplays.js';
import { commentHighlighterFactory } from './commentHighlighter.js';
import { selectionListenerFactory } from './selectionListener.js';
import CommentStyle from './controls/CommentStyle.svelte';
import CommentButton from './controls/CommentButton.svelte';
import CommentEditor from './controls/CommentEditor.svelte';
import CommentViewer from './controls/CommentViewer.svelte';
import { getCommentElements, getResponseIdForElement, getExtendedTextInteractionElements } from './selectors.js';
import { modelHelperFactory } from './model.js';
import { __ } from '@oat-sa-private/ui-core';
import { mount, unmount } from 'svelte';

const defaultPluginConfig = {};

export default pluginFactory({
    name: 'inlineComments',

    install() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const proxy = testRunner.getProxy();
        const pluginConfig = defaultsDeep({}, testRunner.getPluginConfig(this.getName()), defaultPluginConfig);

        pluginConfig.isEditMode = Array.isArray(pluginConfig.mode) ? pluginConfig.mode.includes('write') : false;
        this.setConfig(pluginConfig);

        this.components = {
            style: null,
            editor: null,
            viewer: null,
            button: null
        };
        this.state = {
            isEditorOpen: false,
            isButtonOpen: false,
            currentItemRef: null,
            currentResponseId: null,
            currentColorKey: null,
            editorIsCreate: false,
            editorHasUnsavedChanges: false,
            lastFocusedElement: null
        };
        this.commentHighlighters = {};
        this.selectionListener = null;
        this.modelHelper = modelHelperFactory();

        /**
         * Communication with 'highlighter' plugin.
         */
        this.highlighterPlugin = {
            /**
             * When mode where highlight is created on user selection is set on/off.
             * Comment selection listeners should be removed while this mode is on.
             */
            isListeningToSelection: false,
            /**
             * If comments plugin is enabled for this session.
             */
            notifyPluginEnabled: () => {
                testRunner.trigger('inlineComments-highlighter', { action: 'enabled' });
            },
            /**
             * First comments should be restored, and only then highlights.
             * Because comment is always kept, but higlhight shpuld be removed if there's overlapping comment in the same place.
             * @param {String} itemRef
             */
            notifyCommentsWereRestored: itemRef => {
                testRunner.trigger('inlineComments-highlighter', { action: 'comments-restored', payload: { itemRef } });
            },
            /**
             * Avoid including unsaved comment element in highlighter model.
             * Otherwise not clear what should higlhighter restore if comment creation ended up being cancelled.
             * So highligher should for now stop updating its model.
             * @param {Boolean} hasUnsaved
             * @param {Object} args
             * @param {Boolean} args.restorePreviousModel -  if comment creation was cancelled:
             *      if part of existing highlight was removed when creating comment, restore it back
             */
            notifyHasUnsaved: (hasUnsaved, { restorePreviousModel } = {}) => {
                testRunner.trigger('inlineComments-highlighter', {
                    action: 'has-unsaved',
                    payload: {
                        hasUnsaved,
                        restorePreviousModel
                    }
                });
            },
            /**
             * If user selection goes over existing highlight - we want to create comment over this highlight.
             * Need higlhighter to erase overlapping higlhights and after that restore user selection.
             * Assuming this is synchronious.
             */
            eraseOverlapping: () => {
                testRunner.trigger('inlineComments-highlighter', { action: 'erase-overlapping' });
            }
        };

        this.mountStyle = () => {
            this.components.style = mount(CommentStyle, {
                target: areaBroker.getContentArea(),
                props: {}
            });
        };
        this.toggleEditor = (open, { clientX, clientY, commentValue, isCreate } = {}) => {
            if (open) {
                this.state.lastFocusedElement = document.activeElement;
                if (!this.components.editor) {
                    this.components.editor = mount(CommentEditor, {
                        target: areaBroker.getContentArea(),
                        props: {}
                    });
                    this.components.editor.$on('close', this.onEditorClose);
                    this.components.editor.$on('save', this.onEditorSave);
                    this.components.editor.$on('delete', this.onEditorDelete);
                    this.components.editor.$on('change', this.onEditorChange);
                }
                this.components.editor.$set({
                    isEditorOpen: true,
                    clientX,
                    clientY,
                    commentValue
                });
                this.state.editorHasUnsavedChanges = false;
                this.state.editorIsCreate = isCreate;
                this.state.isEditorOpen = true;

                if (isCreate) {
                    setTimeout(() => {
                        this.components?.editor?.focusField();
                    }, 100);
                }
            } else {
                if (this.components.editor) {
                    this.components.editor.$set({
                        isEditorOpen: false
                    });
                }
                this.state.isEditorOpen = false;
                this.state.lastFocusedElement?.focus();
            }
        };
        this.toggleViewer = (open, { anchorElement, commentValue } = {}) => {
            if (open) {
                if (!this.components.viewer) {
                    this.components.viewer = mount(CommentViewer, {
                        target: areaBroker.getContentArea(),
                        props: {}
                    });
                    this.components.viewer.$on('close', this.onViewerClose);
                }
                this.components.viewer.$set({
                    reference: anchorElement,
                    commentValue
                });
                this.state.isViewerOpen = true;
            } else {
                if (this.components.viewer) {
                    this.components.viewer.$set({
                        reference: null
                    });
                }
                this.state.isViewerOpen = false;
            }
        };
        this.toggleButton = (open, { range } = {}) => {
            if (open) {
                if (!this.components.button) {
                    this.components.button = mount(CommentButton, {
                        target: areaBroker.getContentArea(),
                        props: {}
                    });
                    this.components.button.$on('click', this.onButtonClick);
                }
                this.components.button.$set({ reference: range });
                this.state.isButtonOpen = true;
            } else {
                if (this.components.button) {
                    this.components.button.$set({
                        reference: null
                    });
                }
                this.state.isButtonOpen = false;
            }
        };
        this.destroyComponents = () => {
            for (const componentName of Object.keys(this.components)) {
                if (this.components[componentName]) {
                    unmount(this.components[componentName]);
                    this.components[componentName] = null;
                }
            }
        };

        this.onButtonClick = e => {
            if (this.highlighterPlugin.isListeningToSelection) {
                return;
            }
            const commentHighlighter = this.commentHighlighters[this.state.currentResponseId];
            const colorKey = commentHighlighter.generateUniqueColorKey();

            this.highlighterPlugin.notifyHasUnsaved(true);
            this.highlighterPlugin.eraseOverlapping();

            commentHighlighter.highlightSelection(colorKey, true);

            this.state.currentColorKey = colorKey;

            //check if highlight was actually created - maybe it wasn't if selection didn't include text
            const createdHighlightElements = getCommentElements(
                this.state.currentResponseId,
                this.state.currentColorKey
            );
            if (createdHighlightElements.length > 0) {
                const { clientX, clientY } = e.detail.position || {};
                this.toggleEditor(true, {
                    clientX,
                    clientY,
                    commentValue: '',
                    isCreate: true
                });
            }
        };
        this.onEditorClose = () => {
            this.toggleEditor(false);

            if (this.state.editorIsCreate) {
                const commentHighlighter = this.commentHighlighters[this.state.currentResponseId];
                commentHighlighter.clearHighlights(this.state.currentColorKey);

                this.highlighterPlugin.notifyHasUnsaved(false, { restorePreviousModel: true });
            }
        };
        this.onEditorSave = async e => {
            const { commentValue } = e.detail;

            let model;
            if (this.state.editorIsCreate) {
                const commentHighlighter = this.commentHighlighters[this.state.currentResponseId];
                const highlighterModel = commentHighlighter.getCommentsOnlyDataModel();
                model = this.modelHelper.addComment({
                    itemRef: this.state.currentItemRef,
                    responseId: this.state.currentResponseId,
                    colorKey: this.state.currentColorKey,
                    commentValue,
                    highlighterModel
                });
            } else {
                model = this.modelHelper.updateComment({
                    itemRef: this.state.currentItemRef,
                    responseId: this.state.currentResponseId,
                    colorKey: this.state.currentColorKey,
                    commentValue
                });
            }

            try {
                this.components.editor.$set({
                    disabled: true,
                    submitting: true
                });

                await proxy.saveScoringInlineComments(this.state.currentItemRef, model);
                this.modelHelper.persistChanges({ itemRef: this.state.currentItemRef, model });

                this.components.editor.$set({
                    disabled: false,
                    submitting: false
                });
                this.toggleEditor(false);

                if (this.state.editorIsCreate) {
                    this.highlighterPlugin.notifyHasUnsaved(false, { restorePreviousModel: false });
                }
            } catch (error) {
                console.error(error);
                this.components.editor.$set({
                    disabled: false,
                    submitting: false,
                    notificationProps: {
                        title: __('Saving failed'),
                        message: __('Please try again.'),
                        hierarchy: 'alert'
                    }
                });
                this.components.editor.focusField();
                return;
            }
        };
        this.onEditorDelete = async () => {
            const commentHighlighter = this.commentHighlighters[this.state.currentResponseId];

            //don't delete real highlight node yet, because deletion can fail
            const highlighterModel = commentHighlighter.getCommentsOnlyDataModel({
                excludeColorKey: this.state.currentColorKey
            });
            const model = this.modelHelper.deleteComment({
                itemRef: this.state.currentItemRef,
                responseId: this.state.currentResponseId,
                colorKey: this.state.currentColorKey,
                highlighterModel
            });

            try {
                this.components.editor.$set({
                    disabled: true,
                    submitting: true
                });

                await proxy.saveScoringInlineComments(this.state.currentItemRef, model);
                this.modelHelper.persistChanges({ itemRef: this.state.currentItemRef, model });

                this.components.editor.$set({
                    disabled: false,
                    submitting: false
                });
                this.toggleEditor(false);

                commentHighlighter.clearHighlights(this.state.currentColorKey);
            } catch (error) {
                console.error(error);
                this.components.editor.$set({
                    disabled: false,
                    submitting: false,
                    notificationProps: {
                        title: __('Deletion failed'),
                        message: __('Please try again.'),
                        hierarchy: 'alert'
                    }
                });
                this.components.editor.focusField();
                return;
            }
        };
        this.onEditorChange = e => {
            const { hasChanges } = e.detail;
            this.state.editorHasUnsavedChanges = hasChanges;
        };
        this.onCommentClick = e => {
            if (this.state.isButtonOpen) {
                this.toggleButton(false);
            }

            const el = e.target;
            const responseId = getResponseIdForElement(el);

            const commentHighlighter = this.commentHighlighters[responseId];
            const colorKey = commentHighlighter.getColorKeyForHighlight(el);

            const commentValue = this.modelHelper.getCommentValue({
                itemRef: this.state.currentItemRef,
                responseId,
                colorKey
            });
            if (commentValue) {
                const prevColorKey = this.state.currentColorKey;
                const prevIsEditorOpen = this.state.isEditorOpen;
                const { clientX, clientY } = e;

                if (this.getConfig().isEditMode) {
                    if (!this.state.isEditorOpen || !this.state.editorHasUnsavedChanges) {
                        if (this.state.isEditorOpen) {
                            this.toggleEditor(false);
                        }
                        if (!prevIsEditorOpen || prevColorKey !== colorKey) {
                            this.state.currentColorKey = colorKey;
                            this.state.currentResponseId = responseId;
                            this.toggleEditor(true, { clientX, clientY, commentValue, isCreate: false });
                        }
                    }
                } else {
                    if (this.state.isViewerOpen && prevColorKey === colorKey) {
                        this.toggleViewer(false);
                    } else {
                        this.state.currentColorKey = colorKey;
                        this.state.currentResponseId = responseId;
                        this.toggleViewer(true, { anchorElement: el, commentValue });
                    }
                    e.stopPropagation(); // to avoid that current click is handled by svelte:window listeners as intent to close
                }
            }
        };
        this.onViewerClose = () => {
            this.toggleViewer(false);
        };
        this.onSelectionCleared = () => {
            if (this.state.isButtonOpen) {
                this.toggleButton(false);
            }
        };

        this.onSelectionMade = (ranges, el) => {
            if (this.highlighterPlugin.isListeningToSelection || this.state.isEditorOpen) {
                return;
            }
            const range = ranges[0];
            this.toggleButton(true, { range });

            const responseId = getResponseIdForElement(el);
            this.state.currentResponseId = responseId;
        };
    },

    init() {
        const testRunner = this.getTestRunner();

        const onItemMounted = itemRef => {
            if (testRunner.getResponseDisplay() !== reviewResponseDisplays.answer) {
                return;
            }

            this.state.currentItemRef = itemRef;

            const interactionElments = getExtendedTextInteractionElements();
            interactionElments.forEach(el => {
                const responseId = getResponseIdForElement(el);

                const commentHighlighter = commentHighlighterFactory({
                    responseId,
                    onClickCallback: this.onCommentClick
                });
                this.commentHighlighters[responseId] = commentHighlighter;

                const highlights = this.modelHelper.getHighlights({ itemRef, responseId });
                commentHighlighter.restoreFromDataModel(highlights);
                this.highlighterPlugin.notifyCommentsWereRestored(itemRef);

                if (this.getConfig().isEditMode) {
                    commentHighlighter.attachListeners();
                    commentHighlighter.toggleHighlightModeStyle(true);
                }
            });

            if (this.getConfig().isEditMode && interactionElments.length) {
                this.selectionListener = selectionListenerFactory({
                    responseIds: Object.keys(this.commentHighlighters),
                    onSelectedCallback: this.onSelectionMade,
                    onClearedCallback: this.onSelectionCleared
                });
                this.selectionListener.attach();
            }
        };

        const onItemDestroyed = () => {
            this.selectionListener?.detach();
            this.selectionListener = null;

            for (const commentHighlighter of Object.values(this.commentHighlighters)) {
                commentHighlighter.detachListeners();
                commentHighlighter.toggleHighlightModeStyle(false);
            }
            this.commentHighlighters = {};

            this.toggleEditor(false);
            this.toggleViewer(false);
            this.toggleButton(false);
            this.destroyComponents();

            this.state.currentItemRef = null;
        };

        /**
         * Communication with 'highlighter' plugin.
         * @param {Object} event
         * @param {String} event.action
         * @param {*} event.payload
         */
        const onHighlighterEvents = ({ action, payload }) => {
            switch (action) {
                case 'toggle-listener-mode': {
                    const { toggleOn } = payload;
                    this.highlighterPlugin.isListeningToSelection = toggleOn;
                    break;
                }
            }
        };

        testRunner
            .on(`loaditem.${this.getName()}`, (itemRef, itemData) => {
                this.highlighterPlugin.notifyPluginEnabled();
                //needed if user navigated away from the item without closing the editor
                this.highlighterPlugin.notifyHasUnsaved(false, { restorePreviousModel: false });
                this.modelHelper.setLocalCopyFromItemData({ itemRef, itemData });
            })
            .on(`unloaditem.${this.getName()}`, onItemDestroyed)
            .on(`disableitem.${this.getName()}`, onItemDestroyed)
            .after(`renderitem.${this.getName()}`, onItemMounted)
            .after(`enableitem.${this.getName()}`, onItemMounted)
            .on(`highlighter-inlineComments.${this.getName()}`, onHighlighterEvents);

        this.mountStyle();
    },

    destroy() {
        this.getTestRunner().off(`.${this.getName()}`);
        this.selectionListener?.detach();
        for (const commentHighlighter of Object.values(this.commentHighlighters)) {
            commentHighlighter.detachListeners();
        }
        this.destroyComponents();
    }
});
