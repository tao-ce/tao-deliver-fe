// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { render } from '@testing-library/svelte';
import TheEnd from '../TheEnd.svelte';
import { Feedback } from '@oat-sa-private/ui-elements';

describe('TheEnd component', () => {
    const { location } = window;
    const { open } = window;

    beforeAll(() => {
        delete window.location;
    });

    afterAll(() => {
        window.location = location;
        window.open = open;
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
        const { container, component } = render(TheEnd, {
            title: 'Error',
            cause: 'Something went wrong',
            retry: true
        });
        const clickSpy = vi.fn();
        component.$on('click', clickSpy);
        const button = container.querySelector('button');

        button.click();

        expect(clickSpy).toHaveBeenCalled();
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

    it('Renders detailsComponent if defined', async () => {
        const { container } = render(TheEnd, {
            title: 'Error',
            cause: 'Something went wrong',
            remediation: 'Please follow these instructions',
            detailsComponent: Feedback,
            detailsComponentProps: { heading: 'Whatever', content: 'they are supposed to be' }
        });
        expect(container).toMatchSnapshot();
    });

    it('Renders exit button if withKioskExit=true', () => {
        const { container } = render(TheEnd, {
            title: 'Error',
            cause: 'Something went wrong',
            remediation: 'Please forget about it',
            withKioskExit: true
        });
        expect(container).toMatchSnapshot();
    });

    it('Renders proceed action if actionHref is provided', () => {
        const { container } = render(TheEnd, {
            title: 'Thank you',
            info: 'Your test has been submitted.',
            actionHref: 'https://portal.example.com/my-sessions',
            actionLabel: 'Proceed',
            actionTarget: '_top'
        });
        expect(container).toMatchSnapshot();
    });

    it('The proceed button redirects the top window when actionTarget is _top', () => {
        const openSpy = vi.fn();
        window.location = {
            href: 'https://deliver.example.com/thank-you',
            assign: vi.fn()
        };
        window.open = openSpy;

        const { container } = render(TheEnd, {
            title: 'Thank you',
            info: 'Your test has been submitted.',
            actionHref: 'https://portal.example.com/my-sessions',
            actionLabel: 'Proceed',
            actionTarget: '_top'
        });

        const button = container.querySelector('.button-container button');

        button.click();

        expect(window.location.href).toBe('https://portal.example.com/my-sessions');
        expect(openSpy).not.toHaveBeenCalled();
    });

    it('The proceed button falls back to window.open for other action targets', () => {
        const openSpy = vi.fn();
        window.location = {
            href: 'https://deliver.example.com/thank-you',
            assign: vi.fn()
        };
        window.open = openSpy;

        const { container } = render(TheEnd, {
            title: 'Thank you',
            info: 'Your test has been submitted.',
            actionHref: 'https://portal.example.com/my-sessions',
            actionLabel: 'Proceed',
            actionTarget: '_blank'
        });

        const button = container.querySelector('.button-container button');

        button.click();

        expect(openSpy).toHaveBeenCalledWith('https://portal.example.com/my-sessions', '_blank');
    });
});
