// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2025 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import WaitingPage from '../WaitingPage.svelte';

const props = {
    waitTimeRemaining: 10000,
    testTitle: 'Math exam',
    testTakerName: 'John Doe',
    exitUrl: 'https://example.com',
    theme: {
        logo: {
            src: 'logo.svg',
            alt: 'logo'
        },
        fullLogo: {
            src: 'logo_full.svg',
            alt: 'full logo '
        },
        waitingPage: {
            sideImage: {
                src: 'waiting.svg',
                alt: 'waiting'
            },
            declarationOfAvailability: 'http://example.com'
        }
    },
    startsAt: '1970-01-01T12:00:00Z',
    endsAt: '1970-01-01T13:00:00Z',
    locale: 'en-US'
};

describe('WaitingPage component', () => {
    beforeEach(() => {
        vi.useFakeTimers('modern');
        vi.setSystemTime(new Date('1970-01-01T11:58:30Z'));
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
            setTimeout(callback, 0);
        });
    });

    afterEach(() => {
        window.requestAnimationFrame.mockRestore();
        vi.useRealTimers();
    });

    it('renders correctly with all properties', () => {
        const { container } = render(WaitingPage, { props });

        expect(container).toMatchSnapshot();
    });

    it('fires timeout event', async () => {
        const { component } = render(WaitingPage, { props: { ...props, waitTimeRemaining: 3000 } });

        const onTimeout = vi.fn();
        component.$on('timeout', onTimeout);

        vi.setSystemTime(new Date('1970-01-01T12:00:00Z')); // time after waiting time

        vi.advanceTimersByTime(1); // fires requestAnimationFrame

        await tick(); // wait for reactive condition that dispaches timeout

        expect(onTimeout).toHaveBeenCalled();
    });
});
