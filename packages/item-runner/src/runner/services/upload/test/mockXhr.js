// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { vi } from 'vitest';

/**
 * Factory for mock for window.XMLHttpRequest
 * @param {object} [overrides]
 * @returns {object}
 * @example
 * let xhrSpy;
 *
 * beforeEach(() => {
 *   xhrSpy = vi.spyOn(window, 'XMLHttpRequest');
 * });
 * afterEach(() => {
 *   xhrSpy.mockRestore();
 * });
 *
 * const xhrMock = mockXhr({ status: 404, responseText: 'Not Found', sendDelay: 50 });
 * xhrSpy.mockImplementation(() => xhrMock);
 *
 * TODO: consider if xhr-mock or msw libraries will do it easier...
 */
export function mockXhr(overrides = {}) {
    const listeners = {};
    const _trigger = (name, evt) => {
        if (listeners[name]) {
            listeners[name](evt);
        }
    };
    const mock = Object.assign(
        {
            _trigger,
            open: vi.fn(),
            send: vi.fn(() => {
                setTimeout(() => {
                    _trigger('progress', { lengthComputable: true, loaded: 5, total: 10 });
                    _trigger('load', {});
                }, overrides.sendDelay || 0);
            }),
            abort: vi.fn(() => {
                _trigger('abort', {});
            }),
            setRequestHeader: vi.fn(),
            getAllResponseHeaders: vi.fn(() => ''),
            getResponseHeader: vi.fn(),
            addEventListener: (name, callback) => {
                listeners[name] = callback;
            },
            removeEventListener: name => {
                delete listeners[name];
            },
            upload: {
                addEventListener: (name, callback) => {
                    listeners[name] = callback;
                }
            },
            readyState: 4,
            status: 200,
            responseText: ''
        },
        overrides
    );

    return mock;
}
