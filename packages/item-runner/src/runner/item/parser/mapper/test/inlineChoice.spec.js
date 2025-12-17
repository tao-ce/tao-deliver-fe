// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import inlineChoiceMapper from '../inlineChoice.js';

describe('Choice interaction properties mapper', () => {
    it('returns the input properties', () => {
        const sample = {
            foo: 'bar'
        };
        expect(inlineChoiceMapper.mapChoiceProperties(sample)).toEqual(sample);
    });

    it('the choice identifier is mapped to key, and content to label', () => {
        expect(
            inlineChoiceMapper.mapChoiceProperties({
                identifier: 'choice1',
                content: 'First choice'
            })
        ).toEqual({
            key: 'choice1',
            label: 'First choice'
        });
    });

    it('empty choice content is mapped to empty label', () => {
        expect(
            inlineChoiceMapper.mapChoiceProperties({
                identifier: 'choice1',
                content: ''
            })
        ).toEqual({
            key: 'choice1',
            label: ''
        });
    });
});
