// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import Transition from '../Transition.svelte';

describe('Transition component', () => {
    it('Renders correctly with no props', () => {
        const { container } = render(Transition, {});
        expect(container).toMatchSnapshot();
        expect(container.querySelector('.loading-wrapper').classList).toContain('small');
    });

    it('Renders correctly with text & subtext', () => {
        const text = 'loading';
        const subtext = 'loady loady loady';
        const { container } = render(Transition, { text, subtext });
        expect(container).toMatchSnapshot();
        expect(container.querySelector('.loading-wrapper').classList).toContain('small');
    });

    it('Disables lite mode after a delay', () => {
        vi.useFakeTimers();

        const text = 'loading';
        const delay = 500;
        const { container } = render(Transition, { text, delay });

        expect(container.querySelector('.loading-wrapper').classList).toContain('small');

        vi.runAllTimers();

        // needs 2 ticks to propagate changes through to Loading component
        return tick()
            .then(tick)
            .then(() => {
                expect(container.querySelector('.loading-wrapper').classList).not.toContain('small');
            });
    });
});
