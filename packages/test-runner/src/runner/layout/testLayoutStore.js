// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { writable } from 'svelte/store';

const defaultStoreValue = {
    activeTool: '',
    // should the TestLayout display the asideStart area
    asideStart: false,
    // should the TestLayout display the asideEnd area
    asideEnd: false
};

export const testLayoutStore = writable({ ...defaultStoreValue });

export const clearTestLayoutStore = () => {
    testLayoutStore.set({ ...defaultStoreValue });
};

export const setActiveTool = toolType => testLayoutStore.set({activeTool: toolType});
