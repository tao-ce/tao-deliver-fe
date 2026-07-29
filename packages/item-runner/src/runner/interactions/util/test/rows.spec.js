// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2026 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Tests the functionality of the exported helper methods of rows.js
 */
import { getRowsValue, getAdditionalSpacing } from '../rows.js';

describe('API', () => {
    it('has getRowsValue method', () => {
        expect(typeof getRowsValue).toEqual('function');
    });

    it('has getAdditionalSpacing method', () => {
        expect(typeof getAdditionalSpacing).toEqual('function');
    });
});

describe('rows calculation helper', () => {
    it('empty cases', () => {
        expect(getRowsValue()).toEqual(null);
        expect(getRowsValue({})).toEqual(null);
    });

    it('extracts number from classes', () => {
        expect(
            getRowsValue({
                classes: 'qti-height-lines-15'
            })
        ).toEqual(15);
    });

    it('invalid class is not taken into account', () => {
        expect(
            getRowsValue({
                classes: 'qti-height-lines-13'
            })
        ).toEqual(null);
    });

    it('calculates based on expected length', () => {
        expect(
            getRowsValue({
                expectedLength: 144
            })
        ).toEqual(2);
    });

    it('calculates based on expected length with large number', () => {
        expect(
            getRowsValue({
                expectedLength: 7210
            })
        ).toEqual(101);
    });

    it('calculates based on expected lines', () => {
        expect(
            getRowsValue({
                expectedLines: 3
            })
        ).toEqual(3);
    });

    it('returns hardcoded default value if maxWordsLimit', () => {
        expect(
            getRowsValue({
                maxWordsLimit: 100
            })
        ).toEqual(8);
    });

    it('calculates based on maxlength', () => {
        expect(
            getRowsValue({
                maxlength: 200
            })
        ).toEqual(3);
    });

    it('calculates based on maxlength with large number', () => {
        expect(
            getRowsValue({
                maxlength: 7210
            })
        ).toEqual(101);
    });

    it('class has more priority over expectedLength in calculations', () => {
        expect(
            getRowsValue({
                expectedLength: 10,
                classes: 'qti-height-lines-15'
            })
        ).toEqual(15);
    });

    it('expectedLength has more priority over expectedLines in calculations', () => {
        expect(
            getRowsValue({
                expectedLength: 73,
                expectedLines: 5
            })
        ).toEqual(2);
    });

    it('expectedLines has more priority over maxWordsLimit constraint in calculations', () => {
        expect(
            getRowsValue({
                expectedLines: 5,
                maxWordsLimit: 60
            })
        ).toEqual(5);
    });

    it('maxWordsLimit constraint has more priority over maxlength constraint in calculations', () => {
        expect(
            getRowsValue({
                maxlength: 200,
                maxWordsLimit: 60
            })
        ).toEqual(8);
    });
});

describe('calculates additional spacing needed for prompt and feedback', () => {
    function createDomFixture() {
        const div = document.createElement('div');
        div.class = 'fixture';
        div.innerHTML = `
            <div class='container'>
                <div class='colrow'>
                    <div class='textarea-container'>
                        <div class='textarea'>hey ho!</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(div);

        const rootRef = document.querySelector('.textarea-container');

        return rootRef;
    }

    it('returns 0px is no additional space needed', () => {
        const rootRef = createDomFixture();
        expect(getAdditionalSpacing(rootRef, false)).toEqual('0px');
    });

    it('returns 10rem if interaction has prompt', () => {
        const rootRef = createDomFixture();
        expect(getAdditionalSpacing(rootRef, true)).toEqual('10rem');
    });

    it('returns 10rem if some element (feedback) require space', () => {
        const rootRef = createDomFixture();
        const feedbackElement = document.createElement('div');
        document.querySelector('.container').appendChild(feedbackElement);
        expect(getAdditionalSpacing(rootRef, false)).toEqual('10rem');
    });
});
