// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import ControlRow from '../ControlRow.svelte';

describe('ControlRow', () => {
    it('renders icon, label, stepper', () => {
        const { container } = render(ControlRow, {
            props: {
                icon: 'notepad-16',
                label: 'This is a notepad',
                value: 4,
                min: 0,
                max: 8,
                step: 2,
                ariaLabelIncr: 'a little more',
                ariaLabelDecr: 'a little less',
                nonDefault: false
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('propagates stepper "change" event and applies non-default style', async () => {
        const { container, component } = render(ControlRow, {
            props: {
                icon: 'notepad-16',
                label: 'This is a notepad',
                value: 4,
                min: 0,
                max: 8,
                step: 2,
                ariaLabelIncr: 'a little more',
                ariaLabelDecr: 'a little less',
                nonDefault: false
            }
        });
        const changeSpy = vi.fn();
        component.$on('change', changeSpy);

        const btnPlus = container.querySelector('button:first-of-type');
        expect(container.querySelector('.control-row.non-default')).toBeFalsy();

        btnPlus.click();
        expect(changeSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: {
                    value: 6,
                    position: { x: 0, y: 0 },
                    nonDefault: true
                }
            })
        );
        await tick();
        expect(container.querySelector('.control-row.non-default')).toBeTruthy();
    });
});
