// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Builds a full URL without the hash part
 * @param {URL|string} url
 * @returns {string}
 */
const getUrlWithoutHash = url => {
    const urlWithoutHash = new URL(url);
    urlWithoutHash.hash = '';
    return urlWithoutHash.href;
};

/**
 * Global router using the history API to dispatch the URL to mapped routes.
 *
 * Routes are defined in config.
 * Controllers must be written, as a string parameter of the import,
 * due to webpack's static parsing of import()
 *
 */
const router = {
    /**
     * Contains active controller instance
     */
    activeController: null,

    /**
     * The URL as it was processed by the router, without the hash part if any.
     * This will also help discriminating hash changes from actual routing events.
     */
    currentLocation: null,

    /**
     * Dispatch the router based on a URL.
     * The path will be used for the route and the parameters will be extracted.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
     * @param {string} url - the URL to dispatch
     * @param {string} [base] - the base URL
     * @throws {TypeError} if the URL is not correct (DOM requirements)
     * @returns {Promise}
     */
    dispatchURL(url, base) {
        try {
            const parsedUrl = new URL(url, base || window.location.href);
            const parameters = Array.from(parsedUrl.searchParams.entries()).reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});

            //if we got refreshToken and accessToken in url, we have to cut them out
            if (parameters.refreshToken || parameters.accessToken) {
                const cleanQueryString = this.createCleanQueryString(parameters);
                window.history.replaceState(
                    { parameters },
                    '',
                    `${parsedUrl.origin}${parsedUrl.pathname}?${cleanQueryString}`
                );
            }

            // Cache the current URL, without the hash part.
            // It will allow detecting if only the hash changes when receiving a state change.
            this.syncState();

            return this.dispatch(parsedUrl.pathname, parameters);
        } catch (err) {
            throw new TypeError(`Invalid URL to dispatch:'${url}' (${err.message})`);
        }
    },

    /**
     * Dispatch the given route
     * @param {string} route - an internal route
     * @param {Object} parameters - parameters to be given to the controller
     * @returns {Promise}
     */
    dispatch(route, parameters = {}) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                //to prevent bug in Safari ios 13.2 where memory hangs when loading
                this.importController(route)
                    .then(({ default: controllerFactory }) => {
                        if (typeof controllerFactory === 'function') {
                            return resolve(this.startController(controllerFactory(), parameters));
                        }
                        return reject(
                            new Error(
                                `Unable to load controller for route ${route}, or it doesn't export a default function`
                            )
                        );
                    })
                    .catch(err => reject(err));
            }, 1);
        });
    },

    /**
     * Maps configured routes to controller module imports.
     * This method MUST be overridden from host application!
     *
     * @example
     * router.importController = route => {
     *   switch (route) {
     *     case config.routes.start:
     *       return import('./controller/start.js');
     *   }
     * }
     *
     * @param {String} route
     * @returns {Promise} resolves with an imported module
     */
    // eslint-disable-next-line
    importController(route) {
        return Promise.reject(new Error('router.importController() was not implemented.'));
    },

    /**
     * Provides config for application
     * This method SHOULD be overridden from host application!
     * @returns {Object}
     */
    getConfig() {
        return {};
    },

    /**
     * Prepare and start the provided controller
     * @param {PageController} controller
     * @param {Object} parameters - parameters to be given to the controller
     */
    startController(controller, parameters = {}) {
        if (this.activeController) {
            this.stopActiveController();
        }

        this.activeController = controller;
        controller.prepare();
        if (typeof controller.install === 'function') {
            controller.install(this.getConfig());
        }
        controller.start(parameters);
    },

    /**
     * Stop controller and clean container
     */
    stopActiveController() {
        this.activeController.stop();
        this.activeController.clean();
        this.activeController = null;
    },

    /**
     * Replace state
     * @param {object|string} state - History state object or URL
     * @returns {Promise}
     */
    replace(state) {
        if (typeof state === 'string') {
            state = {
                url: new URL(state, window.location.href).href
            };
        }

        window.history.replaceState(state, state.title, state.url);
        return this.dispatchURL(state.url);
    },

    /**
     * Push state
     * @param {object|string} state - History state object or URL
     * @returns {Promise}
     */
    redirect(state) {
        if (typeof state === 'string') {
            state = {
                url: new URL(state, window.location.href).href
            };
        }

        window.history.pushState(state, state.title, state.url);
        return this.dispatchURL(state.url);
    },

    /**
     * Appends an URL to history and make it current.
     * This will NOT trigger a routing.
     * @param {string} url - The URL
     * @param {string} title - The optional title
     */
    inject(url, title = '') {
        url = new URL(url, window.location.href).href;
        window.history.pushState({ url }, title, url);
        this.syncState();
    },

    /**
     * Rewrites the current URL
     * This will NOT trigger a routing.
     * @param {string} url - The URL
     * @param {string} title - The optional title
     */
    rewrite(url, title = '') {
        url = new URL(url, window.location.href).href;
        window.history.replaceState({ url }, title, url);
        this.syncState();
    },

    /**
     * Synchronize the internal state.
     * Usually, this is done automatically each time a routing event occurs.
     * However, it may be needed to call it explicitly when the URL is updated
     * without routing.
     * For example, when pushing a new state with `window.history.pushState({}, '', url);`.
     */
    syncState() {
        // Keep track of the current location for detecting hash changes.
        this.currentLocation = getUrlWithoutHash(window.location.href);
    },

    /**
     * History pop state event handler
     */
    onPopState() {
        const newLocation = new URL(window.location.href);

        if (newLocation.hash && this.currentLocation === getUrlWithoutHash(newLocation)) {
            // prevent reloading the controller when following an anchor
            return;
        }

        this.dispatchURL(window.location.href);
    },

    /**
     * Entry point of the router that will start event listeners and check actual route
     */
    start() {
        //back & forward button, and push state
        this.boundOnPopState = this.onPopState.bind(this);
        window.addEventListener('popstate', this.boundOnPopState);

        this.dispatchURL(window.location.href);
    },

    /**
     * Stop router event listeners
     */
    stop() {
        if (this.boundOnPopState) {
            window.removeEventListener('popstate', this.boundOnPopState);
        }
    },

    /**
     * Creates query string without accessToken and refreshToken
     * @param {Object} parameters
     * @returns {String} query string made of non-sensitive parameters
     */
    createCleanQueryString(parameters) {
        const parametersClone = { ...parameters };
        delete parametersClone.accessToken;
        delete parametersClone.refreshToken;
        return new URLSearchParams(parametersClone).toString();
    }
};

export default router;
