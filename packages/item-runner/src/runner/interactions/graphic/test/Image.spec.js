// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent, render } from '@testing-library/svelte';
import Image from '../Image.svelte';

describe('Image', () => {
    describe('rendering', () => {
        it('renders default props to markup', () => {
            const { container } = render(Image, { props: {} });
            expect(container).toMatchSnapshot();
        });

        it('renders given props to markup', () => {
            const { container } = render(Image, {
                props: {
                    width: 1234,
                    height: 567,
                    x: 98,
                    y: 76,
                    src: './assets/fake.file.png'
                }
            });
            expect(container).toMatchSnapshot();
        });
    });
    describe('events', () => {
        it('forwards image load event', () => {
            const { container, component } = render(Image, {
                props: {
                    width: 1234,
                    height: 567,
                    x: 98,
                    y: 76,
                    src: './assets/fake.file.png'
                }
            });
            const handlerMock = vi.fn();
            component.$on('load', handlerMock);
            const imageElement = container.querySelector('image');
            fireEvent.load(imageElement);

            expect(handlerMock).toHaveBeenCalled();
        });

        it('forwards image error event', () => {
            const { container, component } = render(Image, {
                props: {
                    width: 1234,
                    height: 567,
                    x: 98,
                    y: 76,
                    src: './assets/fake.file.png'
                }
            });
            const handlerMock = vi.fn();
            component.$on('error', handlerMock);
            const imageElement = container.querySelector('image');
            fireEvent.error(imageElement);

            expect(handlerMock).toHaveBeenCalled();
        });
    });
});
