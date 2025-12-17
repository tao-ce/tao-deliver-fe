// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import ariaHelperFactory from '../ariaHelper.js';

const choices = [{ key: 'c1' }, { key: 'c2' }, { key: 'c3', hotspotLabel: 'foobar' }];
const choiceKeysInTabOrder = ['c3', 'c2', 'c1'];

describe('API', () => {
    it('exports a function', () => {
        expect(typeof ariaHelperFactory).toBe('function');
    });

    it('the function returns an object with the methods', () => {
        const ariaHelper = ariaHelperFactory();
        expect(typeof ariaHelper).toBe('object');
        expect(typeof ariaHelper.getChoiceAriaLabel).toBe('function');
        expect(typeof ariaHelper.announceAdded).toBe('function');
        expect(typeof ariaHelper.announceRemoved).toBe('function');
    });
});

describe('getChoiceAriaLabel', () => {
    test.each([
        ['c1', 99, 'Unordered hotspot 3'],
        ['c3', 99, 'foobar Unordered hotspot 1'],
        ['c1', 44, 'Unordered hotspot 3']
    ])('generated correct label for unordered hotspots with key %s, nextPos %s', (key, nextIndex, expectedMsg) => {
        const ariaHelper = ariaHelperFactory();
        const choice = choices.find(c => c.key === key);
        const choiceOrder = void 0;
        const isSelected = false;
        const res = ariaHelper.getChoiceAriaLabel({ choice, choiceKeysInTabOrder, choiceOrder, nextIndex, isSelected });
        expect(res).toMatch(expectedMsg); // partial string ok for such a feature
        expect(res).toMatch(`Press enter or space to order to position ${nextIndex + 1}`);
    });

    test.each([
        ['c1', 5, 'Ordered hotspot 3. Position 5'],
        ['c3', 5, 'foobar Ordered hotspot 1. Position 5'],
        ['c1', 7, 'Ordered hotspot 3. Position 7']
    ])('generated correct label for ordered hotspots with key %s, number %s', (key, choiceOrder, expectedMsg) => {
        const ariaHelper = ariaHelperFactory();
        const choice = choices.find(c => c.key === key);
        const nextIndex = void 0;
        const isSelected = true;
        const res = ariaHelper.getChoiceAriaLabel({ choice, choiceKeysInTabOrder, choiceOrder, nextIndex, isSelected });
        expect(res).toMatch(expectedMsg); // partial string ok for such a feature
        expect(res).toMatch('Press enter or space to unorder');
    });

    test('generated correct label for unselectable unordered hotspot', () => {
        const ariaHelper = ariaHelperFactory();
        const choice = choices.find(c => c.key === 'c1');
        const res = ariaHelper.getChoiceAriaLabel({
            choice,
            choiceKeysInTabOrder,
            isSelected: false,
            selectable: false
        });
        expect(res).toMatch(
            'Unordered hotspot 3. Toggle button.  To move to next available hotspot, use the arrow keys.'
        );
    });
});

describe('aria-live functions', () => {
    test.each([
        ['c1', choiceKeysInTabOrder, 4, 'Hotspot 3 has been ordered to position 4'],
        ['c2', choiceKeysInTabOrder, 5, 'Hotspot 2 has been ordered to position 5'],
        ['c3', choiceKeysInTabOrder, 6, 'foobar Hotspot 1 has been ordered to position 6'],
        ['c1', choiceKeysInTabOrder, 7, 'Hotspot 3 has been ordered to position 7'],
        ['c1', void 0, 8, 'Hotspot 0 has been ordered to position 8']
    ])('announces added choice %s correctly', (key, tabOrder, choiceOrder, expectedMsg) => {
        const ariaHelper = ariaHelperFactory();
        const res = ariaHelper.announceAdded(key, choices, tabOrder, choiceOrder);
        expect(res.text).toMatch(expectedMsg); // partial string ok for such a feature
    });

    test.each([
        ['c1', choiceKeysInTabOrder, 'Ordered hotspot 3 has been unordered'],
        ['c2', choiceKeysInTabOrder, 'Ordered hotspot 2 has been unordered'],
        ['c3', choiceKeysInTabOrder, 'foobar Ordered hotspot 1 has been unordered'],
        ['c1', void 0, 'Ordered hotspot 0 has been unordered']
    ])('announces removed choice %s correctly', (key, tabOrder, expectedMsg) => {
        const ariaHelper = ariaHelperFactory();
        const res = ariaHelper.announceRemoved(key, choices, tabOrder);
        expect(res.text).toMatch(expectedMsg); // partial string ok for such a feature
    });
});
