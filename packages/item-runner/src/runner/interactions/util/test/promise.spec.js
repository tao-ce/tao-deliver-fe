// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { DeferredPromise } from '../promise.js';

describe('DeferredPromise', () => {
    it('callable', () => {
        expect(typeof DeferredPromise).toBe('function');
    });

    it('returns an object with correct properties', () => {
        const p = new DeferredPromise();
        expect(typeof p).toBe('object');
        expect(p.promise).toBeInstanceOf(Promise);
        expect(typeof p.resolve).toBe('function');
        expect(typeof p.reject).toBe('function');
    });

    it('can resolve once only', () => {
        expect.assertions(1);

        let resolveTimes = 0;
        const p = new DeferredPromise();

        // eslint-disable-next-line vitest/valid-expect-in-promise
        p.promise
            .then(() => {
                resolveTimes++;
                expect(resolveTimes).toBe(1); // should not increment twice
            })
            .catch(() => {
                throw new Error('should not reject');
            });

        p.resolve();
        p.resolve();
        p.reject();
    });

    it('can reject once only', () => {
        expect.assertions(1);

        let rejectTimes = 0;
        const p = new DeferredPromise();

        // eslint-disable-next-line vitest/valid-expect-in-promise
        p.promise
            .then(() => {
                throw new Error('should not resolve');
            })
            .catch(() => {
                rejectTimes++;
                expect(rejectTimes).toBe(1); // should not increment twice
            });

        p.reject();
        p.reject();
        p.resolve();
    });
});
