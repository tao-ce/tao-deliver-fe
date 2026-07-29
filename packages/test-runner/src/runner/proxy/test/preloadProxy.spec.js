// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

// global.jest must be defined for jest-fetch-mock to run
global.jest = { fn: vi.fn };
require('jest-fetch-mock').enableMocks();

vi.mock('../shared.js', async () => {
    const originalModule = await vi.importActual('../shared.js');
    return {
        __esModule: true,
        ...originalModule,
        doRequest: vi.fn().mockImplementation(originalModule.doRequest)
    };
});

import proxyFactory from 'taoTests/runner/proxy';
import preloadProxy from '../preloadProxy.js';
import jwtTokenHandlerFactory from 'core/jwt/jwtTokenHandler';
import { getItemsStore } from '../../itemsStore.js';
import { doRequest } from '../shared.js';
import { wait } from '../../util/common.js';
import ExpiryError from 'taoDeliverAppsCommon/core/error/ExpiryError.js';

describe('Preload Proxy', () => {
    // config
    const jwtTokenHandler = jwtTokenHandlerFactory({
        refreshTokenUrl: '/refreshUrl'
    });
    const accessToken = 'token';
    const serviceUrl = '/url';
    const initItemsUrl = 'https://ngs.test/api/v1/init-items/delivery123';
    const uploadUrl = '/upload';
    const serviceCallId = 'abc12345';
    const itemStoreTTL = 500;
    const config = {
        jwtTokenHandler,
        serviceUrl,
        initItemsUrl,
        uploadUrl,
        serviceCallId,
        itemStoreTTL,
        options: {}
    };

    let proxy;
    proxyFactory.registerProvider('preloadProxy', preloadProxy);

    // items which will cause a getItemDynamic request
    const testMapSectionItems = {
        item1: { id: 'item1', position: 0 },
        item2: { id: 'item2', position: 1 },
        item3: { id: 'item3', position: 2 },
        item4: { id: 'item4', position: 3 }
    };
    // items which will avoid making a getItemDynamic request
    const testMapSectionItemsStateless = {
        item1: { id: 'item1', position: 0, hasItemState: false },
        item2: { id: 'item2', position: 1, hasItemState: false },
        item3: { id: 'item3', position: 2, hasItemState: false },
        item4: { id: 'item4', position: 3, hasItemState: false }
    };

    // Make the DataHolder API.
    // For these unit tests, just currentPos needs to be confgurable.
    // All unit test cases share the same basic testMap, currentTestPart and currentSection.
    const mockDataHolder = (items = testMapSectionItems, currentPos = 0) => ({
        getTestMap: () => ({
            parts: {
                part1: {
                    sections: {
                        section1: {
                            items
                        }
                    }
                }
            },
            stats: {
                total: Object.keys(items).length
            }
        }),
        getTestContext: () => ({
            itemPosition: currentPos
        }),
        getCurrentTestPart: () => ({
            id: 'part1'
        }),
        getCurrentSection: () => ({
            id: 'section1'
        })
    });

    // Make a generic item
    const makeItemObjectStatic = (itemIdentifier, itemData = { type: 'qti' }) => ({
        itemIdentifier,
        itemData
    });
    const makeItemObjectDynamic = (itemIdentifier, itemState = {}) => ({
        itemIdentifier,
        itemState
    });

    // Make a payload for a getItemDynamic request
    const makeGetItemObject = (itemIdentifier, parameters) => ({
        name: 'getItemDynamic',
        parameters: Object.assign(
            {
                itemIdentifier
            },
            parameters
        )
    });

    /**
     * Creates basic init request mock
     * @param {object} sectionItems
     * @returns {string} Serialized json response
     */
    const initRequest = (sectionItems = testMapSectionItems) =>
        JSON.stringify({
            responses: [
                [
                    {
                        success: true,
                        values: {
                            testMap: mockDataHolder(sectionItems).getTestMap()
                        }
                    }
                ]
            ],
            success: true
        });

    /**
     * Creates action request mock
     * @param {object[]} actions - named action requests
     * @param {object|object[]} values - desired response(s) of the request
     * @param {number} [delay] - optionally inserts delay in ms before the response is returned
     * @returns {function} Request mock function, which checks parameters and returns with provided response
     */
    const actionRequest = (actions, values, delay) => async request => {
        const data = JSON.parse(request.body);
        expect(request.url).toBe(serviceUrl);
        expect(request.method).toBe('POST');
        expect(request.headers.get('Content-Type')).toBe('application/json');
        expect(request.headers.get('Authorization')).toBe(`Bearer ${accessToken}`);
        expect(data).toMatchObject([
            {
                channel: 'actions',
                message: {
                    actions: expect.arrayContaining([
                        expect.objectContaining({
                            id: expect.any(String),
                            name: actions[0].name,
                            parameters: expect.objectContaining({
                                ...actions[0].parameters
                            }),
                            timestamp: expect.any(Number)
                        })
                    ])
                }
            }
        ]);
        let responses;
        if (Array.isArray(values)) {
            // batched actions
            responses = [
                values.map(v => ({
                    id: data[0].message.actions[0].id,
                    values: v,
                    success: true
                }))
            ];
        } else {
            // single action
            responses = [
                [
                    {
                        id: data[0].message.actions[0].id,
                        values,
                        success: true
                    }
                ]
            ];
        }
        if (delay) {
            await wait(delay);
        }
        return Promise.resolve(JSON.stringify({ responses, success: true }));
    };

    /**
     * Creates /init-items request mock
     * @param {string[]} itemIds - as seen in query params
     * @param {object|object[]} values - desired response(s) of the request
     * @returns {function} Request mock function, which checks parameters and returns with provided response
     */
    const initItemsRequest = (itemIds, values) => request => {
        expect(request.url.split('?')[0]).toBe(initItemsUrl);
        expect(request.method).toBe('GET');
        expect(request.headers.get('Content-Type')).toBe('application/json');
        expect(request.headers.get('Authorization')).toBe(`Bearer ${accessToken}`);

        const searchParams = new URL(request.url).searchParams;
        expect([...searchParams.values()]).toEqual(itemIds);

        let responses;
        if (Array.isArray(values)) {
            // batched actions
            responses = [
                values.map(v => ({
                    id: 'item-1', // variable
                    values: v,
                    success: true
                }))
            ];
        } else {
            // single action
            responses = [
                [
                    {
                        id: 'item-1',
                        values,
                        success: true
                    }
                ]
            ];
        }
        return Promise.resolve(JSON.stringify({ responses, success: true }));
    };

    /**
     * Creates basic mock for request that throws server-handled error
     * @returns {string} Serialized json response
     */
    const errorRequest = () =>
        JSON.stringify({
            responses: [
                [
                    {
                        success: false
                    }
                ]
            ],
            success: true
        });

    /**
     * Creates basic mock for request that throws 409 error
     * @returns {string} Serialized json response
     */
    const multipleSessionsErrorRequest = () =>
        JSON.stringify({
            responses: [
                [
                    {
                        success: false,
                        errorCode: 409,
                        errorMessage: 'Multiple active sessions detected'
                    }
                ]
            ],
            success: true
        });

    /**
     * Creates basic mock for request with unparseable response
     * @returns {string} Serialized json response
     */
    const jsonErrorRequest = () =>
        JSON.stringify({
            responses: [
                [
                    {
                        success: false
                    }
                ]
            ],
            success: true
        }).substring(0, 20);

    afterEach(() => {
        fetch.resetMocks();
        doRequest.mockClear();
        proxy.destroy();
    });

    it('throws if bad preloadStrategy passed', () =>
        new Promise(done => {
            expect.assertions(2);

            const proxyOptions = { preloadStrategy: 'whoops' };
            const blockConfig = Object.assign({}, config, { options: { proxy: proxyOptions } });
            proxy = proxyFactory('preloadProxy', blockConfig);
            proxy.destroy = () => {}; // avoid unhandledRejection when the afterEach tries to destroy after the error is thrown

            return jwtTokenHandler
                .storeAccessToken(accessToken)
                .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
                .then(() => proxy.install(mockDataHolder()))
                .catch(e => {
                    expect(e).toBeInstanceOf(Error);
                    expect(e.message).toMatch('Invalid preloadStrategy');
                    done();
                });
        }));

    describe('Common behaviour', () => {
        beforeEach(() => {
            proxy = proxyFactory('preloadProxy', config);
            return jwtTokenHandler
                .storeAccessToken(accessToken)
                .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
                .then(() => proxy.install(mockDataHolder()));
        });

        it('calls init request properly', () => {
            expect.assertions(6);
            const values = {
                testContext: {},
                testMap: {}
            };
            fetch.mockResponse(
                actionRequest(
                    [
                        {
                            name: 'init',
                            parameters: {
                                foo: 'bar'
                            }
                        }
                    ],
                    values
                )
            );

            return proxy
                .init({
                    foo: 'bar'
                })
                .then(response => {
                    expect(response).toMatchObject(values);
                });
        });

        it('calls send variables request properly', () => {
            expect.assertions(6);
            const variables = {
                a: 12
            };
            const values = {
                ok: true
            };

            fetch.mockResponses(
                initRequest(),
                actionRequest(
                    [
                        {
                            name: 'storeTraceData',
                            parameters: variables
                        }
                    ],
                    values
                )
            );

            return proxy
                .init()
                .then(() => proxy.sendVariables(variables))
                .then(response => {
                    expect(response).toMatchObject(values);
                });
        });

        it('calls test action request properly', () => {
            expect.assertions(6);
            const actionName = 'fooAction';
            const parameters = {
                xyz: false
            };
            const values = [1, 2, 3];

            fetch.mockResponses(
                initRequest(),
                actionRequest(
                    [
                        {
                            name: actionName,
                            parameters
                        }
                    ],
                    [values]
                )
            );

            return proxy
                .init()
                .then(() => proxy.callTestAction(actionName, parameters))
                .then(response => {
                    expect(response).toMatchObject(values);
                });
        });

        it('calls an action without parameters properly', () => {
            expect.assertions(6);
            const actionName = 'barAction';

            fetch.mockResponses(
                initRequest(),
                actionRequest([
                    {
                        name: actionName
                    }
                ])
            );

            return proxy
                .init()
                .then(() => proxy.callTestAction(actionName))
                .then(response => {
                    expect(response).toBe(void 0);
                });
        });

        it('handles async response from action', () => {
            expect.assertions(7);
            const itemIdentifier = 'item-123';
            const responseIdentifier = 'RESPONSE_1';
            const fileHash = {
                name: 'hello.txt',
                mime: 'text/plain',
                data: 'abcd-efgh',
                id: 'ab123/de456/hello.txt'
            };

            const asyncResponsePromise = new Promise(resolve => setTimeout(() => resolve(fileHash), 50));
            const asyncResponse = {
                base: {
                    fileHash: asyncResponsePromise
                }
            };
            const expectedResponse = {
                base: {
                    fileHash
                }
            };
            const itemState = {
                [responseIdentifier]: {
                    response: asyncResponse,
                    validity: true
                }
            };
            const itemResponse = {
                [responseIdentifier]: asyncResponse
            };

            fetch.mockResponses(
                initRequest(),
                actionRequest(
                    [
                        {
                            name: 'move',
                            parameters: {
                                itemIdentifier,
                                itemState: JSON.stringify({
                                    [responseIdentifier]: { response: expectedResponse, validity: true }
                                }),
                                itemResponse: JSON.stringify({
                                    [responseIdentifier]: expectedResponse
                                })
                            }
                        }
                    ],
                    {
                        did: true
                    }
                )
            );

            return proxy
                .init()
                .then(() =>
                    proxy.callItemAction(itemIdentifier, 'move', {
                        itemState,
                        itemResponse
                    })
                )
                .then(actionResponse => {
                    expect(asyncResponsePromise.handled).toBe(true);
                    expect(actionResponse).toMatchObject({
                        did: true
                    });
                });
        });

        it('calls telemetry request properly', () => {
            expect.assertions(6);
            const itemIdentifier = 'item-123';
            const parameters = {
                a: 1
            };
            const values = {
                ok: true
            };

            fetch.mockResponses(
                initRequest(),
                actionRequest(
                    [
                        {
                            name: 'up',
                            parameters
                        }
                    ],
                    values
                )
            );

            return proxy
                .init()
                .then(() => proxy.telemetry(itemIdentifier, 'signal', parameters))
                .then(response => {
                    expect(response).toMatchObject(values);
                });
        });

        it('returns correct error response for network errors', () => {
            expect.assertions(2);
            fetch.mockResponses([
                null,
                {
                    status: 500
                }
            ]);

            return proxy.init().catch(e => {
                expect(e instanceof Error).toBe(true);
                expect(e.response.status).toBe(500);
            });
        });

        it('returns correct error response for server-handled errors', () => {
            expect.assertions(2);
            fetch.mockResponses(errorRequest());

            return proxy.init().catch(e => {
                expect(e instanceof Error).toBe(true);
                expect(e.response.responses[0][0]).toMatchObject({
                    success: false
                });
            });
        });

        it('returns correct error response for 409 error', () => {
            expect.assertions(3);
            fetch.mockResponses(multipleSessionsErrorRequest());

            return proxy.init().catch(e => {
                expect(e instanceof Error).toBe(true);
                expect(e.errorCode).toBe(409);
                expect(e.response.responses[0][0]).toMatchObject({
                    success: false
                });
            });
        });

        it('refreshes access token automatically', () => {
            expect.assertions(2);
            const newAccessToken = 'newAuthToken';
            const values = {
                testContext: {},
                testMap: {}
            };
            fetch.mockResponses(
                // first unauthenticated request
                [
                    null,
                    {
                        status: 401
                    }
                ],
                // jwt token refresh request
                JSON.stringify({
                    accessToken: newAccessToken
                }),
                request => {
                    expect(request.headers.get('Authorization')).toBe(`Bearer ${newAccessToken}`);
                    return Promise.resolve(
                        JSON.stringify({
                            success: true,
                            responses: [
                                [
                                    {
                                        success: true,
                                        values
                                    }
                                ]
                            ]
                        })
                    );
                }
            );

            return proxy.init().then(response => {
                expect(response).toMatchObject(values);
            });
        });

        it('fails on configured timeout', () => {
            expect.assertions(2);
            fetch.mockResponse(() => new Promise(resolve => setTimeout(() => resolve({}), 500)));

            proxy = proxyFactory(
                'preloadProxy',
                Object.assign(config, {
                    requestTimeout: 100
                })
            );

            return jwtTokenHandler
                .storeAccessToken(accessToken)
                .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
                .then(() => proxy.install())
                .then(() => proxy.init({ foo: 'bar' }))
                .catch(err => {
                    expect(err).toBeTypeOf('object');
                    expect(err.message).toContain('Timeout (actions: init');
                });
        });

        it('parse the item state from a string', () => {
            expect.assertions(17);

            const itemIdentifiers = ['item1'];
            const item1State = {
                RESPONSE_1: {
                    response: {
                        base: null
                    }
                }
            };
            const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
            const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], item1State);
            const getItemActions = [makeGetItemObject(itemIdentifiers[0])];

            fetch.mockResponses(
                initRequest(),
                // 5 assertions:
                initItemsRequest(itemIdentifiers, [item1Static]),
                // 5 assertions:
                actionRequest(getItemActions, [item1Dynamic]),
                // 5 assertions:
                actionRequest(getItemActions, [item1Dynamic])
            );

            return (
                proxy
                    .init()
                    .then(() => proxy.getItem(itemIdentifiers[0]))
                    .then(response => {
                        expect(response).toMatchObject({
                            itemData: item1Static.itemData,
                            itemIdentifier: itemIdentifiers[0],
                            itemState: item1State
                        });
                    })
                    // do a second call, static part of which should be served from cache
                    .then(() => proxy.getItem(itemIdentifiers[0]))
                    .then(response => {
                        expect(response).toMatchObject({
                            itemData: item1Static.itemData,
                            itemIdentifier: itemIdentifiers[0],
                            itemState: item1State
                        });
                    })
            );
        });

        it('fails to parse the item state', () => {
            expect.assertions(11);

            const itemIdentifiers = ['item1'];
            const item1State = '{ invalid json ';
            const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
            const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], item1State);
            const getItemActions = [makeGetItemObject(itemIdentifiers[0])];

            fetch.mockResponses(
                initRequest(),
                // 5 assertions:
                initItemsRequest(itemIdentifiers, [item1Static]),
                // 5 assertions:
                actionRequest(getItemActions, [item1Dynamic])
            );

            return proxy
                .init()
                .then(() => proxy.getItem(itemIdentifiers[0]))
                .catch(err => {
                    expect(err.message).toMatch('Unable to restore the state of item1 (invalid format)');
                });
        });

        it('exposes getAttachmentsUploadData method', () => {
            expect(proxy.getAttachmentsUploadData).toBeTypeOf('function');
        });

        it('calls submit item request properly and updates item state', () => {
            expect.assertions(17);
            const itemIdentifiers = ['item1'];
            const itemState = {
                foo: 'bar'
            };
            const itemResponse = {
                RESPONSE: {
                    base: {
                        integer: -1
                    }
                }
            };
            const parameters = {
                abc: 'def'
            };
            const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
            const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], itemState);
            const getItemActions = [makeGetItemObject(itemIdentifiers[0])];

            fetch.mockResponses(
                initRequest(),
                // 5 assertions:
                initItemsRequest(itemIdentifiers, [item1Static]),
                // 5 assertions:
                actionRequest(getItemActions, [item1Dynamic]),
                // 5 assertions:
                actionRequest(
                    [
                        {
                            name: 'submitItem',
                            parameters: Object.assign(
                                {
                                    itemIdentifier: itemIdentifiers[0],
                                    itemState: JSON.stringify(itemState),
                                    itemResponse: JSON.stringify(itemResponse)
                                },
                                parameters
                            )
                        }
                    ],
                    {
                        saved: true
                    }
                )
            );

            return (
                proxy
                    .init()
                    .then(() => proxy.getItem(itemIdentifiers[0]))
                    .then(() => proxy.submitItem(itemIdentifiers[0], itemState, itemResponse, parameters))
                    .then(response => {
                        expect(response).toMatchObject({
                            saved: true
                        });
                    })
                    // get item from cache again and check the state was updated on it
                    .then(() => proxy.itemsStore.getItem(itemIdentifiers[0]))
                    .then(response => {
                        expect(response).toMatchObject(
                            Object.assign({}, item1Static, {
                                itemState
                            })
                        );
                    })
            );
        });

        it('calls call item action request properly and updates item state', () => {
            expect.assertions(17);
            const action = 'doItem';
            const itemIdentifiers = ['item1'];
            const itemState = {
                bar: 'baz'
            };
            const parameters = {
                baz: ['def', 2]
            };
            const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
            const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], itemState);
            const getItemActions = [makeGetItemObject(itemIdentifiers[0])];

            fetch.mockResponses(
                initRequest(),
                // 5 assertions:
                initItemsRequest(itemIdentifiers, [item1Static]),
                // 5 assertions:
                actionRequest(getItemActions, [item1Dynamic]),
                // 5 assertions:
                actionRequest(
                    [
                        {
                            name: action,
                            parameters: Object.assign(
                                {
                                    itemIdentifier: itemIdentifiers[0],
                                    itemState: JSON.stringify(itemState)
                                },
                                parameters
                            )
                        }
                    ],
                    {
                        did: true
                    }
                )
            );

            return (
                proxy
                    .init()
                    .then(() => proxy.getItem(itemIdentifiers[0]))
                    .then(() =>
                        proxy.callItemAction(
                            itemIdentifiers[0],
                            action,
                            Object.assign(
                                {
                                    itemState
                                },
                                parameters
                            )
                        )
                    )
                    .then(response => {
                        expect(response).toMatchObject({
                            did: true
                        });
                    })
                    // get item from cache again and check the state was updated on it
                    .then(() => proxy.itemsStore.getItem(itemIdentifiers[0]))
                    .then(response => {
                        expect(response).toMatchObject(
                            Object.assign({}, item1Static, {
                                itemState
                            })
                        );
                    })
            );
        });

        it('on "skip" call item action, updates item state', () => {
            expect.assertions(16);
            const action = 'skip';
            const itemIdentifiers = ['item1'];
            const itemState = {
                initial: 'initial'
            };
            const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
            const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], itemState);
            const getItemActions = [makeGetItemObject(itemIdentifiers[0])];

            fetch.mockResponses(
                initRequest(),
                // 5 assertions:
                initItemsRequest(itemIdentifiers, [item1Static]),
                // 5 assertions:
                actionRequest(getItemActions, [item1Dynamic]),
                // 5 assertions:
                actionRequest(
                    [
                        {
                            name: action,
                            parameters: {
                                itemIdentifier: itemIdentifiers[0]
                            }
                        }
                    ],
                    {
                        did: true
                    }
                )
            );

            return (
                proxy
                    .init()
                    .then(() => proxy.getItem(itemIdentifiers[0]))
                    .then(() =>
                        proxy.callItemAction(itemIdentifiers[0], action, {
                            itemState: { modified: 'modified' },
                            x: 'x'
                        })
                    )
                    // get item from cache again and check its state was updated
                    .then(() => proxy.itemsStore.getItem(itemIdentifiers[0]))
                    .then(response => {
                        expect(response.itemState).toEqual({ modified: 'modified' });
                    })
            );
        });
    });

    describe('none strategy', () => {
        const preloadStrategy = 'none';
        const proxyOptions = { preloadStrategy, preloadItemStoreCapacity: 3 };
        const blockConfig = Object.assign({}, config, { options: { proxy: proxyOptions } });

        describe('get item', () => {
            beforeEach(() => {
                proxy = proxyFactory('preloadProxy', blockConfig);
                return jwtTokenHandler
                    .storeAccessToken(accessToken)
                    .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
                    .then(() => proxy.install(mockDataHolder()));
            });

            it('calls get item request properly', () => {
                expect.assertions(22);
                const itemIdentifiers = ['item1', 'item2'];
                const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
                const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: 'bar' });
                const getItemActions = [makeGetItemObject(itemIdentifiers[0])];

                fetch.mockResponses(
                    initRequest(),
                    // 5 assertions:
                    initItemsRequest([itemIdentifiers[0]], [item1Static]),
                    // 5 assertions:
                    actionRequest(getItemActions, [item1Dynamic, item1Dynamic]),
                    // 5 assertions:
                    actionRequest(getItemActions, [item1Dynamic, item1Dynamic])
                );
                const doRequestSpy = doRequest;
                let firstCallResponse;

                const expectedItem1Response = {
                    ...item1Static,
                    ...item1Dynamic
                };

                return (
                    proxy
                        .init()
                        .then(() => {
                            doRequestSpy.mockClear();
                            return proxy.getItem(itemIdentifiers[0]);
                        })
                        .then(response => {
                            expect(response).toEqual(expectedItem1Response);
                            expect(doRequestSpy).toHaveBeenCalledTimes(2); // static + dynamic
                            doRequestSpy.mockClear();
                            firstCallResponse = response;
                            firstCallResponse.itemState.mutated = true;
                        })
                        // do a second call, the static part of which should be served from cache;
                        // and check that it doesn't return the same object reference,
                        // and ignores mutation of response from first call
                        .then(() => proxy.getItem(itemIdentifiers[0]))
                        .then(response => {
                            expect(response).toEqual(expectedItem1Response);
                            expect(response.itemState.mutated).toBe(void 0);
                            expect(response === firstCallResponse).toBe(false);
                            expect(response.itemState === firstCallResponse.itemState).toBe(false);
                            expect(doRequestSpy).toHaveBeenCalledTimes(1); // just dynamic
                        })
                );
            });
        });
    });

    describe('nextItem strategy', () => {
        const preloadStrategy = 'nextItem';
        const proxyOptions = { preloadStrategy, preloadItemStoreCapacity: 3 };
        const blockConfig = Object.assign({}, config, { options: { proxy: proxyOptions } });

        describe('get item', () => {
            beforeEach(() => {
                proxy = proxyFactory('preloadProxy', blockConfig);
                return jwtTokenHandler
                    .storeAccessToken(accessToken)
                    .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
                    .then(() => proxy.install(mockDataHolder()));
            });

            it('calls get item request properly', () => {
                expect.assertions(22);
                const itemIdentifiers = ['item1', 'item2'];
                const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
                const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
                const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: 'bar' });
                const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

                fetch.mockResponses(
                    initRequest(),
                    // 5 assertions:
                    initItemsRequest(itemIdentifiers, [item1Static, item2Static]),
                    // 5 assertions:
                    actionRequest(getItem1Actions, [item1Dynamic]),
                    // 5 assertions:
                    actionRequest(getItem1Actions, [item1Dynamic])
                );
                const doRequestSpy = doRequest;
                let firstCallResponse;

                const expectedItem1Response = {
                    ...item1Static,
                    ...item1Dynamic
                };

                return (
                    proxy
                        .init()
                        .then(() => {
                            doRequestSpy.mockClear();
                            return proxy.getItem(itemIdentifiers[0]);
                        })
                        .then(response => {
                            expect(response).toEqual(expectedItem1Response);
                            expect(doRequestSpy).toHaveBeenCalledTimes(2); // static + dynamic
                            doRequestSpy.mockClear();
                            firstCallResponse = response;
                            firstCallResponse.itemState.mutated = true;
                        })
                        // do a second call, the static part of which should be served from cache;
                        // and check that it doesn't return the same object reference,
                        // and ignores mutation of response from first call
                        .then(() => proxy.getItem(itemIdentifiers[0]))
                        .then(response => {
                            expect(response).toEqual(expectedItem1Response);
                            expect(response.itemState.mutated).toBe(void 0);
                            expect(response === firstCallResponse).toBe(false);
                            expect(response.itemState === firstCallResponse.itemState).toBe(false);
                            expect(doRequestSpy).toHaveBeenCalledTimes(1); // just dynamic
                        })
                );
            });

            it('get item with nextItem preload fetches 2 items into empty store', () => {
                expect.assertions(13);
                const itemIdentifiers = ['item1', 'item2'];
                const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
                const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
                const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: 'bar' });
                const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

                const store = getItemsStore(serviceCallId);

                fetch.mockResponses(
                    initRequest(),
                    // 5 assertions:
                    initItemsRequest(itemIdentifiers, [item1Static, item2Static]),
                    // 5 assertions:
                    actionRequest(getItem1Actions, [item1Dynamic])
                );

                const expectedItem1Response = {
                    ...item1Static,
                    ...item1Dynamic
                };

                return proxy
                    .init()
                    .then(() => {
                        expect(store.size()).toBe(0);
                        return proxy.getItem(itemIdentifiers[0]);
                    })
                    .then(response => {
                        expect(response).toEqual(expectedItem1Response);
                        expect(store.keys()).toEqual(['item1', 'item2']);
                    });
            });

            it('get item with nextItem preload fetches 1 missing item into partially filled store', () => {
                expect.assertions(14);
                const itemIdentifiers = ['item1', 'item2', 'item3'];
                const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
                const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
                const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: 'bar' });
                const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

                fetch.mockResponses(
                    initRequest(),
                    // 5 assertions:
                    initItemsRequest([itemIdentifiers[0]], [item1Static]),
                    // 5 assertions:
                    actionRequest(getItem1Actions, [item1Dynamic])
                );

                const expectedItem1Response = {
                    ...item1Static,
                    ...item1Dynamic
                };

                let store;

                return proxy
                    .init()
                    .then(() => {
                        store = getItemsStore(serviceCallId);
                        store.setItem('item2', item2Static);

                        expect(store.size()).toBe(1);
                        return proxy.getItem(itemIdentifiers[0]);
                    })
                    .then(response => {
                        expect(response).toEqual(expectedItem1Response);
                        expect(store.keys()).toEqual(['item2', 'item1']);
                        expect(store.getOldest()).toBe('item2');
                    });
            });

            it('get item with nextItem preload fetches 2 missing items and replaces oldest item in filled store', () => {
                expect.assertions(15);
                const itemIdentifiers = ['item1', 'item2'];
                const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
                const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
                const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: 'bar' });
                const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

                fetch.mockResponses(
                    initRequest(),
                    // 5 assertions:
                    initItemsRequest(itemIdentifiers, [item1Static, item2Static]),
                    // 5 assertions:
                    actionRequest(getItem1Actions, [item1Dynamic])
                );

                const expectedItem1Response = {
                    ...item1Static,
                    ...item1Dynamic
                };

                let store;

                return proxy
                    .init()
                    .then(() => {
                        store = getItemsStore(serviceCallId);
                        store.setItem('item3', {});
                        store.setItem('item4', {});

                        expect(store.size()).toBe(2);
                        expect(store.getOldest()).toBe('item3');
                        return proxy.getItem(itemIdentifiers[0]);
                    })
                    .then(response => {
                        expect(response).toEqual(expectedItem1Response);
                        expect(store.keys()).toEqual(['item4', 'item1', 'item2']);
                        expect(store.getOldest()).toBe('item4');
                    });
            });

            it('get item with nextItem preload fetches just dynamic data into filled store', () => {
                expect.assertions(8);
                const itemIdentifiers = ['item1', 'item2', 'item3'];
                const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
                const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
                const item3Static = makeItemObjectStatic(itemIdentifiers[2]);
                const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: 'bar' });
                const getItemActions = [makeGetItemObject(itemIdentifiers[0])];

                fetch.mockResponses(
                    initRequest(),
                    // 5 assertions:
                    actionRequest(getItemActions, [item1Dynamic])
                );

                const expectedItem1Response = {
                    ...item1Static,
                    ...item1Dynamic
                };

                const doRequestSpy = doRequest;

                let store;

                return proxy
                    .init()
                    .then(() => {
                        doRequestSpy.mockClear();
                        store = getItemsStore(serviceCallId);
                        store.setItem('item1', item1Static);
                        store.setItem('item2', item2Static);
                        store.setItem('item3', item3Static);

                        expect(store.size()).toBe(3);
                        return proxy.getItem(itemIdentifiers[0]);
                    })
                    .then(response => {
                        expect(response).toEqual(expectedItem1Response);
                        expect(doRequestSpy).toHaveBeenCalledTimes(1); // just dynamic
                    });
            });

            it('preloads next item (async) after item already in store is returned', () =>
                new Promise(done => {
                    expect.assertions(14);
                    const itemIdentifiers = ['item1', 'item2'];
                    const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
                    const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
                    const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: 'bar' });
                    const getItemActions = [makeGetItemObject(itemIdentifiers[0])];

                    fetch.mockResponses(
                        initRequest(testMapSectionItemsStateless),
                        // 5 assertions:
                        actionRequest(getItemActions, [item1Dynamic]),
                        // 5 assertions: (preload)
                        initItemsRequest([itemIdentifiers[1]], [item2Static])
                    );

                    const expectedItem1Response = {
                        ...item1Static,
                        ...item1Dynamic
                    };

                    let store;

                    return proxy
                        .init()
                        .then(() => {
                            store = getItemsStore(serviceCallId);
                            store.setItem('item1', item1Static);

                            expect(store.size()).toBe(1);
                            return proxy.getItem(itemIdentifiers[0]);
                        })
                        .then(response => {
                            expect(response).toEqual(expectedItem1Response);
                            expect(store.keys()).toEqual(['item1']);
                            setTimeout(() => {
                                // background preload result
                                expect(store.keys()).toEqual(['item1', 'item2']);
                                done();
                            }, 50);
                        });
                }));

            it('flags fetched items with assets', () => {
                expect.assertions(14);
                const itemIdentifiers = ['item1', 'item2'];
                const itemData = {
                    type: 'qti',
                    assets: {
                        css: {
                            'tao-user-styles.css': 'tao-user-styles.css'
                        }
                    }
                };
                const item1Static = makeItemObjectStatic(itemIdentifiers[0], itemData);
                const item2Static = makeItemObjectStatic(itemIdentifiers[1], itemData);
                const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], {});
                const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

                const store = getItemsStore(serviceCallId);

                fetch.mockResponses(
                    initRequest(),
                    // 5 assertions:
                    initItemsRequest(itemIdentifiers, [item1Static, item2Static]),
                    // 5 assertions:
                    actionRequest(getItem1Actions, [item1Dynamic])
                );

                return proxy
                    .init()
                    .then(() => {
                        expect(store.size()).toBe(0);
                        return proxy.getItem(itemIdentifiers[0]);
                    })
                    .then(() => {
                        expect(store.keys()).toEqual(['item1', 'item2']);
                        expect(store.getItem('item1').flags).toEqual({ containsNonPreloadedAssets: true });
                        expect(store.getItem('item2').flags).toEqual({ containsNonPreloadedAssets: true });
                    });
            });
        });

        describe('last item in part', () => {
            beforeEach(() => {
                proxy = proxyFactory('preloadProxy', blockConfig);
                return jwtTokenHandler
                    .storeAccessToken(accessToken)
                    .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
                    .then(() => proxy.install(mockDataHolder(testMapSectionItemsStateless, 3))); // currentPos = last item
            });

            it('preloads nothing (async) when last item in part is loaded', () =>
                new Promise(done => {
                    expect.assertions(14);
                    const itemIdentifiers = ['item4'];
                    const item4Static = makeItemObjectStatic(itemIdentifiers[0]);
                    const item4Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: 'bar' });
                    const getItemActions = [makeGetItemObject(itemIdentifiers[0])];

                    fetch.mockResponses(
                        initRequest(testMapSectionItemsStateless),
                        // 5 assertions:
                        initItemsRequest(itemIdentifiers, [item4Static]),
                        // 5 assertions:
                        actionRequest(getItemActions, [item4Dynamic])
                    );

                    const expectedItem4Response = {
                        ...item4Static,
                        ...item4Dynamic
                    };

                    let store;

                    return proxy
                        .init()
                        .then(() => {
                            store = getItemsStore(serviceCallId);
                            expect(store.size()).toBe(0);
                            return proxy.getItem('item4');
                        })
                        .then(response => {
                            expect(response).toEqual(expectedItem4Response);
                            expect(store.keys()).toEqual(['item4']);
                            setTimeout(() => {
                                // background preload result - no new items
                                expect(store.keys()).toEqual(['item4']);
                                done();
                            }, 50);
                        });
                }));
        });
    });

    describe('sectionItems strategy', () => {
        const preloadStrategy = 'sectionItems';

        describe('small itemsStore, many preloads', () => {
            const proxyOptions = {
                preloadStrategy,
                preloadItemStoreCapacity: 3,
                preloadSectionItemsAmount: 4
            };
            const blockConfig = Object.assign({}, config, { options: { proxy: proxyOptions } });
            beforeEach(() => {
                proxy = proxyFactory('preloadProxy', blockConfig);
                return jwtTokenHandler
                    .storeAccessToken(accessToken)
                    .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
                    .then(() => proxy.install(mockDataHolder()));
            });

            it('get item with sectionItems preload fetches 3 items into empty store', () => {
                expect.assertions(13);
                const itemIdentifiers = ['item1', 'item2', 'item3'];
                const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
                const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
                const item3Static = makeItemObjectStatic(itemIdentifiers[2]);
                const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: 'bar' });
                const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

                const store = getItemsStore(serviceCallId);

                fetch.mockResponses(
                    initRequest(testMapSectionItemsStateless),
                    // 5 assertions:
                    initItemsRequest(itemIdentifiers, [item1Static, item2Static, item3Static]),
                    // 5 assertions:
                    actionRequest(getItem1Actions, [item1Dynamic])
                );

                const expectedItem1Response = {
                    ...item1Static,
                    ...item1Dynamic
                };

                return proxy
                    .init()
                    .then(() => {
                        expect(store.size()).toBe(0);
                        return proxy.getItem(itemIdentifiers[0]);
                    })
                    .then(response => {
                        expect(response).toEqual(expectedItem1Response);
                        expect(store.keys()).toEqual(['item1', 'item2', 'item3']);
                    });
            });

            it('get item with sectionItems preload fetches 2 missing items when item is in store', () => {
                expect.assertions(14);
                const itemIdentifiers = ['item1', 'item2', 'item3'];
                const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
                const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
                const item3Static = makeItemObjectStatic(itemIdentifiers[2]);
                const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: 'bar' });
                const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

                const store = getItemsStore(serviceCallId);

                fetch.mockResponses(
                    initRequest(testMapSectionItemsStateless),
                    // 5 assertions:
                    initItemsRequest([itemIdentifiers[0], itemIdentifiers[2]], [item1Static, item3Static]),
                    // 5 assertions:
                    actionRequest(getItem1Actions, [item1Dynamic])
                );

                const expectedItem1Response = {
                    ...item1Static,
                    ...item1Dynamic
                };

                return proxy
                    .init()
                    .then(() => {
                        store.setItem('item2', item2Static);
                        expect(store.size()).toBe(1);
                        return proxy.getItem(itemIdentifiers[0]);
                    })
                    .then(response => {
                        expect(response).toEqual(expectedItem1Response);
                        expect(store.keys()).toEqual(['item2', 'item1', 'item3']);
                        expect(store.getOldest()).toBe('item2');
                    });
            });
        });

        describe('large itemsStore, few preloads', () => {
            const proxyOptions = {
                preloadStrategy,
                preloadItemStoreCapacity: 4,
                preloadSectionItemsAmount: 3
            };
            const blockConfig = Object.assign({}, config, { options: { proxy: proxyOptions } });
            beforeEach(() => {
                proxy = proxyFactory('preloadProxy', blockConfig);
                return jwtTokenHandler
                    .storeAccessToken(accessToken)
                    .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
                    .then(() => proxy.install(mockDataHolder()));
            });

            it('get item with sectionItems preload fetches 3 items into empty store', () => {
                expect.assertions(13);
                const itemIdentifiers = ['item1', 'item2', 'item3'];
                const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
                const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
                const item3Static = makeItemObjectStatic(itemIdentifiers[2]);
                const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: 'bar' });
                const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

                const store = getItemsStore(serviceCallId);

                fetch.mockResponses(
                    initRequest(testMapSectionItemsStateless),
                    // 5 assertions:
                    initItemsRequest(itemIdentifiers, [item1Static, item2Static, item3Static]),
                    // 5 assertions:
                    actionRequest(getItem1Actions, [item1Dynamic])
                );

                const expectedItem1Response = {
                    ...item1Static,
                    ...item1Dynamic
                };

                return proxy
                    .init()
                    .then(() => {
                        expect(store.size()).toBe(0);
                        return proxy.getItem(itemIdentifiers[0]);
                    })
                    .then(response => {
                        expect(response).toEqual(expectedItem1Response);
                        expect(store.keys()).toEqual(['item1', 'item2', 'item3']);
                    });
            });
        });

        describe('large itemsStore, few preloads, short TTL', () => {
            const proxyOptions = {
                preloadStrategy,
                preloadItemStoreCapacity: 4,
                preloadSectionItemsAmount: 3
            };
            const blockConfig = Object.assign({}, config, { itemStoreTTL: 20 }, { options: { proxy: proxyOptions } });
            beforeEach(() => {
                proxy = proxyFactory('preloadProxy', blockConfig);
                return jwtTokenHandler
                    .storeAccessToken(accessToken)
                    .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
                    .then(() => proxy.install(mockDataHolder()));
            });

            it('repeated sectionItems preloads with expiry', () => {
                expect.assertions(24);
                const itemIdentifiers = ['item1', 'item2', 'item3', 'item4'];
                const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
                const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
                const item3Static = makeItemObjectStatic(itemIdentifiers[2]);
                const item4Static = makeItemObjectStatic(itemIdentifiers[3]);
                const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: '1' });
                const item4Dynamic = makeItemObjectDynamic(itemIdentifiers[3], { foo: '4' });
                const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];
                const getItem4Actions = [makeGetItemObject(itemIdentifiers[3])];

                const store = getItemsStore(serviceCallId);

                fetch.mockResponses(
                    initRequest(testMapSectionItemsStateless),
                    // 5 assertions:
                    initItemsRequest(['item1', 'item2', 'item3'], [item1Static, item2Static, item3Static]),
                    // 5 assertions:
                    actionRequest(getItem1Actions, [item1Dynamic]),
                    // 5 assertions:
                    initItemsRequest(['item4', 'item3', 'item2'], [item4Static, item3Static, item2Static]),
                    // 5 assertions:
                    actionRequest(getItem4Actions, [item4Dynamic])
                );

                return proxy
                    .init()
                    .then(() => {
                        expect(store.size()).toBe(0);
                        return proxy.getItem(itemIdentifiers[0]);
                    })
                    .then(() => {
                        expect(store.keys()).toEqual(['item1', 'item2', 'item3']);
                        return new Promise(resolve => setTimeout(resolve, 30)); // let stored items expire
                    })
                    .then(() => {
                        expect(store.size()).toBe(3);
                        return proxy.getItem(itemIdentifiers[3]);
                    })
                    .then(() => {
                        expect(store.keys()).toEqual(['item4', 'item3', 'item2']);
                    });
            });
        });
    });

    describe('Static/dynamic item data', () => {
        const proxyOptions = { preloadStrategy: 'nextItem' };
        const blockConfig = Object.assign(
            {},
            config,
            { itemStoreTTL: 100 },
            { options: { proxy: proxyOptions }, isEmptySession: true }
        );

        beforeEach(() => {
            proxy = proxyFactory('preloadProxy', blockConfig);
            return jwtTokenHandler
                .storeAccessToken(accessToken)
                .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
                .then(() => proxy.install(mockDataHolder()));
        });

        it('makes 2nd simpler request to /init-items if 1st response is unparseable', () => {
            expect.assertions(15);

            const itemIdentifiers = ['item1'];
            const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
            const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: '1' });
            const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

            fetch.mockResponses(
                initRequest(testMapSectionItemsStateless),
                jsonErrorRequest(),
                // 5 assertions:
                initItemsRequest(itemIdentifiers, [item1Static]),
                // 5 assertions:
                actionRequest(getItem1Actions, [item1Dynamic])
            );
            const doRequestSpy = doRequest;

            const expectedItem1Response = {
                ...item1Static,
                ...item1Dynamic
            };

            return proxy
                .init()
                .then(() => {
                    doRequestSpy.mockClear();
                    return proxy.getItem(itemIdentifiers[0]);
                })
                .then(response => {
                    expect(response).toEqual(expectedItem1Response);
                    expect(doRequestSpy).toHaveBeenCalledTimes(3);
                    expect(doRequestSpy.mock.calls[0][0]).toBe(
                        'https://ngs.test/api/v1/init-items/delivery123?itemId%5B%5D=item1&itemId%5B%5D=item2'
                    );
                    expect(doRequestSpy.mock.calls[1][0]).toBe(
                        'https://ngs.test/api/v1/init-items/delivery123?itemId%5B%5D=item1'
                    );
                    expect(doRequestSpy.mock.calls[2][0]).toBe(serviceUrl);
                });
        });

        it('retries fetchItemDynamic if JSON parse error', () => {
            expect.assertions(15);

            const itemIdentifiers = ['item1', 'item2'];
            const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
            const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
            const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: '1' });
            const getItemActions = [makeGetItemObject(itemIdentifiers[0])];

            fetch.mockResponses(
                initRequest(testMapSectionItemsStateless),
                // 5 assertions:
                initItemsRequest(itemIdentifiers, [item1Static, item2Static]),
                jsonErrorRequest(),
                // 5 assertions:
                actionRequest(getItemActions, [item1Dynamic])
            );
            const doRequestSpy = doRequest;

            const expectedItem1Response = {
                ...item1Static,
                ...item1Dynamic
            };

            return proxy
                .init()
                .then(() => {
                    doRequestSpy.mockClear();
                    return proxy.getItem(itemIdentifiers[0]);
                })
                .then(response => {
                    expect(response).toEqual(expectedItem1Response);
                    expect(doRequestSpy).toHaveBeenCalledTimes(3);
                    expect(doRequestSpy.mock.calls[0][0]).toBe(
                        'https://ngs.test/api/v1/init-items/delivery123?itemId%5B%5D=item1&itemId%5B%5D=item2'
                    );
                    expect(doRequestSpy.mock.calls[1][0]).toBe(serviceUrl);
                    expect(doRequestSpy.mock.calls[2][0]).toBe(serviceUrl);
                });
        });

        it('makes a dynamic request when revisiting an item after state was added while item not expired', () => {
            expect.assertions(27);

            const itemIdentifiers = ['item1', 'item2'];
            const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
            const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
            const stateToAdd = { modified: 'modified' };
            const item1Dynamic1 = makeItemObjectDynamic(itemIdentifiers[0], {});
            const item1Dynamic2 = makeItemObjectDynamic(itemIdentifiers[0], stateToAdd);
            const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

            fetch.mockResponses(
                initRequest(testMapSectionItemsStateless),
                // 5 assertions:
                initItemsRequest(itemIdentifiers, [item1Static, item2Static]),
                // 5 assertions:
                actionRequest(getItem1Actions, [item1Dynamic1])
            );
            const doRequestSpy = doRequest;

            const expectedItem1Response1 = {
                ...item1Static,
                ...item1Dynamic1
            };
            const expectedItem1Response2 = {
                ...item1Static,
                ...item1Dynamic2
            };

            return proxy
                .init()
                .then(() => {
                    doRequestSpy.mockClear();
                    return proxy.getItem(itemIdentifiers[0]);
                })
                .then(response => {
                    expect(response).toEqual(expectedItem1Response1);
                    expect(doRequestSpy).toHaveBeenCalledTimes(2);
                    expect(doRequestSpy.mock.calls[0][0]).toBe(
                        'https://ngs.test/api/v1/init-items/delivery123?itemId%5B%5D=item1&itemId%5B%5D=item2'
                    );
                    expect(doRequestSpy.mock.calls[1][0]).toBe(serviceUrl);

                    // simulate move (to the same item is ok) with state added
                    fetch.resetMocks();
                    fetch.mockResponses(
                        // 5 assertions:
                        actionRequest(
                            [
                                {
                                    name: 'move',
                                    parameters: {
                                        itemIdentifier: itemIdentifiers[0],
                                        itemState: JSON.stringify(stateToAdd)
                                    }
                                }
                            ],
                            {}
                        ),
                        // 5 assertions:
                        actionRequest(getItem1Actions, [item1Dynamic2])
                    );
                    return proxy.callItemAction(itemIdentifiers[0], 'move', {
                        itemState: stateToAdd
                    });
                })
                .then(() => {
                    expect(doRequestSpy).toHaveBeenCalledTimes(3);
                    expect(doRequestSpy.mock.calls[2][0]).toBe(serviceUrl);

                    return proxy.getItem(itemIdentifiers[0]);
                })
                .then(response => {
                    expect(response).toEqual(expectedItem1Response2);
                });
        });

        it('makes a static and a dynamic request when revisiting an item after state was added after the item expired', () => {
            expect.assertions(32);

            const itemIdentifiers = ['item1', 'item2'];
            const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
            const item2Static = makeItemObjectStatic(itemIdentifiers[1]);
            const stateToAdd = { modified: 'modified' };
            const item1Dynamic1 = makeItemObjectDynamic(itemIdentifiers[0], {});
            const item1Dynamic2 = makeItemObjectDynamic(itemIdentifiers[0], stateToAdd);
            const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

            fetch.mockResponses(
                initRequest(testMapSectionItemsStateless),
                // 5 assertions:
                initItemsRequest(itemIdentifiers, [item1Static, item2Static]),
                // 5 assertions:
                actionRequest(getItem1Actions, [item1Dynamic1])
            );
            const doRequestSpy = doRequest;

            const expectedItem1Response1 = {
                ...item1Static,
                ...item1Dynamic1
            };
            const expectedItem1Response2 = {
                ...item1Static,
                ...item1Dynamic2
            };

            return proxy
                .init()
                .then(() => {
                    doRequestSpy.mockClear();
                    return proxy.getItem(itemIdentifiers[0]);
                })
                .then(response => {
                    expect(response).toEqual(expectedItem1Response1);
                    expect(doRequestSpy).toHaveBeenCalledTimes(2);
                    expect(doRequestSpy.mock.calls[0][0]).toBe(
                        'https://ngs.test/api/v1/init-items/delivery123?itemId%5B%5D=item1&itemId%5B%5D=item2'
                    );
                    expect(doRequestSpy.mock.calls[1][0]).toBe(serviceUrl);

                    return new Promise(resolve => setTimeout(resolve, 120)); // let stored items expire
                })
                .then(() => {
                    // simulate move (to the same item is ok) with state added
                    fetch.resetMocks();
                    fetch.mockResponses(
                        // 5 assertions:
                        actionRequest(
                            [
                                {
                                    name: 'move',
                                    parameters: {
                                        itemIdentifier: itemIdentifiers[0],
                                        itemState: JSON.stringify(stateToAdd)
                                    }
                                }
                            ],
                            {}
                        ),
                        // 5 assertions:
                        initItemsRequest(itemIdentifiers, [item1Static, item2Static]),
                        // 5 assertions:
                        actionRequest(getItem1Actions, [item1Dynamic2])
                    );
                    return proxy.callItemAction(itemIdentifiers[0], 'move', {
                        itemState: stateToAdd
                    });
                })
                .then(() => {
                    expect(doRequestSpy).toHaveBeenCalledTimes(3);
                    expect(doRequestSpy.mock.calls[2][0]).toBe(serviceUrl);

                    return proxy.getItem(itemIdentifiers[0]);
                })
                .then(response => {
                    expect(response).toEqual(expectedItem1Response2);
                });
        });

        it('throws ExpiryError if stored item expires between 2 lookups in getItem', () => {
            expect.assertions(7);

            const itemIdentifiers = ['item1', 'item2'];
            const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
            const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0], { foo: '1' });
            const getItem1Actions = [makeGetItemObject(itemIdentifiers[0])];

            const store = getItemsStore(serviceCallId);
            store.setItem(itemIdentifiers[0], item1Static); // first lookup will succeed

            fetch.mockResponses(
                initRequest(testMapSectionItemsStateless),
                // 5 assertions:
                actionRequest(getItem1Actions, [item1Dynamic], 150) // delay will cause second lookup to fail
            );
            return proxy
                .init()
                .then(() => proxy.getItem(itemIdentifiers[0]))
                .catch(e => {
                    expect(e.message).toContain('itemId=item1');
                    expect(e instanceof ExpiryError).toBe(true);
                });
        });
    });

    describe('Item locale', () => {
        const proxyOptions = { preloadStrategy: 'none' };
        const localizationOptions = { locale: 'en-GB', mainLocale: 'en-US' };
        const blockConfig = Object.assign({}, config, {
            options: { proxy: proxyOptions, localization: localizationOptions },
            isEmptySession: true
        });

        beforeEach(() => {
            proxy = proxyFactory('preloadProxy', blockConfig);
            return jwtTokenHandler
                .storeAccessToken(accessToken)
                .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
                .then(() => proxy.install(mockDataHolder()));
        });

        it('appends locale query param in fetchItemsStatic if options.localization.locale differs from options.localization.mainLocale', () => {
            expect.assertions(7);
            const itemIdentifiers = ['item1'];
            const item1Static = makeItemObjectStatic(itemIdentifiers[0]);
            const item1Dynamic = makeItemObjectDynamic(itemIdentifiers[0]);
            const getItemActions = [makeGetItemObject(itemIdentifiers[0])];

            fetch.mockResponses(
                initRequest(),
                // custom init-items mock:
                request => {
                    expect(request.url.split('?')[0]).toBe(initItemsUrl);
                    const searchParams = new URL(request.url).searchParams;
                    expect(searchParams.get('locale')).toBe('en-GB');
                    return Promise.resolve(
                        JSON.stringify({
                            responses: [
                                [
                                    {
                                        id: 'item-1',
                                        values: item1Static,
                                        success: true
                                    }
                                ]
                            ],
                            success: true
                        })
                    );
                },
                // 5 assertions:
                actionRequest(getItemActions, [item1Dynamic])
            );

            return proxy.init().then(() => proxy.getItem(itemIdentifiers[0]));
        });
    });
});
