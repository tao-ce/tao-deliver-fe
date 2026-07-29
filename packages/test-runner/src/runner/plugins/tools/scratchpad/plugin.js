// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { getItemProperty } from '../../../util/testMap.js';
import Scratchpad from './Scratchpad.svelte';
import { getTestSessionUserDataService } from '../../../session/testSessionUserDataService.js';
import { defaults, cloneDeep } from 'lodash';
import toolDefinitions from './toolDefinitions.js';
import toolsStoreHandler from '../util/toolsStoreHandler.js';
import { isMutuallyExclusiveTool } from '../../../layout/toolbarItems.js';
import { getDefaultRemSizePx } from '@oat-sa-private/ui-core';
import { mount, unmount } from 'svelte';

const toolKey = 'scratchpad';
const defaultConfig = {
    tools: [
        { key: 'select', enabled: true },
        { key: 'text', enabled: true },
        { key: 'brush', enabled: true },
        { key: 'rectangle', enabled: true },
        { key: 'eraser', enabled: true }
    ],
    enableStateActions: true,
    maxStateStackSize: 25
};

const categoryName = 'x-tao-option-scratchpad'; // can be found on an item

export default pluginFactory({
    name: 'scratchpad',

    install() {
        const testRunner = this.getTestRunner();
        const config = testRunner.getConfig();
        const testSessionUserDataService = getTestSessionUserDataService(config.serviceCallId);
        this.toolsStore = testSessionUserDataService.getToolsStore();
        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        const pluginConfig = defaults({}, providedConfig, defaultConfig);

        this.maxStateStackSize = pluginConfig.maxStateStackSize;
        this.canvasStateStack = [{ shapes: [] }];
        this.currentCanvasStateIndex = 0;

        Object.defineProperty(this, 'toolState', {
            get: () => this.toolsStore.getTestToolState(toolKey)
        });

        this.updateState = values => {
            if (values && typeof values === 'object') {
                this.toolsStore.setTestToolState(toolKey, Object.assign(this.toolState || {}, values));
            }
        };

        this.getInitialStateValues = () => {
            const defaultPxInRem = getDefaultRemSizePx();
            const innerWidth = window.innerWidth;
            const innerHeight = window.innerHeight;
            const initialWidth = 62 * defaultPxInRem; //62 rem comes from scratchpad spec
            const initialHeight = innerHeight / 2;

            const state = { ...this.toolState };
            if (typeof state.left === 'undefined' || state.left < 0) {
                state.left = (innerWidth - initialWidth) / 2;
            }
            if (typeof state.top === 'undefined' || state.top < 0) {
                state.top = (innerHeight - initialHeight) / 2;
            }
            if (!state.width) {
                state.width = initialWidth;
            } else {
                state.width = Math.min(state.width, innerWidth - state.left);
            }
            if (!state.height) {
                state.height = initialHeight;
            } else {
                state.height = Math.min(state.height, innerHeight - state.top);
            }

            state.enableStateActions = pluginConfig.enableStateActions;
            state.canvasStateStackLength = this.canvasStateStack.length;
            state.canvasStateIndex = this.currentCanvasStateIndex;

            if (Array.isArray(providedConfig.tools) || !state.tools) {
                state.tools = pluginConfig.tools
                    .filter(({ enabled }) => enabled)
                    .map(({ key }) => toolDefinitions[key]);
            }

            return state;
        };

        this.updateCanvasStateStackProperties = () => {
            this.scratchpad.$set({
                canvasStateStackLength: this.canvasStateStack.length,
                canvasStateIndex: this.currentCanvasStateIndex
            });
        };

        this.updateCanvasState = () => {
            const currentCanvasState = cloneDeep(this.canvasStateStack[this.currentCanvasStateIndex]);
            this.updateState(currentCanvasState);
            this.scratchpad.$set(currentCanvasState);
        };

        this.toolsStoreHandler = toolsStoreHandler(config.serviceCallId, this.getName());

        //renders scratchpad and updates 'open' store state
        this.open = () => {
            const areaBroker = this.getAreaBroker();
            const initialState = this.getInitialStateValues();
            this.scratchpad = mount(Scratchpad, {
                target: areaBroker.getMainArea(),
                props: initialState
            });
            initialState.open = true;
            this.updateState(initialState);

            this.scratchpad.$on('close', () => this.close());
            this.scratchpad.$on('resize', e => this.updateState(e.detail));
            this.scratchpad.$on('move', e => this.updateState(e.detail));

            this.scratchpad.$on('toolSelect', e => {
                this.updateState(e.detail);
            });
            this.scratchpad.$on('updateState', e => {
                this.canvasStateStack.splice(this.currentCanvasStateIndex + 1);
                if (this.maxStateStackSize && this.canvasStateStack.length === this.maxStateStackSize) {
                    this.canvasStateStack.shift();
                }
                this.canvasStateStack.push(e.detail);
                this.currentCanvasStateIndex = this.canvasStateStack.length - 1;
                this.updateCanvasStateStackProperties();
            });
            this.scratchpad.$on('change', e => {
                this.updateState(e.detail);
            });
            this.scratchpad.$on('undo', () => {
                this.currentCanvasStateIndex -= 1;
                this.updateCanvasState();
                this.updateCanvasStateStackProperties();
            });
            this.scratchpad.$on('redo', () => {
                this.currentCanvasStateIndex += 1;
                this.updateCanvasState();
                this.updateCanvasStateStackProperties();
            });
        };

        //removes scratchpad from dom and updates 'open' store state
        this.close = () => {
            if (this.scratchpad) {
                unmount(this.scratchpad);
                this.scratchpad = null;
            }
            this.updateState({ open: false });
        };
    },

    //adds button event listener to show scratchpad
    init() {
        // Listen for menu trigger event from test runner
        const testRunner = this.getTestRunner();
        testRunner
            .on('toolbaraction.scratchpad', key => {
                if (key === 'scratchpad') {
                    if (this.toolState && this.toolState.open) {
                        this.close();
                    } else {
                        this.open();
                    }
                } else if (isMutuallyExclusiveTool('scratchpad', key)) {
                    if (this.toolState && this.toolState.open) {
                        this.close();
                    }
                }
            })
            //enable or disable scratchpad
            .on('loaditem.scratchpad', () => {
                const testMap = testRunner.getTestMap();
                const { testPartId, sectionId, itemIdentifier } = testRunner.getTestContext();
                const categories = getItemProperty(testMap, testPartId, sectionId, itemIdentifier, 'categories');

                if (Array.isArray(categories) && categories.includes(categoryName)) {
                    this.show();
                    const state = this.toolsStore.getTestToolState(toolKey);
                    if (state && state.open && !this.scratchpad) {
                        this.open();
                    }
                } else {
                    this.hide();
                }
            })
            .on('itemModalFeedback.scratchpad', () => {
                if (this.toolState && this.toolState.open) {
                    this.close();
                }
            });
    },

    render() {},

    /**
     * Shows top bar tool button
     */
    show() {
        this.toolsStoreHandler.set('visible', true);
    },

    /**
     * Hides top bar tool button and closes toolbar,
     * but keeps 'open' store state for future items
     */
    hide() {
        this.toolsStoreHandler.set('visible', false);
        if (this.scratchpad) {
            unmount(this.scratchpad);
            this.scratchpad = null;
        }
    },

    //destroys the plugin
    destroy() {
        this.getTestRunner().off('.scratchpad');
        if (this.scratchpad) {
            unmount(this.scratchpad);
        }
    }
});
