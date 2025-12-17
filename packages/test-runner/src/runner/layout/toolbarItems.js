// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { __ } from '@oat-sa-private/ui-core';

/**
 * @typedef {ButtonDefinition} - static props for IconBarButton
 * @property {String} key
 * @property {String} [icon] - mandatory unless `getIcon`is specified
 * @property {Function} [getIcon] - {(toggled: Boolean) => String} - when `icon` depends on `toggled` state;
 *   if this is set, do not specify `icon` as it will be calculated dynamically
 * @property {String} [label]
 * @property {Function} [getLabel] - {(toggled: Boolean) => String} - when `label` depends on `toggled` state;
 *   if this is set, do not specify `label` as it will be calculated dynamically
 * @property {String} [ariaLabel]
 * @property {Function} [getAriaLabel] - {(toggled: Boolean) => String} - when `ariaLabel` depends on `toggled` state;
 *   if this is set, do not specify `ariaLabel` as it will be calculated dynamically
 * @property {String} [dataTestId]
 * @property {Boolean} [canToggle=false]
 * @property {Boolean} [ariaHasPopup=false]
 */
/**
 * @typedef {ButtonProps} - dynamic props for IconBarButton, including temporary state
 * @extends {ButtonDefinition}
 * @property {Boolean} [toggled=false]
 * @property {Boolean} [ariaPressed=false]
 * @property {Boolean} [ariaExpanded=false]
 * @property {Boolean} [disabled=false]
 */

/* eslint-disable arrow-body-style */

/**
 * Button definitions for all possible toolbar buttons.
 * Their order here will be the order reproduced in the UI, even if the plugins are received in some other order.
 *
 * Non-rendered buttons can exist harmlessly in this list, because only ones associated to plugins are returned.
 *
 * Since dynamic button states can change outside this file, consumers should subscribe to toolsStore
 * and call getToolbarActions() again to receive the updated buttons.
 */
const allToolbarButtons = Object.freeze([
    {
        id: 'attachments-toolbar-btn',
        key: 'attachments',
        icon: 'attachment',
        get label() {
            return __('Attachments');
        },
        dataTestId: 'attachments',
        canToggle: true,
        ariaHasPopup: true
    },
    {
        key: 'scratchpad',
        icon: 'notepad',
        get label() {
            return __('Scratchpad');
        },
        dataTestId: 'scratchpad',
        canToggle: true
    },
    {
        key: 'highlighter',
        icon: 'highlighter',
        get label() {
            return __('Highlighter');
        },
        dataTestId: 'highlighter',
        canToggle: true
    },
    {
        key: 'calculator',
        icon: 'calculator',
        get label() {
            return __('Calculator');
        },
        dataTestId: 'calculator',
        canToggle: true
    },
    {
        key: 'readAloud',
        icon: 'speaker',
        get label() {
            return __('Read Aloud');
        },
        getAriaLabel: toggled => {
            return toggled
                ? __('Read aloud tool. To close, press enter or space')
                : __('Read aloud tool. To open, press enter or space');
        },
        dataTestId: 'readAloud',
        canToggle: true
    },
    {
        key: 'lineReader',
        icon: 'line-reader',
        get label() {
            return __('Line Reader');
        },
        dataTestId: 'lineReader',
        canToggle: true
    },
    {
        key: 'fullscreen',
        getIcon: toggled => {
            return toggled ? 'fullscreen-out' : 'fullscreen-in';
        },
        getLabel: toggled => {
            return toggled ? __('Exit full screen') : __('Full screen');
        },
        dataTestId: 'fullscreen',
        canToggle: true
    },
    {
        key: 'settings',
        icon: 'cogwheel',
        get label() {
            return __('Settings');
        },
        dataTestId: 'settings',
        canToggle: true
    },
    {
        key: 'a11yMenuPanel',
        icon: 'universal-access',
        get label() {
            return __('Open accessibility panel');
        },
        dataTestId: 'a11ymenu',
        ariaHasPopup: true,
        ariaExpanded: false
    },
    {
        key: 'print',
        icon: 'printer',
        get label() {
            return __('Print');
        },
        dataTestId: 'print'
    }
]);
/* eslint-enable arrow-body-style */

/**
 * Describes which tools can't be open simultaneously.
 * Keys used here are the same in `allToolbarButtons`.
 */
const mutuallyExclusiveTools = [
    ['calculator', 'readAloud'],
    ['calculator', 'scratchpad'],
    ['calculator', 'highlighter'],
    ['readAloud', 'scratchpad'],
    ['readAloud', 'highlighter']
];

/**
 * Generates read-only API for retrieving toolbar buttons list (used for 'endActions' prop for HeaderBar)
 * @param {Object} [plugins={}] plugins object, in format { pluginName: PluginAPI }
 * @param {SvelteStore} toolsStore
 * @returns {Object} API
 */
export function createToolbarItemsApi(plugins = {}, toolsStore) {
    /**
     * Look for named plugin in enabled list
     * @param {String} pluginName
     * @returns {Plugin|null}
     */
    function getPlugin(pluginName) {
        return Object.keys(plugins).find(pluginKey => pluginKey === pluginName);
    }

    /**
     * Query a particular state flag for a plugin in the toolsStore
     * @param {String} pluginName
     * @param {String} key - name of a state flag (visible, enabled, open, etc.)
     * @returns {Boolean?}
     */
    function getPluginState(pluginName, key) {
        const toolState = (toolsStore && toolsStore.getTestToolState(pluginName)) || {};
        return toolState[key];
    }

    /**
     * Check if named plugin is
     * 1. configured (in the configuration plugins list)
     * 2. visible
     * @param {String} pluginName
     * @returns {Boolean}
     */
    function hasVisiblePlugin(pluginName) {
        const plugin = getPlugin(pluginName);
        const visible = getPluginState(pluginName, 'visible');
        return plugin && visible !== false;
    }

    return {
        /**
         * Get endActions for a HeaderBar, based on config
         * @returns {ButtonDefinition[]}
         */
        getToolbarActions() {
            if (typeof plugins !== 'object' || Object.keys(plugins).length === 0) {
                return [];
            }

            const testTools = (toolsStore && toolsStore.getTestToolsState()) || {};

            return allToolbarButtons
                .filter(buttonDefinition =>
                    // exclude plugin buttons based on configuration and stored 'visible' value
                    hasVisiblePlugin(buttonDefinition.key)
                )
                .map(buttonDefinition => {
                    const toolState = testTools[buttonDefinition.key];
                    // set 'disabled' state from stored 'enabled' value
                    buttonDefinition.disabled = toolState && toolState.enabled === false;
                    // set 'toggled' state from stored 'open' value
                    if (buttonDefinition.canToggle) {
                        const isToggled = toolState && !!toolState.open;
                        buttonDefinition.toggled = isToggled;
                        buttonDefinition.ariaPressed = isToggled;
                        if (buttonDefinition.getIcon) {
                            buttonDefinition.icon = buttonDefinition.getIcon(isToggled);
                        }
                        if (buttonDefinition.getLabel) {
                            buttonDefinition.label = buttonDefinition.getLabel(isToggled);
                        }
                        if (buttonDefinition.getAriaLabel) {
                            buttonDefinition.ariaLabel = buttonDefinition.getAriaLabel(isToggled);
                        }
                    }
                    return buttonDefinition;
                });
        }
    };
}

/**
 * @param {String} actionKey - key used in `allToolbarButtons` and `createToolbarItemsApi`
 * @param {Object} areaBroker
 * @returns {HTMLElement?}
 */
export function getToolbarButtonElement(actionKey, areaBroker) {
    return areaBroker.getTopBarArea().querySelector(`.icon-bar-btn[data-test-id="${actionKey}"]`);
}

/**
 * Check if this tool needs to close when another one is opened.
 * Some tools can't be open simultaneously. So once the tool is opened, some others may need to be closed.
 * @param {String} ownActionKey - tool that may be forced to be closed by `toggledActionKey` tool
 * @param {Object} toggledActionKey - tool that is getting opened and forces `ownActionKey` to close
 * @returns {Boolean}
 */
export function isMutuallyExclusiveTool(ownActionKey, toggledActionKey) {
    return mutuallyExclusiveTools.some(
        relation => relation.includes(ownActionKey) && relation.includes(toggledActionKey)
    );
}
