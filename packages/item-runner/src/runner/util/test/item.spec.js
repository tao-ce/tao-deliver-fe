// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../../item/parser/itemDataParser.js');

import {
    getInteractionsStates,
    isItemAnswered,
    isItemPartiallyAnswered,
    isItemValid,
    isItemPartiallyValid,
    isItemWithoutInteractions,
    isItemResponseTooLong,
    reduceItemStateToState,
    isStateChanged
} from '../item.js';

describe('getInteractionsStates', () => {
    it('returns an empty state when the item is not defined', () => {
        expect(getInteractionsStates({})).toEqual({});
    });

    test.each([
        [{ RESPONSE: { response: { base: { string: 'hello' } } } }, { RESPONSE: { answered: true, valid: true } }],
        [{ RESPONSE: { response: { base: { string: null } } } }, { RESPONSE: { answered: false, valid: true } }],
        [
            { RESPONSE: { response: { base: { string: null } }, validity: false } },
            { RESPONSE: { answered: false, valid: false } }
        ],
        [
            {
                RESPONSE: { response: { list: { identifier: [] } }, validity: false },
                RESPONSE_1: { response: { base: { float: 1.5 } } }
            },
            {
                RESPONSE: { answered: false, valid: false },
                RESPONSE_1: { answered: true, valid: true }
            }
        ],
        [
            {
                RESPONSE: {
                    response: { base: { string: null } },
                    validity: false,
                    count: { maxCharLimitExceeded: true }
                }
            },
            { RESPONSE: { answered: false, valid: false, tooLong: true } }
        ]
    ])('get the correct states from the store', (state, expected) => {
        expect(getInteractionsStates(state)).toMatchObject(expected);
    });
});

describe('isItemAnswered', () => {
    it('returns false if the item is not defined', () => {
        expect(isItemAnswered({})).toBe(false);
    });

    test.each([
        [{ RESPONSE: { response: { base: { string: 'hello' } } } }, true],
        [{ RESPONSE: { response: { base: { string: null } } } }, false],
        [
            {
                RESPONSE: { response: { list: { identifier: [] } } },
                RESPONSE_1: { response: { base: { float: 1.5 } } }
            },
            false
        ],
        [
            {
                RESPONSE: { response: { list: { identifier: ['choice1'] } } },
                RESPONSE_1: { response: { base: { float: 1.5 } } }
            },
            true
        ]
    ])('check if the item is answered from the store', (state, expected) => {
        expect(isItemAnswered(state)).toBe(expected);
    });
});

describe('isItemPartiallyAnswered', () => {
    it('returns false if the item is not defined', () => {
        expect(isItemPartiallyAnswered({})).toBe(false);
    });

    test.each([
        [{ RESPONSE: { response: { base: { string: 'hello' } } } }, true],
        [{ RESPONSE: { response: { base: { string: null } } } }, false],
        [
            {
                RESPONSE: { response: { list: { identifier: [] } } },
                RESPONSE_1: { response: { base: { float: 1.5 } } }
            },
            true
        ],
        [
            {
                RESPONSE: { response: { list: { identifier: ['choice1'] } } },
                RESPONSE_1: { response: { base: { float: 1.5 } } }
            },
            true
        ]
    ])('check if the item is partially answered from the store', (state, expected) => {
        expect(isItemPartiallyAnswered(state)).toBe(expected);
    });
});

describe('isItemValid', () => {
    it('returns true if the item is not defined', () => {
        expect(isItemValid({})).toBe(true);
    });

    test.each([
        [{ RESPONSE: { response: {} } }, true],
        [{ RESPONSE: { response: {}, validity: false } }, false],
        [
            {
                RESPONSE: { response: {}, validity: true },
                RESPONSE_1: { response: {}, validity: false }
            },
            false
        ],
        [
            {
                RESPONSE: { response: {}, validity: true },
                RESPONSE_1: { response: {} }
            },
            true
        ]
    ])('check if the item is valid from the store', (state, expected) => {
        expect(isItemValid(state)).toBe(expected);
    });
});

describe('isItemPartiallyValid', () => {
    it('returns true if the item is not defined', () => {
        expect(isItemPartiallyValid({})).toBe(true);
    });

    test.each([
        [{ RESPONSE: { response: {} } }, true],
        [{ RESPONSE: { response: {}, validity: false } }, false],
        [
            {
                RESPONSE: { response: {}, validity: true },
                RESPONSE_1: { response: {}, validity: false }
            },
            true
        ],
        [
            {
                RESPONSE: { response: {}, validity: false },
                RESPONSE_1: { response: {}, validity: false }
            },
            false
        ]
    ])('check if the item is partially valid from the store', (state, expected) => {
        expect(isItemPartiallyValid(state)).toBe(expected);
    });
});

describe('isItemWithoutInteractions', () => {
    it('returns true if the item is not defined', () => {
        expect(isItemWithoutInteractions({})).toBe(true);
    });

    test.each([
        [{}, true],
        [{ RESPONSE: { response: {} } }, false],
        [
            {
                RESPONSE: { response: {} },
                RESPONSE_1: { response: {} }
            },
            false
        ]
    ])('check if the item has no interactions', (state, expected) => {
        expect(isItemWithoutInteractions(state)).toBe(expected);
    });
});

describe('isItemResponseTooLong', () => {
    it('returns false if the item is not defined', () => {
        expect(isItemResponseTooLong({})).toBe(false);
    });

    test.each([
        [{ RESPONSE: { response: {} } }, false],
        [{ RESPONSE: { response: {}, count: { maxCharLimitExceeded: true } } }, true],
        [
            {
                RESPONSE: { response: {}, count: { maxCharLimitExceeded: false } },
                RESPONSE_1: { response: {}, count: { maxCharLimitExceeded: true } }
            },
            true
        ],
        [
            {
                RESPONSE: { response: {} },
                RESPONSE_1: { response: {}, count: { maxCharLimitExceeded: false } }
            },
            false
        ]
    ])('check if the item state is flagged as too long', (state, expected) => {
        expect(isItemResponseTooLong(state)).toBe(expected);
    });
});

describe('reduceItemStateToState', () => {
    it('should return original object when itemState is falsy', () => {
        const result = reduceItemStateToState(null);
        expect(result).toEqual(null);
    });

    it('should return new state with valid state properties', () => {
        const itemState = {
            response1: {
                state: { foo: 'bar' }
            },
            response2: {
                state: null
            },
            response3: {}
        };
        const expectedState = {
            response1: {
                state: { foo: 'bar' }
            }
        };
        const result = reduceItemStateToState(itemState);
        expect(result).toEqual(expectedState);
    });

    it('should return empty object when all itemState properties are invalid', () => {
        const itemState = {
            response1: {
                state: null
            },
            response2: {
                state: void 0
            },
            response3: {}
        };
        const result = reduceItemStateToState(itemState);
        expect(result).toEqual({});
    });
});

describe('isStateChanged', () => {
    it('should return false when both states are null', () => {
        const result = isStateChanged(null, null);
        expect(result).toBe(false);
    });

    it('should return false when both states are equivalent', () => {
        const stateOne = {
            response1: {
                state: { foo: 'bar' }
            },
            response2: {
                state: null
            },
            response3: {}
        };
        const stateTwo = {
            response1: {
                state: { foo: 'bar' }
            },
            response2: {
                state: null
            },
            response3: {}
        };
        const result = isStateChanged(stateOne, stateTwo);
        expect(result).toBe(false);
    });

    it('should return true when states are different', () => {
        const stateOne = {
            response1: {
                state: { foo: 'bar' }
            },
            response2: {
                state: null
            },
            response3: {}
        };
        const stateTwo = {
            response1: {
                state: { foo: 'bar' }
            },
            response2: {
                state: { foo: 'baz' }
            },
            response3: {}
        };
        const result = isStateChanged(stateOne, stateTwo);
        expect(result).toBe(true);
    });

    it('should not ignore extra properties in the state objects', () => {
        const stateOne = {
            response1: {
                state: { foo: 'bar' }
            },
            response2: {
                state: null
            },
            response3: {}
        };
        const stateTwo = {
            response1: {
                state: { foo: 'bar' }
            },
            response2: {
                state: null
            },
            response3: {},
            response4: {
                state: { foo: 'bar' }
            }
        };
        const result = isStateChanged(stateOne, stateTwo);
        expect(result).toBe(true);
    });
});
