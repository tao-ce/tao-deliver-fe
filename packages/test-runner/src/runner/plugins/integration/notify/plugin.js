// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';

/**
 * This plugin notifies the parent window of all the events of the TestRunner life-cycle
 */
export default pluginFactory({
    name: 'notify',

    init() {
        if (window.parent) {
            const testrunner = this.getTestRunner();
            const targetOrigin = testrunner.getConfig()?.options?.iframeParentOrigin || '*';
            const notify = (event, parameters = {}) => {
                window.parent.postMessage({ event, parameters }, targetOrigin);
            };
            testrunner
                .on('init', () => notify('init'))
                .on('render', () => notify('render'))
                .on('loaditem', itemIdentifier => notify('loaditem', { itemIdentifier }))
                .on('renderitem', itemIdentifier => notify('renderitem', { itemIdentifier }))
                .on('unloaditem', itemIdentifier => notify('unloaditem', { itemIdentifier }))
                .on('enableitem', itemIdentifier => notify('enableitem', { itemIdentifier }))
                .on('disableitem', itemIdentifier => notify('disableitem', { itemIdentifier }))
                .on('finish', () => notify('finish'))
                .on('flush', () => notify('flush'))
                .on('error', error => notify('error', { error }))
                .on('destroy', () => notify('destroy'));
        }
    }
});
