// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// Styles
import '@oat-sa-private/ui-core/polyfills.js';
import '@oat-sa-private/ui-identity/css/main.css';
import '@oat-sa-private/ui-identity/css/abstracts/themes/_funky.css';
import '@oat-sa-private/ui-identity/css/abstracts/themes/_neon-dark.css';
import './index.css';

// Scripts
import testRunnerFactory from 'taoTests/runner/runner.js';
import qtinuiTestRunnerProvider from '../src/runner/qti.js';
import qtinuiTestRunnerReviewProvider from '../src/runner/qtiReview.js';
import qtinuiTestRunnerExportProvider from '../src/runner/qtiExport.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import presetProxy from './presetProxy.js';
import itemRunner from 'taoItems/runner/api/itemRunner.js';
import qtinuiItemRunnerProvider from '@oat-sa-private/tao-item-runner-qtinui/src/runner/qti.js';
import TestRunnerSandbox from './TestRunnerSandbox.svelte';

// MSW is set up to act as the tao-timers-be websocket backend in the sandbox
import { worker } from './mswMocks/browser.js';
await worker.start({ quiet: true });

testRunnerFactory.registerProvider('qtinui', qtinuiTestRunnerProvider);
testRunnerFactory.registerProvider('qtinuiReview', qtinuiTestRunnerReviewProvider);
testRunnerFactory.registerProvider('qtinuiExport', qtinuiTestRunnerExportProvider);
proxyFactory.registerProvider('preset', presetProxy);
itemRunner.register('qtinui', qtinuiItemRunnerProvider);

new TestRunnerSandbox({
    target: document.body
});
