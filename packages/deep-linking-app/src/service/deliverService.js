// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import request from 'core/fetchRequest';
import jwtTokenRegistry from '@oat-sa/tao-core-sdk/src/core/jwt/jwtTokenRegistry';
import config from '../config';

/**
 * Fetches the deliveries from Deliver backend
 *
 * @returns {Promise<Response>}
 */
export const getDeliveries = () => {
    const { deliveries: deliveriesEndpoint } = config.endpoints;
    const jwtTokenHandler = jwtTokenRegistry.get();
    return request(`${deliveriesEndpoint.rootUrl}${deliveriesEndpoint.path}`, {
        method: deliveriesEndpoint.method,
        jwtTokenHandler,
    });
};

/**
 * Fetches the batteries from Deliver backend
 *
 * @returns {Promise<Response>}
 */
export const getBatteries = () => {
    const { batteries: batteriesEndpoint } = config.endpoints;
    const jwtTokenHandler = jwtTokenRegistry.get();
    return request(`${batteriesEndpoint.rootUrl}${batteriesEndpoint.path}`, {
        method: batteriesEndpoint.method,
        jwtTokenHandler,
    });
};

/**
 * Submits the batteries and deliveries to Deliver backend.
 * The response will contain the `url` where the frontend needs to redirect the user agent.
 *
 * @param {string[]} batteries
 * @param {string[]} deliveries
 * @returns {Promise<Response>}
 */
export const submitBatteriesAndDeliveries = (batteries, deliveries) => {
    const { submit: submitEndpoint } = config.endpoints;
    const jwtTokenHandler = jwtTokenRegistry.get();
    return request(`${submitEndpoint.rootUrl}${submitEndpoint.path}`, {
        method: submitEndpoint.method,
        body: JSON.stringify({ batteries, deliveries }),
        headers: {
            'Content-Type': 'application/json',
        },
        jwtTokenHandler,
    });
};
