// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../../util/polygon.js', async () => {
    const originalModule = await vi.importActual('../../util/polygon.js');
    return Object.assign({ __esModule: true }, originalModule, {
        getIsThin: vi.fn().mockReturnValue(false)
    });
});

import { fireEvent, render } from '@testing-library/svelte';
import AssociableHotspot from '../AssociableHotspot.svelte';
import dropAreaRegistryFactory from '../util/dropAreaRegistry.js';
import { getScaledCoords } from '../../util/scaling.js';

let staticProps = {
    identifier: 'item1',
    hotspotLabel: 'empty gap',
    areaKey: 'answer',
    dropareaRegistry: dropAreaRegistryFactory(),
    ariaLabel: 'put choice here',
    shape: 'rect',
    coords: '177,87,320,205'
};

let rootSvgEl;

describe('AssociableHotspot', () => {
    beforeEach(() => {
        rootSvgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        rootSvgEl.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', 'http://www.w3.org/1999/xlink');
    });

    describe('events', () => {
        it('fires click event', () => {
            const { container, component } = render(AssociableHotspot, { target: rootSvgEl, props: staticProps });
            const clickSpy = vi.fn();
            component.$on('click', clickSpy);

            fireEvent.click(container.querySelector('g.shape'));

            expect(clickSpy).toHaveBeenCalled();
            expect(clickSpy.mock.calls[0][0].detail).toEqual({
                key: staticProps.identifier
            });
        });

        test.each(['space', 'enter'])('fires keypress events for %s button', key => {
            const { container, component } = render(AssociableHotspot, { target: rootSvgEl, props: staticProps });
            const keypressSpy = vi.fn();
            component.$on('keySelect', keypressSpy);

            fireEvent.keyUp(container.querySelector('g.shape'), { key: key });

            expect(keypressSpy).toHaveBeenCalled();
            expect(keypressSpy.mock.calls[0][0].detail).toEqual({
                key: staticProps.identifier
            });

            fireEvent.keyDown(container.querySelector('g.shape'), { key: key });

            expect(keypressSpy).toHaveBeenCalled();
            expect(keypressSpy.mock.calls[0][0].detail).toEqual({
                key: staticProps.identifier
            });
        });

        it('fires hoverOver & hoverOut', () => {
            const { container, component } = render(AssociableHotspot, { target: rootSvgEl, props: staticProps });
            const hoverOverSpy = vi.fn();
            const hoverOutSpy = vi.fn();
            component.$on('hoverOver', hoverOverSpy);
            component.$on('hoverOut', hoverOutSpy);

            fireEvent.mouseEnter(container.querySelector('g.associable-hotspot'), {});

            expect(hoverOverSpy).toHaveBeenCalled();
            expect(hoverOverSpy.mock.calls[0][0].detail).toEqual({
                key: staticProps.identifier
            });
            expect(hoverOutSpy).not.toHaveBeenCalled();

            fireEvent.mouseLeave(container.querySelector('g.associable-hotspot'), {});

            expect(hoverOutSpy).toHaveBeenCalled();
            expect(hoverOutSpy.mock.calls[0][0].detail).toEqual({
                key: staticProps.identifier
            });
        });

        it('fires drop event', () => {
            const { container, component } = render(AssociableHotspot, { target: rootSvgEl, props: staticProps });
            const spyDrop = vi.fn();
            component.$on('drop', spyDrop);

            fireEvent.drop(container.querySelector('g.associable-hotspot'));
            expect(spyDrop).toHaveBeenCalled();
        });
    });

    describe('render', () => {
        it('renders hotspot without props', () => {
            const { container } = render(AssociableHotspot, { target: rootSvgEl });
            expect(container).toMatchSnapshot();
        });
        it('renders hotspot with minimal props', () => {
            const { container } = render(AssociableHotspot, { target: rootSvgEl, props: staticProps });
            expect(container).toMatchSnapshot();
        });
        it('renders disabled gap', () => {
            const { container } = render(
                AssociableHotspot,
                Object.assign({}, staticProps, {
                    disabled: true
                })
            );
            expect(container).toMatchSnapshot();
        });
        it('renders gap in active state', () => {
            const { container } = render(AssociableHotspot, {
                target: rootSvgEl,
                props: Object.assign({}, staticProps, {
                    targetable: true
                })
            });
            expect(container).toMatchSnapshot();
        });
        it('renders gap in target state', () => {
            const { container } = render(AssociableHotspot, {
                target: rootSvgEl,
                props: Object.assign({}, staticProps, {
                    targeted: true
                })
            });
            expect(container).toMatchSnapshot();
        });
        test.each([
            ['circle', '94,302,30'],
            ['ellipse', '373,22,23,8'],
            ['rect', '177,87,320,205'],
            ['poly', '49,402,49,408,41,408,39,421,48,424,48,429,60,429,59,402']
        ])('render %s shapes', (shape, coords) => {
            const { container } = render(AssociableHotspot, {
                target: rootSvgEl,
                props: Object.assign({}, staticProps, {
                    shape,
                    coords: getScaledCoords(coords, 1)
                })
            });

            expect(container).toMatchSnapshot();
        });
    });
});
