// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import Tooltip from '../Tooltip.svelte';
import { tick } from 'svelte';

vi.mock('@oat-sa-private/ui-core', async importOriginal => {
    const actual = await importOriginal();
    return {
        ...actual,
        generateElementId: nodeName => `tao-${nodeName}-123`,
        __: str => str,
        sanitize: str => str,
        remToPx: rem => rem * 16,
        pxToRem: px => px / 16,
        getLocale: () => 'en'
    };
});

//mock Range.getBoundingClientRect
//and Element.getBoundingClientRect
const rectObj = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    bottom: 0,
    right: 0,
    left: 0
};
Range.prototype.getBoundingClientRect = () => rectObj;
Element.prototype.getBoundingClientRect = () => rectObj;

describe('Tooltip', () => {
    it('renders with no attributes', () => {
        const { container } = render(Tooltip);
        expect(container).toMatchSnapshot();
    });

    it('renders with attributes', () => {
        const { container } = render(Tooltip, { props: { attributes: { content: 'content', text: 'text' } } });
        expect(container).toMatchSnapshot();
    });

    it('renders tooltip on anchor focus', async () => {
        const { container } = render(Tooltip, { props: { attributes: { content: 'content', text: 'text' } } });
        fireEvent.focus(container.querySelector('[aria-describedby]'));
        await tick();
        expect(container).toMatchSnapshot();
    });
});
