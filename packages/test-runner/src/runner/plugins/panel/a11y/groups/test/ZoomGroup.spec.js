// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import { cloneDeep } from 'lodash';
import defaultPluginConfig from '../../pluginConfig.js';
import settingsKeys from '../../../../settings/settingsKeys.js';
import ZoomGroup from '../ZoomGroup.svelte';

describe('ZoomGroup', () => {
    it('renders details with header and page-zoom-setting', () => {
        const { container } = render(ZoomGroup, {
            props: {
                pluginConfig: defaultPluginConfig,
                initialSettingsState: {}
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('applies initial state, passes config and initial state to page-zoom-setting', () => {
        const pluginConfig = cloneDeep(defaultPluginConfig);
        pluginConfig[settingsKeys.pageZoom].zoomLevels = [100, 150, 200];

        const { container } = render(ZoomGroup, {
            props: {
                pluginConfig,
                initialSettingsState: {
                    [settingsKeys.pageZoom]: { toolState: { value: 2, zoomLevel: 200, nonDefault: true } }
                }
            }
        });
        expect(container).toMatchSnapshot();
        expect(document.body.dataset.zoomLevel).toBe('200');
    });

    it('propagates stepper "change" event and applies non-default style', async () => {
        const { container, component } = render(ZoomGroup, {
            props: {
                pluginConfig: defaultPluginConfig,
                initialSettingsState: {}
            }
        });
        const changeSpy = vi.fn();
        component.$on('change', changeSpy);

        const btnPlus = container.querySelector('button:first-of-type');
        expect(container.querySelector('.non-default')).toBeFalsy();
        expect(container.querySelector('.outlined')).toBeFalsy();

        btnPlus.click();
        expect(changeSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: {
                    key: settingsKeys.pageZoom,
                    state: {
                        value: 1,
                        zoomLevel: 110,
                        nonDefault: true
                    }
                }
            })
        );
        await tick();
        expect(container.querySelector('.non-default')).toBeTruthy();
        expect(container.querySelector('.outlined')).toBeTruthy();
    });
});
