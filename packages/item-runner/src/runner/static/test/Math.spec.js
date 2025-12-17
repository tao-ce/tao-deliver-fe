// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import Math from '../Math.svelte';
import { getMathJax } from '../math/mathjax.js';

/**
 * Due to the math library loading mechanism,
 * multiple ticks are needed before being able to compare the results.
 * This function waits for N ticks.
 * @param {number} times - the number of tick()
 * @returns {Promise} resolves when the N tick() have been done
 */
function nthTick(times = 1) {
    return Array(times)
        .fill(tick)
        .reduce((acc, aTick) => acc.then(() => aTick()), Promise.resolve());
}

describe('Math', () => {
    // load library early
    beforeAll(() => getMathJax());

    it('renders the provided mathML correctly', () => {
        const { container } = render(Math, {
            props: {
                attributes: {
                    // x^2 + 4x + 4 = 0
                    mathML: `
                    <mrow>
                        <mrow>
                            <msup>
                                <mi>x</mi>
                                <mn>2</mn>
                            </msup>
                            <mo>+</mo>
                            <mrow>
                                <mn>4</mn>
                                <mo>&InvisibleTimes;</mo>
                                <mi>x</mi>
                            </mrow>
                            <mo>+</mo>
                            <mn>4</mn>
                        </mrow>
                        <mo>=</mo>
                        <mn>0</mn>
                    </mrow>`
                }
            }
        });

        return nthTick(5).then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('updates mathML on attributes change', () => {
        const { container, component } = render(Math, {
            props: {
                attributes: {
                    // x^2 = 0
                    mathML: `
                    <mrow>
                        <mrow>
                            <msup>
                                <mi>x</mi>
                                <mn>2</mn>
                            </msup>
                        </mrow>
                        <mo>=</mo>
                        <mn>0</mn>
                    </mrow>`
                }
            }
        });

        return nthTick(5)
            .then(() => {
                expect(container).toMatchSnapshot();

                return component.$set({
                    attributes: {
                        // cos sin a
                        mathML: `
                        <mrow>
                            <mi>cos</mi>
                            <mo>\u2061</mo>
                            <mi>sin</mi>
                            <mo>\u2061</mo>
                            <mi>a</mi>
                        </mrow>`
                    }
                });
            })
            .then(() => tick())
            .then(() => {
                expect(container).toMatchSnapshot();
            });
    });

    it('renders a block element if display block passed', () => {
        const { container } = render(Math, {
            props: { attributes: { display: 'block', mathML: '' } }
        });
        return nthTick(5).then(() => {
            const mathElement = container.querySelector('span');
            expect(mathElement.classList.contains('block')).toBe(true);
        });
    });

    it('renders data-serial if passed', () => {
        const { container } = render(Math, {
            props: { attributes: { mathML: '', dataAttrs: { 'data-serial': '123' } } }
        });
        return nthTick(5).then(() => {
            const mathElement = container.querySelector('span');
            expect(mathElement.dataset.serial).toBe('123');
        });
    });
});
