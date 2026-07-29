// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * @typedef PlagiarismCheckReport
 * @property {String} provider - name which maps to a reportComponent which should render the report
 * @property {String} status - pending, error, suspicious, clear
 * @property {String} [href] - static URI of the report document
 * @property {String} [reportUrl] - API endpoint for fetching dynamic URI of the report document
 * Any other properties could be included, depending on the chosen reportComponent's API
 */

export {};
