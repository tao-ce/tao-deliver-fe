// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import {
    isResponseDefault,
    isResponseValid,
    isMediaInteractionState,
    isStaticAudioIdentifier,
    isStaticVideoIdentifier,
    isExtendedTextInteractionResponseTooLong
} from '../interaction.js';

describe('isResponseDefault', () => {
    it('consider as default without a response', () => {
        expect(isResponseDefault('foo')).toBe(true);
    });

    test.each([
        [{ response: { base: { string: null } } }],
        [{ response: { base: { string: '' } } }],
        [{ response: { list: { identifier: [] } } }],
        [{ response: { list: { string: null } } }],
        [{ response: { list: { string: [] } } }],
        [{}]
    ])('is default value', response => {
        expect(isResponseDefault(response)).toBe(true);
    });

    test.each([
        [{ response: { base: { string: 'foo' } } }],
        [{ response: { base: { string: ' ' } } }],
        [{ response: { list: { identifier: ['a'] } } }],
        [{ response: { list: { string: ['b'] } } }]
    ])('is not default value', response => {
        expect(isResponseDefault(response)).toBe(false);
    });
});

describe('isResponseValid', () => {
    it('consider as valid without a response', () => {
        expect(isResponseValid('foo')).toBe(true);
    });

    test.each([
        [{}, true],
        [{ validity: true }, true],
        [{ validity: false }, false],
        [{ validity: void 0 }, true]
    ])('check validity', (value, expected) => {
        expect(isResponseValid(value)).toBe(expected);
    });
});

describe('isExtendedTextInteractionResponseTooLong', () => {
    test.each([
        [void 0, false],
        [{}, false],
        [{ count: void 0 }, false],
        [{ count: {} }, false],
        [{ count: { maxCharLimitExceeded: false } }, false],
        [{ count: { maxCharLimitExceeded: true } }, true],
        [{ count: { maxCharLimitExceeded: {} } }, false]
    ])('check if ExtendedText too long in state %s', (value, expected) => {
        expect(isExtendedTextInteractionResponseTooLong(value)).toBe(expected);
    });
});

describe('isMediaInteractionState', () => {
    test.each([
        [void 0, false],
        [null, false],
        [{}, false],
        [{ playsUsed: 0 }, true]
    ])('returns correct isMediaInteractionState for %s', (value, expected) => {
        expect(isMediaInteractionState(value)).toBe(expected);
    });
});

describe('isStaticAudioIdentifier', () => {
    it('should correctly identify static audio identifiers', () => {
        expect(isStaticAudioIdentifier(void 0)).toBe(false);
        expect(isStaticAudioIdentifier(null)).toBe(false);
        expect(isStaticAudioIdentifier('i12345')).toBe(false);
        expect(isStaticAudioIdentifier('static_audio_i12345')).toBe(true);
    });
});

describe('isStaticVideoIdentifier', () => {
    it('should correctly identify static video identifiers', () => {
        expect(isStaticVideoIdentifier(void 0)).toBe(false);
        expect(isStaticVideoIdentifier(null)).toBe(false);
        expect(isStaticVideoIdentifier('i12345')).toBe(false);
        expect(isStaticVideoIdentifier('static_video_i12345')).toBe(true);
    });
});
