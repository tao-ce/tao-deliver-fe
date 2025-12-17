// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import StepperArray from '../StepperArray.svelte';

const options = {
    numbers: [2, 3, 5, 7, 11],
    strings: ['alpha', 'beta', 'gamma'],
    objects: [
        {
            name: 'foo',
            value: 'foo'
        },
        {
            name: 'bar',
            value: 'bar'
        }
    ]
};

describe('StepperArray', () => {
    it('renders minus/plus buttons', () => {
        const { container } = render(StepperArray, {
            props: {
                value: 5,
                options: options.numbers,
                ariaLabelIncr: 'a little more',
                ariaLabelDecr: 'a little less'
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders disabled buttons', () => {
        const { container } = render(StepperArray, {
            props: {
                value: 'beta',
                options: options.strings,
                disabled: true
            }
        });
        expect(container.querySelectorAll('button:disabled').length).toBe(2);
        expect(container.querySelectorAll('button:not(:disabled)').length).toBe(0);
    });

    it('renders min value by default', () => {
        const { container } = render(StepperArray, {
            props: {
                options: options.strings
            }
        });
        expect(container.querySelector('button:first-child')).not.toHaveAttribute('aria-disabled', 'true');
        expect(container.querySelector('button:last-child')).toHaveAttribute('aria-disabled', 'true');
    });

    it('renders when min value', () => {
        const { container } = render(StepperArray, {
            props: {
                value: options.objects[0],
                options: options.objects
            }
        });
        expect(container.querySelector('button:first-child')).not.toHaveAttribute('aria-disabled', 'true');
        expect(container.querySelector('button:last-child')).toHaveAttribute('aria-disabled', 'true');
    });

    it('renders when max value', () => {
        const { container } = render(StepperArray, {
            props: {
                value: options.objects[1],
                options: options.objects
            }
        });
        expect(container.querySelector('button:first-child')).toHaveAttribute('aria-disabled', 'true');
        expect(container.querySelector('button:last-child')).not.toHaveAttribute('aria-disabled', 'true');
    });

    test.each(['numbers', 'strings', 'objects'])(
        'with %s as options, fires "change" event on minus/plus click',
        async key => {
            const { container, component } = render(StepperArray, {
                props: {
                    options: options[key],
                    value: options[key][1]
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
                        value: options[key][0],
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
                        value: options[key][1],
                        position: { x: 0, y: 0 },
                        nonDefault: true
                    }
                })
            );
        }
    );
});
