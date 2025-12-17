// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import areaBrokerFactory from '../areaBroker.js';

function setupLayout() {
    const section = document.createElement('section');
    section.innerHTML = `
    <header>a</header>
    <main>b</main>
    <footer>c</footer>
 `;
    return section;
}

describe('area broker factory', () => {
    it('create an areaBroker with a container', () => {
        const container = setupLayout();
        const areaBroker = areaBrokerFactory(container);
        expect(areaBroker).not.toBeNull();
        expect(areaBroker).toHaveProperty('getContainer');
        expect(areaBroker).toHaveProperty('getArea');
    });

    it('get the container', () => {
        const container = setupLayout();
        const areaBroker = areaBrokerFactory(container);
        expect(areaBroker.getContainer()).toEqual(container);
    });

    it('set the areas', () => {
        const container = setupLayout();
        const header = container.querySelector('header');
        const footer = container.querySelector('footer');
        const areaBroker = areaBrokerFactory(container);

        expect(areaBroker.getArea('header')).toBeNull();

        areaBroker.setAreas({
            header,
            footer
        });

        expect(areaBroker.getArea('header')).toEqual(header);
        expect(areaBroker.getArea('footer')).toEqual(footer);
    });

    it('registers method aliases', () => {
        const container = setupLayout();
        const header = container.querySelector('header');
        const mainContent = container.querySelector('main');
        const footer = container.querySelector('footer');
        const areaBroker = areaBrokerFactory(container);

        expect(areaBroker).not.toHaveProperty('getHeaderArea');
        expect(areaBroker).not.toHaveProperty('getMainContentArea');
        expect(areaBroker).not.toHaveProperty('getFooterArea');
        expect(areaBroker).not.toHaveProperty('clearHeaderArea');
        expect(areaBroker).not.toHaveProperty('clearMainContentArea');
        expect(areaBroker).not.toHaveProperty('clearFooterArea');

        areaBroker.setAreas({
            header,
            mainContent,
            footer
        });

        expect(areaBroker).toHaveProperty('getHeaderArea');
        expect(areaBroker).toHaveProperty('getMainContentArea');
        expect(areaBroker).toHaveProperty('getFooterArea');
        expect(areaBroker).toHaveProperty('clearHeaderArea');
        expect(areaBroker).toHaveProperty('clearMainContentArea');
        expect(areaBroker).toHaveProperty('clearFooterArea');
        expect(areaBroker.getHeaderArea()).toEqual(header);
        expect(areaBroker.getMainContentArea()).toEqual(mainContent);
        expect(areaBroker.getFooterArea()).toEqual(footer);
    });

    it('unregisters method aliases on new set', () => {
        const container = setupLayout();
        const header = container.querySelector('header');
        const footer = container.querySelector('footer');
        const areaBroker = areaBrokerFactory(container);

        expect(areaBroker).not.toHaveProperty('getHeaderArea');
        expect(areaBroker).not.toHaveProperty('getFooterArea');
        expect(areaBroker).not.toHaveProperty('clearHeaderArea');
        expect(areaBroker).not.toHaveProperty('clearFooterArea');

        areaBroker.setAreas({
            header,
            footer
        });

        expect(areaBroker).toHaveProperty('getHeaderArea');
        expect(areaBroker).toHaveProperty('getFooterArea');
        expect(areaBroker).toHaveProperty('clearHeaderArea');
        expect(areaBroker).toHaveProperty('clearFooterArea');

        areaBroker.setAreas({
            he: header,
            fo: footer
        });

        expect(areaBroker).not.toHaveProperty('getHeaderArea');
        expect(areaBroker).not.toHaveProperty('getFooterArea');
        expect(areaBroker).not.toHaveProperty('clearHeaderArea');
        expect(areaBroker).not.toHaveProperty('clearFooterArea');
        expect(areaBroker).toHaveProperty('getHeArea');
        expect(areaBroker).toHaveProperty('getFoArea');
        expect(areaBroker).toHaveProperty('clearHeArea');
        expect(areaBroker).toHaveProperty('clearFoArea');
    });

    it('clears a single area', () => {
        const container = setupLayout();
        const header = container.querySelector('header');
        const main = container.querySelector('main');
        const footer = container.querySelector('footer');
        const areaBroker = areaBrokerFactory(container);

        areaBroker.setAreas({
            header,
            main,
            footer
        });

        expect(areaBroker.getHeaderArea().innerHTML).toEqual('a');
        expect(areaBroker.getMainArea().innerHTML).toEqual('b');
        expect(areaBroker.getFooterArea().innerHTML).toEqual('c');

        areaBroker.clearAreaContent('header');

        expect(areaBroker.getHeaderArea().innerHTML).toEqual('');
        expect(areaBroker.getMainArea().innerHTML).toEqual('b');
        expect(areaBroker.getFooterArea().innerHTML).toEqual('c');
    });

    it('clears a single area, by method alias', () => {
        const container = setupLayout();
        const header = container.querySelector('header');
        const main = container.querySelector('main');
        const footer = container.querySelector('footer');
        const areaBroker = areaBrokerFactory(container);

        areaBroker.setAreas({
            header,
            main,
            footer
        });

        expect(areaBroker.getHeaderArea().innerHTML).toEqual('a');
        expect(areaBroker.getMainArea().innerHTML).toEqual('b');
        expect(areaBroker.getFooterArea().innerHTML).toEqual('c');

        areaBroker.clearMainArea();

        expect(areaBroker.getHeaderArea().innerHTML).toEqual('a');
        expect(areaBroker.getMainArea().innerHTML).toEqual('');
        expect(areaBroker.getFooterArea().innerHTML).toEqual('c');
    });

    it('clears all named areas', () => {
        const container = setupLayout();
        const header = container.querySelector('header');
        const main = container.querySelector('main');
        const footer = container.querySelector('footer');
        const areaBroker = areaBrokerFactory(container);

        areaBroker.setAreas({
            header,
            main,
            footer
        });

        expect(areaBroker.getHeaderArea().innerHTML).toEqual('a');
        expect(areaBroker.getMainArea().innerHTML).toEqual('b');
        expect(areaBroker.getFooterArea().innerHTML).toEqual('c');

        areaBroker.clearAreasContent(['footer', 'header']);

        expect(areaBroker.getHeaderArea().innerHTML).toEqual('');
        expect(areaBroker.getMainArea().innerHTML).toEqual('b');
        expect(areaBroker.getFooterArea().innerHTML).toEqual('');
    });
});
