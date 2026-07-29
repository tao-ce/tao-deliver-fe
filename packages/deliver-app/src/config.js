// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { __ } from '@oat-sa-private/ui-core';
/**
 *  The default configuration
 */
const rootUrl = window.env.API_URL || 'http://localhost:8010';

export default {
    locale: 'en-US',
    endpoints: {
        refreshToken: {
            rootUrl,
            path: '/api/v1/auth/refresh-tokens',
            method: 'GET'
        },
        configuration: {
            rootUrl,
            path: '/api/v1/delivery-executions',
            resource: 'configuration',
            method: 'GET'
        },
        initItems: {
            rootUrl,
            path: '/api/v1/init-items',
            method: 'GET'
        },
        actions: {
            rootUrl,
            path: '/api/v1/delivery-executions',
            resource: 'actions',
            method: 'POST'
        },
        attachmentsUploadData: {
            rootUrl,
            path: '/api/v1/delivery-executions',
            resource: 'attachments',
            method: 'POST'
        },
        errorLog: {
            rootUrl,
            path: '/api/v1/delivery-executions',
            resource: 'log',
            method: 'POST'
        },
        saveScoringInlineComments: {
            rootUrl,
            path: '/api/v1/delivery-executions',
            resource: 'scoring/inline-comment',
            method: 'PUT'
        },
        saveScoringAnnotationComment: {
            rootUrl,
            path: '/api/v1/delivery-executions',
            resource: 'scoring/annotation-comment',
            method: 'PUT'
        },
        batteryDistributionLocale: {
            rootUrl,
            path: '/api/v1/battery-distributions',
            resource: 'locale',
            method: 'PUT'
        },
        deliveryExecutionLocale: {
            rootUrl,
            path: '/api/v1/delivery-executions',
            resource: 'locale',
            method: 'PUT'
        }
    },
    runnerConfiguration: {
        staticUrl: (window.env && window.env.STATIC_URL) || 'http://localhost:8011',
        requestTimeout: 30 * 1000,
        itemStoreTTL: 30 * 60 * 1000,
        providers: {
            runner: {
                id: 'qtinui',
                module: 'taoQtiNuiTest/runner/qti',
                category: 'runner'
            },
            itemRunner: {
                id: 'qtinui',
                module: 'taoQtiNuiItem/runner/qti',
                category: 'runner'
            },
            proxy: {
                id: 'actions-proxy',
                module: 'taoQtiNuiTest/runner/proxy/actionProxy',
                category: 'proxy'
            },
            plugins: [
                {
                    id: 'titlePlugin',
                    module: 'taoQtiNuiTest/runner/plugins/content/title/plugin',
                    category: 'content'
                },
                {
                    id: 'menuPanelPlugin',
                    module: 'taoQtiNuiTest/runner/plugins/panel/menu/plugin',
                    category: 'content'
                },
                {
                    id: 'jumpMenuPlugin',
                    module: 'taoQtiNuiTest/runner/plugins/navigation/jumpMenu/plugin',
                    category: 'content'
                },
                {
                    id: 'navigatorPlugin',
                    module: 'taoQtiNuiTest/runner/plugins/navigation/navigator/plugin',
                    category: 'content'
                },
                {
                    id: 'settingsPlugin',
                    module: 'taoQtiNuiTest/runner/plugins/settings/plugin',
                    category: 'settings'
                },
                {
                    id: 'localItemState',
                    module: 'taoQtiNuiTest/runner/plugins/localItemState/plugin',
                    category: 'state'
                }
            ]
        },
        themes: {
            platform: {
                get title() {
                    return __('TAO: test session');
                },
                favicon: {
                    type: 'image/x-icon',
                    href: 'favicon.ico'
                }
            }
        }
    },
    exitPageRoutes: {
        error: '/error',
        thankYou: '/thank-you'
    },
    exitPageParams: {
        lti_errorlog: {
            maxLength: 6500
        }
    },
    errorLog: {
        saveEnabled: true
    },
    accessTokenTTL: 500000
};
