// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import { cloneDeep } from 'lodash';
import defaultPluginConfig, { settingsGroupKeys } from '../../pluginConfig.js';
import settingsKeys from '../../../../settings/settingsKeys.js';
import TextGroup from '../TextGroup.svelte';

vi.mock('../../controls/FontFamilySetting.svelte', async () => {
    const MockSetting = await import('./MockSetting.svelte');
    return { default: MockSetting.default };
});
vi.mock('../../controls/FontSizeSetting.svelte', async () => {
    const MockSetting = await import('./MockSetting.svelte');
    return { default: MockSetting.default };
});
vi.mock('../../controls/LineHeightSetting.svelte', async () => {
    const MockSetting = await import('./MockSetting.svelte');
    return { default: MockSetting.default };
});
vi.mock('../../controls/LetterSpacingSetting.svelte', async () => {
    const MockSetting = await import('./MockSetting.svelte');
    return { default: MockSetting.default };
});
vi.mock('../../controls/WordSpacingSetting.svelte', async () => {
    const MockSetting = await import('./MockSetting.svelte');
    return { default: MockSetting.default };
});
vi.mock('../../controls/LetterAndWordSpacingSetting.svelte', async () => {
    const MockSetting = await import('./MockSetting.svelte');
    return { default: MockSetting.default };
});

const initialStateToCheckRendering = {
    [settingsKeys.fontFamily]: {
        toolState: { mockSettingKey: settingsKeys.fontFamily, someValue: 1 }
    },
    [settingsKeys.fontSize]: {
        toolState: { mockSettingKey: settingsKeys.fontSize, someValue: 2 }
    },
    [settingsKeys.lineHeight]: {
        toolState: { mockSettingKey: settingsKeys.lineHeight, someValue: 3 }
    },
    [settingsKeys.letterSpacing]: {
        toolState: { mockSettingKey: settingsKeys.letterSpacing, someValue: 4 }
    },
    [settingsKeys.wordSpacing]: {
        toolState: { mockSettingKey: settingsKeys.wordSpacing, someValue: 5 }
    },
    [settingsKeys.letterAndWordSpacing]: {
        toolState: { mockSettingKey: settingsKeys.letterAndWordSpacing, someValue: 6 }
    }
};

describe('TextGroup', () => {
    it('renders details, initial state can be empty', () => {
        const { container } = render(TextGroup, {
            props: {
                areaBroker: {},
                pluginConfig: defaultPluginConfig,
                initialSettingsState: {}
            }
        });
        expect(container).toMatchSnapshot();
        expect(container.querySelector('details').open).toBe(true);
        expect(container.querySelector('details.outlined')).toBeFalsy();
    });

    it('renders details with setting components, passes config & initialState & areaBroker to them', () => {
        const pluginConfig = Object.assign({}, defaultPluginConfig, {
            [settingsKeys.fontFamily]: {
                enabled: true,
                someFontFamily: 'a'
            },
            [settingsKeys.fontSize]: {
                enabled: true,
                someFontSize: 'b'
            },
            [settingsKeys.lineHeight]: {
                enabled: true,
                someLineHeight: 'c'
            },
            [settingsKeys.letterSpacing]: {
                enabled: true,
                someLetterSpacing: 'd'
            },
            [settingsKeys.wordSpacing]: {
                enabled: true,
                someWordSpacing: 'e'
            },
            [settingsKeys.letterAndWordSpacing]: {
                enabled: true,
                someLetterAndWordSpacing: 'f'
            }
        });
        const areaBroker = { somewhere: 123 };

        const { container } = render(TextGroup, {
            props: {
                areaBroker,
                pluginConfig: pluginConfig,
                initialSettingsState: initialStateToCheckRendering
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders only enabled settings', () => {
        const pluginConfig = Object.assign({}, defaultPluginConfig, {
            [settingsGroupKeys.text]: {
                collapsible: true
            },
            [settingsKeys.fontFamily]: {
                enabled: false,
                families: defaultPluginConfig[settingsKeys.fontFamily].families
            },
            [settingsKeys.fontSize]: {
                enabled: true
            },
            [settingsKeys.lineHeight]: {
                enabled: false
            },
            [settingsKeys.letterSpacing]: {
                enabled: true
            },
            [settingsKeys.wordSpacing]: {
                enabled: false
            },
            [settingsKeys.letterAndWordSpacing]: {
                enabled: false
            }
        });

        const { container } = render(TextGroup, {
            props: {
                areaBroker: {},
                pluginConfig,
                initialSettingsState: initialStateToCheckRendering
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('header may be not collapsible', () => {
        const pluginConfig = Object.assign({}, defaultPluginConfig, {
            [settingsGroupKeys.text]: {
                collapsible: false
            }
        });
        const { container } = render(TextGroup, {
            props: {
                areaBroker: {},
                pluginConfig,
                initialSettingsState: initialStateToCheckRendering
            }
        });
        expect(container.querySelector('details')).toBeFalsy();
    });

    it('header may be collapsed by default', () => {
        const pluginConfig = Object.assign({}, defaultPluginConfig, {
            [settingsGroupKeys.text]: {
                collapsible: true,
                collapsed: true
            }
        });
        const { container } = render(TextGroup, {
            props: {
                areaBroker: {},
                pluginConfig,
                initialSettingsState: initialStateToCheckRendering
            }
        });
        expect(container.querySelector('details')).toBeTruthy();
        expect(container.querySelector('details').open).toBe(false);
    });

    it('restores non-default style from initial state', async () => {
        const initialSettingsState = cloneDeep(initialStateToCheckRendering);
        initialSettingsState[settingsKeys.lineHeight].toolState.nonDefault = true;

        const { container } = render(TextGroup, {
            props: {
                areaBroker: {},
                pluginConfig: defaultPluginConfig,
                initialSettingsState
            }
        });
        expect(container.querySelector('details.outlined')).toBeTruthy();
    });

    it('propagates "change" event from settings', async () => {
        const { container, component } = render(TextGroup, {
            props: {
                areaBroker: {},
                pluginConfig: defaultPluginConfig,
                initialSettingsState: initialStateToCheckRendering
            }
        });
        const changeSpy = vi.fn();
        component.$on('change', changeSpy);

        expect(container.querySelector('details.outlined')).toBeFalsy();

        const fontFamilyEl = container.querySelector(`.${settingsKeys.fontFamily}`);
        expect(fontFamilyEl).toBeTruthy();

        fontFamilyEl.click();
        expect(changeSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: {
                    key: settingsKeys.fontFamily,
                    state: {
                        foo: 'bar',
                        nonDefault: true
                    }
                }
            })
        );
        await tick();
        expect(container.querySelector('details.outlined')).toBeTruthy();
    });

    it('propagates details "toggle" event', async () => {
        const { container, component } = render(TextGroup, {
            props: {
                areaBroker: {},
                pluginConfig: defaultPluginConfig,
                initialSettingsState: initialStateToCheckRendering
            }
        });
        const toggleSpy = vi.fn();
        component.$on('toggle', toggleSpy);

        const details = container.querySelector('details');
        details.open = false;
        details.dispatchEvent(new CustomEvent('toggle'));

        expect(toggleSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: {
                    key: settingsGroupKeys.text,
                    collapsed: true
                }
            })
        );
    });
});
