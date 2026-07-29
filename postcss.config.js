// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
const path = require('path');
const postcssGlobalNested = require('@oat-sa/postcss-global-nested');
const postcssCustomMedia = require('postcss-custom-media');
const postcssGlobalData = require('@csstools/postcss-global-data');

const plugins = [
    require('postcss-import')(require('postcss-normalize')().postcssImport()),
    postcssGlobalData({
        files: [
            path.join(__dirname, 'node_modules/@oat-sa-private/ui-identity/css/abstracts/_breakpoints.css')
        ]
    }),
    postcssCustomMedia(),
    require('postcss-mixins')({
        mixinsDir: path.join(__dirname, 'node_modules/@oat-sa-private/ui-identity/css/mixins')
    }),
    require('postcss-preset-env')({
        stage: 1,

        features: {
            'nesting-rules': {
                edition: '2021', // this old edition still allows noIsPseudoSelector, and doesn't break global-nested usages
                noIsPseudoSelector: true
            },
            'focus-within-pseudo-class': false,
            'focus-visible-pseudo-class': false,
            'custom-media-queries': false,
            'custom-properties': false,
            'overflow-wrap-property': false,
            'logical-properties-and-values': false
        },
        insertAfter: {
            'nesting-rules': postcssGlobalNested
        }
    })
];

module.exports = {
    map: { inline: false },
    plugins
};
