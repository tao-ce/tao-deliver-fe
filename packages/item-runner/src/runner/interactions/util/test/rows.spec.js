// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2023 (original work) Open Assessment Technologies SA
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
    it('empty case', () => {
        expect(getRowsValue()).toEqual(null);
    });

    it('extracts number from classes', () => {
        expect(getRowsValue(void 0, void 0, void 0, void 0, 'qti-height-lines-15')).toEqual(15);
    });

    it('invalid class is not taken into account', () => {
        expect(getRowsValue(void 0, void 0, void 0, void 0, 'qti-height-lines-13')).toEqual(null);
    });

    it('calculates based on expected length', () => {
        expect(getRowsValue(144, void 0, void 0, void 0, void 0)).toEqual(2);
    });

    it('calculates based on expected lines', () => {
        expect(getRowsValue(void 0, 3, void 0, void 0, void 0)).toEqual(3);
    });

    it('calculates based on maxWords pattern', () => {
        expect(getRowsValue(void 0, void 0, void 0, 100, void 0)).toEqual(8);
    });

    it('calculates based on maxCharacters pattern', () => {
        expect(getRowsValue(void 0, void 0, 200, void 0, void 0)).toEqual(3);
    });

    it('class has the most priority in calculations', () => {
        expect(getRowsValue(10, 3, 200, void 0, 'qti-height-lines-15')).toEqual(15);
    });

    it('length has more priority over lines and pattern in calculations', () => {
        expect(getRowsValue(300, 1, 200, void 0, void 0)).toEqual(5);
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
