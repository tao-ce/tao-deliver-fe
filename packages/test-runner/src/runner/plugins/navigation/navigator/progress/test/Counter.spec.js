// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import Counter from '../Counter.svelte';

describe('Counter component', () => {
    it('Has to render with empty container with no props', () => {
        const { container } = render(Counter, {});
        expect(container.getElementsByClassName('counter').length).toEqual(0);
    });

    it('Has to render with stats object as prop', () => {
        const { container } = render(Counter, { total: 3, position: 1 });
        expect(container.getElementsByClassName('counter').length).toEqual(1);
        expect(container.getElementsByClassName('counter')[0].textContent).toEqual('1 / 3');
        expect(container).toMatchSnapshot();
    });
});
