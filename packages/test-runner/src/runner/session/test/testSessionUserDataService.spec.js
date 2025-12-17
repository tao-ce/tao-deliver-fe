// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getTestSessionUserDataService, clearAllTestSessionsUserData } from '../testSessionUserDataService.js';

describe('TestSessionUserDataService', () => {
    afterEach(() => clearAllTestSessionsUserData());

    it('should be called with a session identifier', () => {
        expect(() => getTestSessionUserDataService()).toThrow(TypeError);
        expect(() => getTestSessionUserDataService(null)).toThrow(TypeError);
    });

    describe('settings', () => {
        it('access store', () => {
            const testSessionUserDataService = getTestSessionUserDataService('session-1');
            const settingsStore = testSessionUserDataService.getSettingsStore();

            expect(settingsStore.get()).toMatchObject({});

            const settings = {
                choiceElimination: true
            };
            settingsStore.set(settings);
            expect(settingsStore.get()).toMatchObject(settings);

            settingsStore.setSetting('choiceElimination', false);
            expect(settingsStore.getSetting('choiceElimination')).toBe(false);
        });

        it('access store in isolation', () => {
            const testSessionUserDataService1 = getTestSessionUserDataService('session-1');
            const testSessionUserDataService2 = getTestSessionUserDataService('session-2');
            const settingsStore1 = testSessionUserDataService1.getSettingsStore();
            const settingsStore2 = testSessionUserDataService2.getSettingsStore();

            expect(settingsStore1.get()).toMatchObject({});
            expect(settingsStore2.get()).toMatchObject({});

            const settings1 = {
                choiceElimination: true,
                textToSpeech: {
                    volume: 75,
                    voice: 'john'
                }
            };
            const settings2 = {
                choiceElimination: true,
                theme: 'dark'
            };
            settingsStore1.set(settings1);
            settingsStore2.set(settings2);
            expect(settingsStore1.get()).toMatchObject(settings1);
            expect(settingsStore2.get()).toMatchObject(settings2);

            settingsStore1.setSetting('choiceElimination', false);
            expect(settingsStore1.getSetting('choiceElimination')).toBe(false);
            expect(settingsStore2.getSetting('choiceElimination')).toBe(true);
        });

        it('set disable/enable using isEnabled to check', () => {
            const testSessionUserDataService = getTestSessionUserDataService('session-1');
            const settingsStore = testSessionUserDataService.getSettingsStore();

            expect(settingsStore.get()).toMatchObject({});

            const settingsKey1 = 'customKey1';
            const settingsKey2 = 'customKey2';
            const settings = {
                _disabledKeys: [],
                [settingsKey1]: 1,
                [settingsKey2]: 2
            };

            settingsStore.set(settings);
            expect(settingsStore.get()).toMatchObject(settings);

            settingsStore.disableSetting(settingsKey1);
            settingsStore.disableSetting(settingsKey2);
            settingsStore.enableSetting(settingsKey1);

            expect(settingsStore.isEnabled(settingsKey1)).toBe(true);
            expect(settingsStore.isEnabled(settingsKey2)).toBe(false);
        });

        it('get all disabled settings', () => {
            const testSessionUserDataService = getTestSessionUserDataService('session-1');
            const settingsStore = testSessionUserDataService.getSettingsStore();

            expect(settingsStore.get()).toMatchObject({});

            const settingsKey1 = 'customKey1';
            const settingsKey2 = 'customKey2';
            const settings = {
                _disabledKeys: [],
                [settingsKey1]: true,
                [settingsKey2]: false,
                customKey3: 1
            };

            settingsStore.set(settings);
            expect(settingsStore.get()).toMatchObject(settings);

            settingsStore.disableSetting(settingsKey1);
            expect(settingsStore.getDisabledSettings()).toMatchObject([settingsKey1]);

            settingsStore.disableSetting(settingsKey2);
            expect(settingsStore.getDisabledSettings()).toMatchObject([settingsKey1, settingsKey2]);
        });
    });

    describe('toolsState', () => {
        it('access store', () => {
            const testSessionUserDataService = getTestSessionUserDataService('session-1');
            const toolsStore = testSessionUserDataService.getToolsStore();

            expect(toolsStore.get()).toMatchObject({
                testTools: {},
                itemTools: {}
            });

            const tools = {
                testTools: {
                    scratchpad: [12, 13, 14]
                },
                itemTools: {}
            };
            toolsStore.set(tools);
            expect(toolsStore.get()).toMatchObject(tools);

            toolsStore.setTestToolState('scratchpad', []);
            expect(toolsStore.getTestToolState('scratchpad')).toHaveLength(0);
        });

        it('access structured data', () => {
            const testSessionUserDataService = getTestSessionUserDataService('session-1');
            const toolsStore = testSessionUserDataService.getToolsStore();

            expect(toolsStore.get()).toMatchObject({
                testTools: {},
                itemTools: {}
            });

            const tools = {
                testTools: {
                    scratchpad: [12, 13, 14]
                },
                itemTools: {
                    item1: {
                        choiceElimination: ['c1', 'c2']
                    },
                    item2: {
                        lineReader: {
                            element: '#paragraph',
                            line: 12
                        }
                    }
                }
            };
            toolsStore.set(tools);
            expect(toolsStore.get()).toMatchObject(tools);

            expect(toolsStore.getTestToolState('scratchpad')).toEqual(tools.testTools.scratchpad);
            toolsStore.setTestToolState('scratchpad', []);
            expect(toolsStore.getTestToolState('scratchpad')).toHaveLength(0);

            expect(toolsStore.getItemToolsState('item2')).toMatchObject(tools.itemTools.item2);
            expect(toolsStore.getItemToolState('item1', 'choiceElimination')).toMatchObject(
                tools.itemTools.item1.choiceElimination
            );

            toolsStore.setItemToolState('item2', 'lineReader', { element: 'p', line: 13 });
            expect(toolsStore.getItemToolState('item2', 'lineReader')).toMatchObject({ element: 'p', line: 13 });

            toolsStore.setItemToolsState('item1', {
                highlighter: { color: 'pink', line: 5 },
                choiceElimination: ['c3']
            });

            expect(toolsStore.getItemToolsState('item1')).toMatchObject({
                highlighter: { color: 'pink', line: 5 },
                choiceElimination: ['c3']
            });
        });

        it('set invalid data structure', () => {
            const testSessionUserDataService = getTestSessionUserDataService('session-1');
            const toolsStore = testSessionUserDataService.getToolsStore();
            expect(toolsStore.get()).toMatchObject({
                testTools: {},
                itemTools: {}
            });

            expect(() => toolsStore.set([])).toThrow(TypeError);
            expect(() => toolsStore.set(null)).toThrow(TypeError);
            expect(() => toolsStore.set({})).toThrow(TypeError);
            expect(() => toolsStore.set({ foo: true, testTools: false })).toThrow(TypeError);
            expect(() =>
                toolsStore.set({ itemTools: { foo: true }, testTools: { bar: false }, baz: true })
            ).not.toThrow(TypeError);

            expect(toolsStore.get()).toMatchObject({ itemTools: { foo: true }, testTools: { bar: false }, baz: true });
        });

        it('access store in isolation', () => {
            const testSessionUserDataService1 = getTestSessionUserDataService('session-1');
            const testSessionUserDataService2 = getTestSessionUserDataService('session-2');
            const toolsStore1 = testSessionUserDataService1.getToolsStore();
            const toolsStore2 = testSessionUserDataService2.getToolsStore();

            expect(toolsStore1.get()).toMatchObject({});
            expect(toolsStore2.get()).toMatchObject({});

            const testTools1 = {
                scratchpad: [17, 19, 21]
            };
            const testTools2 = {
                scratchpad: [3, 7, 9]
            };
            toolsStore1.setTestToolsState(testTools1);

            toolsStore2.setTestToolsState(testTools2);

            expect(toolsStore1.getTestToolsState()).toMatchObject(testTools1);

            expect(toolsStore2.getTestToolsState()).toMatchObject(testTools2);

            toolsStore1.setTestToolState('scratchpad', []);
            expect(toolsStore1.getTestToolState('scratchpad')).toMatchObject([]);
            expect(toolsStore2.getTestToolState('scratchpad')).toMatchObject(testTools2.scratchpad);
        });
    });

    describe('sync stores with storage', () => {
        it('should be called with a storage', () => {
            const testSessionUserDataService = getTestSessionUserDataService('session-1');

            return expect(testSessionUserDataService.startSyncWithStorage(null)).rejects.toBeInstanceOf(TypeError);
        });

        it('saves data to the storage when the store changes', () => {
            const testSessionUserDataService = getTestSessionUserDataService('session-1');
            const getItem = vi.fn();
            const setItem = vi.fn();

            return testSessionUserDataService
                .startSyncWithStorage({
                    getItem,
                    setItem
                })
                .then(() => {
                    testSessionUserDataService.getSettingsStore().setSetting('choiceElimination', false);

                    //3 because of the initial calls
                    expect(setItem).toHaveBeenNthCalledWith(3, 'settings', {
                        _disabledKeys: [],
                        choiceElimination: false
                    });
                });
        });

        it('stops synchronization with the storage', () => {
            const testSessionUserDataService = getTestSessionUserDataService('session-1');
            const getItem = vi.fn();
            const setItem = vi.fn();

            return testSessionUserDataService
                .startSyncWithStorage({
                    getItem,
                    setItem
                })
                .then(() => {
                    testSessionUserDataService.getSettingsStore().setSetting('choiceElimination', false);

                    //3 because of the initial calls
                    expect(setItem).toHaveBeenNthCalledWith(3, 'settings', {
                        _disabledKeys: [],
                        choiceElimination: false
                    });
                })
                .then(() => testSessionUserDataService.stopSyncWithStorage())
                .then(() => {
                    testSessionUserDataService.getSettingsStore().setSetting('choiceElimination', true);
                    expect(setItem).toHaveBeenCalledTimes(3);
                });
        });
    });
});
