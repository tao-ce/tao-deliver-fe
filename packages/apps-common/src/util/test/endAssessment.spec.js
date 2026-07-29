// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024-2026 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import request from 'core/fetchRequest';

vi.mock('../../core/async.js', () => ({
    wait: vi.fn().mockResolvedValue()
}));
vi.mock('core/fetchRequest');

import { endAssessment } from '../endAssessment.js';

const origin = 'https://taotesting.com';
const postMessageMock = vi.fn();
const jwtTokenHandler = {
    getToken: vi.fn()
};
const endAssessmentRequestParams = {
    jwtTokenHandler,
    method: 'GET'
};

describe('endAssessment', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        request.mockReset();
        postMessageMock.mockReset();
    });

    // simple exitUrl cases
    test.each([
        {
            description: 'Redirect to exit URL',
            expected: 'https://taotesting.com/',
            exitUrl: 'https://taotesting.com'
        },
        {
            description: 'Redirect to exit URL with query parameters',
            expected:
                'https://taotesting.com/?exit=true&urlEncoded=+%21%23%24%26%27%28%29*%2B%2C%2F%3Al%3D%3F%40%5B%5D',
            exitUrl: 'https://taotesting.com',
            exitUrlParameters: {
                exit: true,
                urlEncoded: " !#$&'()*+,/:l=?@[]"
            }
        },
        {
            description: 'Redirect to exit URL when no JWT token handler specified',
            expected: 'https://taotesting.com/',
            exitUrl: 'https://taotesting.com',
            endAssessmentUrl: 'https://taotesting.com/end-assessment'
        }
    ])('$description', async ({ expected, exitUrl = null, exitUrlParameters = {}, endAssessmentUrl = null }) => {
        const replaceMock = vi.fn();
        vi.stubGlobal('location', {
            replace: replaceMock,
            origin,
            protocol: 'https:'
        });
        vi.stubGlobal('parent', {
            postMessage: postMessageMock
        });
        await endAssessment({ exitUrl, exitUrlParameters, endAssessmentUrl });
        expect(replaceMock).toHaveBeenCalledWith(expected);
        expect(postMessageMock).toHaveBeenCalledWith({ event: 'exit', parameters: { exitUrl: expected } }, origin);
    });

    it('redirects to a success URL without notifying the parent app', async () => {
        const replaceMock = vi.fn();
        vi.stubGlobal('location', {
            replace: replaceMock,
            origin,
            protocol: 'https:'
        });
        vi.stubGlobal('parent', {
            postMessage: postMessageMock
        });

        const successUrl = 'https://taotesting.com/thank-you?returnUrl=https%3A%2F%2Fportal.example.com%2F';

        await endAssessment({
            exitUrl: 'https://taotesting.com',
            successUrl
        });

        expect(replaceMock).toHaveBeenCalledWith(successUrl);
        expect(postMessageMock).not.toHaveBeenCalled();
    });

    // cases with an endAssessmentUrl request
    test.each([
        {
            description: 'Redirect to end-assessment URL',
            expected: 'https://taotesting.com/end-assessment-result',
            endAssessmentUrl: 'https://taotesting.com/end-assessment',
            endAssessmentRequestUrl: 'https://taotesting.com/end-assessment?redirectUrl=&redirect=0'
        },
        {
            description: 'Redirect to end-assessment URL, replacing the protocol',
            expected: 'https://taotesting.com/end-assessment-result',
            endAssessmentUrl: '//taotesting.com/end-assessment',
            endAssessmentRequestUrl: 'https://taotesting.com/end-assessment?redirectUrl=&redirect=0'
        },
        {
            description: 'Redirect to end-assessment URL, replacing the origin',
            expected: 'https://taotesting.com/end-assessment-result',
            endAssessmentUrl: '/end-assessment',
            endAssessmentRequestUrl: 'https://taotesting.com/end-assessment?redirectUrl=&redirect=0'
        }
    ])('$description', async ({ expected, endAssessmentUrl, endAssessmentRequestUrl }) => {
        const replaceMock = vi.fn();
        vi.stubGlobal('location', {
            replace: replaceMock,
            origin: 'https://taotesting.com',
            protocol: 'https:'
        });
        request.mockResolvedValue({ endAssessmentUrl: expected });
        await endAssessment({ jwtTokenHandler, endAssessmentUrl });
        expect(request).toHaveBeenCalledWith(endAssessmentRequestUrl, endAssessmentRequestParams);
        expect(replaceMock).toHaveBeenCalledWith(expected);
    });

    // cases with both an exitUrl and an endAssessmentUrl request
    test.each([
        {
            description: 'Redirect to end-assessment URL and maintain the return URL',
            expected: 'https://taotesting.com/end-assessment-result',
            endAssessmentUrl: 'https://taotesting.com/end-assessment',
            endAssessmentRequestUrl:
                'https://taotesting.com/end-assessment?redirectUrl=https%3A%2F%2Ftaotesting.com%2F&redirect=0',
            redirectUrl: 'https://taotesting.com',
            exitUrl: 'https://taotesting.com'
        },
        {
            description: 'Redirect to end-assessment URL and maintain the return URL with query parameters',
            expected:
                'https://taotesting.com/end-assessment?jwt=access-token-value&redirectUrl=https%3A%2F%2Ftaotesting.com%2F%3Fexit%3Dtrue%26urlEncoded%3D%2B%2521%2523%2524%2526%2527%2528%2529*%252B%252C%252F%253Al%253D%253F%2540%255B%255D',
            endAssessmentUrl: 'https://taotesting.com/end-assessment',
            endAssessmentRequestUrl:
                'https://taotesting.com/end-assessment?redirectUrl=https%3A%2F%2Ftaotesting.com%2F%3Fexit%3Dtrue%26urlEncoded%3D%2B%2521%2523%2524%2526%2527%2528%2529*%252B%252C%252F%253Al%253D%253F%2540%255B%255D&redirect=0',
            redirectUrl:
                'https://taotesting.com/?exit=true&urlEncoded=+%21%23%24%26%27%28%29*%2B%2C%2F%3Al%3D%3F%40%5B%5D',
            exitUrl: 'https://taotesting.com',
            exitUrlParameters: {
                exit: true,
                urlEncoded: " !#$&'()*+,/:l=?@[]"
            }
        }
    ])(
        '$description',
        async ({
            expected,
            endAssessmentUrl,
            endAssessmentRequestUrl,
            redirectUrl,
            exitUrl = null,
            exitUrlParameters = {}
        }) => {
            const replaceMock = vi.fn();
            vi.stubGlobal('location', {
                replace: replaceMock,
                origin: 'https://taotesting.com',
                protocol: 'https:'
            });
            vi.stubGlobal('parent', {
                postMessage: postMessageMock
            });
            request.mockResolvedValue({ endAssessmentUrl: expected });
            await endAssessment({ jwtTokenHandler, exitUrl, exitUrlParameters, endAssessmentUrl });
            expect(request).toHaveBeenCalledWith(endAssessmentRequestUrl, endAssessmentRequestParams);
            expect(replaceMock).toHaveBeenCalledWith(expected);
            expect(postMessageMock).toHaveBeenCalledWith(
                { event: 'exit', parameters: { exitUrl: new URL(redirectUrl).toString() } },
                origin
            );
        }
    );

    it('uses the success URL as the end-assessment return target without notifying the parent app', async () => {
        const replaceMock = vi.fn();
        vi.stubGlobal('location', {
            replace: replaceMock,
            origin: 'https://taotesting.com',
            protocol: 'https:'
        });
        vi.stubGlobal('parent', {
            postMessage: postMessageMock
        });

        const exitUrl = 'https://portal.example.com/return';
        const successUrl = 'https://taotesting.com/thank-you?returnUrl=https%3A%2F%2Fportal.example.com%2Freturn';
        const endAssessmentUrl = 'https://taotesting.com/end-assessment';
        const expected = 'https://taotesting.com/end-assessment-result';

        request.mockResolvedValue({ endAssessmentUrl: expected });

        await endAssessment({ jwtTokenHandler, exitUrl, successUrl, endAssessmentUrl });

        expect(request).toHaveBeenCalledWith(
            'https://taotesting.com/end-assessment?redirectUrl=https%3A%2F%2Ftaotesting.com%2Fthank-you%3FreturnUrl%3Dhttps%253A%252F%252Fportal.example.com%252Freturn&redirect=0',
            endAssessmentRequestParams
        );
        expect(replaceMock).toHaveBeenCalledWith(expected);
        expect(postMessageMock).not.toHaveBeenCalled();
    });

    // cases with endAssessmentUrl request failing
    test.each([
        {
            description: 'Redirect to exit URL when endAssessmentUrl cannot be resolved',
            expected: 'https://taotesting.com/',
            endAssessmentUrl: 'https://taotesting.com/end-assessment',
            endAssessmentRequestUrl:
                'https://taotesting.com/end-assessment?redirectUrl=https%3A%2F%2Ftaotesting.com%2F&redirect=0',
            redirectUrl: 'https://taotesting.com',
            exitUrl: 'https://taotesting.com'
        },
        {
            description: 'Redirect to exit URL with query parameters when endAssessmentUrl cannot be resolved',
            expected:
                'https://taotesting.com/?exit=true&urlEncoded=+%21%23%24%26%27%28%29*%2B%2C%2F%3Al%3D%3F%40%5B%5D',
            endAssessmentUrl: 'https://taotesting.com/end-assessment',
            endAssessmentRequestUrl:
                'https://taotesting.com/end-assessment?redirectUrl=https%3A%2F%2Ftaotesting.com%2F%3Fexit%3Dtrue%26urlEncoded%3D%2B%2521%2523%2524%2526%2527%2528%2529*%252B%252C%252F%253Al%253D%253F%2540%255B%255D&redirect=0',
            exitUrl: 'https://taotesting.com',
            redirectUrl:
                'https://taotesting.com/?exit=true&urlEncoded=+%21%23%24%26%27%28%29*%2B%2C%2F%3Al%3D%3F%40%5B%5D',
            exitUrlParameters: {
                exit: true,
                urlEncoded: " !#$&'()*+,/:l=?@[]"
            }
        }
    ])(
        '$description',
        async ({
            expected,
            endAssessmentUrl,
            endAssessmentRequestUrl,
            redirectUrl,
            exitUrl = null,
            exitUrlParameters = {}
        }) => {
            const replaceMock = vi.fn();
            vi.stubGlobal('location', {
                replace: replaceMock,
                origin: 'https://taotesting.com',
                protocol: 'https:'
            });
            vi.stubGlobal('parent', {
                postMessage: postMessageMock
            });
            request.mockRejectedValue();
            await endAssessment({ jwtTokenHandler, exitUrl, exitUrlParameters, endAssessmentUrl });
            expect(request).toHaveBeenCalledWith(endAssessmentRequestUrl, endAssessmentRequestParams);
            expect(replaceMock).toHaveBeenCalledWith(expected);
            expect(postMessageMock).toHaveBeenCalledWith(
                { event: 'exit', parameters: { exitUrl: new URL(redirectUrl).toString() } },
                origin
            );
        }
    );

    it('falls back to the original exit URL and notifies the parent app when the thank-you redirect cannot be resolved', async () => {
        const replaceMock = vi.fn();
        vi.stubGlobal('location', {
            replace: replaceMock,
            origin: 'https://taotesting.com',
            protocol: 'https:'
        });
        vi.stubGlobal('parent', {
            postMessage: postMessageMock
        });

        const exitUrl = 'https://portal.example.com/return';
        const endAssessmentUrl = 'https://taotesting.com/end-assessment';
        const successUrl = 'https://taotesting.com/thank-you?returnUrl=https%3A%2F%2Fportal.example.com%2Freturn';
        const exitUrlParameters = {
            lti_msg: 'Test is finished',
            lti_log: 'Test taker finished the test'
        };
        const expectedRedirectUrl =
            'https://portal.example.com/return?lti_msg=Test+is+finished&lti_log=Test+taker+finished+the+test';

        request.mockRejectedValue(new Error('Unable to resolve endAssessmentUrl'));

        await endAssessment({ jwtTokenHandler, exitUrl, exitUrlParameters, successUrl, endAssessmentUrl });

        expect(request).toHaveBeenCalledWith(
            'https://taotesting.com/end-assessment?redirectUrl=https%3A%2F%2Ftaotesting.com%2Fthank-you%3FreturnUrl%3Dhttps%253A%252F%252Fportal.example.com%252Freturn&redirect=0',
            endAssessmentRequestParams
        );
        expect(replaceMock).toHaveBeenCalledWith(expectedRedirectUrl);
        expect(postMessageMock).toHaveBeenCalledWith(
            { event: 'exit', parameters: { exitUrl: expectedRedirectUrl } },
            'https://portal.example.com'
        );
    });
});
