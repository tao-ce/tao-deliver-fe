// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

module.exports = function babelConfig(api) {
    const isTest = api.env('test');
    api.cache(true);

    const plugins = [];
    let presets = [
        [
            '@babel/preset-env',
            {
                // forceAllTransforms needed to make AMD build ES5-compatible for external bundler
                forceAllTransforms: !!process.env.AMDBUILD,
                debug: false
            }
        ]
    ];

    // Jest+Babel configuration:
    if (isTest) {
        presets = [
            [
                '@babel/preset-env',
                {
                    targets: {
                        node: process.versions.node
                    }
                }
            ]
        ];
    }

    return {
        presets,
        plugins
    };
};
