// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import Figure from '../Figure.svelte';
import ContextWrapper from './ContextWrapper.svelte';

describe('Figure', () => {
    test.each([
        ['', {}, null],
        ['', { w: '100%', h: void 0 }, 'width: 100%;'],
        ['', { w: '50px', h: '30px', s: 'color:red' }, 'color: red; width: 50px;'],
        ['vertical-rl', { w: '100%', h: void 0 }, 'height: 100%;'],
        ['vertical-rl', { w: '50px', h: '30px', s: 'color: red' }, 'color: red; width: 50px;'],
        ['vertical-rl', { w: '100%', h: '30px' }, 'width: 100%;']
    ])('sets style from image width, if writing-mode %s', async (writingMode, sizeAttrs, style) => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: 'item2',
                testContext: {
                    getWritingMode: vi.fn().mockReturnValue(writingMode)
                },
                testComponent: Figure,
                testComponentProps: {
                    itemIdentifier: 'item2',
                    attributes: {
                        style: sizeAttrs.s,
                        imageElementWidth: sizeAttrs.w,
                        imageElementHeight: sizeAttrs.h
                    }
                }
            }
        });
        expect(container.querySelector('figure').getAttribute('style')).toBe(style);
    });
});
