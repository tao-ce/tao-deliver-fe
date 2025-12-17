// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// mock store for custom interaction
vi.mock('core/store', () => {
    const store = () =>
        Promise.resolve({
            getItem() {
                return Promise.resolve();
            },
            setItem() {
                return Promise.resolve(true);
            }
        });
    store.backends = {
        memory: 'memory'
    };
    return {
        __esModule: true,
        default: store
    };
});

import { getRenderer } from '../index.js';

describe('Renderer', () => {
    test.each([[void 0], ['foo']])('returns with default if %s unexisitng renderer is requested', name => {
        expect(getRenderer(name).name).toBe('common');
    });

    test.each([['common'], ['review']])('returns with requested %s renderer', name => {
        const renderer = getRenderer(name);
        expect(renderer.name).toBe(name);
        expect(typeof renderer.getInteractions()).toBe('object');
    });

    test.each([
        ['common', 'author'],
        ['common', 'candidate'],
        ['review', 'proctor'],
        ['review', 'scorer'],
        ['common', 'testConstructor'],
        ['review', 'tutor']
    ])('returns with %s renderer for %s alias', (name, alias) => {
        expect(getRenderer(alias).name).toBe(name);
    });
});
