// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// global.jest must be defined for jest-fetch-mock to run
global.jest = { fn: vi.fn };
require('jest-fetch-mock').enableMocks();

import proxyFactory from 'taoTests/runner/proxy.js';
import previewerProxy from '../previewerProxy.js';
import { cloneDeep } from 'lodash';

describe('Previewer Proxy', () => {
    const configs = {
        requestTimeout: 50000,
        proxy: {
            urls: {
                init: 'http://localhost/myinit',
                getItem: 'http://localhost/mygetitem'
            }
        },
        params: {
            requestId: '123',
            unitId: 'myunit'
        }
    };

    const initResponse = {
        data: {
            locales: { current: 'en_ZZ', linked: [] },
            testMap: {
                id: 'Test-4',
                label: 'QTI test',
                position: 0,
                parts: {
                    'testPart-1': {
                        id: 'testPart-1',
                        label: '',
                        position: 0,
                        sections: {
                            'assessmentSection-1': {
                                id: 'assessmentSection-1',
                                label: 'Overview',
                                position: 0,
                                items: {
                                    'item-1': {
                                        id: 'item-1',
                                        label: 'Somewhere',
                                        position: 0
                                    },
                                    'item-2': {
                                        id: 'item-2',
                                        label: 'Sometime',
                                        position: 1
                                    },
                                    'item-3': {
                                        id: 'item-3',
                                        label: 'Somewhat',
                                        position: 2
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    const getItemResponse = {
        baseUrl: 'http://localhost',
        content: {
            type: 'qti',
            data: {
                identifier: 'i123',
                qtiClass: 'assessmentItem',
                attributes: {}
            }
        }
    };

    let proxy;
    proxyFactory.registerProvider('qtiPreviewerProxy', previewerProxy);

    let dateNowSpy;
    let setTimeoutSpy;

    beforeEach(() => {
        setTimeoutSpy = vi.spyOn(global, 'setTimeout');
        dateNowSpy = vi.spyOn(Date, 'now');
        proxy = proxyFactory('qtiPreviewerProxy', configs);
        return proxy.install();
    });

    afterEach(() => {
        fetch.resetMocks();
        dateNowSpy.mockRestore();
        setTimeoutSpy.mockRestore();
        proxy.destroy();
    });

    describe('init request', () => {
        it('returns testMap and testContext', () => {
            expect.assertions(3);

            fetch.mockResponseOnce(request => {
                expect(request.url).toBe('http://localhost/myinit?unitId=myunit&requestId=123');
                expect(request.method).toBe('GET');
                return Promise.resolve(JSON.stringify(initResponse));
            });

            return proxy.init().then(response => {
                expect(response).toMatchObject({
                    testMap: {
                        id: 'Test-4',
                        label: 'QTI test',
                        position: 0,
                        parts: initResponse.data.testMap.parts,
                        stats: {
                            total: 3
                        },
                        locales: []
                    },
                    testContext: {
                        itemIdentifier: 'item-1',
                        itemPosition: 0,
                        itemSessionState: 0,
                        testPartId: 'testPart-1',
                        sectionId: 'assessmentSection-1',
                        state: 1,
                        locale: 'en_ZZ'
                    }
                });
            });
        });

        it('if "locale" or "requestId" param, adds them to url, sets testContext locale to "locale"', () => {
            expect.assertions(3);

            fetch.mockResponseOnce(request => {
                expect(request.url).toBe(
                    'http://localhost/myinit?unitId=myunit&requestId=myrequest&locale=mm-MM&jwt=jwt-token'
                );
                expect(request.method).toBe('GET');
                const initResponse2 = cloneDeep(initResponse);
                initResponse2.data.locales = { current: 'mm-MM', linked: ['en_ZZ', 'xy-ZZ'] };
                return Promise.resolve(JSON.stringify(initResponse2));
            });

            proxy = proxyFactory(
                'qtiPreviewerProxy',
                Object.assign({}, configs, {
                    params: {
                        unitId: 'myunit',
                        requestId: 'myrequest',
                        locale: 'mm-MM',
                        jwt: 'jwt-token'
                    }
                })
            );
            return proxy
                .install()
                .then(() => proxy.init())
                .then(response => {
                    expect(response).toMatchObject({
                        testMap: {
                            parts: initResponse.data.testMap.parts,
                            locales: ['en_ZZ', 'xy-ZZ']
                        },
                        testContext: {
                            itemIdentifier: 'item-1',
                            itemPosition: 0,
                            locale: 'mm-MM'
                        }
                    });
                });
        });

        it('if "item" param, sets testContext position to it', () => {
            expect.assertions(3);

            fetch.mockResponseOnce(request => {
                expect(request.url).toBe('http://localhost/myinit?unitId=myunit');
                expect(request.method).toBe('GET');
                return Promise.resolve(JSON.stringify(initResponse));
            });

            proxy = proxyFactory(
                'qtiPreviewerProxy',
                Object.assign({}, configs, {
                    params: {
                        unitId: 'myunit',
                        item: 3
                    }
                })
            );
            return proxy
                .install()
                .then(() => proxy.init())
                .then(response => {
                    expect(response).toMatchObject({
                        testMap: {
                            parts: initResponse.data.testMap.parts,
                            stats: {
                                total: 3
                            }
                        },
                        testContext: {
                            itemIdentifier: 'item-3',
                            itemPosition: 2,
                            testPartId: 'testPart-1',
                            sectionId: 'assessmentSection-1'
                        }
                    });
                });
        });

        it('retries if 404 response status', () =>
            new Promise(done => {
                const retryTimeoutMs = 2 * 60 * 1000;
                const now = Date.now();
                dateNowSpy.mockReturnValue(now);
                setTimeoutSpy.mockImplementation(callback => {
                    Promise.resolve().then(() => callback());
                });

                fetch.mockResponses(
                    ['', { status: 404 }],
                    ['', { status: 404 }],
                    ['', { status: 404 }],
                    [JSON.stringify(initResponse), { status: 200 }]
                );

                expect(true).toBe(true);

                proxy
                    .init()
                    .then(response => {
                        expect(response).toMatchObject({
                            testMap: {
                                id: 'Test-4'
                            },
                            testContext: {
                                itemIdentifier: 'item-1'
                            }
                        });
                        done();
                    })
                    .catch(err => {
                        throw err;
                    });

                dateNowSpy.mockReturnValue(now + retryTimeoutMs * 0.8);
            }));

        it('retries if 404 response status and throws if retry timeout reached', () =>
            new Promise(done => {
                const retryTimeoutMs = 2 * 60 * 1000;
                const now = Date.now();
                dateNowSpy.mockReturnValue(now);
                setTimeoutSpy.mockImplementation(callback => {
                    Promise.resolve().then(() => callback());
                });

                fetch.mockResponse('', { status: 404 });

                proxy.init().catch(err => {
                    expect(err.errorCode).toBe(404);
                    done();
                });

                dateNowSpy.mockReturnValue(now + retryTimeoutMs * 1.2);
            }));
    });

    describe('getItem request', () => {
        it('returns itemData', () => {
            expect.assertions(3);

            fetch.mockResponseOnce(() => Promise.resolve(JSON.stringify(initResponse)));
            return proxy
                .init()
                .then(() => {
                    fetch.mockResponseOnce(request => {
                        expect(request.url).toBe(
                            'http://localhost/mygetitem?unitId=myunit&requestId=123&itemId=item-2'
                        );
                        expect(request.method).toBe('GET');
                        return Promise.resolve(JSON.stringify(getItemResponse));
                    });
                    return proxy.getItem('item-2');
                })
                .then(response => {
                    expect(response).toMatchObject({
                        itemData: getItemResponse.content,
                        itemIdentifier: 'i123',
                        itemState: {}
                    });
                });
        });

        it('if "locale" or "requestId" param, adds them to url', () => {
            proxy = proxyFactory(
                'qtiPreviewerProxy',
                Object.assign({}, configs, {
                    params: {
                        unitId: 'myunit',
                        requestId: 'myrequest',
                        locale: 'mm-MM'
                    }
                })
            );
            fetch.mockResponseOnce(() => Promise.resolve(JSON.stringify(initResponse)));
            return proxy
                .install()
                .then(() => proxy.init())
                .then(() => {
                    fetch.mockResponseOnce(request => {
                        expect(request.url).toBe(
                            'http://localhost/mygetitem?unitId=myunit&requestId=myrequest&locale=mm-MM&itemId=item-2'
                        );
                        expect(request.method).toBe('GET');
                        return Promise.resolve(JSON.stringify(getItemResponse));
                    });
                    return proxy.getItem('item-2');
                });
        });
    });

    describe('callItemAction updates testContext without request', () => {
        let proxyInitResponse; //what proxy.init() returned, not fetch request
        const mockDataHolder = {
            get: vi.fn().mockImplementation(propertyName => {
                if (propertyName === 'testContext') {
                    return proxyInitResponse.testContext;
                } else if (propertyName === 'testMap') {
                    return proxyInitResponse.testMap;
                }
            })
        };

        it('action move next', () => {
            expect.assertions(2);

            proxy = proxyFactory('qtiPreviewerProxy', configs);
            fetch.mockResponseOnce(() => Promise.resolve(JSON.stringify(initResponse)));
            return proxy
                .install(mockDataHolder)
                .then(() =>
                    proxy.init().then(resp => {
                        proxyInitResponse = resp;
                        expect(resp.testContext.itemIdentifier).toBe('item-1');
                        return resp;
                    })
                )
                .then(() =>
                    proxy.callItemAction('item-1', 'move', {
                        direction: 'next',
                        scope: 'item'
                    })
                )
                .then(response => {
                    expect(response).toMatchObject({
                        testContext: {
                            itemIdentifier: 'item-2',
                            itemPosition: 1,
                            itemSessionState: 0,
                            testPartId: 'testPart-1',
                            sectionId: 'assessmentSection-1',
                            state: 1,
                            locale: 'en_ZZ'
                        },
                        testMap: proxyInitResponse.testMap
                    });
                });
        });

        it('action move previous', () => {
            expect.assertions(2);

            proxy = proxyFactory(
                'qtiPreviewerProxy',
                Object.assign({}, configs, {
                    params: {
                        unitId: 'myunit',
                        item: 2
                    }
                })
            );
            fetch.mockResponseOnce(() => Promise.resolve(JSON.stringify(initResponse)));
            return proxy
                .install(mockDataHolder)
                .then(() =>
                    proxy.init().then(resp => {
                        proxyInitResponse = resp;
                        expect(resp.testContext.itemIdentifier).toBe('item-2');
                        return resp;
                    })
                )
                .then(() =>
                    proxy.callItemAction('item-2', 'move', {
                        direction: 'previous',
                        scope: 'item'
                    })
                )
                .then(response => {
                    expect(response).toMatchObject({
                        testContext: {
                            itemIdentifier: 'item-1',
                            itemPosition: 0,
                            itemSessionState: 0,
                            testPartId: 'testPart-1',
                            sectionId: 'assessmentSection-1',
                            state: 1,
                            locale: 'en_ZZ'
                        },
                        testMap: proxyInitResponse.testMap
                    });
                });
        });

        it('action jump', () => {
            expect.assertions(2);

            proxy = proxyFactory('qtiPreviewerProxy', configs);
            fetch.mockResponseOnce(() => Promise.resolve(JSON.stringify(initResponse)));
            return proxy
                .install(mockDataHolder)
                .then(() =>
                    proxy.init().then(resp => {
                        proxyInitResponse = resp;
                        expect(resp.testContext.itemIdentifier).toBe('item-1');
                        return resp;
                    })
                )
                .then(() =>
                    proxy.callItemAction('item-1', 'move', {
                        direction: 'jump',
                        scope: 'item',
                        ref: 2
                    })
                )
                .then(response => {
                    expect(response).toMatchObject({
                        testContext: {
                            itemIdentifier: 'item-3',
                            itemPosition: 2,
                            itemSessionState: 0,
                            testPartId: 'testPart-1',
                            sectionId: 'assessmentSection-1',
                            state: 1,
                            locale: 'en_ZZ'
                        },
                        testMap: proxyInitResponse.testMap
                    });
                });
        });
    });

    it('fails for network errors', () => {
        expect.assertions(2);
        fetch.mockResponses([
            null,
            {
                status: 500
            }
        ]);
        return proxy.init().catch(e => {
            expect(e instanceof Error).toBe(true);
            expect(e.errorCode).toBe(500);
        });
    });

    it('fails on configured timeout', () => {
        expect.assertions(1);
        fetch.mockResponse(() => new Promise(resolve => setTimeout(() => resolve({}), 500)));

        proxy = proxyFactory('qtiPreviewerProxy', Object.assign({}, configs, { requestTimeout: 1 }));
        return proxy
            .install()
            .then(() => proxy.init())
            .catch(function (err) {
                expect(err).toMatchObject({
                    message: 'Timeout'
                });
            });
    });
});
