// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import NetworkError from 'core/error/NetworkError';
import TimeoutError from 'core/error/TimeoutError';
import ActionError, { actionErrorCodes } from 'taoDeliverAppsCommon/core/error/ActionError';

/**
 * Create a new interface for socket communication
 * @param {Object} config
 * @param {Object} config.jwtTokenHandler
 * @param {String} config.deliveryExecutionId
 * @param {String} config.socketUrl - backend of the timers websocket connection
 * @returns {Object} - API allowing the socket client to emit events
 */
export async function socketProxyFactory(config = {}) {
    // Socket.IO must be dynamically imported because if we are using MSW,
    // it needs to override the native WebSocket class before anything else uses it.
    // @see https://github.com/mswjs/socket.io-binding/issues/12#issuecomment-2834955932
    const { io } = await import('socket.io-client');

    const socketUrl = new URL(config.socketUrl);
    if (!config.jwtTokenHandler || !config.jwtTokenHandler.getToken) {
        throw new TypeError('config.jwtTokenHandler must be provided and have a getToken method');
    }
    if (!config.deliveryExecutionId) {
        throw new TypeError('config.deliveryExecutionId must be provided');
    }
    const timeoutMs = 30000;
    // will try to reconnect at 1-2-4-5-5-5-5-5 second intervals,
    // amounting to around 30s grace period before error page
    const reconnectionAttempts = 8;

    // socket.io-client instance
    const socketClientOptions = {
        path: `${socketUrl.pathname.replace(/\/$/, '')}/socket.io/`,
        transports: ['websocket', 'polling'], // Websocket is required as the main transport option in order to make sure the server-side Pods aren't changed between the handshake and messaging
        auth: {
            token: null
        },
        reconnectionAttempts,
        autoConnect: false
    };
    const socket = io(socketUrl.origin, socketClientOptions);

    const eventHandlers = new Map();
    const handleProxyEvent = (eventName, payload) => {
        if (eventHandlers[eventName]) {
            eventHandlers[eventName].forEach(handler => {
                handler(payload);
            });
        }
    };

    const proxy = {
        /**
         * Establish a connection
         * @returns {Promise<Socket>} resolves on connection
         */
        connect() {
            if (socket && !socket.disconnected) {
                return Promise.resolve(socket);
            }

            return config.jwtTokenHandler.getToken().then(
                token =>
                    new Promise(resolve => {
                        /**
                         * Subscribes to socket events for this delivery
                         */
                        const launch = () => {
                            this.emit('launch-test', { id: config.deliveryExecutionId });
                            handleProxyEvent('launch');
                        };

                        // use manual timeout -> if no connection, must show error page and wait for user to reload
                        let isConnectionTimedOut = false;
                        let connectionTimeout = null;
                        const setupTimeout = () => {
                            //start timeout countdown if unless it's running already
                            if (!connectionTimeout) {
                                connectionTimeout = setTimeout(() => {
                                    isConnectionTimedOut = true;
                                }, timeoutMs);
                            }
                        };
                        setupTimeout();

                        // fires on initial connection
                        socket.once('connect', () => {
                            launch(); // async
                            resolve(socket);
                        });

                        // fires on initial connection AND reconnection
                        // @see https://socket.io/docs/v4/client-socket-instance/#connect
                        socket.on('connect', () => {
                            clearTimeout(connectionTimeout);
                            isConnectionTimedOut = false;
                            connectionTimeout = null;
                        });

                        socket.io.on('reconnect', () => {
                            launch();
                        });

                        // fires in case of no network AND if server middleware denies conn
                        // @see https://socket.io/docs/v4/client-socket-instance/#connect_error
                        socket.on('connect_error', err => {
                            let errorToThrow = null;

                            if (isConnectionTimedOut) {
                                errorToThrow = new TimeoutError(err.message);
                            } else if (
                                err.message &&
                                (err.message === 'invalid credentials' ||
                                    err.message.startsWith('Authentication error when validating token'))
                            ) {
                                // handle access token expiration:
                                // if jwt token was considered invalid by socket server, try with a different token,
                                //   until time runs out (see `isConnectionTimedOut` check above); reset if successful connection happened.
                                config.jwtTokenHandler.refreshToken().then(newToken => {
                                    setupTimeout();
                                    socket.auth.token = newToken;
                                    socket.connect();
                                });
                            }

                            if (errorToThrow) {
                                // stop the test, as initial 'connect' never happened in time
                                if (!socket.connected) {
                                    socket.disconnect();
                                    handleProxyEvent('error', new NetworkError(errorToThrow, 0, err));
                                }
                            }
                        });

                        // fires if disconnected and all reconnection attempts used
                        // @see https://socket.io/docs/v4/client-api/#event-reconnect_failed
                        socket.io.on('reconnect_failed', err => {
                            if (!socket.connected) {
                                socket.disconnect();
                                handleProxyEvent(
                                    'error',
                                    new NetworkError('Lost socket connection and could not re-establish it', 0, err)
                                );
                            }
                        });

                        // @see https://socket.io/docs/v4/client-socket-instance/#disconnect
                        socket.on('disconnect', (reason, details) => {
                            // socket.io will reconnect automatically, unless it was a manual disconnect by client or server
                            if (isConnectionTimedOut) {
                                // if socket server threw error ('disconnect' reason = 'transport close') in its middleware,
                                // client will endlessly retry with 'reconnectAttempt=1'; so retry only until time runs out; reset if successful connection happened.
                                socket.disconnect();
                                handleProxyEvent(
                                    'error',
                                    new NetworkError(
                                        `Disconnected from socket several times in a row, reason: ${reason}`,
                                        0, // we unlikely have any error codes
                                        details
                                    )
                                );
                            } else {
                                setupTimeout();
                                if (reason === 'io server disconnect') {
                                    socket.connect();
                                }
                            }
                        });

                        socket.on('unexpected-error', err => {
                            handleProxyEvent('error', new NetworkError(err));
                        });

                        // user got disconnected due to another active session
                        socket.on('force_logout', message => {
                            // stop any further reconnection attempts
                            socket.disconnect();
                            // forward to proxy consumers
                            // emit a specific 'force_logout' event for explicit handling
                            handleProxyEvent(
                                'force_logout',
                                new ActionError(message, actionErrorCodes.forceLogout)
                            );
                        });

                        // initialise connection
                        socket.auth.token = token;
                        socket.connect();
                    })
            );
        },

        /**
         * Emit a message to the socket server
         * If no connection, messages will be buffered until there is one
         * @param {String} eventName
         * @param {any?} [payload]
         * @param {Function?} [cb] - callback which will be called if server acknowledges the message
         */
        emit(eventName, payload, cb = () => {}) {
            if (socket) {
                // emit signature varies if there is a payload or not
                if (typeof payload === 'undefined') {
                    socket.emit(eventName, cb);
                } else {
                    socket.emit(eventName, payload, cb);
                }
            }
        },

        /**
         * Attach a listener for incoming messages
         * @param {String} eventName
         * @param {Function} handler
         */
        on(eventName, handler) {
            if (socket) {
                socket.on(eventName, handler);
            }
        },

        /**
         * Remove an existing listener from this socketProxy
         * @param {String} eventName
         */
        off(eventName) {
            if (socket) {
                socket.off(eventName);
            }
        },

        onProxyEvent(eventName, handler) {
            if (!eventHandlers[eventName]) {
                eventHandlers[eventName] = [];
            }
            eventHandlers[eventName].push(handler);
        },

        /**
         * Close the connection
         */
        disconnect() {
            if (socket && socket.connected) {
                socket.disconnect();
            }
        },

        /**
         * If is connected.
         * While attempting to reconnect returns `false`.
         * @returns {Boolean}
         */
        isConnected() {
            return socket && socket.connected;
        },

        /**
         * Expose event listener methods for underlying manager instance
         * Useful for external handling of manager events 'reconnect', 'reconnect_attempt', 'reconnect_error', 'reconnect_failed', 'error'
         * But using socket events is preferred
         */
        io: {
            /**
             * Attach a listener for manager events
             * @param {String} eventName
             * @param {Function} handler
             */
            on(eventName, handler) {
                if (socket && socket.io) {
                    socket.io.on(eventName, handler);
                }
            },

            /**
             * Remove an existing listener from the manager
             * @param {String} eventName
             */
            off(eventName) {
                if (socket && socket.io) {
                    socket.io.off(eventName);
                }
            }
        }
    };

    return proxy;
}
