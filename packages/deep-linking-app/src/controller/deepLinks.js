// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pageController from 'taoDeliverAppsCommon/controller/page.js';
import urlBuilder from 'taoDeliverAppsCommon/core/urlBuilder.js';
import jwtTokenHandlerFactory from '@oat-sa/tao-core-sdk/src/core/jwt/jwtTokenHandler';
import jwtTokenRegistry from '@oat-sa/tao-core-sdk/src/core/jwt/jwtTokenRegistry';
import { parseJwtPayload } from '@oat-sa/tao-core-sdk/src/core/jwt/jwtToken';
import config from '../config.js';
import DeepLinks from '../component/DeepLinks.svelte';

export default () =>
    pageController({
        name: 'deep-links',

        createJWTTokenHandler: function(sessionId) {
            const jwtTokenHandler = jwtTokenHandlerFactory({
                refreshTokenUrl: urlBuilder.urlFromConfig(config.endpoints.refreshToken),
                useCredentials: true,
                accessTokenTTL: config.accessTokenTTL,
                usePerTokenTTL: true,
                refreshTokenParameters: { refreshTokenId: sessionId },
            });

            jwtTokenRegistry.register(jwtTokenHandler);
        },

        start: function({ sessionId, hideBatteries, hideDeliveries }) {
            this.createJWTTokenHandler(sessionId);

            const jwtTokenHandler = jwtTokenRegistry.get();

            jwtTokenHandler.getToken().then((token) => {
                const parsedToken = parseJwtPayload(token);
                const deepLinkingSettings = parsedToken['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'];

                this.deepLinksComponent = new DeepLinks({
                    target: this.container,
                    props: {
                        isMultiSelectEnabled: deepLinkingSettings['accept_multiple'],
                        hideBatteries,
                        hideDeliveries,
                    },
                });
            });
        },

        stop: function() {
            if (this.deepLinksComponent) {
                this.deepLinksComponent.$destroy();
            }
        }
    });
