// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import MiniPins from '../MiniPins.svelte';

describe('MiniPins component', () => {
    describe('rendering', () => {
        it('renders a pin', () => {
            const { container } = render(MiniPins, {
                props: { used: 1 }
            });
            expect(container.querySelectorAll('li').length).toBe(1);
            expect(container.querySelector('.mini-pins')).toMatchSnapshot();
        });

        it('renders no more than 10 pins', () => {
            const { container } = render(MiniPins, {
                props: { unused: 25 }
            });
            expect(container.querySelectorAll('li').length).toBe(10);
        });

        test.each([
            [void 0, void 0],
            [void 0, 5],
            [5, void 0],
            [0, 3],
            [3, 0],
            [4, 6]
        ])('renders with %d used and %d unused pins', (used, unused) => {
            const { container } = render(MiniPins, {
                props: { used, unused }
            });
            const expectedUsed = used || 0;
            const expectedUnused = unused || 0;
            expect(container.querySelectorAll('li').length).toBe(expectedUsed + expectedUnused);
            expect(container.querySelectorAll('li.dimmed').length).toBe(expectedUsed);
        });
    });
});
