// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * If a "response" object (can be the item state or item response or both)
 * contains some promise, we wait for those promises to resolve and replace them by their current value.
 * @param {Object} response
 * @returns {Promise<Object>} the resolved response
 */
export function waitForResponsePromises(response) {
    if (!response || typeof response !== 'object') {
        return Promise.resolve(response);
    }
    const asyncResponses = [];

    //TODO it can be safer to have a deep clone and update the result of the promise into the clone
    const resolvedResponse = Object.assign({}, response);
    const extractPromises = targetObject => {
        if (targetObject && typeof targetObject === 'object') {
            for (let key of Object.keys(targetObject)) {
                if (targetObject[key] instanceof Promise) {
                    const responsePromise = targetObject[key];

                    //tells the promise has a consumer,
                    //and the consumer will handle the rejection
                    responsePromise.handled = true;

                    asyncResponses.push(
                        new Promise((resolve, reject) => {
                            responsePromise
                                .then(result => {
                                    //once resolved, the response is updated
                                    //with the promise result
                                    targetObject[key] = result;
                                    resolve();
                                })
                                .catch(reject);
                        })
                    );
                } else {
                    extractPromises(targetObject[key]);
                }
            }
        }
    };
    extractPromises(resolvedResponse);
    return Promise.all(asyncResponses).then(() => resolvedResponse);
}
