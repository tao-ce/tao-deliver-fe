// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import ErrorController from '../error.js';
import ActionError from '../../core/error/ActionError.js';
import TheEnd from '../../component/TheEnd.svelte';
import NetworkError from 'core/error/NetworkError';
import request from 'core/fetchRequest';

vi.mock('../page.js', () => ({
    __esModule: true,
    default: controller =>
        Object.assign(controller, {
            container: 'body',
            logger: {
                error: vi.fn()
            }
        })
}));

vi.mock('../../component/TheEnd.svelte');

vi.mock('core/fetchRequest');

function createWindowSpyWithLocationReplace() {
    const replaceMock = vi.fn();
    const originalWindow = { ...window };
    const windowSpy = vi.spyOn(global, 'window', 'get');
    windowSpy.mockImplementation(() => ({
        ...originalWindow,
        location: {
            replace: replaceMock
        }
    }));
    return windowSpy;
}

describe('handling errors', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        request.mockReset();
    });

    const controller = ErrorController();

    //default recoverable error
    const error = new ActionError('Item is not available', 500);
    error.stack = 'ActionError: Try again at bar.js:24:42';

    //default non-recoverable error
    const nonRecoverableError = new NetworkError('Something goes wrong', 503, null, false);
    nonRecoverableError.itemIdentifier = 'item-5';
    nonRecoverableError.stack = 'NetworkError: Something goes wrong at foo.js:13:31';

    //default props for rendering TheEnd page based on default error (see above)
    const theEndPageProps = {
        props: {
            cause: 'Sorry, an unexpected error happened during the test.',
            remediation: 'Please contact your test administrator.',
            title: 'Unexpected error.',
            retry: true,
            withExitUrlRedirect: false
        },
        target: 'body'
    };

    /**
     * Extend "props" attribute in default params
     * @param {object} props
     * @returns {{props: {remediation: string, cause: string, title: string, retry: boolean}, target: string} & {props: any}}
     */
    function extendFinalPageProps(props) {
        return Object.assign({}, theEndPageProps, {
            props: Object.assign({}, theEndPageProps.props, props)
        });
    }

    it('renders TheEnd page if no params passed', () => {
        controller.start();
        expect(TheEnd).toHaveBeenCalledWith(extendFinalPageProps({ retry: false }));
        expect(controller.logger.error).toHaveBeenCalledTimes(0);
    });

    it('renders TheEnd page if only messages passed', () => {
        const params = {
            lti_errormsg: 'Error\nis\nhappened.',
            lti_errorlog: 'Log error message'
        };
        controller.start(params);
        expect(TheEnd).toHaveBeenCalledWith(
            extendFinalPageProps({ cause: 'is', remediation: 'happened.', title: 'Error', retry: false })
        );
        expect(controller.logger.error).toHaveBeenCalledTimes(1);
    });

    it('renders TheEnd page if only recoverable internal error passed', () => {
        const params = {
            internalError: error
        };
        controller.start(params);
        expect(controller.logger.error).toHaveBeenCalledWith(expect.stringMatching(error.message));
        expect(TheEnd).toHaveBeenCalledWith(theEndPageProps);
    });

    it('redirect non-recoverable issue to external page', () => {
        const windowSpy = createWindowSpyWithLocationReplace();

        const params = {
            internalError: nonRecoverableError,
            lti_errormsg: 'Error is happened.',
            lti_errorlog: 'Log error message',
            exitUrl: 'http://new.url',
            deliveryExecutionId: 'dx123'
        };

        const expectedUrl = new URL(params.exitUrl);
        expectedUrl.searchParams.append(
            'lti_errormsg',
            `No connection to the service.\nPlease contact your test administrator.`
        );
        expectedUrl.searchParams.append(
            'lti_errorlog',
            `${nonRecoverableError.message}\n${nonRecoverableError.stack}\n[dx123][item-5]`
        );

        controller.start(params);
        expect(controller.logger.error).toHaveBeenCalledWith(expect.stringMatching(nonRecoverableError.message));
        expect(window.location.replace).toHaveBeenCalledWith(expectedUrl);

        windowSpy.mockRestore();
    });

    it('renders TheEnd page if exitUrl is absent', () => {
        const params = {
            internalError: error,
            lti_errormsg: 'Error is happened.',
            lti_errorlog: 'Log error message'
        };
        controller.start(params);
        expect(TheEnd).toHaveBeenCalledWith(theEndPageProps);
        expect(controller.logger.error).toHaveBeenCalledWith(expect.stringMatching(error.message));
    });

    it('renders TheEnd page if error is recoverable', () => {
        const params = {
            internalError: error,
            lti_errormsg: 'Error is happened.',
            lti_errorlog: 'Log error message',
            exitUrl: 'http://new.url'
        };
        controller.start(params);
        expect(TheEnd).toHaveBeenCalledWith(theEndPageProps);
        expect(controller.logger.error).toHaveBeenCalledWith(expect.stringMatching(error.message));
    });

    it('destroys TheEnd page if initialized', () => {
        controller.start();
        expect(TheEnd).toHaveBeenCalledWith(extendFinalPageProps({ retry: false }));
        controller.stop();
        expect(controller.theEndComponent.$destroy).toHaveBeenCalled();
    });

    it('do nothing if controller was not started', () => {
        const newController = ErrorController();
        controller.stop();
        expect(newController.theEndComponent).not.toBeDefined();
    });

    describe('save error log', () => {
        const controllerConfig = {
            endpoints: {
                errorLog: {
                    rootUrl: 'http://root.url',
                    path: 'path1',
                    resource: 'log1',
                    method: 'method1'
                }
            },
            errorLog: {
                saveEnabled: true
            }
        };

        const controllerParams = {
            jwtTokenHandler: { jwt: 'handler' },
            deliveryExecutionId: 'dx123',
            internalError: error,
            exitUrl: null
        };

        let windowSpy;
        beforeAll(() => {
            windowSpy = createWindowSpyWithLocationReplace();
        });
        afterAll(() => {
            windowSpy.mockRestore();
        });

        test.each([
            ['recoverable error', 'http://exit.url', error, `${error.message}\n${error.stack}\n[recoverable]`],
            [
                'unrecoverable error & no exitUrl',
                null,
                nonRecoverableError,
                `${nonRecoverableError.message}\n${nonRecoverableError.stack}\n[item-5][unrecoverable]`
            ],
            [
                'unrecoverable error & exitUrl',
                'http://exit.url',
                nonRecoverableError,
                `${nonRecoverableError.message}\n${nonRecoverableError.stack}\n[item-5][unrecoverable]`
            ]
        ])('sends log request if %s', async (message, exitUrl, internalError, reason) => {
            request.mockResolvedValue();

            const newController = ErrorController();
            newController.install(controllerConfig);
            await newController.start(
                Object.assign({}, controllerParams, {
                    internalError,
                    exitUrl
                })
            );

            expect(request).toHaveBeenCalledWith(
                'http://root.url/path1/dx123/log1',
                expect.objectContaining({
                    method: 'method1',
                    jwtTokenHandler: controllerParams.jwtTokenHandler,
                    body: JSON.stringify({
                        issuer: 'deliver-fe',
                        reason
                    })
                })
            );
            newController.stop();
        });

        it('does not send log request if configured not to', async () => {
            request.mockResolvedValue();

            const newController = ErrorController();
            newController.install(
                Object.assign({}, controllerConfig, {
                    errorLog: {
                        saveEnabled: false
                    }
                })
            );
            await newController.start(controllerParams);

            expect(request).not.toHaveBeenCalled();

            newController.stop();
        });

        it('ignores errors from log request', async () => {
            request.mockRejectedValue();

            const newController = ErrorController();
            newController.install(controllerConfig);

            await newController.start(controllerParams);
            expect(request).toHaveBeenCalled();

            newController.stop();
        });
    });
});
