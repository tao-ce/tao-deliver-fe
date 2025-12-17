// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Creates a wrapped Promise which can be fulfilled from outside its own context
 * @example
 * const p = new DeferredPromise();
 * p.promise.then(() => { doSomething(); });
 * p.promise.catch(() => { handleError(); });
 * p.resolve();
 */
export function DeferredPromise() {
    this.promise = new Promise((res, rej) => {
        this.resolve = res;
        this.reject = rej;
    });
}
