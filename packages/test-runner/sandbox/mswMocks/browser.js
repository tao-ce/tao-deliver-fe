// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

export const worker = setupWorker(...handlers);
