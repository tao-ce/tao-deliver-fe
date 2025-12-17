// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import useArrowKeys from '../arrowKeys.js';

const createDomFixture = () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    return div;
};

describe('arrowKeys action', () => {
    it("forwards arrow up presses as 'arrowup' event", () => {
        const arrowUpListener = vi.fn();
        const domFixture = createDomFixture();
        useArrowKeys(domFixture);
        domFixture.addEventListener('arrowup', arrowUpListener);

        const pressUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        domFixture.dispatchEvent(pressUpEvent);
        expect(arrowUpListener).toBeCalled();
    });

    it("forwards arrow down presses as 'arrowdown' event", () => {
        const arrowDownListener = vi.fn();
        const domFixture = createDomFixture();
        useArrowKeys(domFixture);
        domFixture.addEventListener('arrowdown', arrowDownListener);

        const pressUpEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        domFixture.dispatchEvent(pressUpEvent);
        expect(arrowDownListener).toBeCalled();
    });

    it("removes 'keydown' event listener on destroy() call", () => {
        const arrowUpListener = vi.fn();
        const arrowDownListener = vi.fn();
        const domFixture = createDomFixture();
        const arrowKeys = useArrowKeys(domFixture);

        domFixture.addEventListener('arrowup', arrowUpListener);
        domFixture.addEventListener('arrowdown', arrowDownListener);

        arrowKeys.destroy();

        const pressUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        domFixture.dispatchEvent(pressUpEvent);
        expect(arrowUpListener).not.toBeCalled();

        const pressDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        domFixture.dispatchEvent(pressDownEvent);
        expect(arrowDownListener).not.toBeCalled();
    });
});
