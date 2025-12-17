// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { writable } from 'svelte/store';

/**
 * Store intended to get access for info about choices
 * @returns {SvelteStore}
 */
export default function createChoicesStore() {
    const { subscribe, set } = writable({});

    return {
        subscribe,
        init: choices => {
            const newChoicesObject = {};
            choices.forEach(choice => (newChoicesObject[choice.identifier] = choice));
            set(newChoicesObject);
        }
    };
}
