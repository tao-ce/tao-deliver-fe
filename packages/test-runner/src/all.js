// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * This is the file used as the input for the AMD build of the package (@see ../rollup.config.js)
 * It re-exports everything that may be needed to run the test runner in an AMD-based project.
 */

import {
    titlePlugin,
    menuPanelPlugin,
    settingsPlugin,
    jumpMenuPlugin,
    navigatorPlugin
} from './runner/plugins/index.js';
const plugins = {
    titlePlugin,
    menuPanelPlugin,
    settingsPlugin,
    jumpMenuPlugin,
    navigatorPlugin
};

export { default as qtiTestRunner } from './runner/qti.js';
export * from '@oat-sa-private/tao-item-runner-qtinui/src/index.js';
export { __ } from '@oat-sa-private/ui-core';
export { plugins };
export { default as getAssetManager } from './runner/config/assetManager.js';
export * from './dynamicModulesIndex.js';
