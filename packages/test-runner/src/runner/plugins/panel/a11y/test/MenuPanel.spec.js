// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import defaultPluginConfig, { settingsGroupKeys } from '../pluginConfig.js';
import settingsKeys from '../../../settings/settingsKeys.js';
import MenuPanel from '../MenuPanel.svelte';

vi.mock('../controls/FontFamilySetting.svelte', async () => {
    const MockSetting = await import('../groups/test/MockSetting.svelte');
    return {
        default: MockSetting.default
    };
});

function setupLayout() {
    const section = document.createElement('section');
    section.classList.add('test-container');
    document.body.appendChild(section);
    return section;
}

function removeLayout() {
    const section = document.querySelector('.test-container');
    section?.remove();
}

describe('MenuPanel', () => {
    const areaBrokerMock = {
        getContainer: () => document.querySelector('.test-container')
    };

    beforeEach(() => {
        setupLayout();
    });

    afterEach(() => {
        removeLayout();
    });

    it('renders groups', () => {
        const { container } = render(MenuPanel, {
            props: {
                areaBroker: areaBrokerMock,
                pluginConfig: defaultPluginConfig
            }
        });
        expect(container).toMatchSnapshot();
        expect(container.querySelector('.panel').classList.contains('open')).toBe(false);

        const groupHeaderTexts = Array.from(document.querySelectorAll('summary, .summary')).map(el => el.textContent);
        expect(groupHeaderTexts.length).toBe(4);
        expect(groupHeaderTexts[0]).toContain('Zoom');
        expect(groupHeaderTexts[1]).toContain('Contrast');
        expect(groupHeaderTexts[2]).toContain('Cursor');
        expect(groupHeaderTexts[3]).toContain('Text');
    });

    it('pluginConfig specifies which groups to render and their order', () => {
        const pluginConfig = Object.assign({}, defaultPluginConfig, {
            groups: [settingsGroupKeys.pointer, settingsGroupKeys.contrast]
        });
        render(MenuPanel, {
            props: {
                areaBroker: areaBrokerMock,
                pluginConfig
            }
        });
        const groupHeaderTexts = Array.from(document.querySelectorAll('summary, .summary')).map(el => el.textContent);
        expect(groupHeaderTexts.length).toBe(2);
        expect(groupHeaderTexts[0]).toContain('Cursor');
        expect(groupHeaderTexts[1]).toContain('Contrast');
    });

    it('passes required properties to group components', () => {
        const pluginConfig = Object.assign({}, defaultPluginConfig, {
            [settingsKeys.fontFamily]: {
                enabled: true,
                someConfig: 'aaa'
            }
        });
        const initialSettingsState = {
            [settingsKeys.fontFamily]: {
                toolState: { someValue: 'bbb', mockSettingKey: 'mock-setting-fontFamily' }
            }
        };
        const areaBroker = Object.assign({}, areaBrokerMock, { someAreaProp: 'ccc' });
        const { container } = render(MenuPanel, {
            props: {
                areaBroker,
                pluginConfig,
                initialSettingsState
            }
        });
        const mockedSettingEl = container.querySelector(`.mock-setting-fontFamily`);
        expect(mockedSettingEl).toBeTruthy();
        expect(mockedSettingEl).toMatchSnapshot();
    });

    it('fires "close" event on panel close, and "open/close" on open props change', async () => {
        const { container, component } = render(MenuPanel, {
            props: {
                areaBroker: areaBrokerMock,
                pluginConfig: defaultPluginConfig
            }
        });
        const openSpy = vi.fn();
        component.$on('open', openSpy);
        const closeSpy = vi.fn();
        component.$on('close', closeSpy);

        expect(openSpy).not.toHaveBeenCalled();
        component.$set({ open: true });

        await tick();
        expect(container.querySelector('.panel').classList.contains('open')).toBe(true);
        expect(openSpy).toHaveBeenCalledTimes(1);
        expect(closeSpy).not.toHaveBeenCalled();

        const closeBtn = container.querySelector('.panel button[aria-label^="Close"]');
        closeBtn.click();

        await tick();
        expect(container.querySelector('.panel').classList.contains('open')).toBe(false);
        expect(closeSpy).toHaveBeenCalledTimes(1);
        closeSpy.mockClear();

        component.$set({ open: true });
        component.$set({ open: false });
        await tick();
        expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('propagates "change" event from group settings', () => {
        const { container, component } = render(MenuPanel, {
            props: {
                areaBroker: areaBrokerMock,
                pluginConfig: defaultPluginConfig
            }
        });
        const changeSpy = vi.fn();
        component.$on('change', changeSpy);

        const mockedSettingEl = container.querySelector(`.mock-setting`);
        mockedSettingEl.click();

        expect(changeSpy).toHaveBeenCalledTimes(1);
    });

    it('propagates "toggle" event from group headers', () => {
        const { container, component } = render(MenuPanel, {
            props: {
                areaBroker: areaBrokerMock,
                pluginConfig: defaultPluginConfig
            }
        });
        const toggleSpy = vi.fn();
        component.$on('toggle', toggleSpy);

        const details = container.querySelector('details');
        details.open = false;
        details.dispatchEvent(new CustomEvent('toggle'));

        expect(toggleSpy).toHaveBeenCalledTimes(1);
    });
});
