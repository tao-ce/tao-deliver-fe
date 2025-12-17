// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import router from '../router.js';

const defineProperty = (target, name, value) =>
    Object.defineProperty(target, name, {
        configurable: true,
        enumerable: true,
        value
    });

describe('router', () => {
    const windowLocation = window.location;
    const mockList = ['replaceState', 'pushState'];
    const history = {};
    mockList.forEach(key => {
        history[key] = window.history[key];
    });

    let testRouter;

    const mockURL = 'http://foo.bar';

    beforeEach(() => {
        defineProperty(window, 'location', new URL(mockURL));

        mockList.forEach(key => {
            window.history[key] = vi.fn().mockImplementation((state, title, url) => {
                // Update window.location when pushState/replaceState is called
                if (url) {
                    defineProperty(window, 'location', new URL(url));
                }
            });
        });

        // rewrap the router to another object in order to isolate from the side-effects
        testRouter = { ...router };
    });

    afterEach(() => {
        defineProperty(window, 'location', windowLocation);

        Object.keys(history).forEach(key => {
            window.history[key] = history[key];
        });
    });

    describe('dispatchURL', () => {
        it('dispatches the URL extracting the parameters', async () => {
            const urlPath = '/baz';
            const url = `${mockURL}${urlPath}?foo=bar`;
            const parameters = {
                foo: 'bar'
            };

            testRouter.dispatch = vi.fn().mockReturnValue(Promise.resolve());

            await expect(testRouter.dispatchURL(url)).resolves.toBeUndefined();

            expect(testRouter.dispatch).toHaveBeenCalledWith(urlPath, parameters);
        });

        it('cleans up the URL from session parameters', async () => {
            const urlPath = '/baz';
            const url = `${mockURL}${urlPath}?foo=bar&refreshToken=123htre&accessToken=456lfde`;
            const cleanUrl = `${mockURL}${urlPath}?foo=bar`;
            const parameters = {
                foo: 'bar',
                refreshToken: '123htre',
                accessToken: '456lfde'
            };

            testRouter.dispatch = vi.fn().mockReturnValue(Promise.resolve());

            await expect(testRouter.dispatchURL(url)).resolves.toBeUndefined();

            expect(window.history.replaceState).toHaveBeenCalledWith({ parameters }, '', cleanUrl);

            expect(testRouter.dispatch).toHaveBeenCalledWith(urlPath, parameters);
        });

        it('fails when the URL is not accepted', async () => {
            const urlPath = '/baz';
            const url = `${mockURL}${urlPath}`;

            testRouter.dispatch = vi.fn().mockReturnValue(Promise.reject());

            await expect(testRouter.dispatchURL(url)).rejects.toThrow();

            window.history.replaceState = vi.fn().mockImplementation(() => {
                throw new Error('fail this!');
            });

            expect(() => testRouter.dispatchURL(`${url}?foo=bar&refreshToken=123htre&accessToken=456lfde`)).toThrow();
        });

        it('registers the current location', async () => {
            const urlPath = '/foo';
            const url = `${mockURL}${urlPath}`;
            window.location.href = url;

            testRouter.dispatch = vi.fn().mockReturnValue(Promise.resolve());

            await expect(testRouter.dispatchURL(url)).resolves.toBeUndefined();
            expect(testRouter.dispatch).toHaveBeenCalledWith(urlPath, {});

            expect(testRouter.currentLocation).toEqual(url);
        });

        it('registers the current location, discarding the hash', async () => {
            const urlPath = '/foo';
            const current = `${mockURL}${urlPath}`;
            const url = `${current}#bar`;
            window.location.href = url;

            testRouter.dispatch = vi.fn().mockReturnValue(Promise.resolve());

            await expect(testRouter.dispatchURL(url)).resolves.toBeUndefined();
            expect(testRouter.dispatch).toHaveBeenCalledWith(urlPath, {});

            expect(testRouter.currentLocation).toEqual(current);
        });
    });

    describe('dispatch', () => {
        it('dispatches to the route controller', async () => {
            const mockController = { name: 'foo' };
            const defaultController = { name: 'default' };
            const controllerFactory = vi.fn().mockImplementation(() => mockController);
            const defaultFactory = vi.fn().mockImplementation(() => defaultController);

            testRouter.importController = vi.fn().mockImplementation(route => {
                if (route === 'foo') {
                    return Promise.resolve({ default: controllerFactory });
                }
                return Promise.resolve({ default: defaultFactory });
            });

            testRouter.startController = vi.fn();

            await expect(testRouter.dispatch('foo')).resolves.toBeUndefined();

            expect(testRouter.importController).toHaveBeenCalledWith('foo');

            expect(testRouter.startController).toHaveBeenCalledWith(mockController, {});
        });

        it('dispatches with the given parameters', async () => {
            const mockController = { name: 'foo' };
            const controllerFactory = vi.fn().mockImplementation(() => mockController);
            const parameters = {
                foo: 'bar'
            };

            testRouter.importController = vi
                .fn()
                .mockImplementation(() => Promise.resolve({ default: controllerFactory }));

            testRouter.startController = vi.fn();

            await expect(testRouter.dispatch('foo', parameters)).resolves.toBeUndefined();

            expect(testRouter.importController).toHaveBeenCalledWith('foo');

            expect(testRouter.startController).toHaveBeenCalledWith(mockController, parameters);
        });

        it('dispatches to the default controller', async () => {
            const mockController = { name: 'foo' };
            const defaultController = { name: 'default' };
            const controllerFactory = vi.fn().mockImplementation(() => mockController);
            const defaultFactory = vi.fn().mockImplementation(() => defaultController);

            testRouter.importController = vi.fn().mockImplementation(route => {
                if (route === 'foo') {
                    return Promise.resolve({ default: controllerFactory });
                }
                return Promise.resolve({ default: defaultFactory });
            });

            testRouter.startController = vi.fn();

            await expect(testRouter.dispatch('bar')).resolves.toBeUndefined();

            expect(testRouter.importController).toHaveBeenCalledWith('bar');

            expect(testRouter.startController).toHaveBeenCalledWith(defaultController, {});
        });

        it('fails when the controller is not valid', async () => {
            testRouter.importController = vi.fn().mockImplementation(() => Promise.resolve({ default: 'foo' }));

            testRouter.startController = vi.fn();

            await expect(testRouter.dispatch('foo')).rejects.toThrow();

            expect(testRouter.importController).toHaveBeenCalledWith('foo');

            expect(testRouter.startController).not.toHaveBeenCalled();

            testRouter.importController = vi.fn().mockImplementation(() => Promise.reject(new Error('fail this!')));

            await expect(testRouter.dispatch('foo')).rejects.toThrow();

            expect(testRouter.importController).toHaveBeenCalledWith('foo');
        });
    });

    describe('importController', () => {
        it('throw exception if no specific router implements the controller loaded', async () => {
            await expect(testRouter.importController()).rejects.toThrow();
        });
    });

    describe('getConfig', () => {
        it('returns an empty config by default', () => {
            expect(testRouter.getConfig()).toEqual({});
        });
    });

    describe('startController', () => {
        it('starts the given controller', () => {
            const mockController = {
                prepare: vi.fn(),
                install: vi.fn(),
                start: vi.fn()
            };

            testRouter.startController(mockController);

            expect(mockController.prepare).toHaveBeenCalled();
            expect(mockController.install).toHaveBeenCalled();
            expect(mockController.start).toHaveBeenCalled();

            expect(testRouter.activeController).toBe(mockController);
        });

        it('starts the given controller with the given parameters', () => {
            const mockController = {
                prepare: vi.fn(),
                install: vi.fn(),
                start: vi.fn()
            };
            const config = {
                answer: 42
            };
            const parameters = {
                foo: 'bar'
            };

            testRouter.getConfig = () => config;
            testRouter.startController(mockController, parameters);

            expect(mockController.prepare).toHaveBeenCalled();
            expect(mockController.install).toHaveBeenCalledWith(config);
            expect(mockController.start).toHaveBeenCalledWith(parameters);

            expect(testRouter.activeController).toBe(mockController);
        });

        it('stops the previous controller', () => {
            const oldController = {
                stop: vi.fn(),
                clean: vi.fn()
            };
            const newController = {
                prepare: vi.fn(),
                start: vi.fn()
            };

            testRouter.activeController = oldController;
            testRouter.startController(newController);

            expect(oldController.stop).toHaveBeenCalled();
            expect(oldController.clean).toHaveBeenCalled();

            expect(newController.prepare).toHaveBeenCalled();
            expect(newController.start).toHaveBeenCalled();

            expect(testRouter.activeController).toBe(newController);
        });
    });

    describe('stopActiveController', () => {
        it('stops the active controller', () => {
            const mockController = {
                stop: vi.fn(),
                clean: vi.fn()
            };
            testRouter.activeController = mockController;

            testRouter.stopActiveController();

            expect(mockController.stop).toHaveBeenCalled();
            expect(mockController.clean).toHaveBeenCalled();

            expect(testRouter.activeController).toBeNull();
        });
    });

    describe('replace', () => {
        it('replaces with a relative URL', () => {
            testRouter.dispatchURL = vi.fn();
            const expected = `${mockURL}/foo`;

            testRouter.replace('/foo');

            expect(window.history.replaceState).toHaveBeenCalledWith({ url: expected }, void 0, expected);

            expect(testRouter.dispatchURL).toHaveBeenCalledWith(expected);
        });

        it('replaces with a given state', () => {
            testRouter.dispatchURL = vi.fn();
            const state = {
                url: `${mockURL}/baz`,
                title: 'FOO'
            };

            testRouter.replace(state);

            expect(window.history.replaceState).toHaveBeenCalledWith(state, state.title, state.url);

            expect(testRouter.dispatchURL).toHaveBeenCalledWith(state.url);
        });
    });

    describe('redirect', () => {
        it('redirects to a relative URL', () => {
            testRouter.dispatchURL = vi.fn();
            const expected = `${mockURL}/foo`;

            testRouter.redirect('/foo');

            expect(window.history.pushState).toHaveBeenCalledWith({ url: expected }, void 0, expected);

            expect(testRouter.dispatchURL).toHaveBeenCalledWith(expected);
        });

        it('redirects with a given state', () => {
            testRouter.dispatchURL = vi.fn();
            const state = {
                url: `${mockURL}/baz`,
                title: 'FOO'
            };

            testRouter.redirect(state);

            expect(window.history.pushState).toHaveBeenCalledWith(state, state.title, state.url);

            expect(testRouter.dispatchURL).toHaveBeenCalledWith(state.url);
        });
    });

    describe('inject', () => {
        it('adds a new state to the history', () => {
            const url = `${mockURL}/foo`;
            testRouter.dispatchURL = vi.fn();

            testRouter.inject(url);

            expect(window.history.pushState).toHaveBeenCalledWith({ url }, '', url);

            testRouter.inject(url, 'foo');

            expect(window.history.pushState).toHaveBeenCalledWith({ url }, 'foo', url);

            expect(testRouter.dispatchURL).not.toHaveBeenCalled();
        });

        it('registers the new location', () => {
            const url = `${mockURL}/foo`;
            testRouter.dispatchURL = vi.fn();

            testRouter.inject(url, 'foo');

            expect(testRouter.currentLocation).toEqual(url);
        });

        it('accept a relative URL', () => {
            const path = '/foo/var';
            const url = `${mockURL}${path}`;
            testRouter.dispatchURL = vi.fn();

            testRouter.inject(path, 'foo');

            expect(window.history.pushState).toHaveBeenCalledWith({ url }, 'foo', url);
        });

        it('accept an URL not related to the base URL', () => {
            const url = 'http://bar.foo.bar/foo/bar';
            testRouter.dispatchURL = vi.fn();

            testRouter.inject(url, 'foo');

            expect(window.history.pushState).toHaveBeenCalledWith({ url }, 'foo', url);
        });

        it('accept an URL object', () => {
            const url = `${mockURL}/foo`;
            testRouter.dispatchURL = vi.fn();

            testRouter.inject(new URL(url), 'foo');

            expect(window.history.pushState).toHaveBeenCalledWith({ url }, 'foo', url);
        });
    });

    describe('rewrite', () => {
        it('replaces the current state in the history', () => {
            const url = `${mockURL}/foo`;
            testRouter.dispatchURL = vi.fn();

            testRouter.rewrite(url);

            expect(window.history.replaceState).toHaveBeenCalledWith({ url }, '', url);

            testRouter.rewrite(url, 'foo');

            expect(window.history.replaceState).toHaveBeenCalledWith({ url }, 'foo', url);

            expect(testRouter.dispatchURL).not.toHaveBeenCalled();
        });

        it('registers the new location', () => {
            const url = `${mockURL}/foo`;
            testRouter.dispatchURL = vi.fn();

            testRouter.rewrite(url, 'foo');

            expect(testRouter.currentLocation).toEqual(url);
        });

        it('accept a relative URL', () => {
            const path = '/foo/var';
            const url = `${mockURL}${path}`;
            testRouter.dispatchURL = vi.fn();

            testRouter.rewrite(path, 'foo');

            expect(window.history.replaceState).toHaveBeenCalledWith({ url }, 'foo', url);
        });

        it('accept an URL not related to the base URL', () => {
            const url = 'http://bar.foo.bar/foo/bar';
            testRouter.dispatchURL = vi.fn();

            testRouter.rewrite(url, 'foo');

            expect(window.history.replaceState).toHaveBeenCalledWith({ url }, 'foo', url);
        });

        it('accept an URL object', () => {
            const url = `${mockURL}/foo`;
            testRouter.dispatchURL = vi.fn();

            testRouter.rewrite(new URL(url), 'foo');

            expect(window.history.replaceState).toHaveBeenCalledWith({ url }, 'foo', url);
        });
    });

    describe('onPopState', () => {
        it('dispatches the current location', () => {
            const path = '/foo';
            window.location.href = `${mockURL}${path}`;

            testRouter.dispatch = vi.fn();

            testRouter.onPopState();

            expect(testRouter.dispatch).toHaveBeenCalledWith(path, {});
        });

        it('registers the current location', () => {
            window.location.href = `${mockURL}/foo`;

            testRouter.dispatch = vi.fn();

            testRouter.onPopState();

            expect(testRouter.currentLocation).toEqual(window.location.href);
        });

        it('does nothing if only the hash changes', () => {
            window.location.href = `${mockURL}/foo`;
            testRouter.dispatchURL = vi.fn();

            testRouter.currentLocation = window.location.href;
            window.location.hash = '#bar';

            testRouter.onPopState();

            expect(testRouter.dispatchURL).not.toHaveBeenCalled();
        });

        it('dispatches the new location with hash', () => {
            window.location.href = `${mockURL}/foo#bar`;
            testRouter.currentLocation = `${mockURL}/baz?q=42`;
            testRouter.dispatchURL = vi.fn();

            testRouter.onPopState();

            expect(testRouter.dispatchURL).toHaveBeenCalledWith(window.location.href);
        });

        it('supports URL with user/passwords', () => {
            window.location.href = 'http://user:password@foo.bar:8080/foo#bar';
            testRouter.currentLocation = 'http://user:password@foo.bar:8080/baz?q=42';
            testRouter.dispatchURL = vi.fn();

            testRouter.onPopState();

            expect(testRouter.dispatchURL).toHaveBeenCalledWith(window.location.href);
        });
    });

    describe('syncState', () => {
        it('stores the current location', () => {
            const current = 'http://user:password@foo.bar:8080/baz?q=42';
            const url = 'http://user:password@foo.bar:8080/foo';
            window.location.href = `${url}#bar`;
            testRouter.currentLocation = current;

            expect(testRouter.currentLocation).toEqual(current);
            expect(testRouter.currentLocation).not.toEqual(url);

            testRouter.syncState();

            expect(testRouter.currentLocation).toEqual(url);
        });
    });

    describe('start', () => {
        it('starts listening to popstate events', () => {
            testRouter.onPopState = vi.fn();
            testRouter.dispatchURL = vi.fn();

            const mockEvent = new CustomEvent('popstate');
            window.dispatchEvent(mockEvent);

            testRouter.start();

            window.dispatchEvent(mockEvent);

            testRouter.stop();

            expect(testRouter.onPopState).toHaveBeenCalledTimes(1);
            expect(testRouter.onPopState).toHaveBeenCalledWith(mockEvent);
        });

        it('dispatch current location immediately', () => {
            testRouter.onPopState = vi.fn();
            testRouter.dispatchURL = vi.fn();

            testRouter.start();
            testRouter.stop();

            expect(testRouter.onPopState).not.toHaveBeenCalled();

            expect(testRouter.dispatchURL).toHaveBeenCalledTimes(1);
            expect(testRouter.dispatchURL).toHaveBeenCalledWith(window.location.href);
        });

        it('registers the current location', () => {
            const current = `${mockURL}/foo`;
            window.location.href = current;

            testRouter.onPopState = vi.fn();
            testRouter.dispatch = vi.fn();

            testRouter.start();
            testRouter.stop();

            expect(testRouter.currentLocation).toEqual(current);
        });

        it('registers the current location, discarding the hash', () => {
            const current = `${mockURL}/foo`;
            window.location.href = `${current}#bar`;

            testRouter.onPopState = vi.fn();
            testRouter.dispatch = vi.fn();

            testRouter.start();
            testRouter.stop();

            expect(testRouter.currentLocation).toEqual(current);
        });

        it('does not dispatch current location again if it started with the hash', () => {
            const path = '/foo';
            window.location.href = `http://user:password@foo.bar:8080${path}#bar`;
            testRouter.dispatch = vi.fn();

            testRouter.start();
            expect(testRouter.dispatch).toHaveBeenCalledWith(path, {});

            testRouter.dispatch.mockClear();

            testRouter.onPopState();
            expect(testRouter.dispatch).not.toHaveBeenCalled();

            testRouter.stop();
        });

        it('does not dispatch current location again if the hash remains', () => {
            window.location.href = 'http://user:password@foo.bar:8080/foo#bar';
            testRouter.dispatch = vi.fn();

            testRouter.start();

            // no reload, despite the hash is recalled
            testRouter.onPopState();
            testRouter.onPopState();
            testRouter.onPopState();

            expect(testRouter.dispatch).toHaveBeenCalledTimes(1);

            testRouter.stop();
        });

        it('dispatches the new URL on true change', () => {
            window.location.href = 'http://user:password@foo.bar:8080/foo#bar';
            testRouter.dispatch = vi.fn();

            // initial URL dispatched (1)
            testRouter.start();

            // new URL dispatched (2)
            window.location.href = 'http://user:password@foo.bar:8080/bar#bar';
            testRouter.onPopState();

            // new URL dispatched (3)
            window.location.href = 'http://user:password@foo.bar:8080/foo';
            testRouter.onPopState();
            // URL re-dispatched (4)
            testRouter.onPopState();

            // anchor followed (no reload)
            window.location.href = 'http://user:password@foo.bar:8080/foo#bar';
            testRouter.onPopState();

            expect(testRouter.dispatch).toHaveBeenCalledTimes(4);

            testRouter.stop();
        });
    });

    describe('stop', () => {
        it('stops listening to popstate events', () => {
            testRouter.onPopState = vi.fn();
            testRouter.dispatchURL = vi.fn();

            const mockEvent = new CustomEvent('popstate');

            testRouter.stop(); // useless, but it increases the coverage
            testRouter.start();
            testRouter.stop();

            window.dispatchEvent(mockEvent);

            expect(testRouter.onPopState).not.toHaveBeenCalled();
        });
    });

    describe('createCleanQueryString', () => {
        it('creates query string without accessToken and refreshToken', () => {
            const parameters = {
                foo: 'bar',
                jwt: '0123456789abcd',
                accessToken: 'tuf933',
                refreshToken: 'cri277'
            };

            expect(testRouter.createCleanQueryString(parameters)).toEqual('foo=bar&jwt=0123456789abcd');
        });

        it('does not modify the source collection', () => {
            const parameters = {
                foo: 'bar',
                jwt: '0123456789abcd',
                accessToken: 'tuf933',
                refreshToken: 'cri277'
            };
            const check = { ...parameters };
            testRouter.createCleanQueryString(parameters);

            expect(parameters).toEqual(check);
        });
    });
});
