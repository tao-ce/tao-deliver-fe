// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import pluginFactory from 'taoTests/runner/plugin';
import { getItemProperty } from '../../../util/testMap.js';
import toolsStoreHandler from '../util/toolsStoreHandler.js';
import { isMutuallyExclusiveTool } from '../../../layout/toolbarItems.js';
import Calculator from './Calculator.svelte';
import { defaults } from 'lodash';
import { getTestSessionUserDataService } from '../../../session/testSessionUserDataService.js';
import { calculatorMinSize } from '@oat-sa-private/ui-components';
import { getDefaultRemSizePx } from '@oat-sa-private/ui-core';
import { mount, unmount } from 'svelte';

// Identifier for the plugin
const pluginName = 'calculator';

// The default config for the plugin
const defaultConfig = {
    decimals: 5
};

// Known categories
const basicCategoryName = 'x-tao-option-calculator';
const bodmasCategoryName = 'x-tao-option-calculatorBodmas';
const scientificCategoryName = 'x-tao-option-calculator-scientific';

// Know calculator types
const basicCalculator = 'basic';
const bodmasCalculator = 'bodmas';
const scientificCalculator = 'scientific';

// List of categories, ordered by priority
const calculatorCategories = [scientificCategoryName, bodmasCategoryName, basicCategoryName];

// Mapping from a category to a calculator's type
const calculatorByCategory = {
    [basicCategoryName]: basicCalculator,
    [bodmasCategoryName]: bodmasCalculator,
    [scientificCategoryName]: scientificCalculator
};

/**
 * Finds the type of calculator from a list of item categories.
 * @param {string[]} categories - A list of item categories in which find the type of calculator.
 * @returns {string} - Returns the type of calculator, or `null`.
 */
function getCalculatorType(categories) {
    const calculatorCategory = calculatorCategories.find(category => categories.includes(category));
    return calculatorByCategory[calculatorCategory] || null;
}

/**
 * the calculator plugin allows to render calculator during test execution
 */
export default pluginFactory({
    name: pluginName,

    /**
     * Prepares the plugin, adding API
     */
    install() {
        const areaBroker = this.getAreaBroker();
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        const testSessionUserDataService = getTestSessionUserDataService(testConfig.serviceCallId);
        this.toolsStore = testSessionUserDataService.getToolsStore();
        this.toolsStoreHandler = toolsStoreHandler(testConfig.serviceCallId, this.getName());
        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        const pluginConfig = defaults({}, providedConfig, defaultConfig);

        this.calculator = null;

        Object.defineProperty(this, 'toolState', {
            get: () => this.toolsStore.getTestToolState(pluginName) || {}
        });

        /**
         * Stores the tool's state
         * @param {object} values - The new state
         */
        this.updateState = values => {
            if (values && typeof values === 'object') {
                this.toolsStore.setTestToolState(pluginName, Object.assign(this.toolState || {}, values));
            }
        };

        /**
         * Ges the initial tool's state
         * @returns {object} Returns the initialized state
         */
        this.getInitialStateValues = () => {
            const defaultPxInRem = getDefaultRemSizePx();
            const innerWidth = window.innerWidth;
            const innerHeight = window.innerHeight;
            const initialWidth = calculatorMinSize.width * defaultPxInRem;
            const initialHeight = calculatorMinSize.height * defaultPxInRem;

            const state = { ...this.toolState };
            state.decimals = pluginConfig.decimals;

            if ('undefined' === typeof state.type) {
                state.type = basicCalculator;
            }

            if ('undefined' === typeof state.left || state.left < 0) {
                state.left = (innerWidth - initialWidth) / 2;
            }
            if ('undefined' === typeof state.top || state.top < 0) {
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

            return state;
        };

        /**
         * Renders a calculator of the specified type
         * Creates the component if it doesn't exist, or change its type property
         */
        this.renderComponent = () => {
            const initialState = this.getInitialStateValues();
            this.updateState(initialState);
            const { type } = initialState;

            if (!this.calculator) {
                // Create the component if it doesn't exist yet
                this.calculator = mount(Calculator, {
                    target: areaBroker.getMainArea(),
                    props: initialState
                });
            } else {
                // Or change its type
                this.calculator.$set({ type });
            }

            this.calculator.$on('close', () => this.close());
            this.calculator.$on('resize', e => this.updateState(e.detail));
            this.calculator.$on('move', e => this.updateState(e.detail));
        };

        /**
         * Destroys the calculator
         */
        this.destroyComponent = () => {
            if (this.calculator) {
                unmount(this.calculator);
                this.calculator = null;
            }
        };

        /**
         * Renders the component, sets the open state
         */
        this.open = () => {
            this.renderComponent();
            this.toolsStoreHandler.set('open', true);
        };

        /**
         * Destroys the component, sets the closed state
         */
        this.close = () => {
            this.destroyComponent();
            this.toolsStoreHandler.set('open', false);
        };
    },

    /**
     * Starts the behavior, listening to events that will activate the plugin
     */
    init() {
        const testRunner = this.getTestRunner();
        testRunner
            .on(`toolbaraction.${pluginName}`, key => {
                if (key === pluginName) {
                    if (this.toolsStoreHandler.get('open')) {
                        this.close();
                    } else {
                        this.open();
                    }
                } else if (isMutuallyExclusiveTool(pluginName, key)) {
                    if (this.toolsStoreHandler.get('open')) {
                        this.close();
                    }
                }
            })
            /**
             * When loading item, check for mandatory category to show or hide the entire plugin
             */
            .on(`loaditem.${pluginName}`, () => {
                const testMap = testRunner.getTestMap();
                const { testPartId, sectionId, itemIdentifier } = testRunner.getTestContext();
                const categories = getItemProperty(testMap, testPartId, sectionId, itemIdentifier, 'categories');
                const type = getCalculatorType(categories);

                if (type) {
                    this.updateState({ type });
                    this.show();
                    if (this.toolsStoreHandler.get('open')) {
                        this.open();
                    }
                } else {
                    this.hide();
                }
            })
            /**
             * When leaving item, make sure the tool is closed
             */
            .on(`unloaditem.${pluginName} itemModalFeedback.${pluginName}`, () => {
                this.close();
            });
    },

    /**
     * Show the toolbar button
     */
    show() {
        this.toolsStoreHandler.set('visible', true);
    },

    /**
     * Hide the toolbar button (and calculator, if opened)
     */
    hide() {
        this.destroyComponent();
        this.toolsStoreHandler.set('visible', false);
    },

    /**
     * Destroy the plugin and its components. Normally called only at the end of a test session.
     */
    destroy() {
        this.close();
        this.getTestRunner().off(`.${pluginName}`);
    }
});
