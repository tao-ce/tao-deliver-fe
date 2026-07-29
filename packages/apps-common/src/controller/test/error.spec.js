// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2026 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../page.js', () => ({
    __esModule: true,
    default: controller =>
        Object.assign(controller, {
            container: document.body,
            logger: {
                error: vi.fn()
            }
        })
}));

vi.mock('../../util/notify.js', () => ({
    notifyFactory: vi.fn().mockImplementation(() => vi.fn())
}));
vi.mock('../../core/async.js', () => ({
    wait: vi.fn().mockResolvedValue()
}));

vi.mock('core/fetchRequest');

import { tick } from 'svelte';
import ErrorController from '../error.js';
import ActionError from '../../core/error/ActionError.js';
import NetworkError from 'core/error/NetworkError';
import request from 'core/fetchRequest';
import { notifyFactory } from '../../util/notify.js';
import { expect } from 'vitest';
import KioskError from '../../core/error/KioskError.js';

export function createWindowLocationSpy() {
    const replaceMock = vi.fn();
    const reloadMock = vi.fn();

    const originalLocation = window.location;

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
          ...originalLocation,
          replace: replaceMock,
          reload: reloadMock
      }
    });

    return {
        replaceMock,
        reloadMock,
        restore() {
            Object.defineProperty(window, 'location', {
                configurable: true,
                value: originalLocation
            });
        }
    };
}

describe('handling errors', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        request.mockReset();
        document.body.innerHTML = '';
    });

    const controller = ErrorController();

    //default recoverable error
    const recoverableErrorMessage = 'Item is not available';
    const recoverableError = new ActionError(recoverableErrorMessage, 500);
    recoverableError.stack = 'ActionError: Try again at bar.js:24:42';

    //default non-recoverable error
    const nonRecoverableErrorMessage = 'Something goes wrong';
    const nonRecoverableError = new NetworkError(nonRecoverableErrorMessage, 503, null, false);
    nonRecoverableError.itemIdentifier = 'item-5';
    nonRecoverableError.stack = 'NetworkError: Something goes wrong at foo.js:13:31';

    it('renders TheEnd page if no params passed', () => {
        controller.start();
        expect(document.querySelector('.the-end .info')).toMatchSnapshot();
        expect(controller.logger.error).not.toHaveBeenCalled();
    });

    it('renders TheEnd page if only messages passed', () => {
        const params = {
            lti_errormsg: 'Error\nis\nhappened.',
            lti_errorlog: 'Log error message'
        };
        controller.start(params);
        expect(document.querySelector('.the-end .info')).toMatchSnapshot();
        expect(controller.logger.error).toHaveBeenCalledTimes(1);
        expect(notifyFactory).not.toHaveBeenCalled();
    });

    it('renders TheEnd page if only recoverable internal error passed', () => {
        const params = {
            internalError: recoverableError
        };
        controller.start(params);
        expect(controller.logger.error).toHaveBeenCalledWith(expect.stringMatching(recoverableError.message));
        expect(document.querySelector('.the-end .info')).toMatchSnapshot();
        expect(notifyFactory).not.toHaveBeenCalled();
    });

    it('redirects non-recoverable issue to external page', async () => {
        const windowLocationSpy = createWindowLocationSpy();

        const params = {
            internalError: nonRecoverableError,
            lti_errormsg: 'Error is happened.',
            lti_errorlog: 'Log error message',
            exitUrl: 'http://new.url',
            deliveryExecutionId: 'dx123'
        };

        const expectedUrl = new URL(params.exitUrl);
        const lti_errormsg = 'No connection to the service.\nPlease contact your test administrator.';
        const lti_errorlog = `${nonRecoverableError.message}\n${nonRecoverableError.stack}\n[dx123][item-5]`;
        expectedUrl.searchParams.append('lti_errormsg', lti_errormsg);
        expectedUrl.searchParams.append('lti_errorlog', lti_errorlog);

        controller.start(params);
        expect(controller.logger.error).toHaveBeenCalledWith(expect.stringMatching(nonRecoverableError.message));
        expect(notifyFactory).toHaveBeenCalledWith(params.exitUrl);
        expect(controller.notify).toHaveBeenCalledWith('error', {
            errorLog: `${nonRecoverableErrorMessage}\n${nonRecoverableError.stack}`,
            errorMsg: lti_errormsg,
            recoverable: false
        });

        await vi.waitFor(async () => {
            expect(window.location.replace).toHaveBeenCalledWith(expectedUrl.toString());
        });
        windowLocationSpy.restore();
    });

    it('renders TheEnd page if exitUrl is absent', () => {
        const params = {
            internalError: recoverableError,
            lti_errormsg: 'Error is happened.',
            lti_errorlog: 'Log error message'
        };
        controller.start(params);
        expect(document.querySelector('.the-end')).toBeInTheDocument();
        expect(controller.logger.error).toHaveBeenCalledWith(expect.stringMatching(recoverableError.message));
        expect(notifyFactory).not.toHaveBeenCalled();
    });

    it('renders TheEnd page if error is recoverable, reloads the page on button click', async () => {
        const windowLocationSpy = createWindowLocationSpy();

        const params = {
            internalError: recoverableError,
            lti_errormsg: 'Error is happened.',
            lti_errorlog: 'Log error message',
            exitUrl: 'http://new.url'
        };
        controller.start(params);
        expect(document.querySelector('.the-end button')).toBeInTheDocument();
        expect(controller.logger.error).toHaveBeenCalledWith(expect.stringMatching(recoverableError.message));
        expect(notifyFactory).toHaveBeenCalledWith(params.exitUrl);
        expect(controller.notify).toHaveBeenCalledWith('error', {
            errorLog: `${recoverableErrorMessage}\n${recoverableError.stack}`,
            errorMsg: expect.any(String),
            recoverable: true
        });

        const theEndReloadButton = document.querySelector('.the-end button');
        theEndReloadButton.click();
        await tick();
        await tick();
        expect(window.location.reload).toHaveBeenCalled();
        windowLocationSpy.restore();
    });

    it('destroys TheEnd page if initialized', () => {
        controller.start();
        expect(document.querySelector('.the-end')).toBeTruthy();
        controller.stop();
        expect(document.querySelector('.the-end')).toBeFalsy();
    });

    it('do nothing if controller was not started', () => {
        const newController = ErrorController();
        controller.stop();
        expect(newController.theEndComponent).not.toBeDefined();
    });

    test.each([[false], [true]])(
        'KioskError: if denyProcesses specified, renders TheEnd page: afterLaunch=%s',
        afterLaunch => {
            const kioskService = { exit: vi.fn() };

            const denyProcessesError = new KioskError('oh no');
            denyProcessesError.denyProcesses = [
                { name: 'pr-b', label: 'Process B' },
                { name: 'pr-c', label: 'Process C' }
            ];
            denyProcessesError.afterLaunch = afterLaunch;

            const params = {
                internalError: denyProcessesError,
                exitUrl: 'http://new.url',
                kioskService,
                deliveryExecutionId: 'dx123'
            };
            controller.start(params);

            const theEndEl = document.querySelector('.the-end');
            expect(theEndEl).toBeTruthy();
            expect(theEndEl).toMatchSnapshot();

            const btn = theEndEl.querySelector('button');
            expect(kioskService.exit).not.toHaveBeenCalled();
            btn.click();
            expect(kioskService.exit).toHaveBeenCalled();
        }
    );

    it('KioskError: if no denyProcesses, redirects as other non-recoverable errors, adds special lti_errorlog', async () => {
        const kioskService = { exit: vi.fn() };
        const windowLocationSpy = createWindowLocationSpy();

        const kioskLaunchError = new KioskError('oh no');

        const params = {
            internalError: kioskLaunchError,
            exitUrl: 'http://new.url',
            kioskService,
            deliveryExecutionId: 'dx123'
        };
        controller.start(params);

        const lti_errormsg =
            "Can't start secure session\nTo start this secure session, install or update TAO Secure Browser.";
        const lti_errorlog = `Secure browser validation\n[dx123]`;
        const expectedUrl = new URL(params.exitUrl);
        expectedUrl.searchParams.append('lti_errormsg', lti_errormsg);
        expectedUrl.searchParams.append('lti_errorlog', lti_errorlog);

        await vi.waitFor(async () => {
            expect(window.location.replace).toHaveBeenCalledWith(expectedUrl.toString());
        });
        windowLocationSpy.restore();
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
            internalError: recoverableError,
            exitUrl: null
        };

        let windowLocationSpy;
        beforeAll(() => {
            windowLocationSpy = createWindowLocationSpy();
        });
        afterAll(() => {
            windowLocationSpy.restore();
        });

        test.each([
            [
                'recoverable error',
                'http://exit.url',
                recoverableError,
                `${recoverableError.message}\n${recoverableError.stack}\n[recoverable]`
            ],
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
