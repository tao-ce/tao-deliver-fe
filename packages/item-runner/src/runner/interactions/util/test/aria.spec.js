// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Tests the functionality of the exported helper methods in aria.js
 */
import { getReadableContent } from '../aria.js';

describe('aria API', () => {
    it('has expected API', () => {
        expect(typeof getReadableContent).toEqual('function');
    });

    it('returns expected types', () => {
        expect(typeof getReadableContent()).toEqual('string');
    });
});

describe('aria: getReadableContent', () => {
    it('empty case', () => {
        expect(getReadableContent('')).toEqual('');
    });

    it('preserves plain text', () => {
        expect(getReadableContent('my plain text')).toEqual('my plain text');
    });

    it('removes placeholders', () => {
        expect(getReadableContent('start {{i5f50a5ada918c}}{{i5f50a5ada918c}} middle {{i5f50a5ada918c}} end')).toEqual(
            'start  middle  end'
        );
    });

    it('removes tags', () => {
        expect(getReadableContent('test <p class="foo"><br /><i>it</i></p> works')).toEqual('test it works');
    });

    it('cleans complex example', () => {
        expect(getReadableContent('<p>return {{i5f50a5ada918c}} <em>d</em> to the unused choices</p>')).toEqual(
            'return  d to the unused choices'
        );
    });
});
