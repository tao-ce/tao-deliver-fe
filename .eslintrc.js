// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2019-2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
module.exports = {
    extends: ['@oat-sa/eslint-config-tao/svelte', '@oat-sa/eslint-config-tao/cypress'],
    root: true,
    globals: {
        vi: 'readonly'
    }
};
