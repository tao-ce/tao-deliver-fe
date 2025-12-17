// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * @example schema of incoming data
    [{
      "provider": "hbl",
      "responses": {
        "RESPONSE_1": {
          "status": "pending"
        },
        "RESPONSE_2": {
          "status": "error"
        }
      }
    }]
 */
/**
 * @typedef {PlagiarismReportProps}
 * @property {String} provider
 * @property {String} status
 * @property {String} href
 */
/**
 * Transform plagiarism data from incoming format to component props format
 * @param {String} responseIdentifier
 * @param {Object[]} plagiarismReports
 * @returns {PlagiarismReportProps[]}
 */
/* eslint-disable no-unused-vars */
export function normalizeReports(responseIdentifier, plagiarismReports = []) {
    if (!Array.isArray(plagiarismReports)) {
        return [];
    }
    return plagiarismReports.map(({ provider, responses }) => {
        if (!responses) {
            return;
        }
        const response = responses[responseIdentifier];
        if (response) {
            return {
                provider,
                ...response
            };
        }
    });
}
