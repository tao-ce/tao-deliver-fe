// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { render } from '@testing-library/svelte';
import AtomicAriaLive from '../AtomicAriaLive.svelte';
import { tick } from 'svelte';

describe('AtomicAriaLive', () => {
    it('renders with default props', () => {
        const { container } = render(AtomicAriaLive, {
            props: {}
        });
        expect(container).toMatchSnapshot();
    });

    it('renders string announcement', () => {
        const { container } = render(AtomicAriaLive, {
            props: {
                assertive: false,
                id: 'live-id-123',
                announcement: { text: 'Rejoice!' }
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders announcement linking to html content', () => {
        const { container } = render(AtomicAriaLive, {
            props: {
                assertive: true,
                id: 'live-id-123',
                announcement: {
                    text: '%lb has replaced %lb',
                    labelledByParams: ['content-id-A', 'content-id-B']
                }
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders announcement in a given lang', () => {
        const { container } = render(AtomicAriaLive, {
            props: {
                assertive: true,
                id: 'live-id-123',
                lang: 'fr-FR',
                announcement: {
                    text: 'Veuillez compléter ce formulaire'
                }
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('reacts to props change', () => {
        const { container, component } = render(AtomicAriaLive, {
            props: {
                assertive: true,
                id: 'live-id-123',
                announcement: {
                    text: 'The new %lb has appeared',
                    labelledByParams: ['content-id-A']
                }
            }
        });
        let firstTimeContent;
        let secondTimeContent;
        const getContent = () => container.querySelector('[aria-live]').innerHTML;
        return tick()
            .then(() => {
                firstTimeContent = getContent();
                expect(container).toMatchSnapshot();

                component.$set({
                    announcement: {
                        text: 'The new %lb has appeared',
                        labelledByParams: ['content-id-A']
                    }
                });
                return tick();
            })
            .then(() => {
                secondTimeContent = getContent();
                expect(firstTimeContent).not.toEqual(secondTimeContent);

                component.$set({
                    announcement: {
                        text: 'Cancelled'
                    }
                });
                return tick();
            })
            .then(() => {
                firstTimeContent = getContent();
                expect(container).toMatchSnapshot();

                component.$set({
                    announcement: {
                        text: 'Cancelled'
                    }
                });
                return tick();
            })
            .then(() => {
                secondTimeContent = getContent();
                expect(firstTimeContent).not.toEqual(secondTimeContent);
            });
    });
});
