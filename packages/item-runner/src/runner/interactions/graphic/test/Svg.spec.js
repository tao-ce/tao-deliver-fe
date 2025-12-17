// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { fireEvent, render } from '@testing-library/svelte';
import Svg from '../Svg.svelte';
import SvgSlotsTest from './SvgSlotsTest.svelte';

describe('Svg', () => {
    describe('rendering', () => {
        it('must have image dimensions to render', () => {
            const { container } = render(Svg, {
                props: {
                    itemIdentifier: 'item-123',
                    imgSrc: '/path/to/image'
                }
            });
            expect(container.children.length).toBe(0);
        });

        it('renders basic props to markup', () => {
            const { container } = render(Svg, {
                props: {
                    svgId: 'external-svgid-123',
                    itemIdentifier: 'item-123',
                    label: 'a foovist artwork',
                    imgSrc: '/path/to/image',
                    imgWidth: 1234,
                    imgHeight: 567
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('does not render desc without a label', () => {
            const { container } = render(Svg, {
                props: {
                    itemIdentifier: 'item-321',
                    imgSrc: '/path/to/image',
                    imgWidth: 1234,
                    imgHeight: 567,
                    label: void 0
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('renders basic + bayAttrs props to markup', () => {
            const { container } = render(Svg, {
                props: {
                    itemIdentifier: 'item-123',
                    label: 'a foovist artwork',
                    imgSrc: '/path/to/image',
                    imgWidth: 1234,
                    imgHeight: 567,
                    bayAttrs: {
                        width: 200,
                        height: 567,
                        x: 0,
                        y: 0,
                        related: {
                            imgExcessWidth: 200,
                            imgExcessHeight: 0,
                            imgOffsetX: 200,
                            imgOffsetY: 0
                        }
                    }
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('renders slot contents', () => {
            const { container } = render(SvgSlotsTest, { props: {} });
            expect(container).toMatchSnapshot();
        });

        it('inherits lang attribute from parent section', () => {
            const parent = document.createElement('section');
            parent.setAttribute('lang', 'ru-RU');
            render(
                Svg,
                {
                    svgId: 'external-svgid-123',
                    itemIdentifier: 'item-123',
                    label: 'a foovist artwork',
                    imgSrc: '/path/to/image',
                    imgWidth: 1234,
                    imgHeight: 567
                },
                {
                    baseElement: parent
                }
            );
            expect(parent.querySelector('svg').getAttribute('lang')).toBe('ru-RU');
        });
    });

    describe('events', () => {
        it('fires backgroundImageLoad on image load event', () => {
            const { container, component } = render(Svg, {
                props: {
                    svgId: 'external-svgid-123',
                    itemIdentifier: 'item-123',
                    label: 'a foovist artwork',
                    imgSrc: '/path/to/image',
                    imgWidth: 1234,
                    imgHeight: 567
                }
            });
            const handlerMock = vi.fn();
            component.$on('backgroundImageLoad', handlerMock);
            const imageElement = container.querySelector('image');
            fireEvent.load(imageElement);
            expect(handlerMock).toHaveBeenCalled();
        });

        it('fires backgroundImageError on image load event, passes recoverable error', () => {
            const { container, component } = render(Svg, {
                props: {
                    svgId: 'external-svgid-123',
                    itemIdentifier: 'item-123',
                    label: 'a foovist artwork',
                    imgSrc: '/path/to/image',
                    imgWidth: 1234,
                    imgHeight: 567
                }
            });
            const handlerMock = vi.fn();
            component.$on('backgroundImageError', handlerMock);
            const imageElement = container.querySelector('image');
            fireEvent.error(imageElement);

            expect(handlerMock).toHaveBeenCalled();
            const err = handlerMock.mock.calls[0][0].detail;
            expect(err.recoverable).toBe(true);
        });
    });
});
