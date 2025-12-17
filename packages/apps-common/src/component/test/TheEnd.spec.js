// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import TheEnd from '../TheEnd.svelte';

describe('TheEnd component', () => {
    const { location } = window;

    beforeAll(() => {
        delete window.location;
    });

    afterAll(() => {
        window.location = location;
    });

    it('Renders correctly with only a title', () => {
        const { container } = render(TheEnd, {
            title: 'Error'
        });
        expect(container).toMatchSnapshot();
    });

    it('Renders correctly with a title and info', () => {
        const { container } = render(TheEnd, {
            title: 'Error',
            info: 'Your test has been submitted.'
        });
        expect(container).toMatchSnapshot();
    });

    it('Renders correctly with only a title and a cause', () => {
        const { container } = render(TheEnd, {
            title: 'Error',
            cause: 'Something went wrong'
        });
        expect(container).toMatchSnapshot();
    });

    it('Renders the retry button', () => {
        const { container } = render(TheEnd, {
            title: 'Error',
            cause: 'Something went wrong',
            remediation: 'Please reload the page',
            retry: true
        });
        expect(container).toMatchSnapshot();
    });

    it('The retry button reloads the current page', () => {
        expect.assertions(1);
        const { container } = render(TheEnd, {
            title: 'Error',
            cause: 'Something went wrong',
            retry: true
        });
        const button = container.querySelector('button');

        const reload = vi.fn();
        window.location = {
            reload
        };

        button.click();

        expect(reload).toHaveBeenCalled();
    });

    it('Focuses the heading element on mount', () => {
        const { container } = render(TheEnd, {
            title: 'You are the best'
        });
        return new Promise(resolve => {
            setTimeout(() => {
                expect(document.activeElement).toEqual(container.querySelector('h1'));
                resolve();
            }, 10);
        });
    });
});
