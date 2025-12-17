// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import AllItemsFooter from '../AllItemsFooter.svelte';

describe('AllItemsFooter component', () => {
    it('Renders correctly', () => {
        const { container } = render(AllItemsFooter);
        expect(container).toMatchSnapshot();
    });
});
