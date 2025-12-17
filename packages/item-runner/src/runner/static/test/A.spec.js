// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import A from '../A.svelte';

describe('A', () => {
    it('renders with no props', () => {
        const { container } = render(A, {
            props: {}
        });
        expect(container).toMatchSnapshot();
    });

    it('appends target="_blank"', () => {
        const { container } = render(A, {
            props: {
                attributes: {
                    href: 'www.hello.org'
                }
            }
        });
        expect(container).toMatchSnapshot();
        expect(container.querySelector('a').getAttribute('target')).toBe('_blank');
        expect(container.querySelector('a').getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('does not append target="_blank" if # href', () => {
        const { container } = render(A, {
            props: {
                attributes: {
                    href: '#element123'
                }
            }
        });
        expect(container).toMatchSnapshot();
        expect(container.querySelector('a').getAttribute('target')).toBeFalsy();
        expect(container.querySelector('a').getAttribute('rel')).toBeFalsy();
    });
});
