// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { __ } from '@oat-sa-private/ui-core';

const rootUrl = window.env.DEEP_LINKING_API_URL || 'https://deliver.docker.localhost';

export default {
    locale: 'en-US',
    accessTokenTTL: 3600,
    baseUrls: {
        api: rootUrl,
        authServer: window.env.AUTH_SERVER_URL,
    },
    endpoints: {
        refreshToken: {
            rootUrl,
            path: '/api/v1/auth/refresh-tokens',
            method: 'GET',
        },
        batteries: {
            rootUrl,
            path: '/api/v1/lti/deep-links/batteries',
            method: 'GET',
        },
        deliveries: {
            rootUrl,
            path: '/api/v1/lti/deep-links/deliveries',
            method: 'GET',
        },
        submit: {
            rootUrl,
            path: '/api/v1/lti/deep-links/submit',
            method: 'POST',
        },
    },
    tabs: {
        batteries: { id: 'batteries', label: __('Batteries') },
        deliveries: { id: 'deliveries', label: __('Deliveries') },
    },
    dataTable: {
        batteries: {
            columns: [
                { id: 'name', label: __('Name') },
                { id: 'id', label: __('ID') },
                { id: 'nrOfDeliveries', label: __('Deliveries') },
            ],
        },
        deliveries: {
            columns: [
                { id: 'name', label: __('Name') },
                { id: 'id', label: __('Published delivery ID') },
            ],
        },
    },
};
