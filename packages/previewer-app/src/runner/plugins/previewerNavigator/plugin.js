// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import pluginFactory from 'taoTests/runner/plugin';
import PreviewerNavigator from './PreviewerNavigator.svelte';

/**
 * the previewer navigator plugin handles:
 *  - the next/previous buttons
 *  - the progress visualization
 */
export default pluginFactory({
    name: 'previewerNavigator',

    init() {
        const testRunner = this.getTestRunner();
        testRunner
            .on('enablenav', () => {
                this.enable();
            })
            .on('disablenav', () => {
                this.disable();
            });
    },

    render() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const testConfig = testRunner.getConfig();

        this.navigator = new PreviewerNavigator({
            target: areaBroker.getNavigationArea(),
            props: {
                serviceCallId: testConfig.serviceCallId,
                disabled: true
            }
        });

        this.navigator.$on('move', e => {
            const { direction, scope, position } = e.detail;
            if (direction === 'next') {
                testRunner.next(scope);
            } else if (direction === 'previous') {
                testRunner.previous(scope);
            } else {
                if (testRunner.getTestContext().itemPosition !== position) {
                    testRunner.jump(position);
                }
            }
        });
    },

    enable() {
        if (this.navigator) {
            this.navigator.$set({ disabled: false });
        }
    },

    disable() {
        if (this.navigator) {
            this.navigator.$set({ disabled: true });
        }
    },

    destroy() {
        if (this.navigator) {
            this.navigator.$destroy();
        }
    }
});
