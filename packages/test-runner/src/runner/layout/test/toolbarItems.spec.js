// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { createToolbarItemsApi, getToolbarButtonElement, isMutuallyExclusiveTool } from '../toolbarItems';
import {
    getTestSessionUserDataService,
    clearAllTestSessionsUserData
} from '../../session/testSessionUserDataService.js';

const makeMockPlugin = name => ({
    getName: () => name
});

const mockPlugins = {
    highlighter: makeMockPlugin('highlighter'),
    settings: makeMockPlugin('settings'),
    scratchpad: makeMockPlugin('scratchpad'),
    readAloud: makeMockPlugin('readAloud'),
    lineReader: makeMockPlugin('lineReader'),
    fullscreen: makeMockPlugin('fullscreen'),
    refresh: makeMockPlugin('refresh'),
    a11yMenuPanel: makeMockPlugin('a11yMenuPanel'),
    print: makeMockPlugin('print')
};

describe('toolbarItems', () => {
    const serviceCallId = 'abc123';
    const toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();

    afterEach(() => {
        clearAllTestSessionsUserData();
    });

    describe('API', () => {
        it('exports a function', () => {
            expect(typeof createToolbarItemsApi).toBe('function');
        });

        it('the function returns an object with just the methods', () => {
            const toolbarItemsApi = createToolbarItemsApi(mockPlugins);
            expect(typeof toolbarItemsApi.getToolbarActions).toBe('function');
            expect(Object.keys(toolbarItemsApi).length).toEqual(1);
        });
    });

    describe('getToolbarActions', () => {
        it('Returns no actions if no plugins', () => {
            const toolbarItemsApi = createToolbarItemsApi();
            expect(toolbarItemsApi.getToolbarActions()).toEqual([]);
        });

        it('Returns no actions if empty plugins', () => {
            const toolbarItemsApi = createToolbarItemsApi({});
            expect(toolbarItemsApi.getToolbarActions()).toEqual([]);
        });

        it.each([
            ['scratchpad'],
            ['highlighter'],
            ['readAloud'],
            ['lineReader'],
            ['fullscreen'],
            ['refresh'],
            ['settings'],
            ['a11yMenuPanel'],
            ['print']
        ])('Returns the action button definition for the %s plugin (no store)', pluginName => {
            const testCasePlugins = {
                [pluginName]: mockPlugins[pluginName]
            };

            const toolbarItemsApi = createToolbarItemsApi(testCasePlugins);
            const actions = toolbarItemsApi.getToolbarActions();

            expect(actions.length).toBe(1);
            // just validate presence of main properties; full content is covered by snapshots of other components
            expect(actions[0]).toHaveProperty('icon');
            expect(actions[0]).toHaveProperty('label');
            expect(actions[0]).toHaveProperty('key', pluginName);
        });

        test.each([
            ['highlighter', true],
            ['highlighter', false]
        ])(
            'Returns the stateful action button definition for the %s { open: %s } plugin (using store)',
            (pluginName, open) => {
                const testCasePlugins = {
                    [pluginName]: mockPlugins[pluginName]
                };
                toolsStore.setTestToolState(pluginName, { open });

                const toolbarItemsApi = createToolbarItemsApi(testCasePlugins, toolsStore);
                const actions = toolbarItemsApi.getToolbarActions();

                expect(actions.length).toBe(1);
                expect(actions[0]).toHaveProperty('key', pluginName);
                expect(actions[0]).toHaveProperty('toggled', open);
                expect(actions[0]).toHaveProperty('ariaPressed', open);
            }
        );

        test.each([
            ['icon', 'getIcon', 'fullscreen'],
            ['label', 'getLabel', 'fullscreen'],
            ['ariaLabel', 'getAriaLabel', 'readAloud']
        ])(
            'Returns the stateful action button definition: %s depends on "open"',
            (propertyName, propertyGetName, pluginName) => {
                const testCasePlugins = {
                    [pluginName]: mockPlugins[pluginName]
                };
                toolsStore.setTestToolState(pluginName, { open: false });

                const toolbarItemsApi = createToolbarItemsApi(testCasePlugins, toolsStore);
                let actions = toolbarItemsApi.getToolbarActions();

                expect(actions.length).toBe(1);
                expect(actions[0]).toHaveProperty('key', pluginName);
                expect(actions[0]).toHaveProperty('toggled', false);
                expect(actions[0][propertyGetName](false)).toBeTruthy();
                expect(actions[0][propertyGetName](true)).toBeTruthy();
                expect(actions[0][propertyGetName](true)).not.toEqual(actions[0][propertyGetName](false));

                expect(actions[0][propertyName]).toEqual(actions[0][propertyGetName](false));

                toolsStore.setTestToolState(pluginName, { open });
                actions = toolbarItemsApi.getToolbarActions();
                expect(actions[0]).toHaveProperty('toggled', true);
                expect(actions[0][propertyName]).toEqual(actions[0][propertyGetName](true));
            }
        );

        it('Returns correct order of actions, if all toolbar plugins configured', () => {
            const toolbarItemsApi = createToolbarItemsApi(mockPlugins);
            const actions = toolbarItemsApi.getToolbarActions();

            expect(actions.length).toBe(9);
            expect(actions.map(action => action.key)).toEqual([
                'refresh',
                'scratchpad',
                'highlighter',
                'readAloud',
                'lineReader',
                'fullscreen',
                'settings',
                'a11yMenuPanel',
                'print'
            ]);
        });
    });
});

describe('getToolbarButtonElement', () => {
    afterEach(() => {
        const div = document.querySelector('.top-bar');
        if (div) {
            div.remove();
        }
    });

    it('returns button element by key', () => {
        const div = document.createElement('div');
        div.classList.add('top-bar');
        const btn = document.createElement('button');
        btn.classList.add('icon-bar-btn');
        btn.setAttribute('data-test-id', 'mykey');
        div.append(btn);
        const areaBroker = { getTopBarArea: () => div };

        expect(typeof getToolbarButtonElement).toBe('function');
        expect(getToolbarButtonElement('mykey', areaBroker)).toEqual(btn);
        expect(getToolbarButtonElement('otherkey', areaBroker)).toBeFalsy();
    });
});

describe('isMutuallyExclusiveTool', () => {
    it('returns true for tools that cannot be used together', () => {
        [
            ['readAloud', 'scratchpad'],
            ['readAloud', 'highlighter'],
            ['highlighter', 'readAloud'],
            ['scratchpad', 'readAloud']
        ].forEach(([tool1, tool2]) => {
            expect(isMutuallyExclusiveTool(tool1, tool2)).toEqual(true);
        });
    });

    it('returns false for tools that can be used together', () => {
        [
            ['readAloud', 'lineReader'],
            ['readAloud', 'fullscreen'],
            ['highlighter', 'scratchpad'],
            ['scratchpad', 'highlighter']
        ].forEach(([tool1, tool2]) => {
            expect(isMutuallyExclusiveTool(tool1, tool2)).toEqual(false);
        });
    });
});
