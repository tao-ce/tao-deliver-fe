// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import matchMapper from '../match.js';

describe('Match interaction choice properties mapper', () => {
    it('returns the input properties', () => {
        const sample = {
            foo: 'bar'
        };
        expect(matchMapper.mapChoiceProperties(sample)).toEqual(sample);
    });

    it('the choice identifier is mapped to key', () => {
        expect(
            matchMapper.mapChoiceProperties({
                identifier: 'choice1'
            })
        ).toEqual({
            key: 'choice1'
        });
    });

    it('the choice content is mapped to plainText', () => {
        expect(
            matchMapper.mapChoiceProperties({
                content: '<p>choice1 {{i12345}} end</p>'
            })
        ).toEqual({
            content: '<p>choice1 {{i12345}} end</p>',
            plainText: 'choice1  end'
        });
    });

    it('replaces MathML expressions placeholders', () => {
        const result = matchMapper.mapChoiceProperties({
            blockTree: [
                {
                    props: {
                        attributes: {
                            mathML: '<semantics><mstyle displaystyle="true" scriptlevel…RD"><mi>π</mi></mrow></mrow></mstyle></semantics>'
                        }
                    },
                    content: 'i620287464277e'
                }
            ],
            content: '{{i620287464277e}}'
        });

        expect(result.content).toMatchSnapshot();
    });

    it('replaces multiple math expressions placeholders within content', () => {
        const result = matchMapper.mapChoiceProperties({
            blockTree: [
                {
                    props: {
                        attributes: {
                            mathML: '<semantics><mstyle displaystyle="true" scriptlevel…RD"><mi>π</mi></mrow></mrow></mstyle></semantics>'
                        }
                    },
                    content: 'i620287464277e'
                },
                {
                    props: {
                        attributes: {
                            mathML: '<semantics><mstyle displaystyle="true" scriptlevel…RD"><mi>π</mi></mrow></mrow></mstyle></semantics>'
                        }
                    },
                    content: 'i620287464277f'
                }
            ],
            content: '{{i620287464277e}} and {{i620287464277f}}'
        });

        expect(result.content).toMatchSnapshot();
    });
});

describe('Match interaction properties mapper', () => {
    it('returns the input properties', () => {
        const sample = {
            foo: 'bar'
        };
        expect(matchMapper.mapProperties(sample)).toEqual(sample);
    });

    it('the position property is added to each choice in each set', () => {
        expect(
            matchMapper.mapProperties({
                choices: [
                    [{ identifier: 'x1' }, { identifier: 'x2' }],
                    [{ identifier: 'y1' }, { identifier: 'y2' }, { identifier: 'y3' }]
                ]
            })
        ).toMatchSnapshot();
    });
});
