// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

// global.jest must be defined for jest-fetch-mock to run
global.jest = { fn: vi.fn };
require('jest-fetch-mock').enableMocks();

import proxyFactory from 'taoTests/runner/proxy';
import actionProxy from '../reviewProxy.js';
import jwtTokenHandlerFactory from 'core/jwt/jwtTokenHandler';

describe('Review Proxy', () => {
    // config
    const jwtTokenHandler = jwtTokenHandlerFactory({
        refreshTokenUrl: '/refreshUrl'
    });
    const accessToken = 'token';
    const serviceUrl = '/url';
    const saveScoringInlineCommentsUrl = '/scoring-inline-comments';
    const saveScoringAnnotationCommentUrl = '/scoring-annotation-comment';
    const itemStoreTTL = 500;
    const config = {
        jwtTokenHandler,
        serviceUrl,
        saveScoringInlineCommentsUrl,
        saveScoringAnnotationCommentUrl,
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

    it('calls get item request properly', () => {
        expect.assertions(9);
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

        return (
            proxy
                .init()
                .then(() => proxy.getItem(itemIdentifier, parameters))
                .then(response => {
                    expect(response).toMatchObject(item);
                    expect(callItemActionSpy).toHaveBeenCalledTimes(1);
                    callItemActionSpy.mockClear();
                })
                // do a second call, what should be served from cache
                .then(() => proxy.getItem(itemIdentifier, parameters))
                .then(response => {
                    expect(response).toMatchObject(item);
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

    it('parse the itemResponse and correctResponse and itemState from a string', () => {
        expect.assertions(7);

        const itemData = {
            type: 'qti'
        };
        const itemIdentifier = 'item-2';
        const itemResponse = {
            RESPONSE_1: {
                base: null
            }
        };
        const correctResponse = {
            RESPONSE_1: {
                base: {
                    integer: 11
                }
            }
        };
        const itemState = {
            RESPONSE_1: {
                base: {
                    integer: 77
                }
            }
        };
        const item = {
            itemData,
            itemIdentifier,
            itemResponse: JSON.stringify(itemResponse),
            correctResponse: JSON.stringify(correctResponse),
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
                        itemResponse,
                        correctResponse,
                        itemState
                    });
                })
                // do a second call, what should be served from cache
                .then(() => proxy.getItem(itemIdentifier, parameters))
                .then(response => {
                    expect(response).toMatchObject({
                        itemData,
                        itemIdentifier,
                        itemResponse,
                        correctResponse,
                        itemState
                    });
                })
        );
    });

    it('calls call item action request properly', () => {
        expect.assertions(12);
        const action = 'doItem';
        const itemIdentifier = 'item-123';
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
                                itemIdentifier
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
                .then(() => proxy.callItemAction(itemIdentifier, action, parameters))
                .then(response => {
                    expect(response).toMatchObject({
                        did: true
                    });
                })
                // get item from cache again and check the state was updated on it
                .then(() => proxy.getItem(itemIdentifier))
                .then(response => {
                    expect(response).toMatchObject(item);
                })
        );
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
            .catch(function (err) {
                expect(err).toMatchObject({
                    message: 'Timeout'
                });
            });
    });

    it('saveScoringInlineComments', async () => {
        expect.assertions(4);

        expect(proxy.saveScoringInlineComments).toBeTypeOf('function');

        fetch.mockResponses(initRequest(), JSON.stringify({}));
        await proxy.init(config);
        await proxy.saveScoringInlineComments('item-abc', {
            foo: 'bar'
        });
        const fetchCall = fetch.mock.calls[fetch.mock.calls.length - 1];
        expect(fetchCall).toBeTruthy();
        expect(fetchCall[0]).toBe(config.saveScoringInlineCommentsUrl);

        expect(fetchCall[1]).toMatchObject({
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            method: 'PUT',
            body: '{"itemId":"item-abc","comment":{"foo":"bar"}}'
        });
    });

    it('saveScoringAnnotationComment', async () => {
        expect.assertions(4);

        expect(proxy.saveScoringAnnotationComment).toBeTypeOf('function');

        fetch.mockResponses(initRequest(), JSON.stringify({}));
        await proxy.init(config);
        await proxy.saveScoringAnnotationComment('item-abc', {
            markingSymbols: [{ foo: 'bar' }]
        });
        const fetchCall = fetch.mock.calls[fetch.mock.calls.length - 1];
        expect(fetchCall).toBeTruthy();
        expect(fetchCall[0]).toBe(config.saveScoringAnnotationCommentUrl);

        expect(fetchCall[1]).toMatchObject({
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            method: 'PUT',
            body: '{"itemId":"item-abc","annotations":{"markingSymbols":[{"foo":"bar"}]}}'
        });
    });

    it('saveScoringAnnotationComment includes responseIdentifier when available', async () => {
        expect.assertions(4);

        fetch.mockResponses(initRequest(), JSON.stringify({}));
        await proxy.init(config);
        await proxy.saveScoringAnnotationComment('item-abc', {
            responses: {
                RESPONSE_1: {
                    markingSymbols: [{ foo: 'bar' }]
                }
            }
        });
        const fetchCall = fetch.mock.calls[fetch.mock.calls.length - 1];
        expect(fetchCall).toBeTruthy();
        expect(fetchCall[0]).toBe(config.saveScoringAnnotationCommentUrl);
        const body = JSON.parse(fetchCall[1].body);
        expect(body.responseIdentifier).toBe('RESPONSE_1');
        expect(body.annotations).toEqual({
            responses: {
                RESPONSE_1: {
                    markingSymbols: [{ foo: 'bar' }]
                }
            }
        });
    });
});
