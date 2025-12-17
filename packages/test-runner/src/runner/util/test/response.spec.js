// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { waitForResponsePromises } from '../response.js';

describe('response', () => {
    test.each([[null], [void 0], [{}], [{ itemResponse: {} }]])(
        'resolves with the exact response without promise',
        response =>
            waitForResponsePromises(response).then(resolved => {
                expect(resolved).toEqual(response);
            })
    );

    it('waits for a promise to resolve', () => {
        const spy = vi.fn();
        const response = {
            response: new Promise(resolve => {
                setTimeout(() => {
                    spy();
                    resolve(null);
                }, 10);
            })
        };

        return waitForResponsePromises(response).then(resolved => {
            expect(spy).toHaveBeenCalled();
            expect(resolved).toMatchObject({
                response: null
            });
        });
    });

    it('waits for a multiple promises to resolve and replace their values', () => {
        const spy1 = vi.fn();
        const spy2 = vi.fn();
        const response = {
            itemResponse: {
                response: new Promise(resolve => {
                    setTimeout(() => {
                        spy1();
                        resolve({ base: { string: 'choiceA' } });
                    }, 14);
                })
            },
            itemState: {
                responses: {
                    r1: new Promise(resolve => {
                        setTimeout(() => {
                            spy2();
                            resolve({ links: ['a', 'b', 'c'] });
                        }, 7);
                    })
                }
            }
        };

        return waitForResponsePromises(response).then(resolved => {
            expect(spy1).toHaveBeenCalled();
            expect(spy1).toHaveBeenCalled();
            expect(resolved).toMatchObject({
                itemResponse: {
                    response: { base: { string: 'choiceA' } }
                },
                itemState: {
                    responses: {
                        r1: { links: ['a', 'b', 'c'] }
                    }
                }
            });
        });
    });
});
