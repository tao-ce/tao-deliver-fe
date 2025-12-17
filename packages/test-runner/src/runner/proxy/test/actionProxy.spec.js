// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

// global.jest must be defined for jest-fetch-mock to run
global.jest = { fn: vi.fn };
require('jest-fetch-mock').enableMocks();

import proxyFactory from 'taoTests/runner/proxy';
import actionProxy from '../actionProxy.js';
import jwtTokenHandlerFactory from 'core/jwt/jwtTokenHandler';

describe('Action Proxy', () => {
    // config
    const jwtTokenHandler = jwtTokenHandlerFactory({
        refreshTokenUrl: '/refreshUrl'
    });
    const accessToken = 'token';
    const serviceUrl = '/url';
    const uploadUrl = '/upload';
    const itemStoreTTL = 500;
    const config = {
        jwtTokenHandler,
        serviceUrl,
        uploadUrl,
        itemStoreTTL
    };

    let proxy;
    proxyFactory.registerProvider('actionProxy', actionProxy);

    /**
     * Creates basic init request mock
     * @returns {string} Serialized json response
     */
    const initRequest = () =>
        JSON.stringify({
            responses: [[{}]]
        });

    /**
     * Creates action request mock
     * @param {string} actions - name of the action request
     * @param {object} values - response of the request
     * @returns {function} Request mock function, which checks parameters and returns with provided response
     */
    const actionRequest = (actions, values) => request => {
        const data = JSON.parse(request.body);
        expect(request.url).toBe(serviceUrl);
        expect(request.method).toBe('POST');
        expect(request.headers.get('Content-Type')).toBe('application/json');
        expect(request.headers.get('Authorization')).toBe(`Bearer ${accessToken}`);
        expect(data).toMatchObject([
            {
                channel: 'actions',
                message: {
                    actions
                }
            }
        ]);
        return Promise.resolve(
            JSON.stringify({
                responses: [
                    [
                        {
                            id: data[0].message.actions[0].id,
                            values
                        }
                    ]
                ]
            })
        );
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
            ]
        });

    beforeEach(() => {
        proxy = proxyFactory('actionProxy', config);
        return jwtTokenHandler
            .storeAccessToken(accessToken)
            .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
            .then(() => proxy.install());
    });

    afterEach(() => {
        fetch.resetMocks();
        proxy.destroy();
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
                values
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

    it('calls get item request properly', () => {
        expect.assertions(12);
        const itemIdentifier = 'item-2';
        const item = {
            itemData: {
                type: 'qti'
            },
            itemIdentifier,
            itemState: {}
        };
        const parameters = {
            x: 'y'
        };

        fetch.mockResponses(
            initRequest(),
            actionRequest(
                [
                    {
                        name: 'getItem',
                        parameters: Object.assign(
                            {
                                itemIdentifier
                            },
                            parameters
                        )
                    }
                ],
                item
            )
        );
        const callItemActionSpy = vi.spyOn(proxy, 'callItemAction');
        let firstCallResponse;

        return (
            proxy
                .init()
                .then(() => proxy.getItem(itemIdentifier, parameters))
                .then(response => {
                    expect(response).toEqual(item);
                    expect(callItemActionSpy).toHaveBeenCalledTimes(1);
                    callItemActionSpy.mockClear();
                    firstCallResponse = response;
                    firstCallResponse.itemState.mutated = true;
                })
                // do a second call, what should be served from cache;
                // and check that it doesn't return the same object reference,
                // and ignores mutation of response from first call
                .then(() => proxy.getItem(itemIdentifier, parameters))
                .then(response => {
                    expect(response).toEqual(item);
                    expect(response.itemState.mutated).toBe(void 0);
                    expect(response === firstCallResponse).toBe(false);
                    expect(response.itemState === firstCallResponse.itemState).toBe(false);
                    expect(callItemActionSpy).toHaveBeenCalledTimes(0);
                    callItemActionSpy.mockRestore();
                })
        );
    });

    it('calls getItem twice without accessing itemStore, if TTL exceeded', () => {
        expect.assertions(14);
        const itemIdentifier = 'item-2';
        const item = {
            itemData: {
                type: 'qti'
            },
            itemIdentifier,
            itemState: {}
        };

        fetch.mockResponses(
            initRequest(),
            actionRequest(
                [
                    {
                        name: 'getItem',
                        parameters: {
                            itemIdentifier
                        }
                    }
                ],
                item
            ),
            actionRequest(
                [
                    {
                        name: 'getItem',
                        parameters: {
                            itemIdentifier
                        }
                    }
                ],
                item
            )
        );
        const callItemActionSpy = vi.spyOn(proxy, 'callItemAction');

        const now = Date.now();
        vi.spyOn(global.Date, 'now').mockReturnValue(now);

        return (
            proxy
                .init()
                .then(() => proxy.getItem(itemIdentifier))
                .then(response => {
                    expect(response).toMatchObject(item);
                    expect(callItemActionSpy).toHaveBeenCalledTimes(1);
                    callItemActionSpy.mockClear();
                })
                .then(() => {
                    vi.spyOn(global.Date, 'now').mockReturnValue(now + itemStoreTTL + 1);
                })
                // do a second call, which should hit callItemAction again
                // due to (second timestamp) > (first timestamp + TTL)
                .then(() => proxy.getItem(itemIdentifier))
                .then(response => {
                    expect(response).toMatchObject(item);
                    expect(callItemActionSpy).toHaveBeenCalledTimes(1);
                    callItemActionSpy.mockRestore();
                })
        );
    });

    it('parse the item state from a string', () => {
        expect.assertions(7);

        const itemData = {
            type: 'qti'
        };
        const itemIdentifier = 'item-2';
        const itemState = {
            RESPONSE_1: {
                response: {
                    base: null
                }
            }
        };
        const item = {
            itemData,
            itemIdentifier,
            itemState: JSON.stringify(itemState)
        };
        const parameters = {
            x: 'y'
        };

        fetch.mockResponses(
            initRequest(),
            actionRequest(
                [
                    {
                        name: 'getItem',
                        parameters: Object.assign(
                            {
                                itemIdentifier
                            },
                            parameters
                        )
                    }
                ],
                item
            )
        );

        return (
            proxy
                .init()
                .then(() => proxy.getItem(itemIdentifier, parameters))
                .then(response => {
                    expect(response).toMatchObject({
                        itemData,
                        itemIdentifier,
                        itemState
                    });
                })
                // do a second call, what should be served from cache
                .then(() => proxy.getItem(itemIdentifier, parameters))
                .then(response => {
                    expect(response).toMatchObject({
                        itemData,
                        itemIdentifier,
                        itemState
                    });
                })
        );
    });

    it('fails to parse the item state', () => {
        expect.assertions(6);

        const itemData = {
            type: 'qti'
        };
        const itemIdentifier = 'item-2';
        const item = {
            itemData,
            itemIdentifier,
            itemState: '{ invalid json '
        };
        const parameters = {
            x: 'y'
        };

        fetch.mockResponses(
            initRequest(),
            actionRequest(
                [
                    {
                        name: 'getItem',
                        parameters: Object.assign(
                            {
                                itemIdentifier
                            },
                            parameters
                        )
                    }
                ],
                item
            )
        );

        return proxy
            .init()
            .then(() => proxy.getItem(itemIdentifier, parameters))
            .catch(err => {
                expect(err.message).toMatch('Unable to restore the state of item-2 (invalid format)');
            });
    });

    it('calls submit item request properly and updates item state', () => {
        expect.assertions(12);
        const itemIdentifier = 'item-3';
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
        const item = {
            itemData: {
                type: 'qti'
            },
            itemIdentifier,
            itemState: {}
        };

        fetch.mockResponses(
            initRequest(),
            actionRequest(
                [
                    {
                        name: 'getItem',
                        parameters: {
                            itemIdentifier
                        }
                    }
                ],
                item
            ),
            actionRequest(
                [
                    {
                        name: 'submitItem',
                        parameters: Object.assign(
                            {
                                itemIdentifier,
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
                .then(() => proxy.getItem(itemIdentifier))
                .then(() => proxy.submitItem(itemIdentifier, itemState, itemResponse, parameters))
                .then(response => {
                    expect(response).toMatchObject({
                        saved: true
                    });
                })
                // get item from cache again and check the state was updated on it
                .then(() => proxy.getItem(itemIdentifier))
                .then(response => {
                    expect(response).toMatchObject(
                        Object.assign({}, item, {
                            itemState
                        })
                    );
                })
        );
    });

    it('calls call item action request properly and updates item state', () => {
        expect.assertions(12);
        const action = 'doItem';
        const itemIdentifier = 'item-123';
        const itemState = {
            bar: 'baz'
        };
        const parameters = {
            baz: ['def', 2]
        };
        const item = {
            itemData: {
                type: 'qti'
            },
            itemIdentifier,
            itemState: {}
        };

        fetch.mockResponses(
            initRequest(),
            actionRequest(
                [
                    {
                        name: 'getItem',
                        parameters: {
                            itemIdentifier
                        }
                    }
                ],
                item
            ),
            actionRequest(
                [
                    {
                        name: action,
                        parameters: Object.assign(
                            {
                                itemIdentifier,
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
                .then(() => proxy.getItem(itemIdentifier))
                .then(() =>
                    proxy.callItemAction(
                        itemIdentifier,
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
                .then(() => proxy.getItem(itemIdentifier))
                .then(response => {
                    expect(response).toMatchObject(
                        Object.assign({}, item, {
                            itemState
                        })
                    );
                })
        );
    });

    it('on "skip" call item action, updates item state', () => {
        expect.assertions(11);
        const action = 'skip';
        const itemIdentifier = 'item-123';
        const item = {
            itemData: {
                type: 'qti'
            },
            itemIdentifier,
            itemState: { initial: 'initial' }
        };

        fetch.mockResponses(
            initRequest(),
            actionRequest(
                [
                    {
                        name: 'getItem',
                        parameters: { itemIdentifier }
                    }
                ],
                item
            ),
            actionRequest(
                [
                    {
                        name: action,
                        parameters: { itemIdentifier }
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
                .then(() => proxy.getItem(itemIdentifier))
                .then(() =>
                    proxy.callItemAction(itemIdentifier, action, {
                        itemState: { modified: 'modified' },
                        x: 'x'
                    })
                )
                // get item from cache again and check its state was not updated
                .then(() => proxy.getItem(itemIdentifier))
                .then(response => {
                    expect(response.itemState).toEqual({ modified: 'modified' });
                })
        );
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
                        responses: [
                            [
                                {
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
        expect.assertions(1);
        fetch.mockResponse(() => new Promise(resolve => setTimeout(() => resolve({}), 500)));

        proxy = proxyFactory(
            'actionProxy',
            Object.assign(config, {
                requestTimeout: 100
            })
        );
        return jwtTokenHandler
            .storeAccessToken(accessToken)
            .then(() => jwtTokenHandler.storeRefreshToken('refreshToken'))
            .then(() => proxy.install())
            .then(() => proxy.init({ foo: 'bar' }))
            .catch(err =>
                expect(err).toMatchObject({
                    message: 'Timeout'
                })
            );
    });

    it('exposes getAttachmentsUploadData method', () => {
        expect(proxy.getAttachmentsUploadData).toBeTypeOf('function');
    });
});
