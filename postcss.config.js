// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
const path = require('path');
const postcssGlobalNested = require('@oat-sa/postcss-global-nested');

const plugins = [
    require('postcss-import')(require('postcss-normalize')().postcssImport()),
    require('postcss-mixins')({
        mixinsDir: path.join(__dirname, 'node_modules/@oat-sa-private/ui-identity/css/mixins')
    }),
    require('postcss-preset-env')({
        stage: 1,

        features: {
            'nesting-rules': {
                noIsPseudoSelector: true
            },
            'focus-within-pseudo-class': false,
            'focus-visible-pseudo-class': false,
            'custom-media-queries': {
                importFrom: [
                    path.join(__dirname, 'node_modules/@oat-sa-private/ui-identity/css/abstracts/_breakpoints.css')
                ]
            },
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
