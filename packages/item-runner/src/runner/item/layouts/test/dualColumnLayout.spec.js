// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { filterBlock, getElementName, validate } from '../dualColumnLayout.js';

describe('Test "dual-column-layout" handler', () => {
    describe('Test "validate" method', () => {
        it('returns false if grid in test body contains more than 2 rows', () => {
            document.body.innerHTML =
                '<div id="container"><div class="grid-row dual-column-layout"></div><div class="grid-row"></div></div>';
            const testBodyElement = document.getElementById('container');
            expect(validate(testBodyElement)).toBe(false);
        });

        it('returns false if grid in test body do not contains necessary class', () => {
            document.body.innerHTML = '<div id="container"><div class="grid-row"></div></div>';
            const testBodyElement = document.getElementById('container');
            expect(validate(testBodyElement)).toBe(false);
        });

        it('returns false if grid row in test body contains more than 2 cols', () => {
            document.body.innerHTML =
                '<div id="container"><div class="grid-row dual-column-layout"><div class="col-4"></div><div class="col-4"></div><div class="col-4"></div></div></div>';
            const testBodyElement = document.getElementById('container');
            expect(validate(testBodyElement)).toBe(false);
        });

        it('returns false if grid row in test body contains less than 2 cols', () => {
            document.body.innerHTML =
                '<div id="container"><div class="grid-row dual-column-layout"><div class="col-12"></div></div></div>';
            const testBodyElement = document.getElementById('container');
            expect(validate(testBodyElement)).toBe(false);
        });

        it('returns true if test body contains 1 row with class and 2 cols inside', () => {
            document.body.innerHTML =
                '<div id="container"><div class="grid-row dual-column-layout"><div class="col-4"></div><div class="col-8"></div></div></div>';
            const testBodyElement = document.getElementById('container');
            expect(validate(testBodyElement)).toBe(true);
        });
    });

    describe('Test "filterBlock" method', () => {
        it('returns false if node is undefined', () => {
            expect(filterBlock(null)).toBeFalsy();
        });

        it('returns false if row do not contains elements with class "col-*" inside', () => {
            document.body.innerHTML =
                '<div id="container"><div class="grid-row dual-column-layout"><div class="column-1"></div><div class="column-2"></div></div></div>';
            const childrenElements = document.getElementById('container').querySelector('.dual-column-layout').children;
            expect(filterBlock(childrenElements[0])).toBeFalsy();
            expect(filterBlock(childrenElements[1])).toBeFalsy();
        });

        it('returns true if row contains elements with class "col-*" inside', () => {
            document.body.innerHTML =
                '<div id="container"><div class="grid-row dual-column-layout"><div class="col-4"></div><div class="col-8"></div></div></div>';
            const childrenElements = document.getElementById('container').querySelector('.dual-column-layout').children;
            expect(filterBlock(childrenElements[0])).toBe(true);
            expect(filterBlock(childrenElements[1])).toBe(true);
        });

        it('returns true if row contains columns without placeholder', () => {
            document.body.innerHTML =
                '<div id="container"><div class="grid-row dual-column-layout"><div class="col-4"></div><div class="col-8"></div></div></div>';
            const rowElement = document.getElementById('container').querySelector('.dual-column-layout');
            expect(filterBlock(rowElement)).toBe(true);
        });
    });

    describe('Test "getElementName" method', () => {
        it('returns custom element name if node is undefined', () => {
            expect(getElementName()).toEqual('dualColumn');
        });

        it('returns custom element name if node is a row wit corresponding class', () => {
            document.body.innerHTML =
                '<div id="container"><div class="grid-row dual-column-layout"><div class="col-4"></div><div class="col-8"></div></div></div>';
            const node = document.getElementById('container');
            expect(getElementName(node)).toEqual('dualColumn');
        });

        it('returns node name if node is a row', () => {
            document.body.innerHTML =
                '<div id="container"><div class="grid-row dual-column-layout"><div class="col-4"></div><div class="col-8"></div></div></div>';
            const node = document.getElementById('container').querySelector('.dual-column-layout');
            expect(getElementName(node)).toEqual('div');
        });
    });
});
