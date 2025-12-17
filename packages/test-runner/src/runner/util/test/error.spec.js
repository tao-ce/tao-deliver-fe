// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { setAdditionalErrorInfo } from '../error.js';

const edgeReadAloudHtml =
    '<div><p>abc</p><p><msreadoutspan class="msreadout-line-highlight msreadout-inactive-highlight">def <msreadoutspan class="msreadout-word-highlight">ghi</msreadoutspan></msreadoutspan></p></div>';
const edgeReadAloudStyle =
    '<style>.abc {color: orange;}</style><style>.msreadout-word-highlight:not(.msreadout-inactive-highlight) { color: orange; } .msreadout-line-highlight:not(.msreadout-inactive-highlight) { color: lilac; }</style>';

describe('setAdditionalErrorInfo', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });

    it('sets info: edgeReadAloud', () => {
        document.body.innerHTML = edgeReadAloudHtml;
        let err = new Error('oh no!');
        setAdditionalErrorInfo(err);
        expect(err.additionalInfo).toEqual({ edgeReadAloud: true });
        expect(err.recoverable).toBeFalsy();

        document.body.innerHTML = '';
        err = new Error('oh no!');
        setAdditionalErrorInfo(err);
        expect(err.additionalInfo).toEqual(void 0);
        expect(err.recoverable).toBeFalsy();

        document.head.innerHTML = edgeReadAloudStyle;
        err = new TypeError('oh no!');
        setAdditionalErrorInfo(err);
        expect(err.additionalInfo).toEqual({ edgeReadAloud: true });
        expect(err.recoverable).toBeFalsy();
    });

    it('sets info: fromSvelte', () => {
        let err = new TypeError("Cannot read properties of null (reading 'insertBefore')");
        setAdditionalErrorInfo(err);
        expect(err.additionalInfo).toEqual({ fromSvelte: true });
        expect(err.recoverable).toBeFalsy();

        err = new TypeError("Cannot read properties of null (reading 'forEach')");
        setAdditionalErrorInfo(err);
        expect(err.additionalInfo).toEqual(void 0);
        expect(err.recoverable).toBeFalsy();

        err = new DOMException(
            "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node."
        );
        setAdditionalErrorInfo(err);
        expect(err.additionalInfo).toEqual({ fromSvelte: true });
        expect(err.recoverable).toBeFalsy();
    });

    it('sets recoverable=true if edgeReadAloud & fromSvelte', () => {
        document.head.innerHTML = edgeReadAloudStyle;
        let err = new TypeError("Cannot read properties of null (reading 'insertBefore')");
        setAdditionalErrorInfo(err);
        expect(err.additionalInfo).toEqual({ fromSvelte: true, edgeReadAloud: true });
        expect(err.recoverable).toBe(true);
    });

    it('sets info: unhandledPromiseRejection', () => {
        let err = new Error('oh no!');
        setAdditionalErrorInfo(err, { unhandledPromiseRejection: true });
        expect(err.additionalInfo).toEqual({ unhandledPromiseRejection: true });

        document.head.innerHTML = edgeReadAloudStyle;
        err = new Error('oh no!');
        setAdditionalErrorInfo(err, { unhandledPromiseRejection: true });
        expect(err.additionalInfo).toEqual({
            unhandledPromiseRejection: true,
            edgeReadAloud: true
        });
    });

    it('does nothing if argument is not an error', () => {
        expect(() => setAdditionalErrorInfo(null)).not.toThrow();
        expect(() => setAdditionalErrorInfo('rejected with string')).not.toThrow();
    });
});
