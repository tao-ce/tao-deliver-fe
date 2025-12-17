// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import CursorSvg from '../CursorSvg.svelte';

describe('CursorSvg', () => {
    beforeAll(() => {
        document.elementFromPoint = () => document.body;
    });
    afterAll(() => {
        document.elementFromPoint = null;
    });

    it('renders passed options', async () => {
        const { component } = render(CursorSvg, {
            props: {
                size: { w: 12, h: 16 },
                color: {
                    label: 'Default',
                    fill: 'white',
                    stroke: 'black'
                },
                targetElement: document.body,
                position: { x: 0, y: 0 }
            }
        });
        component.addSvgCursor();

        await tick();
        expect(document.body).toMatchSnapshot();
    });

    it('renders empty element if no initial position', async () => {
        const { component } = render(CursorSvg, {
            props: {
                size: { w: 12, h: 16 },
                color: {
                    label: 'Default',
                    fill: 'white',
                    stroke: 'black'
                },
                targetElement: document.body
            }
        });
        component.addSvgCursor();

        await tick();
        expect(document.body).toMatchSnapshot();
    });
});
