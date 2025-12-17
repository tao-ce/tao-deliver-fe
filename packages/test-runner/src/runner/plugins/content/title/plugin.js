// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import pluginFactory from 'taoTests/runner/plugin';
import { testSessionStatus } from '../../../session/sessionStates.js';
import { getTestSessionStatusStore } from '../../../testsStateStore.js';
import TestTitle from './TestTitle.svelte';
import HiddenContentTitle from './HiddenContentTitle.svelte';
import TimersAriaLive from './TimersAriaLive.svelte';
import { getNavigationFeedbacksStore } from '../../../feedback';

const defaultThrottleConfig = {
    minutesThreshold: 10
};

/**
 * This plugin generates a contextual titles
 */
export default pluginFactory({
    name: 'title',

    init() {
        //mandatory
    },

    /**
     * Render the TestTitle component inside the Header Area
     */
    render() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const testConfig = testRunner.getConfig();
        const serviceCallId = testConfig.serviceCallId;
        const titles = (testConfig.options || {}).titles;
        const navigationFeedbacksStore = getNavigationFeedbacksStore(serviceCallId);

        //render the title
        this.testTitle = new TestTitle({
            target: areaBroker.getHeaderArea(),
            props: {
                serviceCallId,
                titles
            }
        });

        //update the hidden title
        this.hiddenContentTitle = new HiddenContentTitle({
            target: areaBroker.getContainer().querySelector('#a11y-main'),
            props: {
                serviceCallId
            }
        });

        this.timersAriaLive = new TimersAriaLive({
            target: areaBroker.getHeaderArea(),
            props: {
                serviceCallId,
                throttleConfig: testConfig.options?.timersService?.throttleConfig || defaultThrottleConfig
            }
        });

        //focus hidden title on certain session status changes
        this.unsubscribeSessionStatus = getTestSessionStatusStore(testConfig.serviceCallId).subscribe(sessionStatus => {
            tick().then(() => {
                if (sessionStatus === testSessionStatus.interacting && !navigationFeedbacksStore.isAnyShown()) {
                    areaBroker.getContainer().querySelector('#a11y-main').focus();
                }
            });
        });
    },

    /**
     * Destroys the plugin
     */
    destroy() {
        if (this.unsubscribeSessionStatus) {
            this.unsubscribeSessionStatus();
            this.unsubscribeSessionStatus = null;
        }
        if (this.hiddenContentTitle) {
            this.hiddenContentTitle.$destroy();
        }
        if (this.testTitle) {
            this.testTitle.$destroy();
        }
        if (this.timersAriaLive) {
            this.timersAriaLive.$destroy();
        }
    }
});
