// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Performs security logging.
 * @param {object} testRunner - The test runner object.
 * @param {string} reason - The reason for the security log action.
 */
export const securityLog = (testRunner, reason) => {
    testRunner.getProxy().callTestAction('security-log', {
        action: 'flag',
        reason: reason
    });
};
