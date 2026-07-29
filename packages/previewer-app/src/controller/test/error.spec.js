// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2023 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import ErrorController from '../error.js';
import ActionError from 'taoDeliverAppsCommon/core/error/ActionError.js';
import NetworkError from '@oat-sa/tao-core-sdk/src/core/error/NetworkError';
import { getIsRetriableFromError } from '../../core/errorMessages.js';

let mockContainer = document;

vi.mock('../page.js', () => ({
    __esModule: true,
    default: controller =>
        Object.assign(controller, {
            container: mockContainer,
            logger: {
                error: vi.fn()
            }
        })
}));

vi.mock('../../core/errorMessages.js', async () => {
    const originalModule = await vi.importActual('../../core/errorMessages.js');
    return {
        ...originalModule,
        getErrorDetailsFromError: vi.fn(),
        getErrorMessageFromError: vi.fn(() => ({
            title: 'Unexpected error.',
            cause: 'Sorry, an unexpected error happened during the test.',
            remediation: 'Please contact your test administrator.'
        })),
        getIsRetriableFromError: vi.fn(() => true) // Add retry check mock
    };
});

describe('handling errors', () => {
    let controller;
    const error = new ActionError('Item is not available', 500); //default recoverable error

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="page">
                <div id="page-main"></div>
            </div>
        `;
        controller = ErrorController();
    });

    afterEach(() => {
        controller.stop();
        document.body.innerHTML = '';
    });

    it('renders TheEnd page if no params passed', () => {
        controller.start();
        expect(document.querySelector('.the-end h1')).toBeInTheDocument();
        expect(document.querySelector('button')).not.toBeInTheDocument();
        expect(document.querySelector('.the-end')).toMatchSnapshot();
        expect(controller.logger.error).toHaveBeenCalledTimes(0);
    });

    it('renders TheEnd page if only recoverable internal error passed', () => {
        const params = {
            internalError: error
        };
        controller.start(params);
        expect(controller.logger.error).toHaveBeenCalledWith(error);
        expect(document.querySelector('.the-end h1')).toBeInTheDocument();
        expect(document.querySelector('button')).toBeInTheDocument();
    });

    it('redirect non-recoverable issue to external page', () => {
        const replaceMock = vi.fn();

        // Store original location
        const originalLocation = window.location;

        // Mock window.location.replace
        delete window.location;
        window.location = { replace: replaceMock };

        // Mock getIsRetriableFromError to return false for non-recoverable error
        getIsRetriableFromError.mockImplementationOnce(() => false);

        const nonRecoverableError = new NetworkError('Something goes wrong', 503, null, false);

        const params = {
            internalError: nonRecoverableError,
            exitUrl: 'http://new.url'
        };
        controller.start(params);
        expect(controller.logger.error).toHaveBeenCalledWith(nonRecoverableError);
        expect(replaceMock).toHaveBeenCalledWith('http://new.url');

        // Restore original location
        window.location = originalLocation;
    });

    it('renders TheEnd page if exitUrl is absent', () => {
        const params = {
            internalError: error
        };
        controller.start(params);
        expect(document.querySelector('.the-end h1')).toBeInTheDocument();
        expect(document.querySelector('button')).toBeInTheDocument();
        expect(controller.logger.error).toHaveBeenCalledWith(error);
    });

    it('renders TheEnd page if error is recoverable', () => {
        const params = {
            internalError: error,
            exitUrl: 'http://new.url'
        };
        controller.start(params);
        expect(document.querySelector('.the-end h1')).toBeInTheDocument();
        expect(document.querySelector('button')).toBeInTheDocument();
        expect(controller.logger.error).toHaveBeenCalledWith(error);
    });

    it('do nothing if controller was not started', () => {
        const newController = ErrorController();
        controller.stop();
        expect(newController.theEndComponent).not.toBeDefined();
    });
});
