// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import FloatingToolbarAreas from '../FloatingToolbarAreas.svelte';
import { getTestSessionUserDataService } from '../../session/testSessionUserDataService.js';

const makeMockPlugin = name => ({
    getName: () => name
});

const mockPlugins = {
    scratchpad: makeMockPlugin('scratchpad'), // has no floating bar, others do
    highlighter: makeMockPlugin('highlighter'),
    readAloud: makeMockPlugin('readAloud')
};

describe('FloatingToolbarAreas component', () => {
    it('Renders no divs for no plugins', () => {
        const { container } = render(FloatingToolbarAreas, {
            serviceCallId: 'test2'
        });
        expect(container.querySelector('.floating-toolbars > div:not(.flex-break)')).toBeFalsy();
    });

    test.each([['highlighter'], ['readAloud']])('Renders single div for single plugin: %s', pluginName => {
        const { container } = render(FloatingToolbarAreas, {
            serviceCallId: 'test1',
            plugins: {
                [pluginName]: makeMockPlugin(pluginName)
            }
        });
        expect(container.querySelector(`.toolbar-${pluginName}`)).toBeInTheDocument();
    });

    it('Renders all divs for plugins, and only for plugins in template', () => {
        const { container } = render(FloatingToolbarAreas, {
            serviceCallId: 'test2',
            plugins: mockPlugins
        });
        expect(container).toMatchSnapshot();
    });

    it('Applies open class only for plugins which stored open state', () => {
        const serviceCallId = 'test3';
        const toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
        toolsStore.setTestToolsState({
            highlighter: { open: false },
            readAloud: { open: true }
        });

        const { container } = render(FloatingToolbarAreas, {
            serviceCallId,
            plugins: mockPlugins
        });

        return tick().then(() => {
            expect(container.querySelector('.toolbar-highlighter')).not.toHaveClass('open');
            expect(container.querySelector('.toolbar-readAloud')).toHaveClass('open');
        });
    });
});
