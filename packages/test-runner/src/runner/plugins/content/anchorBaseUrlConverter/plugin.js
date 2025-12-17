// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';

/**
 * This plugin will make sure the anchor relative urls point to the original base URL (fix base html tag behaviour)
 */
export default pluginFactory({
    name: 'anchorBaseUrlConverter',

    init() {
        const testRunner = this.getTestRunner();
        const container = testRunner.getAreaBroker().getContainer();
        const convert = () => {
            let links = container.querySelectorAll("a[href^='#']");

            links.forEach(link => {
                const oldLinkURL = new URL(link.href);
                const newLinkURL = new URL(location);
                newLinkURL.hash = oldLinkURL.hash;
                link.href = newLinkURL.href;

                // neutralize the anchor targets placed inside a hidden container
                const anchors = document.querySelectorAll(`${oldLinkURL.hash}`);
                if (anchors && anchors.length > 1) {
                    anchors.forEach(anchor => {
                        if (anchor.closest('.hidden')) {
                            anchor.removeAttribute('id');
                        }
                    });
                }
            });
        };

        testRunner.on('renderitem', () => convert());
    }
});
