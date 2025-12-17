// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Factory for mock for window.FileReader
 * @param {object} [overrides]
 * @returns {object}
 * @example
 * let filereaderSpy;
 *
 * beforeEach(() => {
 *   filereaderSpy = vi.spyOn(window, 'FileReader');
 * });
 * afterEach(() => {
 *   filereaderSpy.mockRestore();
 * });
 *
 * const filereaderMock = mockFileReader({ delay: 50 });
 * filereaderSpy.mockImplementation(() => filereaderMock);
 */
export function mockFileReader(overrides = {}) {
    const listeners = {};
    const _trigger = (name, evt) => {
        if (listeners[name]) {
            listeners[name](evt);
        }
    };

    const mock = Object.assign(
        {
            _trigger,
            readAsDataURL: vi.fn(function() {
                this.readyState = 1; // LOADING
                this._timeout = setTimeout(() => {
                    this.result = `data://${overrides.data}`;
                    this.readyState = 2; // DONE
                    _trigger('load', {});
                }, overrides.delay || 0);
            }),
            abort: () => {
                clearTimeout(this._timeout);
                this.readyState = 2; // DONE
                _trigger('abort', {});
            },
            addEventListener: (name, callback) => {
                listeners[name] = callback;
            },
            readyState: 0, // EMPTY
            result: {},
            error: null
        },
        overrides
    );

    return mock;
}
