// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { __ } from '@oat-sa-private/ui-core';

/**
 *  The default configuration
 */
const rootUrl = (window.env && window.env.PREVIEW_API_URL) || 'http://localhost:8001';

export default {
    locale: 'en-US',
    endpoints: {
        unit: {
            rootUrl,
            path: '/api/v1/package',
            resource: 'unit',
            method: 'GET'
        },
        init: {
            rootUrl,
            path: '/api/v1/package/unit',
            resource: 'init',
            method: 'GET'
        },
        getItem: {
            rootUrl,
            path: '/api/v1/package/unit',
            resource: 'item',
            method: 'GET'
        }
    },
    runnerConfiguration: {
        staticUrl: (window.env && window.env.PREVIEW_STATIC_URL) || 'http://localhost:8021',
        requestTimeout: 30 * 1000,
        providers: {
            runner: {
                id: 'qtiPreviewer',
                module: 'taoQtiNuiPreviewer/runner/qtiPreviewer',
                category: 'runner'
            },
            itemRunner: {
                id: 'qtinui',
                module: 'taoQtiNuiItem/runner/qti',
                category: 'runner'
            },
            proxy: {
                id: 'qtiPreviewerProxy',
                module: 'taoQtiNuiPreviewer/runner/proxy/previewerProxy',
                category: 'proxy'
            },
            plugins: [
                {
                    id: 'navigatorPlugin',
                    module: 'taoQtiNuiPreviewer/runner/plugins/previewerNavigator/plugin',
                    category: 'content'
                },
                {
                    id: 'previewerHeader',
                    module: 'taoQtiNuiPreviewer/runner/plugins/previewerHeader/plugin',
                    category: 'content'
                },
                {
                    id: 'bookletExport',
                    module: 'taoQtiNuiTest/runner/plugins/export/bookletExport/plugin',
                    category: 'content'
                },
                {
                    id: 'anchorBaseUrlConverter',
                    module: 'taoQtiNuiTest/runner/plugins/content/anchorBaseUrlConverter/plugin',
                    category: 'content'
                },
                {
                    id: 'customUIStyles',
                    module: 'taoQtiNuiTest/runner/plugins/layout/customUIStyles/plugin',
                    category: 'layout'
                }
            ]
        },
        options: {
            itemRunnerConfig: {
                hideFeedbacks: true,
                // TODO: move the customer itemStyles to somewhere not hardcoded
                itemStyles:
                    '.match-tabular.match-tabular.match-tabular .match-tabular-header-cell.match-tabular-header-cell.match-tabular-header-cell {padding: var(--space-1x5) var(--space-1x);} .emphasized {font-style: italic;} .bolded {font-weight: bold;} .underlined {text-decoration: underline;}'
            },
            proxy: {
                retryInterval: 5 * 1000,
                retryTimeout: 2 * 60 * 1000
            },
            plugins: {
                customUIStyles: {
                    qtiItemContainerSelector: '.qti-item',
                    // This style was adopted from the following repository: https://github.com/oat-sa/pisa-deliver-fe/tree/develop/packages/pisa-test-runner/sandbox/presets/testRunnerConfig
                    core1: '.qti-item-container,.runner-component,.test-container{display:flex;justify-content:center}.test-runner.custom-ui.core1 .qti-customInteraction[data-type-identifier^=trendItem_]{transform-origin:top center;margin:-2rem}.qti-item{flex-grow:1}@media screen and (min-width:3841px){html{font-size:8px}}@media screen and (min-width:2561px){html{font-size:8px}}@media screen and (min-width:1920px){html{font-size:8px}.test-runner.custom-ui.core1,[data-custom-ui-id=core1]{width:1920px;height:1080px}.test-runner.custom-ui.core1 .qti-item{height:1012px}.test-runner.custom-ui.core1 .qti-customInteraction[data-type-identifier^=trendItem_]{transform:scale(calc(1012 / 718))}}@media screen and (min-width:1600px) and (max-width:1919px){.test-runner.custom-ui.core1,[data-custom-ui-id=core1]{width:1600px;height:900px}.test-runner.custom-ui.core1 .qti-item{height:832px}.test-runner.custom-ui.core1 .qti-customInteraction[data-type-identifier^=trendItem_]{transform:scale(calc(832 / 718))}}@media screen and (max-width:1599px){.test-runner.custom-ui.core1,[data-custom-ui-id=core1]{width:1366px;height:768px}.test-runner.custom-ui.core1 .qti-item:has(.qti-customInteraction[data-type-identifier^=trendItem_]){height:700px;overflow:hidden}.test-runner.custom-ui.core1 .qti-customInteraction[data-type-identifier^=trendItem_]{transform:scale(calc(700 / 718))}}',
                    core4: '.qti-item-container,.runner-component,.test-container{display:flex;justify-content:center;--testrunner-header-height:0}#test-top-bar{display:none}.qti-item {flex-grow: 1;}.qti-item>.core4:not(.grid-row):not(.qti-layout-row):first-child{margin:0}@media screen and (min-width:3841px){html{font-size:8px}}@media screen and (min-width:2561px){html{font-size:8px}}@media screen and (min-width:1920px){html{font-size:8px}.test-runner.custom-ui.core4,[data-custom-ui-id=core4]{width:1920px;height:1080px}.test-runner.custom-ui.core4 .qti-item{height:1012px}}@media screen and (min-width:1600px) and (max-width:1919px){.test-runner.custom-ui.core4,[data-custom-ui-id=core4]{width:1600px;height:900px}.test-runner.custom-ui.core4 .qti-item{height:832px}}@media screen and (max-width:1599px){.test-runner.custom-ui.core4,[data-custom-ui-id=core4]{width:1366px;height:768px}.test-runner.custom-ui.core4 .qti-item{height:700px}}'
                }
            }
        },
        themes: {
            platform: {
                title: __('TAO - Previewer'),
                favicon: {
                    type: 'image/x-icon',
                    href: 'favicon.ico'
                }
            }
        }
    },
    routes: {
        splash: '/',
        error: '/error',
        testPreview: '/test-preview/',
        bookletExport: '/booklet-export/',
        exit: '/exit'
    }
};
