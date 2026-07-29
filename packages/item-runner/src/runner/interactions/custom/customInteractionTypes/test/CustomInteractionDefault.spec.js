// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
/* global System */

// global.jest must be defined for jest-fetch-mock to run
global.jest = { fn: vi.fn };
require('jest-fetch-mock').enableMocks();

// mock store for custom interaction
vi.mock('core/store', () => {
    const store = () =>
        Promise.resolve({
            getItem() {
                return Promise.resolve();
            },
            setItem() {
                return Promise.resolve(true);
            }
        });
    store.backends = {
        memory: 'memory'
    };
    return {
        __esModule: true,
        default: store
    };
});

// SystemJS should always use fetch to load modules
System.constructor.prototype.shouldFetch = () => true;

// Ensure SystemJS uses the global fetch mock
System.constructor.prototype.fetch = global.fetch;

import { render } from '@testing-library/svelte';
import CustomInteraction from '../CustomInteractionDefault.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../../itemsStateStore.js';
import ContextWrapper from '../../../../static/test/ContextWrapper.svelte';
import { decommentify } from '@/test-utils/helpers.js';

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

const qtiClass = 'qti-customInteraction';
const itemIdentifier = 'foo';
const responseIdentifier = 'RESPONSE_123';

describe('CustomInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
        fetch.resetMocks();
    });

    it('renders props into markup', () => {
        const { container } = render(CustomInteraction, {
            props: {
                itemIdentifier,
                role: 'someUniqueRole',
                ariaAttrs: {
                    ariaFoo: 12,
                    ariaBar: 'baz'
                },
                dataAttrs: {
                    'data-foo': 'bar',
                    'data-baz': 24
                },
                language: 'hu',
                id: 'interactionId',
                classes: 'foo bar baz',
                dir: 'rtl',
                markup: '<div class="markup"></div>',
                prompt: [
                    {
                        type: 'text',
                        content: 'Some prompt'
                    }
                ],
                responseIdentifier: 'foo123',
                typeIdentifier: 'foo'
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('loads PCI and communicates with it correctly', () =>
        new Promise(done => {
            expect.assertions(18);

            const typeIdentifier = 'fooPCI';
            const modulePath = 'module.js';
            const resolvedModulePath = 'http://example.com/module.js';
            const markup = '<div class="fooPCI">Hello</div>';
            const properties = {
                a: 'b',
                baz: 12
            };
            const previousResponse = { base: { integer: 21 } };
            const newResponse = { base: { integer: 23 } };
            const previousState = { foo: 1 };
            const initialState = { foo: 2 };
            const newState = { foo: 3 };

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.set({ state: previousState });
            interactionStateStore.setResponse(previousResponse);

            let unmount;
            let stateUpdateHandler;

            window.parameterChecker = (container, configuration, state) => {
                expect(decommentify(container.innerHTML)).toBe(markup);
                expect(typeof configuration.onready).toBe('function');
                expect(configuration.properties).toMatchObject(properties);
                expect(configuration.boundTo).toMatchObject({ [responseIdentifier]: previousResponse });
                expect(state).toMatchObject(previousState);

                // setTimeout is necessary to allow to finish parameterChecker function
                setTimeout(() => {
                    // check initial state was saved to store after onready was called
                    expect(interactionStateStore.get().state).toMatchObject(initialState);
                    expect(interactionStateStore.get()).toMatchObject({ qtiClass, typeIdentifier });

                    // request interaction to update state
                    stateUpdateHandler();

                    // response was saved
                    expect(interactionStateStore.getResponse()).toMatchObject(newResponse);

                    // state was saved
                    expect(interactionStateStore.get().state).toMatchObject(newState);
                    expect(interactionStateStore.get()).toMatchObject({ qtiClass, typeIdentifier });

                    unmount();
                }, 0);

                // clean function
                delete window.parameterChecker;
            };

            window.oncompletedChecker = () => {
                // clean function
                delete window.oncompletedChecker;

                done();
            };

            fetch.mockResponse(function (request) {
                expect(request.url).toBe(resolvedModulePath);
                return Promise.resolve(
                    new Response(
                        `
                        define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                            qtiCustomInteractionContext.register({
                                typeIdentifier: "${typeIdentifier}",
                                getInstance(container, configuration, state) {
                                    configuration.onready({
                                        getResponse() {
                                            return ${JSON.stringify(newResponse)};
                                        },
                                        getState() {
                                            return ${JSON.stringify(newState)};
                                        },
                                        oncompleted() {
                                            window.oncompletedChecker();
                                        }
                                    }, ${JSON.stringify(initialState)});
                                    window.parameterChecker(container, configuration, state);
                                }
                            });
                        });
                    `,
                        {
                            headers: {
                                'Content-Type': 'application/javascript'
                            }
                        }
                    )
                );
            });

            ({ unmount } = render(ContextWrapper, {
                props: {
                    testComponent: CustomInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        typeIdentifier,
                        markup,
                        properties
                    },
                    testContextKey: itemIdentifier,
                    testContext: {
                        getPCI(typeIdentifierParam) {
                            expect(typeIdentifierParam).toBe(typeIdentifier);
                            return { runtime: { hook: modulePath } };
                        },
                        getAssetManager() {
                            return {
                                resolve(assetPath) {
                                    expect(assetPath).toBe(modulePath);
                                    return resolvedModulePath;
                                }
                            };
                        },
                        registerLoadingElement(loadingPromiseGetter) {
                            loadingPromiseGetter().then(() => {
                                expect(true).toBe(true);
                            });
                        },
                        on(eventName, handler) {
                            expect(eventName).toBe('stateupdate');
                            expect(typeof handler).toBe('function');
                            stateUpdateHandler = handler;
                        },
                        off(eventName, handler) {
                            expect(eventName).toBe('stateupdate');
                            expect(handler).toBe(stateUpdateHandler);
                        }
                    }
                }
            }));
        }));

    it('loads PCI and waits for "afterPciInstantiated", if it was defined in props', () =>
        new Promise(done => {
            expect.assertions(3);

            const typeIdentifier = 'fooPCI';
            const previousResponse = { base: { integer: 21 } };
            const previousState = { foo: 1 };
            const initialState = { foo: 2 };

            let calledAndAwaited = false;
            const afterPciInstantiated = vi.fn().mockImplementation((pInstance, pInitialState) => {
                expect(pInstance?.foo).toBe('bar-instance-prop');
                expect(pInitialState).toEqual({ foo: 2 });
                return new Promise(resolve => {
                    setTimeout(() => {
                        calledAndAwaited = true;
                        resolve();
                    }, 0);
                });
            });

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.set({ state: previousState });
            interactionStateStore.setResponse(previousResponse);

            fetch.mockResponse(function () {
                return Promise.resolve(
                    new Response(
                        `
                        define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                            qtiCustomInteractionContext.register({
                                typeIdentifier: "${typeIdentifier}",
                                getInstance(container, configuration, state) {
                                    configuration.onready({
                                        getResponse() {
                                            return '{}';
                                        },
                                        getState() {
                                            return '{}';
                                        },
                                        oncompleted() {},
                                        foo: 'bar-instance-prop'
                                    }, ${JSON.stringify(initialState)});
                                }
                            });
                        });
                    `,
                        {
                            headers: {
                                'Content-Type': 'application/javascript'
                            }
                        }
                    )
                );
            });

            render(ContextWrapper, {
                props: {
                    testComponent: CustomInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        typeIdentifier,
                        afterPciInstantiated
                    },
                    testContextKey: itemIdentifier,
                    testContext: {
                        getPCI() {
                            return { runtime: { hook: 'pci.js' } };
                        },
                        getAssetManager() {
                            return {
                                resolve() {
                                    return 'http://example.com/resolvedPathPCI.js';
                                }
                            };
                        },
                        registerLoadingElement(loadingPromiseGetter) {
                            loadingPromiseGetter().then(() => {
                                expect(calledAndAwaited).toBe(true);
                                done();
                            });
                        },
                        on() {},
                        off() {}
                    }
                }
            });
        }));

    it('does not update state and response in review mode', () =>
        new Promise(done => {
            expect.assertions(12);

            const typeIdentifier = 'fooPCI';
            const modulePath = 'module.js';
            const resolvedModulePath = 'http://example.com/module.js';
            const markup = '<div class="fooPCI">Hello</div>';
            const properties = {
                a: 'b',
                baz: 12,
                isReviewMode: true
            };
            const previousResponse = { base: { integer: 21 } };
            const newResponse = { base: { integer: 23 } };
            const previousState = { foo: 1 };
            const initialState = { foo: 2 };
            const newState = { foo: 3 };

            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.set({ state: previousState });
            interactionStateStore.setResponse(previousResponse);

            let unmount;

            window.parameterChecker = (container, configuration, state) => {
                expect(decommentify(container.innerHTML)).toBe(markup);
                expect(typeof configuration.onready).toBe('function');
                expect(configuration.properties).toMatchObject(properties);
                expect(configuration.boundTo).toMatchObject({ [responseIdentifier]: previousResponse });
                expect(state).toMatchObject(previousState);

                // setTimeout is necessary to allow to finish parameterChecker function
                setTimeout(() => {
                    // check initial state was NOT saved to store after onready was called
                    expect(interactionStateStore.get().state).toMatchObject(previousState);

                    // response was NOT saved
                    expect(interactionStateStore.getResponse()).toMatchObject(previousResponse);

                    // state was NOT saved
                    expect(interactionStateStore.get().state).toMatchObject(previousState);

                    unmount();
                }, 0);

                // clean function
                delete window.parameterChecker;
            };

            window.oncompletedChecker = () => {
                // clean function
                delete window.oncompletedChecker;

                done();
            };

            fetch.mockResponse(function (request) {
                expect(request.url).toBe(resolvedModulePath);
                return Promise.resolve(
                    new Response(
                        `
                        define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                            qtiCustomInteractionContext.register({
                                typeIdentifier: "${typeIdentifier}",
                                getInstance(container, configuration, state) {
                                    configuration.onready({
                                        getResponse() {
                                            return ${JSON.stringify(newResponse)};
                                        },
                                        getState() {
                                            return ${JSON.stringify(newState)};
                                        },
                                        oncompleted() {
                                            window.oncompletedChecker();
                                        }
                                    }, ${JSON.stringify(initialState)});
                                    window.parameterChecker(container, configuration, state);
                                }
                            });
                        });
                    `,
                        {
                            headers: {
                                'Content-Type': 'application/javascript'
                            }
                        }
                    )
                );
            });

            ({ unmount } = render(ContextWrapper, {
                props: {
                    testComponent: CustomInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        typeIdentifier,
                        markup,
                        properties
                    },
                    testContextKey: itemIdentifier,
                    testContext: {
                        getPCI(typeIdentifierParam) {
                            expect(typeIdentifierParam).toBe(typeIdentifier);
                            return { runtime: { hook: modulePath } };
                        },
                        getAssetManager() {
                            return {
                                resolve(assetPath) {
                                    expect(assetPath).toBe(modulePath);
                                    return resolvedModulePath;
                                }
                            };
                        },
                        registerLoadingElement(loadingPromiseGetter) {
                            loadingPromiseGetter().then(() => {
                                expect(true).toBe(true);
                            });
                        },
                        on() {},
                        off() {}
                    }
                }
            }));
        }));

    it('if not isInitialMount, loads PCI outside of context.registerLoadingElement', () =>
        new Promise(done => {
            expect.assertions(3);

            const typeIdentifier = 'fooPCI';
            const modulePath = 'module.js';
            const resolvedModulePath = 'http://example.com/module.js';
            const markup = '<div class="fooPCI">Hello</div>';

            let unmount;

            window.parameterChecker = container => {
                expect(decommentify(container.innerHTML)).toBe(markup);

                // setTimeout is necessary to allow to finish parameterChecker function
                setTimeout(() => {
                    unmount();
                    done();
                }, 0);

                // clean function
                delete window.parameterChecker;
            };

            fetch.mockResponse(function (request) {
                expect(request.url).toBe(resolvedModulePath);
                return Promise.resolve(
                    new Response(
                        `
                        define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                            qtiCustomInteractionContext.register({
                                typeIdentifier: "${typeIdentifier}",
                                getInstance(container, configuration, state) {
                                    window.parameterChecker(container, configuration, state);
                                }
                            });
                        });
                    `,
                        {
                            headers: {
                                'Content-Type': 'application/javascript'
                            }
                        }
                    )
                );
            });

            ({ unmount } = render(ContextWrapper, {
                props: {
                    testComponent: CustomInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        typeIdentifier,
                        markup,
                        isInitialMount: false
                    },
                    testContextKey: itemIdentifier,
                    testContext: {
                        getPCI(typeIdentifierParam) {
                            expect(typeIdentifierParam).toBe(typeIdentifier);
                            return { runtime: { hook: modulePath } };
                        },
                        getAssetManager() {
                            return {
                                resolve() {
                                    return resolvedModulePath;
                                }
                            };
                        },
                        registerLoadingElement() {
                            //itemContext.registerLoadingElement executes its callbacks only on item mount,
                            //so if they are added later, they won't execute
                        },
                        on() {},
                        off() {}
                    }
                }
            }));
        }));

    it('calls full stateUpdate and oncompleted before destroy', () =>
        new Promise(done => {
            expect.assertions(7);

            const typeIdentifier = 'foo';

            // checks PCI oncompleted was called
            window.oncompletedChecker = () => {
                // clean function
                delete window.oncompletedChecker;

                expect(true).toBe(true);
            };

            fetch.mockResponse(function () {
                const responsePromise = createModuleResponse(`
                    define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                        qtiCustomInteractionContext.register({
                            typeIdentifier: '${typeIdentifier}',
                            getInstance(container, configuration, state) {
                                configuration.onready({
                                    getResponse() {
                                        return 'response';
                                    },
                                    getState() {
                                        return 'state';
                                    },
                                    oncompleted() {
                                        window.oncompletedChecker();
                                    }
                                });
                            }
                        });
                    });
                `)();
                // put component into global context to be destroyable from PCI
                return responsePromise;
            });

            const handleState = vi.fn();
            const handleResponse = vi.fn();

            const { unmount } = render(ContextWrapper, {
                props: {
                    testComponent: CustomInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        typeIdentifier,
                        handleState,
                        handleResponse
                    },
                    testContextKey: itemIdentifier,
                    testContext: {
                        getPCI() {
                            return { runtime: { hook: 'pci.js' } };
                        },
                        getAssetManager() {
                            return {
                                resolve() {
                                    return 'http://example.com/resolvedPathPCI.js';
                                }
                            };
                        },
                        registerLoadingElement(loadingPromiseGetter) {
                            loadingPromiseGetter().then(() => {
                                expect(handleState).not.toHaveBeenCalled();
                                expect(handleResponse).not.toHaveBeenCalled();

                                unmount();

                                expect(handleState).toHaveBeenCalledTimes(1);
                                expect(handleState).toHaveBeenCalledWith('state');
                                expect(handleResponse).toHaveBeenCalledTimes(1);
                                expect(handleResponse).toHaveBeenCalledWith('response');

                                done();
                            });
                        },
                        on() {},
                        off() {}
                    }
                }
            });
        }));

    it('forwards load error back to item', () =>
        new Promise(done => {
            const pathResolvedPCI = 'pathResolvedPCI.js';

            fetch.mockResponse(function () {
                return Promise.resolve(
                    new Response(null, {
                        status: 404
                    })
                );
            });

            render(ContextWrapper, {
                props: {
                    testComponent: CustomInteraction,
                    testComponentProps: {
                        itemIdentifier
                    },
                    testContextKey: itemIdentifier,
                    testContext: {
                        getPCI() {
                            return { runtime: { hook: 'pci.js' } };
                        },
                        getAssetManager() {
                            return {
                                resolve() {
                                    return pathResolvedPCI;
                                }
                            };
                        },
                        registerLoadingElement(loadingPromiseGetter) {
                            loadingPromiseGetter().catch(e => {
                                expect(e.toString()).toMatch(
                                    new RegExp(`Unable to resolve bare specifier '${pathResolvedPCI}'`)
                                );
                                done();
                            });
                        }
                    }
                }
            });
        }));

    it('forwards initialize error back to item', () =>
        new Promise(done => {
            const typeIdentifier = 'bar';

            fetch.mockResponse(
                createModuleResponse(`
                define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                    qtiCustomInteractionContext.register({
                        typeIdentifier: 'foo'
                    });
                });
            `)
            );

            render(ContextWrapper, {
                props: {
                    testComponent: CustomInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        typeIdentifier
                    },
                    testContextKey: itemIdentifier,
                    testContext: {
                        getPCI() {
                            return { runtime: { hook: 'pci.js' } };
                        },
                        getAssetManager() {
                            return {
                                resolve() {
                                    return 'http://example.com/resolvedPathPCI.js';
                                }
                            };
                        },
                        registerLoadingElement(loadingPromiseGetter) {
                            loadingPromiseGetter().catch(e => {
                                expect(e.toString()).toMatch(
                                    new RegExp(
                                        `Unable to instantiate ${typeIdentifier} PCI, because it is not loaded and registered.`
                                    )
                                );
                                done();
                            });
                        }
                    }
                }
            });
        }));

    it('forwards PCI code error back to item', () =>
        new Promise(done => {
            const typeIdentifier = 'foo';

            fetch.mockResponse(createModuleResponse('somecodeerror'));

            render(ContextWrapper, {
                props: {
                    testComponent: CustomInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        typeIdentifier
                    },
                    testContextKey: itemIdentifier,
                    testContext: {
                        getPCI() {
                            return { runtime: { hook: 'pci.js' } };
                        },
                        getAssetManager() {
                            return {
                                resolve() {
                                    return 'http://example.com/resolvedPathPCI.js';
                                }
                            };
                        },
                        registerLoadingElement(loadingPromiseGetter) {
                            loadingPromiseGetter().catch(e => {
                                expect(e.toString()).toMatch(/ReferenceError: somecodeerror is not defined/);
                                done();
                            });
                        }
                    }
                }
            });
        }));

    it('handles destroy during PCI source load', () =>
        new Promise(done => {
            const typeIdentifier = 'foo';
            let unmount;

            fetch.mockResponse(function (req) {
                expect(req.url).toBe('http://example.com/resolvedPathPCI.js');
                const responsePromise = createModuleResponse(`
                define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                    qtiCustomInteractionContext.register({
                        typeIdentifier: '${typeIdentifier}',
                        getInstance() {
                            throw new Error('This line should not be reached');
                        }
                    });
                });
            `)();
                unmount();
                return responsePromise;
            });

            ({ unmount } = render(ContextWrapper, {
                props: {
                    testComponent: CustomInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        typeIdentifier
                    },
                    testContextKey: itemIdentifier,
                    testContext: {
                        getPCI() {
                            return { runtime: { hook: 'pci.js' } };
                        },
                        getAssetManager() {
                            return {
                                resolve() {
                                    return 'http://example.com/resolvedPathPCI.js';
                                }
                            };
                        },
                        registerLoadingElement(loadingPromiseGetter) {
                            loadingPromiseGetter().then(done);
                        }
                    }
                }
            }));
        }));

    it('handles destroy during PCI initialization', () =>
        new Promise(done => {
            expect.assertions(1);

            const typeIdentifier = 'foo';
            let unmount;

            // checks PCI oncompleted was called
            window.oncompletedChecker = () => {
                // clean function
                delete window.oncompletedChecker;

                expect(true).toBe(true);
            };

            fetch.mockResponse(function () {
                const responsePromise = createModuleResponse(`
                define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                    qtiCustomInteractionContext.register({
                        typeIdentifier: '${typeIdentifier}',
                        getInstance(container, configuration, state) {
                            // simulates destroy during init
                            unmount();
                            configuration.onready({
                                oncompleted() {
                                    window.oncompletedChecker();
                                }
                            });
                        }
                    });
                });
            `)();
                // put component into global context to be destroyable from PCI
                window.unmount = unmount;
                return responsePromise;
            });

            ({ unmount } = render(ContextWrapper, {
                props: {
                    testComponent: CustomInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        typeIdentifier
                    },
                    testContextKey: itemIdentifier,
                    testContext: {
                        getPCI() {
                            return { runtime: { hook: 'pci.js' } };
                        },
                        getAssetManager() {
                            return {
                                resolve() {
                                    return 'http://example.com/resolvedPathPCI.js';
                                }
                            };
                        },
                        registerLoadingElement(loadingPromiseGetter) {
                            loadingPromiseGetter().then(done);
                        }
                    }
                }
            }));
        }));

    it('forwards interactiontrace event', () =>
        new Promise(done => {
            const typeIdentifier = 'foo';
            const detail = {
                foo: 'bar',
                baz: 123
            };
            const onTrace = vi.fn();

            fetch.mockResponse(
                createModuleResponse(`
                    define(['qtiCustomInteractionContext'], function(qtiCustomInteractionContext) {
                        qtiCustomInteractionContext.register({
                            typeIdentifier: '${typeIdentifier}',
                            getInstance(container, configuration) {
                                configuration.onready({
                                    getResponse() {
                                        return '{}';
                                    },
                                    getState() {
                                        return '{}';
                                    },
                                    oncompleted() {}
                                });
                                container.dispatchEvent(new CustomEvent('interactiontrace', {
                                    detail: ${JSON.stringify(detail)}
                                }));
                            }
                        });
                    });
                `)
            );

            const { container } = render(ContextWrapper, {
                props: {
                    testComponent: CustomInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        typeIdentifier
                    },
                    testContextKey: itemIdentifier,
                    testContext: {
                        getPCI() {
                            return { runtime: { hook: 'pci.js' } };
                        },
                        getAssetManager() {
                            return {
                                resolve() {
                                    return 'http://example.com/resolvedPathPCI.js';
                                }
                            };
                        },
                        registerLoadingElement(loadingPromiseGetter) {
                            loadingPromiseGetter().then(() => {
                                expect(onTrace).toHaveBeenCalledTimes(1);
                                expect(onTrace.mock.calls[0][0].detail).toEqual({
                                    domEventType: 'custom', // if it is not provided
                                    ...detail
                                });
                                done();
                            });
                        },
                        on() {},
                        off() {}
                    }
                }
            });

            const interactionElement = container.querySelector('.qti-interaction');
            interactionElement.addEventListener('interactiontrace', onTrace);
        }));
});
