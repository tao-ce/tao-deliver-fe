// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import * as base64UploadService from './base64.js';
import * as cloudStorageUploadService from './cloudStorage.js';

/**
 * @typedef {Object} UploadService
 * @property {Function} default
 * @property {Function} cancelAllUploads
 */
/**
 * List of upload services implementations
 * @type {Object<string, UploadService>}
 */
export default Object.freeze({
    base64: base64UploadService,
    'cloud-storage': cloudStorageUploadService
});
