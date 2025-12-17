// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import NetworkError from 'core/error/NetworkError';
import ApiError from 'core/error/ApiError';
import TimeoutError from 'core/error/TimeoutError';
import RenderingError from 'core/error/RenderingError';
import TokenError from 'core/error/TokenError';
import LaunchError from '../LaunchError.js';
import ActionError, { actionErrorCodes } from '../ActionError.js';
import { errorMessages, getErrorMessageFromError, getErrorMessageByType, guessMessageStructure } from '../messages.js';

describe('get error message by type', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('gives the error message', () => {
        expect(getErrorMessageByType('timeout')).toMatchObject(errorMessages.timeout);
        expect(getErrorMessageByType('notAvailable')).toMatchObject(errorMessages.notAvailable);
    });

    it('gives the unexpected error message when the type is not found', () => {
        expect(getErrorMessageByType()).toMatchObject(errorMessages.unexpected);
        expect(getErrorMessageByType(false)).toMatchObject(errorMessages.unexpected);
        expect(getErrorMessageByType('')).toMatchObject(errorMessages.unexpected);
        expect(getErrorMessageByType('foo')).toMatchObject(errorMessages.unexpected);
    });
});

describe('get error message by error', () => {
    it('gives the unexpected error message by default', () => {
        expect(getErrorMessageFromError()).toMatchObject(errorMessages.unexpected);
        expect(getErrorMessageFromError('Oops')).toMatchObject(errorMessages.unexpected);
        expect(getErrorMessageFromError(null)).toMatchObject(errorMessages.unexpected);
        expect(getErrorMessageFromError(new Error('oops'))).toMatchObject(errorMessages.unexpected);
        expect(getErrorMessageFromError(new TypeError('oops'))).toMatchObject(errorMessages.unexpected);
    });

    it('gives the correct message from typed error', () => {
        expect(getErrorMessageFromError(new TimeoutError('timeout', 300))).toMatchObject(errorMessages.timeout);
        expect(getErrorMessageFromError(new ApiError('timeout', 408))).toMatchObject(errorMessages.timeout);

        expect(getErrorMessageFromError(new LaunchError('no test'))).toMatchObject(errorMessages.notAvailable);

        expect(getErrorMessageFromError(new ApiError('service busy', 504))).toMatchObject(errorMessages.busy);
        expect(getErrorMessageFromError(new ApiError('not found', 404))).toMatchObject(errorMessages.notAvailable);
        expect(getErrorMessageFromError(new TokenError('token expired'))).toMatchObject(errorMessages.tokenExpired);

        expect(getErrorMessageFromError(new RenderingError('Unable to load menu'))).toMatchObject(errorMessages.client);

        vi.spyOn(navigator, 'onLine', 'get').mockReturnValueOnce(true);
        expect(getErrorMessageFromError(new NetworkError('Not able to fetch a resource', 0))).toMatchObject(
            errorMessages.noConnection
        );

        vi.spyOn(navigator, 'onLine', 'get').mockReturnValueOnce(false);
        expect(getErrorMessageFromError(new NetworkError('Not able to fetch a resource', 0))).toMatchObject(
            errorMessages.noInternet
        );

        expect(getErrorMessageFromError(new ActionError('Multiple sessions detected', 409))).toMatchObject(
            errorMessages.multipleSession
        );

        expect(
            getErrorMessageFromError(new ActionError('Proctor ended test', actionErrorCodes.proctorTerminated))
        ).toMatchObject(errorMessages.proctorTerminated);

        expect(
            getErrorMessageFromError(new ActionError('Proctor paused test', actionErrorCodes.proctorPaused))
        ).toMatchObject(errorMessages.proctorPaused);
    });

    it('gives the third-party tool error message', () => {
        const err1 = new Error('something');
        err1.additionalInfo = {
            edgeReadAloud: true,
            fromSvelte: true
        };
        expect(getErrorMessageFromError(err1)).toMatchObject(errorMessages.clientEdgeReadAloud);

        const err2 = new TypeError('DOM exception');
        err2.additionalInfo = {
            edgeReadAloud: true,
            fromSvelte: true
        };
        expect(getErrorMessageFromError(err2)).toMatchObject(errorMessages.clientEdgeReadAloud);

        const err3 = new Error('something');
        err3.additionalInfo = {
            fromSvelte: true
        };
        expect(getErrorMessageFromError(err3)).toMatchObject(errorMessages.unexpected);

        const err4 = new TypeError('DOM exception');
        err4.additionalInfo = {
            edgeReadAloud: true
        };
        expect(getErrorMessageFromError(err4)).toMatchObject(errorMessages.unexpected);
    });
});

describe('guess message structure', () => {
    test.each([
        [
            'Test not available.\nSorry, we cannot start your test.\nPlease launch your test again or contact your administrator.',
            errorMessages.notAvailable
        ],
        ['Oops', { title: 'Oops' }],
        ['Oops\nSomething went wrong', { title: 'Oops', cause: 'Something went wrong' }],
        [
            'Oops\nSomething went wrong.\nPlease retry.',
            { title: 'Oops', cause: 'Something went wrong.', remediation: 'Please retry.' }
        ],
        [
            'Oops an error occured due to missing actions from your side',
            {
                title: errorMessages.unexpected.title,
                cause: 'Oops an error occured due to missing actions from your side'
            }
        ],
        ['', errorMessages.unexpected]
    ])('returns the correct structure', (message, expected) => {
        expect(guessMessageStructure(message)).toMatchObject(expected);
    });
});
