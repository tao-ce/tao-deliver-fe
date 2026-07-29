// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import ItemRunnerSandbox from './ItemRunnerSandbox.svelte';
import '@oat-sa-private/ui-core/polyfills.js';
import '@oat-sa-private/ui-identity/css/main.css';
import itemRunner from 'taoItems/runner/api/itemRunner.js';
import { providerName, default as provider } from '../src/runner/qti.js';
import { mount } from 'svelte';

//the provider needs to be registered globally, once.
itemRunner.register(providerName, provider);

mount(ItemRunnerSandbox, {
    target: document.body
});
