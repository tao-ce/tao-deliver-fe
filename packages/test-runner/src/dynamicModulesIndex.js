// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
/**
 * !! This file can be intentionally replaced with a custom version at build time, using Rollup aliases !!
 *
 * When using the listed modules in the app, make sure to import them **ONLY** from this file!
 */

export { default as TestLayout } from './runner/TestLayout.svelte';
export { checkNavigationFeedback, getNavigationFeedbackConfig } from './runner/feedback/navigationFeedback.js';
