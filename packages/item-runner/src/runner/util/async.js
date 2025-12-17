// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-23 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * @param {number} time
 * @returns {Promise<unknown>}
 */
export const wait = time =>
    new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });
