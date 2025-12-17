// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import PageZoomSetting from '../PageZoomSetting.svelte';

describe('PageZoomSetting', () => {
    it('renders correctly', () => {
        const { container } = render(PageZoomSetting, {
            props: {
                zoomLevels: [100, 200]
            }
        });
        const buttons = Array.from(container.querySelectorAll('button'));
        expect(buttons.length).toBe(2);

        const [btn1, btn2] = buttons;
        expect(btn1.getAttribute('aria-label')).toBe('zoom in');
        expect(btn2.getAttribute('aria-label')).toBe('zoom out');
    });

    it('renders with 3 zoom levels', async () => {
        const { container } = render(PageZoomSetting, {
            props: {
                config: {
                    zoomLevels: [100, 150, 200]
                }
            }
        });
        const buttons = Array.from(container.querySelectorAll('button'));
        expect(buttons.length).toBe(2);

        const [btn1, btn2] = buttons;
        expect(btn1.classList.contains('visually-disabled')).toBe(false);
        expect(btn2.classList.contains('visually-disabled')).toBe(true);

        btn1.click();
        await tick();

        expect(btn1.classList.contains('visually-disabled')).toBe(false);
        expect(btn2.classList.contains('visually-disabled')).toBe(false);

        btn1.click();
        await tick();

        expect(btn1.classList.contains('visually-disabled')).toBe(true);
        expect(btn2.classList.contains('visually-disabled')).toBe(false);
    });

    it('fires "change" events on button clicks', async () => {
        const { container, component } = render(PageZoomSetting, {
            props: {
                config: {
                    zoomLevels: [100, 200]
                }
            }
        });
        const onchange = vi.fn();
        component.$on('change', onchange);

        const [btn1, btn2] = Array.from(container.querySelectorAll('button'));
        btn1.click();
        await tick();

        expect(onchange).toHaveBeenCalledTimes(1);
        expect(onchange.mock.calls[0][0].detail).toStrictEqual({
            key: 'pageZoom',
            state: {
                nonDefault: true,
                value: 1,
                zoomLevel: 200
            }
        });

        btn2.click();
        await tick();

        expect(onchange).toHaveBeenCalledTimes(2);
        expect(onchange.mock.calls[1][0].detail).toStrictEqual({
            key: 'pageZoom',
            state: {
                nonDefault: false,
                value: 0,
                zoomLevel: 100
            }
        });
    });

    it('applies attributes to document on change', async () => {
        const { container } = render(PageZoomSetting, {
            props: {
                config: {
                    zoomLevels: [100, 200]
                }
            }
        });
        expect(document.body.dataset.zoomLevel).toBeUndefined();

        const [btn1, btn2] = Array.from(container.querySelectorAll('button'));
        btn1.click();

        expect(document.body.dataset.zoomLevel).toBe('200');

        await tick();

        btn2.click();

        expect(document.body.dataset.zoomLevel).toBe('100');
    });

    it('applies initial state value to document on load', async () => {
        render(PageZoomSetting, {
            props: {
                config: {
                    zoomLevels: [100, 200]
                },
                initialState: {
                    zoomLevel: 200,
                    value: 1
                }
            }
        });
        expect(document.body.dataset.zoomLevel).toBe('200');
    });
});
