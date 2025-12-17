// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * @param {Array} choiceOptions
 * @param {(item: any) => boolean} fixedCheckFn
 * @returns {{result: any[], newOrder: number[]}}
 */
function shuffle(choiceOptions, fixedCheckFn) {
    const itemIndexesToShuffle = [];

    choiceOptions.forEach((item, index) => {
        if (!fixedCheckFn(item)) {
            itemIndexesToShuffle.push(index);
        }
    });

    const shuffledItemIndexes = itemIndexesToShuffle.sort(() => Math.random() - 0.5);
    const result = [];

    const newOrder = choiceOptions.map((choice, index) => {
        if (fixedCheckFn(choice)) {
            result.push(choice);
            return index;
        }

        const newIndex = shuffledItemIndexes.shift();
        result.push(choiceOptions[newIndex]);
        return newIndex;
    });

    return { result, newOrder };
}

/**
 * Shuffles choice options array while keeping fixed items in place
 * and saves new order in the itemStateStore
 * @param {Array} choiceOptions
 * @param {Store & {setOptionsOrder: function(number[]): void, getOptionsOrder: function(void): number[]}} interactionStateStore
 * @param {(item: any) => boolean} [fixedCheckFn] - function that defines fixed state
 * @returns {Array}
 */
export default function shuffleChoiceOptions(choiceOptions, interactionStateStore, fixedCheckFn = item => item.fixed) {
    choiceOptions = choiceOptions || [];
    let order = interactionStateStore.getOptionsOrder();
    if (order && validateOptionsOrder(order, choiceOptions)) {
        return orderOptions(choiceOptions, order);
    }

    let { result, newOrder } = shuffle(choiceOptions, fixedCheckFn);

    if (!validateOptionsOrder(newOrder, choiceOptions)) {
        newOrder = fixOptionsOrder(newOrder, choiceOptions);
    }
    interactionStateStore.setOptionsOrder(newOrder);

    return result;
}

/**
 * Returns options according to provided order
 * @param {{}[]} choiceOptions
 * @param {number[]} optionsOrder
 * @returns {{}[]} - ordered options
 */
function orderOptions(choiceOptions, optionsOrder) {
    return optionsOrder.map(index => choiceOptions[index]);
}

/**
 * @param {{ fixed?: Boolean }[][]} choiceOptions
 * @param {Store & {setOptionsOrder: function(number[]): void, getOptionsOrder: function(void): number[][]}} interactionStateStore
 * @param {(item: any) => boolean} [fixedCheckFn] - function that defines fixed state
 * @returns {any[][]}
 */
export function shuffleChoicesTable(choiceOptions, interactionStateStore, fixedCheckFn = item => item.fixed) {
    choiceOptions = choiceOptions || [[]];
    const order = interactionStateStore.getOptionsOrder();
    if (order && validateOptionsOrder(order, choiceOptions)) {
        return choiceOptions.map((choicesRow, index) => orderOptions(choicesRow, order[index]));
    }

    let resultTable = [];
    let newOrderTable = [];
    choiceOptions.forEach(choicesRow => {
        const { result, newOrder } = shuffle(choicesRow, fixedCheckFn);
        resultTable.push(result);
        newOrderTable.push(newOrder);
    });

    if (!validateOptionsOrder(newOrderTable, choiceOptions)) {
        newOrderTable = fixOptionsOrder(newOrderTable, choiceOptions);
    }

    interactionStateStore.setOptionsOrder(newOrderTable);

    return resultTable;
}

/**
 * Validates that the order array matches the options array requirements
 * Works with both single row (number[]) and table (number[][]) formats
 * @param {number[]|number[][]} order - Array of indices or array of arrays of indices
 * @param {any[]|any[][]} options - Array of items or array of arrays of items
 * @returns {boolean} - True if order is valid, false otherwise
 */
export function validateOptionsOrder(order, options) {
    if (!Array.isArray(order) || !Array.isArray(options)) {
        return false;
    }

    // Handle single row case (number[])
    if (!Array.isArray(options[0])) {
        if (order.length !== options.length) {
            return false;
        }

        if (order.some(index => index < 0 || index >= options.length)) {
            return false;
        }

        const uniqueIndices = new Set(order);
        return uniqueIndices.size === order.length;
    }

    // Handle table case (number[][])
    if (order.length !== options.length) {
        return false;
    }

    return order.every((rowOrder, rowIndex) => {
        const optionsRow = options[rowIndex] || [];

        if (!Array.isArray(rowOrder)) {
            return false;
        }

        if (rowOrder.length !== optionsRow.length) {
            return false;
        }

        if (rowOrder.some(index => index < 0 || index >= optionsRow.length)) {
            return false;
        }

        const uniqueIndices = new Set(rowOrder);
        return uniqueIndices.size === rowOrder.length;
    });
}

/**
 * Creates sequential array of indices
 * @param {number} length
 * @returns {number[]}
 */
function createSequentialIndices(length) {
    return Array.from({ length }, (_, i) => i);
}

/**
 * Corrects the order array to match the number of items in options
 * Works with both single row (number[]) and table (number[][]) formats
 * @param {number[]|number[][]} order - Array of indices or array of arrays of indices
 * @param {any[]|any[][]} options - Array of items or array of arrays of items
 * @returns {number[]|number[][]} - Corrected order array
 */
export function fixOptionsOrder(order, options) {
    // Handle invalid input cases
    if (!Array.isArray(order) || !Array.isArray(options)) {
        // Create default sequential indices
        if (!Array.isArray(options[0])) {
            return createSequentialIndices(options.length);
        }
        return options.map(row => createSequentialIndices(row.length));
    }

    // Handle single row case (number[])
    if (!Array.isArray(order[0])) {
        // Remove negative values
        let fixedOrder = order.filter(index => index >= 0 && index < options.length);

        if (fixedOrder.length < options.length) {
            const existingIndices = new Set(fixedOrder);
            for (let i = 0; i < options.length; i++) {
                if (!existingIndices.has(i)) {
                    fixedOrder.push(i);
                }
            }
        }

        return fixedOrder;
    }

    // Handle table case (number[][])
    return order.map((rowOrder, rowIndex) => {
        const optionsRow = options[rowIndex] || [];

        if (!Array.isArray(rowOrder)) {
            return createSequentialIndices(optionsRow.length);
        }

        // Remove negative values
        let fixedOrder = rowOrder.filter(index => index >= 0 && index < optionsRow.length);

        if (fixedOrder.length < optionsRow.length) {
            const existingIndices = new Set(fixedOrder);
            for (let i = 0; i < optionsRow.length; i++) {
                if (!existingIndices.has(i)) {
                    fixedOrder.push(i);
                }
            }
        }

        return fixedOrder;
    });
}
