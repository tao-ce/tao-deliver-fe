// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import mapper from '../graphicGapMatch.js';

describe('graphicGapMatch mapper', () => {
    describe('mapChoiceProperties', () => {
        it('work without params', () => {
            expect(mapper.mapChoiceProperties()).toEqual({});
        });
        it('work without identifier', () => {
            const obj = { a: 'b', c: 'd' };
            expect(mapper.mapChoiceProperties(obj)).toEqual(obj);
        });
        it('change identifier on key', () => {
            const obj = { identifier: 'id', someProp: 'prop' };
            const result = mapper.mapChoiceProperties(obj);
            expect(result.key).toEqual('id');
            expect(result.identifier).toBeUndefined();
        });
    });
    describe('mapProperties', () => {
        const gapImages = {
            gap_image1: {
                attributes: {
                    identifier: 'image1'
                },
                identifier: 'image1',
                object: {
                    attributes: {
                        type: 'img'
                    }
                }
            },
            gap_image2: {
                attributes: {
                    identifier: 'image2'
                },
                identifier: 'image2',
                object: {
                    attributes: {
                        type: 'img'
                    }
                }
            }
        };
        it('work with empty params', () => {
            expect(mapper.mapProperties({})).toEqual({});
        });
        it('basic behavior', () => {
            const obj = { object: {}, choices: [] };
            const result = mapper.mapProperties(obj);

            expect(result.imgObject).toEqual({});
            expect(result.object).toBeUndefined();

            expect(result.gaps).toEqual([]);
            expect(result.choices).toBeUndefined();
        });
        it('add choices properties', () => {
            let result = mapper.mapProperties({}, { gapImgs: gapImages });
            expect(result.choices).toEqual([
                { key: 'image1', type: 'img' },
                { key: 'image2', type: 'img' }
            ]);
            expect(result.object).toBeUndefined();

            // test single image
            delete gapImages['gap_image1'];
            result = mapper.mapProperties({}, { gapImgs: gapImages });
            expect(result.choices).toEqual([{ key: 'image2', type: 'img' }]);
        });
    });
});
