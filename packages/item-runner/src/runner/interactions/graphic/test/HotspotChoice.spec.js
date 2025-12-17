// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import HotspotChoice from '../HotspotChoice.svelte';

//mock getBBox for <text> rendering
const originalGetBBox = SVGElement.prototype.getBBox;
beforeEach(() => {
    SVGElement.prototype.getBBox = () => ({ x: 1, y: 1, width: 1, height: 1 });
});
afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

describe('HotspotChoice component', () => {
    const key = 'key';
    const shape = 'circle';
    const coords = '10,10,5';
    const label = 'label';
    const ariaLabel = 'ariaLabel';

    describe('rendering', () => {
        it('renders with basic props', () => {
            const { container } = render(HotspotChoice, { props: { key, shape, coords, label, ariaLabel } });
            expect(container).toMatchSnapshot();
        });

        it('renders with selected true', () => {
            const { container } = render(HotspotChoice, {
                props: { key, shape, coords, label, ariaLabel, selected: true }
            });
            expect(container.querySelector('.selected')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('renders with disabled true', () => {
            const { container } = render(HotspotChoice, {
                props: { key, shape, coords, label, ariaLabel, disabled: true }
            });
            expect(container.querySelector('.disabled')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });
        it('renders in targetable state', () => {
            const { container } = render(HotspotChoice, {
                props: { key, shape, coords, label, ariaLabel, targetable: true }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders in target state', () => {
            const { container } = render(HotspotChoice, {
                props: { key, shape, coords, label, ariaLabel, targeted: true }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders in activated state', () => {
            const { container } = render(HotspotChoice, {
                props: { key, shape, coords, label, ariaLabel, activated: true }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders scaled hotspot in hoverable state', () => {
            const { container } = render(HotspotChoice, {
                props: { key, shape, coords, label, ariaLabel, hoverable: true }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders hotspot with custom classes', () => {
            const { container } = render(HotspotChoice, {
                props: { key, shape, coords, label, ariaLabel, classes: 'inactive' }
            });
            expect(container).toMatchSnapshot();
        });
    });

    describe('events', () => {
        it('dispatches change event on click', () => {
            const { container, component } = render(HotspotChoice, { props: { key, shape, coords } });
            const fn = vi.fn();
            component.$on('change', fn);
            const groupEl = container.querySelector('.hotspot-choice > g');
            return fireEvent.click(groupEl).then(() => {
                expect(fn).toHaveBeenCalled();
            });
        });

        it.each(['Enter', 'Space'])('dispatches change event on %s keyup', keyName => {
            const { container, component } = render(HotspotChoice, { props: { key, shape, coords } });
            const fn = vi.fn();
            component.$on('change', fn);
            const groupEl = container.querySelector('.hotspot-choice > g');
            return fireEvent.keyUp(groupEl, { key: keyName }).then(() => {
                expect(fn).toHaveBeenCalled();
                expect(fn.mock.calls[0][0].detail).toMatchObject({ key });
            });
        });

        it('does not dispatch if disabled', () => {
            const { container, component } = render(HotspotChoice, { props: { key, shape, coords, disabled: true } });
            const fn = vi.fn();
            component.$on('change', fn);
            const groupEl = container.querySelector('.hotspot-choice > g');
            fireEvent.click(groupEl);
            fireEvent.keyUp(groupEl, { key: 'Space' });
            fireEvent.keyUp(groupEl, { key: 'Enter' });
            expect(fn).not.toHaveBeenCalled();
        });
    });
});
