// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import shuffleChoiceOptions, { shuffleChoicesTable, validateOptionsOrder, fixOptionsOrder } from '../shuffleChoices.js';

/**
 * Generate test choice options
 * @param {Number} n
 * @param {Function} tpl - mapper function
 * @returns {Array}
 */
function generateItems(n = 100, tpl = item => ({ id: item + Date.now(), fixed: false })) {
    return [...Array(n).keys()].map(tpl);
}

describe('Shuffling utils', () => {
    // Maps shuffled array to it indexes order
    const getIndexesOrder = (shuffledItems, originalItems) =>
        shuffledItems.map(shuffledItem => originalItems.findIndex(item => shuffledItem.id === item.id));

    const getOptionsOrder = vi.fn();
    const setOptionsOrder = vi.fn();
    const itemStateStore = {
        getOptionsOrder,
        setOptionsOrder
    };

    afterEach(() => {
        getOptionsOrder.mockReset();
        setOptionsOrder.mockReset();
    });

    describe('shuffleChoiceOptions', () => {
        it('should return an empty array when no choice options are provided', () => {
            const result = shuffleChoiceOptions(null, itemStateStore);
            expect(result).toEqual([]);
        });

        it('should return the same array when all choice options are fixed', () => {
            const choiceOptions = generateItems(100, item => ({ id: item, fixed: true }));
            const result = shuffleChoiceOptions(choiceOptions, itemStateStore);
            expect(result).toEqual(choiceOptions);
        });

        it('should not return the same array when no choice options are fixed', () => {
            const choiceOptions = generateItems();
            const result = shuffleChoiceOptions(choiceOptions, itemStateStore);
            expect(JSON.stringify(result)).not.toBe(JSON.stringify(choiceOptions));
        });

        it('should shuffle the non-fixed choice options', () => {
            const choiceOptions = [{ id: 101, fixed: true }, ...generateItems()];
            const result = shuffleChoiceOptions(choiceOptions, itemStateStore);
            expect(result[0]).toEqual(choiceOptions[0]); // Fixed item should remain unchanged
            expect(result.slice(1)).not.toEqual(choiceOptions.slice(1)); // Non-fixed items should be shuffled
        });

        it('should handle a custom fixedCheckFn correctly', () => {
            const choiceOptions = [{ id: 101, isFixed: true }, ...generateItems()];
            const customFixedCheckFn = item => item.isFixed === true;
            const result = shuffleChoiceOptions(choiceOptions, itemStateStore, customFixedCheckFn);
            expect(result[0]).toEqual(choiceOptions[0]); // Fixed item should remain unchanged
            expect(JSON.stringify(result.slice(1))).not.toBe(JSON.stringify(choiceOptions.slice(1))); // Non-fixed items should be shuffled
        });

        it('should call getOptionsOrder to use existing order before shuffling', () => {
            // Prepare
            getOptionsOrder.mockImplementation(() => [4, 2, 0, 1, 3]);
            const items = generateItems(5);

            // Run
            const result = shuffleChoiceOptions(items, itemStateStore);

            expect(getOptionsOrder).toHaveBeenCalled();
            expect(getIndexesOrder(result, items)).toEqual([4, 2, 0, 1, 3]);
        });

        it('should call setOptionsOrder to save generated order', () => {
            const items = generateItems(5);

            // Run
            const result = shuffleChoiceOptions([], itemStateStore);

            expect(setOptionsOrder).toHaveBeenCalled();
            const savedOrder = setOptionsOrder.mock.calls[0][0];
            expect(getIndexesOrder(result, items)).toEqual(savedOrder);
        });
    });

    describe('shuffleChoicesTable', () => {
        it('should return an array of empty array when no choice options are provided', () => {
            const result = shuffleChoicesTable(null, itemStateStore);
            expect(result[0]).toEqual([]);
            expect(result).toHaveLength(1);
        });

        it('should return the same array when all choice options are fixed', () => {
            const choiceOptions = [
                generateItems(50, item => ({ id: item, fixed: true })),
                generateItems(50, item => ({ id: item, fixed: true }))
            ];
            const result = shuffleChoicesTable(choiceOptions, itemStateStore);
            expect(result).toEqual(choiceOptions);
        });

        it('should not return the same array when no choice options are fixed', () => {
            const choiceOptions = [generateItems(), generateItems()];
            const result = shuffleChoicesTable(choiceOptions, itemStateStore);
            expect(JSON.stringify(result)).not.toBe(JSON.stringify(choiceOptions));
        });

        it('should shuffle the non-fixed choice options', () => {
            const choiceOptions = [
                [...generateItems(49), { id: 50, fixed: true }, ...generateItems(50)],
                [...generateItems(34), { id: 35, fixed: true }, ...generateItems(35)]
            ];
            const result = shuffleChoicesTable(choiceOptions, itemStateStore);
            // Fixed item should remain unchanged
            expect(result[0][49]).toEqual(choiceOptions[0][49]);
            expect(result[1][34]).toEqual(choiceOptions[1][34]);
            // Non-fixed items should be shuffled
            expect(result).not.toEqual(choiceOptions);
        });

        it('should handle a custom fixedCheckFn correctly', () => {
            const choiceOptions = [
                [{ id: 101, isFixed: true }, ...generateItems(50)],
                [{ id: 201, isFixed: true }, ...generateItems(50)]
            ];
            const customFixedCheckFn = item => item.isFixed === true;
            const result = shuffleChoicesTable(choiceOptions, itemStateStore, customFixedCheckFn);
            // Fixed items  should remain unchanged
            expect(result[0][0]).toEqual(choiceOptions[0][0]);
            expect(result[1][0]).toEqual(choiceOptions[1][0]);
            // Non-fixed items should be shuffled
            expect(result).not.toEqual(choiceOptions);
        });

        it('should call getOptionsOrder to use existing order before shuffling', () => {
            // Prepare
            getOptionsOrder.mockImplementation(() => [
                [4, 2, 0, 1, 3],
                [3, 1, 2, 0, 4]
            ]);
            const items = [generateItems(5), generateItems(5)];

            // Run
            const result = shuffleChoicesTable(items, itemStateStore);
            const restoredIndexesOrder = result.map((row, index) => getIndexesOrder(row, items[index]));

            expect(getOptionsOrder).toHaveBeenCalled();
            expect(restoredIndexesOrder).toEqual([
                [4, 2, 0, 1, 3],
                [3, 1, 2, 0, 4]
            ]);
        });

        it('should call setOptionsOrder to save generated order', () => {
            const items = [generateItems(5), generateItems(5)];

            // Run
            const result = shuffleChoicesTable([[]], itemStateStore);
            const restoredIndexesOrder = result.map((row, index) => getIndexesOrder(row, items[index]));

            expect(setOptionsOrder).toHaveBeenCalled();
            const savedOrder = setOptionsOrder.mock.calls[0][0];
            expect(restoredIndexesOrder).toEqual(savedOrder);
        });
    });

    describe('validateOptionsOrder', () => {
        describe('single row validation', () => {
            it('should validate correct order', () => {
                const order = [2, 0, 1, 3];
                const options = ['a', 'b', 'c', 'd'];
                expect(validateOptionsOrder(order, options)).toBe(true);
            });

            it('should fail when order length is greater than options', () => {
                const order = [2, 0, 1, 3, 4];
                const options = ['a', 'b', 'c', 'd'];
                expect(validateOptionsOrder(order, options)).toBe(false);
            });

            it('should fail when order length is less than options', () => {
                const order = [2, 0, 1];
                const options = ['a', 'b', 'c', 'd'];
                expect(validateOptionsOrder(order, options)).toBe(false);
            });

            it('should fail when order contains negative numbers', () => {
                const order = [2, -1, 1, 3];
                const options = ['a', 'b', 'c', 'd'];
                expect(validateOptionsOrder(order, options)).toBe(false);
            });

            it('should fail when order contains duplicate indices', () => {
                const order = [2, 2, 1, 3];
                const options = ['a', 'b', 'c', 'd'];
                expect(validateOptionsOrder(order, options)).toBe(false);
            });
        });

        describe('table validation', () => {
            it('should validate correct table order', () => {
                const order = [
                    [1, 0],
                    [2, 1, 0]
                ];
                const options = [
                    ['a', 'b'],
                    ['x', 'y', 'z']
                ];
                expect(validateOptionsOrder(order, options)).toBe(true);
            });

            it('should fail when row order length is greater than options', () => {
                const order = [
                    [1, 0, 2],
                    [2, 1, 0]
                ];
                const options = [
                    ['a', 'b'],
                    ['x', 'y', 'z']
                ];
                expect(validateOptionsOrder(order, options)).toBe(false);
            });

            it('should fail when row order length is less than options', () => {
                const order = [[1], [2, 1, 0]];
                const options = [
                    ['a', 'b'],
                    ['x', 'y', 'z']
                ];
                expect(validateOptionsOrder(order, options)).toBe(false);
            });

            it('should fail when row order contains negative numbers', () => {
                const order = [
                    [1, -1],
                    [2, 1, 0]
                ];
                const options = [
                    ['a', 'b'],
                    ['x', 'y', 'z']
                ];
                expect(validateOptionsOrder(order, options)).toBe(false);
            });

            it('should fail when row order contains duplicate indices', () => {
                const order = [
                    [1, 1],
                    [2, 1, 0]
                ];
                const options = [
                    ['a', 'b'],
                    ['x', 'y', 'z']
                ];
                expect(validateOptionsOrder(order, options)).toBe(false);
            });
        });
    });

    describe('fixOptionsOrder', () => {
        describe('single row fixing', () => {
            it('should fix order with extra indices', () => {
                const order = [2, 0, 1, 3, 4];
                const options = ['a', 'b', 'c', 'd'];
                const fixed = fixOptionsOrder(order, options);
                expect(fixed).toHaveLength(4);
                expect(validateOptionsOrder(fixed, options)).toBe(true);
            });

            it('should fix order with missing indices', () => {
                const order = [2, 0];
                const options = ['a', 'b', 'c', 'd'];
                const fixed = fixOptionsOrder(order, options);
                expect(fixed).toHaveLength(4);
                expect(validateOptionsOrder(fixed, options)).toBe(true);
            });

            it('should fix order with negative numbers', () => {
                const order = [2, -1, 1, 3];
                const options = ['a', 'b', 'c', 'd'];
                const fixed = fixOptionsOrder(order, options);
                expect(fixed).toHaveLength(4);
                expect(validateOptionsOrder(fixed, options)).toBe(true);
            });

            it('should fix invalid order to sequential indices', () => {
                const order = null;
                const options = ['a', 'b', 'c'];
                const fixed = fixOptionsOrder(order, options);
                expect(fixed).toEqual([0, 1, 2]);
            });
        });

        describe('table fixing', () => {
            it('should fix table order with extra indices', () => {
                const order = [
                    [1, 0, 2],
                    [2, 1, 0, 3]
                ];
                const options = [
                    ['a', 'b'],
                    ['x', 'y', 'z']
                ];
                const fixed = fixOptionsOrder(order, options);
                expect(fixed[0]).toHaveLength(2);
                expect(fixed[1]).toHaveLength(3);
                expect(validateOptionsOrder(fixed, options)).toBe(true);
            });

            it('should fix table order with missing indices', () => {
                const order = [[1], [2, 1]];
                const options = [
                    ['a', 'b'],
                    ['x', 'y', 'z']
                ];
                const fixed = fixOptionsOrder(order, options);
                expect(fixed[0]).toHaveLength(2);
                expect(fixed[1]).toHaveLength(3);
                expect(validateOptionsOrder(fixed, options)).toBe(true);
            });

            it('should fix table order with negative numbers', () => {
                const order = [
                    [1, -1],
                    [2, -1, 0]
                ];
                const options = [
                    ['a', 'b'],
                    ['x', 'y', 'z']
                ];
                const fixed = fixOptionsOrder(order, options);
                expect(validateOptionsOrder(fixed, options)).toBe(true);
            });

            it('should fix invalid table order to sequential indices', () => {
                const order = null;
                const options = [
                    ['a', 'b'],
                    ['x', 'y', 'z']
                ];
                const fixed = fixOptionsOrder(order, options);
                expect(fixed).toEqual([
                    [0, 1],
                    [0, 1, 2]
                ]);
            });

            it('should fix table order with invalid rows to sequential indices', () => {
                const order = [[1, 0], null];
                const options = [
                    ['a', 'b'],
                    ['x', 'y', 'z']
                ];
                const fixed = fixOptionsOrder(order, options);
                expect(fixed).toEqual([
                    [1, 0],
                    [0, 1, 2]
                ]);
            });
        });
    });
});
