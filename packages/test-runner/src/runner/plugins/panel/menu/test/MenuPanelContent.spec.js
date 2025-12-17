// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import MenuPanelContent from '../MenuPanelContent.svelte';

describe('MenuPanelContent', () => {
    it('renders correctly without any property', () => {
        const { container } = render(MenuPanelContent, {
            props: {}
        });
        expect(container).toMatchSnapshot();
    });

    it('add a logout link with an exitUrl', () => {
        const { container } = render(MenuPanelContent, {
            props: {
                exitUrl: '/logout'
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('update the links list', () => {
        const { container } = render(MenuPanelContent, {
            props: {
                links: [
                    { label: 'Foo', href: '/foo' },
                    { label: 'Bar Baz', href: '//bar' },
                    { label: 'noz & nox', href: 'https://noz.nox/foo' }
                ]
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('update the footer with only a logo', () => {
        const { container } = render(MenuPanelContent, {
            props: {
                footer: { logo: { src: 'foo.png' } }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('update the footer with a logo and some content', () => {
        const { container } = render(MenuPanelContent, {
            props: {
                footer: {
                    logo: { src: 'foo.png' },
                    content: ['made with love by us', { href: 'https://foo.bar', label: 'foo bar' }]
                }
            }
        });
        expect(container).toMatchSnapshot();
    });
});
