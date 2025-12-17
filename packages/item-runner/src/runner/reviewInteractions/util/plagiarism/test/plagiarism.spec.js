// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { normalizeReports } from '../plagiarism.js';

describe('normalizeReports', () => {
    test.each([[void 0], [null], [{}], [[]]])('returns [] when reports = %p', plagiarismReports => {
        const responseIdentifier = 'RESPONSE_2';
        expect(normalizeReports(responseIdentifier, plagiarismReports)).toEqual([]);
    });

    test.each([
        [[{ provider: 'abc' }]],
        [[{ provider: 'abc', responses: {} }]],
        [[{ provider: 'abc', responses: { foo: 'bar' } }]]
    ])('returns [undefined] when reports = %o', plagiarismReports => {
        const responseIdentifier = 'RESPONSE_2';
        expect(normalizeReports(responseIdentifier, plagiarismReports)).toEqual([void 0]);
    });

    it('extracts & normalizes single report from single report provider', () => {
        const responseIdentifier = 'RESPONSE_2';
        const plagiarismReports = [
            {
                provider: 'abc',
                responses: {
                    [responseIdentifier]: {
                        status: 'clear'
                    }
                }
            }
        ];
        const expectedReports = [
            {
                provider: 'abc',
                status: 'clear'
            }
        ];
        expect(normalizeReports(responseIdentifier, plagiarismReports)).toEqual(expectedReports);
    });

    it('extracts & normalizes reports from multiple report providers', () => {
        const responseIdentifier = 'RESPONSE_2';
        const plagiarismReports = [
            {
                provider: 'abc',
                responses: {
                    RESPONSE_1: {
                        status: 'pending'
                    },
                    [responseIdentifier]: {
                        status: 'error'
                    }
                }
            },
            {
                provider: 'xyz',
                responses: {
                    [responseIdentifier]: {
                        status: 'suspicious',
                        href: 'http://example.com'
                    },
                    RESPONSE_3: {
                        status: 'clear'
                    }
                }
            }
        ];
        const expectedReports = [
            {
                provider: 'abc',
                status: 'error'
            },
            {
                provider: 'xyz',
                status: 'suspicious',
                href: 'http://example.com'
            }
        ];
        expect(normalizeReports(responseIdentifier, plagiarismReports)).toEqual(expectedReports);
    });
});
