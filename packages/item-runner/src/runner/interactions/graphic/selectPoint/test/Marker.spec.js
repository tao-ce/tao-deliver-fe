// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const originalGetBBox = SVGElement.prototype.getBBox;
const originalGetScreenCTM = SVGElement.prototype.getScreenCTM;
beforeEach(() => {
    SVGElement.prototype.getBBox = () => ({ x: 50, y: 50, width: 36, height: 58 });
    SVGElement.prototype.getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 500, f: 300 });
});
afterEach(() => {
    SVGElement.prototype.getBBox = originalGetBBox;
    SVGElement.prototype.getScreenCTM = originalGetScreenCTM;
});

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
//need to use helper component - rendering Marker alone fails sometimes due to root svg absence
import SvgWithMarker from './SvgWithMarker.svelte';

describe('Marker component', () => {
    describe('rendering', () => {
        it('renders with provided coords', () => {
            const { container } = render(SvgWithMarker, {
                props: {
                    coords: [0, 0],
                    imgWidth: 500,
                    imgHeight: 300
                }
            });
            expect(container.querySelector('.marker')).toMatchSnapshot();
        });

        it('renders in disabled state', () => {
            const { container } = render(SvgWithMarker, {
                props: {
                    coords: [100, 100],
                    disabled: true,
                    imgWidth: 500,
                    imgHeight: 300
                }
            });
            expect(container.querySelector('.marker')).toMatchSnapshot();
        });

        it('renders in selected state', () => {
            const { container } = render(SvgWithMarker, {
                props: {
                    coords: [0, 0],
                    selected: true,
                    imgWidth: 500,
                    imgHeight: 300
                }
            });
            expect(container.querySelector('.marker')).toMatchSnapshot();
        });
    });

    describe('events', () => {
        it('fires click event', () => {
            const key = 'somekey';
            const { container, component } = render(SvgWithMarker, {
                props: {
                    coords: [0, 0],
                    selected: true,
                    imgWidth: 500,
                    imgHeight: 300,
                    key
                }
            });
            const fn = vi.fn();
            component.$on('click', fn);
            return fireEvent.click(container.querySelector('.hitbox')).then(() => {
                expect(fn).toHaveBeenCalled();
                expect(fn.mock.calls[0][0].detail.key).toEqual(key);
            });
        });

        it('fires click event for short drags', () => {
            const key = 'somekey';
            const { container, component } = render(SvgWithMarker, {
                props: {
                    coords: [100, 100],
                    selected: true,
                    imgWidth: 500,
                    imgHeight: 300,
                    key
                }
            });
            const fnClick = vi.fn();
            const fnDragEnd = vi.fn();
            component.$on('click', fnClick);
            component.$on('dragEnd', fnDragEnd);
            fireEvent.mouseDown(container.querySelector('.hitbox'), { which: 1, clientX: 10, clientY: 10 });

            return tick().then(() => {
                fireEvent.mouseUp(window, { clientX: 12, clientY: 13 });
                expect(fnClick).toHaveBeenCalled();
                expect(fnDragEnd).not.toHaveBeenCalled();
            });
        });

        it('fires dragEnd event', () => {
            const key = 'somekey';
            const { container, component } = render(SvgWithMarker, {
                props: {
                    coords: [100, 100],
                    selected: true,
                    imgWidth: 500,
                    imgHeight: 300,
                    key
                }
            });
            const fn = vi.fn();
            component.$on('dragEnd', fn);
            fireEvent.mouseDown(container.querySelector('.hitbox'), { which: 1, clientX: 10, clientY: 10 });
            return new Promise(resolve => {
                setTimeout(() => {
                    fireEvent.mouseUp(window, { clientX: 12, clientY: 13 });
                    expect(fn).toHaveBeenCalled();
                    expect(fn.mock.calls[0][0].detail).toEqual({ key, x: 102, y: 103 });
                    resolve();
                }, 20);
            });
        });

        it('respects min constraints', () => {
            const key = 'somekey';
            const { container, component } = render(SvgWithMarker, {
                props: {
                    coords: [100, 100],
                    selected: true,
                    imgWidth: 500,
                    imgHeight: 300,
                    key
                }
            });
            const fn = vi.fn();
            component.$on('dragEnd', fn);
            fireEvent.mouseDown(container.querySelector('.hitbox'), { which: 1, clientX: 10, clientY: 10 });
            return new Promise(resolve => {
                setTimeout(() => {
                    fireEvent.mouseUp(window, { clientX: -150, clientY: -150 });
                    expect(fn).toHaveBeenCalled();
                    expect(fn.mock.calls[0][0].detail).toEqual({ key, x: 0, y: 0 });
                    resolve();
                }, 20);
            });
        });

        it('respects max constraints', () => {
            const key = 'somekey';
            const imgWidth = 500;
            const imgHeight = 300;
            const { container, component } = render(SvgWithMarker, {
                props: {
                    coords: [100, 100],
                    selected: true,
                    imgWidth,
                    imgHeight,
                    key
                }
            });
            const fn = vi.fn();
            component.$on('dragEnd', fn);
            fireEvent.mouseDown(container.querySelector('.hitbox'), { which: 1, clientX: 10, clientY: 10 });
            return new Promise(resolve => {
                setTimeout(() => {
                    fireEvent.mouseUp(window, { clientX: 1050, clientY: 1050 });
                    expect(fn).toHaveBeenCalled();
                    expect(fn.mock.calls[0][0].detail).toEqual({ key, x: imgWidth, y: imgHeight });
                    resolve();
                }, 20);
            });
        });

        it('fires click if not moved', () => {
            const key = 'somekey';
            const imgWidth = 500;
            const imgHeight = 300;
            const { container, component } = render(SvgWithMarker, {
                props: {
                    coords: [100, 100],
                    selected: true,
                    imgWidth,
                    imgHeight,
                    key
                }
            });
            const fnDragEnd = vi.fn();
            const fnClick = vi.fn();
            component.$on('dragEnd', fnDragEnd);
            component.$on('click', fnClick);
            return new Promise(resolve => {
                setTimeout(() => {
                    fireEvent.mouseDown(container.querySelector('.hitbox'), { which: 1, clientX: 10, clientY: 10 });
                    fireEvent.mouseUp(window, { clientX: 10, clientY: 10 });
                    expect(fnDragEnd).not.toHaveBeenCalled();
                    expect(fnClick).toHaveBeenCalled();
                    resolve();
                }, 20);
            });
        });

        it('events do not fire if disabled', () => {
            const key = 'somekey';
            const imgWidth = 500;
            const imgHeight = 300;
            const { container, component } = render(SvgWithMarker, {
                props: {
                    coords: [100, 100],
                    selected: true,
                    imgWidth,
                    imgHeight,
                    key,
                    disabled: true
                }
            });
            const fn = vi.fn();
            component.$on('dragEnd', fn);
            component.$on('click', fn);
            fireEvent.mouseDown(container.querySelector('.hitbox'), { which: 1, clientX: 10, clientY: 10 });
            fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });
            expect(fn).not.toHaveBeenCalled();
            fireEvent.click(container.querySelector('.hitbox'));
            expect(fn).not.toHaveBeenCalled();
        });

        it('fires focus events', () => {
            const key = 'somekey';
            const imgWidth = 500;
            const imgHeight = 300;
            const { container, component } = render(SvgWithMarker, {
                props: {
                    coords: [100, 100],
                    selected: true,
                    imgWidth,
                    imgHeight,
                    key
                }
            });
            const fnFocus = vi.fn();
            const fnBlur = vi.fn();
            component.$on('focus', fnFocus);
            component.$on('blur', fnBlur);
            fireEvent.focus(container.querySelector('.marker'));
            fireEvent.blur(container.querySelector('.marker'));
            expect(fnFocus).toHaveBeenCalled();
            expect(fnBlur).toHaveBeenCalled();
            expect(fnFocus.mock.calls[0][0].detail).toEqual({ key });
            expect(fnBlur.mock.calls[0][0].detail).toEqual({ key });
        });
    });
});
