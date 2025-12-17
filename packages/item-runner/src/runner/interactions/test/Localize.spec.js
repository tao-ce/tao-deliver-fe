// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../../util/locale.js', async importOriginal => {
    const originalModule = await importOriginal();
    return Object.assign({ __esModule: true }, originalModule, {
        getLocale: () => 'ab-CD'
    });
});
import { render } from '@testing-library/svelte';
import Localize from '../Localize.svelte';

describe('Localize', () => {
    it('renders nothing without props', () => {
        const { container } = render(Localize, {
            props: {}
        });
        expect(container).toMatchSnapshot();
    });

    it('renders string in user lang', () => {
        const { container } = render(Localize, {
            props: {
                value: 'already formatted and translated'
            }
        });
        expect(container).toMatchSnapshot();
    });

    test.each([
        ['This is the %s that %s built. This is the %s that %s in the house', ['house', 'Jack', 'malt', 'lay']],
        ['%s associated with %s', ['le chat', 'la souris']],
        ['agnostes %s', ['words']],
        ['%d years', [5]]
    ])('renders string in user lang with params in content lang', (text, params) => {
        const { container } = render(Localize, {
            props: {
                value: {
                    text,
                    params
                }
            }
        });
        expect(container).toMatchSnapshot();
    });
});
