// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import Stepper from '../Stepper.svelte';

describe('Stepper', () => {
    it('renders minus/plus buttons', () => {
        const { container } = render(Stepper, {
            props: {
                value: 4,
                min: 0,
                max: 8,
                step: 2,
                ariaLabelIncr: 'a little more',
                ariaLabelDecr: 'a little less'
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders disabled buttons', () => {
        const { container } = render(Stepper, {
            props: {
                value: 4,
                min: 0,
                max: 8,
                step: 2,
                disabled: true
            }
        });
        expect(container.querySelectorAll('button:disabled').length).toBe(2);
        expect(container.querySelectorAll('button:not(:disabled)').length).toBe(0);
    });

    it('renders when min value', () => {
        const { container } = render(Stepper, {
            props: {
                value: 0,
                min: 0,
                max: 8,
                step: 2,
                ariaLabelIncr: 'a little more',
                ariaLabelDecr: 'a little less'
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders when max value', () => {
        const { container } = render(Stepper, {
            props: {
                value: 8,
                min: 0,
                max: 8,
                step: 2,
                ariaLabelIncr: 'a little more',
                ariaLabelDecr: 'a little less'
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('fires "change" event on minus/plus click', async () => {
        const { container, component } = render(Stepper, {
            props: {
                value: 0,
                min: -0.5,
                max: 0.5,
                step: 0.25
            }
        });
        const changeSpy = vi.fn();
        component.$on('change', changeSpy);

        const btnPlus = container.querySelector('button:first-of-type');
        const btnMinus = container.querySelector('button:last-of-type');

        btnMinus.click();
        expect(changeSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: {
                    value: -0.25,
                    position: { x: 0, y: 0 },
                    nonDefault: true
                }
            })
        );
        changeSpy.mockClear();

        btnMinus.click();
        expect(changeSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: {
                    value: -0.5,
                    position: { x: 0, y: 0 },
                    nonDefault: false
                }
            })
        );
        changeSpy.mockClear();

        btnPlus.click();
        expect(changeSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                detail: {
                    value: -0.25,
                    position: { x: 0, y: 0 },
                    nonDefault: true
                }
            })
        );
        changeSpy.mockClear();

        btnPlus.click();
        btnPlus.click();
        btnPlus.click();
        expect(changeSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({
                detail: {
                    value: 0.5,
                    position: { x: 0, y: 0 },
                    nonDefault: true
                }
            })
        );
    });
});
