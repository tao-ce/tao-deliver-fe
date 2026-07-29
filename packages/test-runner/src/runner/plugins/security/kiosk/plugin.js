// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { isPausedByProctorUiFlow } from '../../../util/proctoring';
import pluginFactory from 'taoTests/runner/plugin';
import { securityLog } from '../common/securityLog.js';
import KioskError from 'taoDeliverAppsCommon/core/error/KioskError.js';
import kioskServiceFactory from 'taoDeliverAppsCommon/service/runner/kiosk.js';

export default pluginFactory({
    name: 'kiosk',

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        const kioskConfig = testConfig.options?.kiosk;

        if (!kioskConfig?.enabled) {
            return;
        }

        this.kioskService = kioskServiceFactory(kioskConfig);
        const autoresume = !kioskConfig.pauseOnBreach;

        this.onBreach = async e => {
            let deviceInfo;
            let processList;
            try {
                deviceInfo = JSON.stringify(e.deviceInfo);
                processList = e.processList.join(', ');
            } catch {
                deviceInfo = '';
                processList = '';
            }

            securityLog(testRunner, 'lockdown-breach', { deviceInfo, processList });

            if (!autoresume) {
                if (!isPausedByProctorUiFlow(testRunner)) {
                    const pauseReason = 'lockdown-breach-pause';
                    testRunner.trigger('security-showed', {
                        plugin: pauseReason,
                        autoresume,
                        action: 'pause',
                        category: 'examinee',
                        subcategory: 'other',
                        message: 'Test taker may be attempting to breach the lockdown browser mode.'
                    });
                    //timeout only to avoid visual glitch with loader spinner slide-out animation
                    setTimeout(() => {
                        testRunner.trigger('security-closed', {
                            plugin: pauseReason,
                            autoresume
                        });
                    }, 200);
                }
            }
        };
    },

    init() {
        if (!this.kioskService) {
            return;
        }

        this.kioskService.addBreachListener(this.onBreach);

        const testRunner = this.getTestRunner();
        testRunner.on(`loaditem.${this.getName()}`, async () => {
            if (this.kioskService) {
                try {
                    await this.kioskService.validateProcessDenyList();
                } catch (err) {
                    if (err instanceof KioskError) {
                        securityLog(testRunner, 'lockdown-processes-after-launch', {
                            processes: err.denyProcesses?.map(i => i.name).join(', ') || ''
                        });
                        err.afterLaunch = true;
                    }
                    testRunner.trigger('error', err);
                }
            }
        });
    },

    destroy() {
        const testRunner = this.getTestRunner();
        testRunner.off(`.${this.getName()}`);
        this.kioskService?.removeBreachListener(this.onBreach);
    }
});
