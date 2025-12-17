// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import NetworkError from 'core/error/NetworkError';
import ApiError from 'core/error/ApiError';
import LaunchError from 'taoDeliverAppsCommon/core/error/LaunchError.js';
import { errorMessages, getErrorMessageFromError, getIsRetriableFromError } from '../errorMessages.js';
import { errorMessages as commonErrorMessages } from 'taoDeliverAppsCommon/core/error/messages.js';

describe('getErrorMessageFromError', () => {
    it('gives the correct local message from typed error', () => {
        expect(getErrorMessageFromError(new ApiError('not found', 404))).toMatchObject(errorMessages.notFound);
        expect(getErrorMessageFromError(new NetworkError('not found', 404))).toMatchObject(errorMessages.notFound);
        expect(getErrorMessageFromError(new LaunchError('no test'))).toMatchObject(errorMessages.notFound);
        expect(getErrorMessageFromError(new NetworkError('not found', 401))).toMatchObject(errorMessages.unauthorised);
    });

    it('gives the correct common message from typed error', () => {
        expect(getErrorMessageFromError(new ApiError('timeout', 408))).toMatchObject(commonErrorMessages.timeout);

        vi.spyOn(navigator, 'onLine', 'get').mockReturnValueOnce(true);
        expect(getErrorMessageFromError(new NetworkError('Not able to fetch a resource', 0))).toMatchObject(
            commonErrorMessages.noConnection
        );

        vi.spyOn(navigator, 'onLine', 'get').mockReturnValueOnce(false);
        expect(getErrorMessageFromError(new NetworkError('Not able to fetch a resource', 0))).toMatchObject(
            commonErrorMessages.noInternet
        );
    });

    it('gives the unexpected error message by default', () => {
        expect(getErrorMessageFromError()).toMatchObject(commonErrorMessages.unexpected);
        expect(getErrorMessageFromError('Oops')).toMatchObject(commonErrorMessages.unexpected);
        expect(getErrorMessageFromError(null)).toMatchObject(commonErrorMessages.unexpected);
        expect(getErrorMessageFromError(new Error('oops'))).toMatchObject(commonErrorMessages.unexpected);
        expect(getErrorMessageFromError(new TypeError('oops'))).toMatchObject(commonErrorMessages.unexpected);
    });
});

describe('getIsRetriableFromError', () => {
    it('returns true for recoverable errors', () => {
        const err1 = new Error('hello');
        expect(getIsRetriableFromError(err1)).toBe(false);
        const err2 = new Error('hello');
        err2.recoverable = true;
        expect(getIsRetriableFromError(err2)).toBe(true);
        const err3 = new Error('hello');
        err3.unrecoverable = false;
        expect(getIsRetriableFromError(err3)).toBe(true);
    });

    it('returns false for 404 errors', () => {
        const err1 = new NetworkError('not found', 404);
        err1.recoverable = true;
        expect(getIsRetriableFromError(err1)).toBe(false);

        const err2 = new NetworkError('not found', 401);
        err2.recoverable = true;
        expect(getIsRetriableFromError(err2)).toBe(true);
    });
});
