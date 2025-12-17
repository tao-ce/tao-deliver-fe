// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import * as interactions from '../interactions/index.js';

export default {
    name: 'common',
    // async module load can be added here
    getInteractions() {
        return interactions;
    }
};
