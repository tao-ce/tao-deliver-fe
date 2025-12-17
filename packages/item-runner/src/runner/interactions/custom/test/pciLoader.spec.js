// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
/* global System */

// global.jest must be defined for jest-fetch-mock to run
global.jest = { fn: vi.fn };
require('jest-fetch-mock').enableMocks();

vi.mock('core/store', () => {
    const store = () =>
        Promise.resolve({
            getItem(id) {
                return Promise.resolve(store._storage[id]);
            },
            setItem(id, item) {
                store._storage[id] = item;
                return Promise.resolve(true);
            },
            clear() {
                store._storage = {};
                return Promise.resolve(true);
            }
        });
    store._storage = {};
    store.backends = {
        memory: 'memory'
    };
    return {
        __esModule: true,
        default: store
    };
});

import pciLoader from '../pciLoader.js';
import store from 'core/store';

// SystemJS should always use fetch to load modules
System.constructor.prototype.shouldFetch = () => true;

// Ensure SystemJS uses the global fetch mock
System.constructor.prototype.fetch = global.fetch;

const createModuleResponse = function (source, timeout = 0) {
    return function () {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(
                    new Response(source, {
                        headers: {
                            'Content-Type': 'application/javascript'
                        }
                    })
                );
            }, timeout);
        });
    };
};

describe('pciLoader', () => {
    afterEach(() => {
        fetch.resetMocks();
        store().then(moduleStore => moduleStore.clear());
    });

    it('defines AMD define method on window', () => {
        expect(typeof window.define).toBe('function');
    });

    it('loads module and waits for register', () => {
        fetch.mockResponse(
            createModuleResponse(`
                define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                    qtiCustomInteractionContext.register({ typeIdentifier: 'foo' });
                });
            `)
        );

        return pciLoader('./module.js').then(qtiCustomInteractionContext => {
            expect(typeof qtiCustomInteractionContext.getInstance).toBe('function');
        });
    });

    it('waits for previous module load', () => {
        fetch.mockResponses(
            createModuleResponse(
                `
                    define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                        setTimeout(() => {
                            qtiCustomInteractionContext.register({ typeIdentifier: 'foo' });
                        }, 300);
                    });
                `,
                100
            ),
            createModuleResponse(`
                define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                    setTimeout(() => {
                        qtiCustomInteractionContext.register({ typeIdentifier: 'bar' });
                    }, 100);
                });
            `)
        );

        let isModuleARegistered = false;
        let isModuleBRegistered = false;
        return Promise.all([
            pciLoader('./moduleA.js').then(qtiCustomInteractionContext => {
                isModuleARegistered = true;
                expect(typeof qtiCustomInteractionContext.getInstance).toBe('function');
                expect(isModuleBRegistered).toBe(true);
            }),
            pciLoader('./moduleB.js').then(qtiCustomInteractionContext => {
                isModuleBRegistered = true;
                expect(typeof qtiCustomInteractionContext.getInstance).toBe('function');
                expect(isModuleARegistered).toBe(false);
            })
        ]);
    });

    it('creates contexts that avoid module name conflict', () => {
        expect.assertions(2);

        fetch.mockResponses(
            createModuleResponse(`
                define('conflictingModule', [], function() {
                    return 'foo';
                });
                define(['qtiCustomInteractionContext', 'conflictingModule'], function(qtiCustomInteractionContext, conflictingModule) {
                    qtiCustomInteractionContext.register({
                        typeIdentifier: 'foo',
                        getInstance(dom, { onready }) {
                            onready({ conflictingModule });
                        }
                    });
                });
            `),
            createModuleResponse(`
                define('conflictingModule', [], function() {
                    return 'bar';
                });
                define(['qtiCustomInteractionContext', 'conflictingModule'], function(qtiCustomInteractionContext, conflictingModule) {
                    qtiCustomInteractionContext.register({
                        typeIdentifier: 'bar',
                        getInstance(dom, { onready }) {
                            onready({ conflictingModule });
                        }
                    });
                });
            `)
        );

        return Promise.all([
            pciLoader('./moduleA.js').then(qtiCustomInteractionContext => {
                qtiCustomInteractionContext.getInstance('foo', document.body, {
                    onready: interaction => {
                        expect(interaction.conflictingModule).toBe('foo');
                    }
                });
            }),
            pciLoader('./moduleB.js').then(qtiCustomInteractionContext => {
                qtiCustomInteractionContext.getInstance('bar', document.body, {
                    onready: interaction => {
                        expect(interaction.conflictingModule).toBe('bar');
                    }
                });
            })
        ]);
    });

    it('handles if one bundle registers two PCI', () => {
        expect.assertions(2);

        fetch.mockResponse(
            createModuleResponse(`
                define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                    qtiCustomInteractionContext.register({
                        typeIdentifier: 'foo',
                        getInstance(dom, { onready }) {
                            onready({ typeIdentifier: 'foo', });
                        }
                    });
                    qtiCustomInteractionContext.register({
                        typeIdentifier: 'bar',
                        getInstance(dom, { onready }) {
                            onready({ typeIdentifier: 'bar' });
                        }
                    });
                });
            `)
        );

        return pciLoader('./module.js').then(qtiCustomInteractionContext => {
            qtiCustomInteractionContext.getInstance('foo', document.body, {
                onready: interaction => {
                    expect(interaction.typeIdentifier).toBe('foo');
                }
            });
            qtiCustomInteractionContext.getInstance('bar', document.body, {
                onready: interaction => {
                    expect(interaction.typeIdentifier).toBe('bar');
                }
            });
        });
    });

    it('does not block importflow, if one module has been loaded unsuccessfully', () => {
        fetch.mockResponses(
            function () {
                return Promise.resolve(
                    new Response(null, {
                        status: 404
                    })
                );
            },
            createModuleResponse(`
                define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                    qtiCustomInteractionContext.register({ typeIdentifier: 'foo' });
                });
            `)
        );

        return Promise.all([
            pciLoader('./notExistingModule.js').catch(e => {
                expect(e.toString()).toMatch(/404 Not Found/);
            }),
            pciLoader('./module.js').then(qtiCustomInteractionContext => {
                expect(typeof qtiCustomInteractionContext.getInstance).toBe('function');
            })
        ]);
    });

    it('loads module and next time gets module from store', () => {
        expect.assertions(3);

        fetch.mockResponse(
            createModuleResponse(`
                define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                    qtiCustomInteractionContext.register({ typeIdentifier: 'foo' });
                });
            `)
        );

        const modulePath = './module.js';

        return pciLoader(modulePath)
            .then(qtiCustomInteractionContext => {
                expect(typeof qtiCustomInteractionContext.getInstance).toBe('function');

                return store()
                    .then(moduleStore => moduleStore.getItem(modulePath))
                    .then(storedModule => {
                        // module is saved into store
                        expect(typeof storedModule.getInstance).toBe('function');

                        return pciLoader(modulePath);
                    });
            })
            .then(qtiCustomInteractionContext => {
                // module is not loaded again, but got from store
                expect(typeof qtiCustomInteractionContext.getInstance).toBe('function');
            });
    });
});
