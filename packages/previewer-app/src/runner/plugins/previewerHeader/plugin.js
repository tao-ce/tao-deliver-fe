// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import PreviewerHeader from './PreviewerHeader.svelte';
import { mount, unmount } from 'svelte';

/**
 * This plugin generates a contextual titles
 */
export default pluginFactory({
    name: 'previewerHeader',

    init() {
        //mandatory
    },

    render() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const testConfig = testRunner.getConfig();
        const { getLaunchUrlForLocale, serviceCallId } = testConfig;

        this.header = mount(PreviewerHeader, {
            target: areaBroker.getTopBarArea(),
            props: {
                serviceCallId,
                getLaunchUrlForLocale
            }
        });
    },

    destroy() {
        if (this.header) {
            unmount(this.header);
        }
    }
});
