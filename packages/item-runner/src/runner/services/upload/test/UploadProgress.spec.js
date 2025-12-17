// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import UploadProgress from '../UploadProgress.svelte';

describe('UploadProgress component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllTimers();
    });

    function expectProgressbar(container, present = false) {
        expect(!!container.querySelector('[role="progressbar"]')).toBe(present);
    }

    async function loadBytesOverTime(component, time = 1000) {
        // because the implementation requires 5 distinct prop updates
        component.$set({ bytesLoaded: 10 });
        await tick();
        vi.advanceTimersByTime(time);
        component.$set({ bytesLoaded: 20 });
        await tick();
        component.$set({ bytesLoaded: 30 });
        await tick();
        component.$set({ bytesLoaded: 40 });
        await tick();
        component.$set({ bytesLoaded: 50 });
        await tick();
    }

    it('renders nothing with default props', () => {
        const { container } = render(UploadProgress);
        expectProgressbar(container, false);
    });

    it('renders in full after enough progress events to estimate duration', async () => {
        const { container, component } = render(UploadProgress, {
            props: {
                bytesLoaded: 0,
                bytesTotal: 100,
                durationMinimumMs: 1000
            }
        });
        expectProgressbar(container, false);

        await loadBytesOverTime(component);

        expect(container).toMatchSnapshot();
    });

    it('renders in full after durationMinimumMs with insufficient progress events', async () => {
        const { container, component } = render(UploadProgress, {
            props: {
                bytesLoaded: 0,
                bytesTotal: 100,
                durationMinimumMs: 50
            }
        });
        expectProgressbar(container, false);

        component.$set({ bytesLoaded: 10 });

        vi.runAllTimers();
        await tick();

        expectProgressbar(container, true);
    });

    it('renders nothing if estimated duration is shorter than minimum', async () => {
        const { container, component } = render(UploadProgress, {
            props: {
                bytesLoaded: 0,
                bytesTotal: 100,
                durationMinimumMs: 10000
            }
        });
        expectProgressbar(container, false);

        await loadBytesOverTime(component);

        expectProgressbar(container, false);
    });

    it('renders without cancel button', async () => {
        const { container, component } = render(UploadProgress, {
            props: {
                bytesLoaded: 0,
                bytesTotal: 100,
                cancelable: false,
                durationMinimumMs: 0
            }
        });
        expectProgressbar(container, false);

        component.$set({ bytesLoaded: 10 });

        vi.runAllTimers();
        await tick();

        expectProgressbar(container, true);
        expect(container.querySelector('button')).not.toBeInTheDocument();
    });

    it('dispatches cancel event', async () => {
        const { container, component } = render(UploadProgress, {
            props: {
                bytesLoaded: 0,
                bytesTotal: 100,
                durationMinimumMs: 0
            }
        });
        expectProgressbar(container, false);

        const cancelSpy = vi.fn();
        component.$on('cancel', cancelSpy);

        component.$set({ bytesLoaded: 10 });

        vi.runAllTimers();
        await tick();

        expectProgressbar(container, true);
        expect(container.querySelector('button')).toBeInTheDocument();
        container.querySelector('button').click();

        expect(cancelSpy).toHaveBeenCalledTimes(1);
    });
});
