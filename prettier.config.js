// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const config = require('@oat-sa/prettier-config');

delete config.parser;

config.svelteSortOrder = 'options-scripts-styles-markup';
config.bracketSameLine = true;
config.plugins = ['prettier-plugin-svelte'];

module.exports = config;
