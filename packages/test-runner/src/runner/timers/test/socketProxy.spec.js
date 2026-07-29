// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import { socketProxyFactory } from '../socketProxy.js';
import { actionErrorCodes } from 'taoDeliverAppsCommon/core/error/ActionError';

describe('socketProxy', () => {
    const deliveryExecutionId = 'delivery123';
    let socketUrl = `http://localhost`; // port gets added later
    const authToken = 'token123';
    const jwtTokenHandler = {
        getToken: () => Promise.resolve(authToken)
    };

    describe('API', () => {
        it('should fail without a jwtTokenHandler', async () => {
            const opts = { socketUrl, deliveryExecutionId };
            await expect(socketProxyFactory(opts)).rejects.toThrow(TypeError);
        });

        it('should fail without a socketUrl', async () => {
            const opts = { jwtTokenHandler, deliveryExecutionId };
            await expect(socketProxyFactory(opts)).rejects.toThrow(new TypeError('Invalid URL: undefined'));
        });

        it('should fail without a deliveryExecutionId', async () => {
            const opts = { jwtTokenHandler, socketUrl };
            await expect(socketProxyFactory(opts)).rejects.toThrow(TypeError);
        });

        it('should return the API object', async () => {
            const opts = { jwtTokenHandler, socketUrl, deliveryExecutionId };
            const socketProxy = await socketProxyFactory(opts);
            expect(socketProxy.connect).toBeTypeOf('function');
            expect(socketProxy.emit).toBeTypeOf('function');
            expect(socketProxy.on).toBeTypeOf('function');
            expect(socketProxy.off).toBeTypeOf('function');
            expect(socketProxy.onProxyEvent).toBeTypeOf('function');
            expect(socketProxy.disconnect).toBeTypeOf('function');
            expect(socketProxy.isConnected).toBeTypeOf('function');
            expect(socketProxy.io).toBeTypeOf('object');
            expect(socketProxy.io.on).toBeTypeOf('function');
            expect(socketProxy.io.off).toBeTypeOf('function');
        });
    });

    describe('socket events', () => {
        let io, serverSocket, testClientSocket;

        beforeAll(
            () =>
                new Promise(done => {
                    // mock the socket backend used in all tests
                    const httpServer = createServer();
                    io = new Server(httpServer);
                    httpServer.listen(() => {
                        const port = httpServer.address().port;
                        socketUrl = `${socketUrl}:${port}`;
                        testClientSocket = new Client(socketUrl); // dummy client, to know when server is connectable
                        io.on('connect', socket => {
                            serverSocket = socket;
                            done();
                        });
                    });
                })
        );

        afterAll(() => {
            testClientSocket.close();
            io.close();
        });

        beforeEach(() => {
            if (serverSocket) {
                serverSocket.removeAllListeners();
            }
        });

        it('should connect to a backend and disconnect', async () => {
            const opts = { jwtTokenHandler, socketUrl, deliveryExecutionId };
            const proxy = await socketProxyFactory(opts);
            expect(proxy.isConnected()).toBe(false);

            const clientSocket = await proxy.connect();

            expect(clientSocket.connected).toBe(true);
            expect(proxy.isConnected()).toBe(true);
            proxy.disconnect();
            expect(clientSocket.connected).toBe(false);
            expect(proxy.isConnected()).toBe(false);
        });

        it('should be configured to send auth token', async () => {
            const jwtTokenHandlerMock = {
                getToken: vi.fn().mockResolvedValue('abc-def')
            };
            const opts = { jwtTokenHandler: jwtTokenHandlerMock, socketUrl, deliveryExecutionId };
            const proxy = await socketProxyFactory(opts);
            expect(jwtTokenHandlerMock.getToken).not.toHaveBeenCalled();

            const clientSocket = await proxy.connect();

            expect(clientSocket.connected).toBe(true);
            expect(clientSocket.auth.token).toBe('abc-def');
            expect(jwtTokenHandlerMock.getToken).toHaveBeenCalled();
        });

        it('should emit launch-test with deliveryExecutionId on connect and reconnect', async () => {
            const connectLaunchTestSpy = vi.fn();
            serverSocket.once('launch-test', connectLaunchTestSpy);

            const _pingTimeout = io.engine.opts.pingTimeout;
            const _pingInterval = io.engine.opts.pingInterval;
            const opts = { jwtTokenHandler, socketUrl, deliveryExecutionId };
            const proxy = await socketProxyFactory(opts);

            const clientSocket = await proxy.connect();

            expect(clientSocket.connected).toBe(true);
            expect(connectLaunchTestSpy).toHaveBeenCalled();
            expect(connectLaunchTestSpy.mock.calls[0][0]).toEqual({ id: deliveryExecutionId });
            connectLaunchTestSpy.mockClear();

            const emitSpy = vi.spyOn(clientSocket, 'emit');

            return new Promise(done => {
                clientSocket.once('disconnect', () => {
                    expect(clientSocket.connected).toBe(false);

                    // 3. restore original settings
                    io.engine.opts.pingTimeout = _pingTimeout;
                    io.engine.opts.pingInterval = _pingInterval;
                });
                clientSocket.io.once('reconnect', () => {
                    // 4. test events re-emitted afer reconnect
                    expect(emitSpy.mock.calls[0]).toEqual(
                        expect.arrayContaining(['launch-test', { id: deliveryExecutionId }])
                    );
                    proxy.disconnect();
                    done();
                });

                // 2. apply fake settings to cause 'ping timeout' disconnect
                io.engine.opts.pingTimeout = 1;
                io.engine.opts.pingInterval = 1;
            });
        });

        it('should on and off listeners and receive server messages', async () => {
            const opts = { jwtTokenHandler, socketUrl, deliveryExecutionId };
            const proxy = await socketProxyFactory(opts);

            const clientSocket = await proxy.connect();

            expect(clientSocket.connected).toBe(true);

            return new Promise(done => {
                let foos = 0;
                const fooHandler = vi.fn(n => {
                    foos += n;
                    expect(foos).toBe(n);
                    expect(fooHandler).toHaveBeenCalledTimes(n);
                });
                const barHandler = vi.fn(n => {
                    expect(n).toBe(1);
                    expect(barHandler).toHaveBeenCalledTimes(1);
                    // end of test
                    proxy.off('bar');
                    proxy.disconnect();
                    done();
                });

                serverSocket.emit('foo', 1); // not received
                expect(fooHandler).not.toHaveBeenCalled();

                proxy.on('foo', fooHandler);
                proxy.on('bar', barHandler);

                serverSocket.emit('foo', 1); // received
                serverSocket.emit('foo', 2); // received
                serverSocket.emit('foo', 3); // received
                expect(barHandler).not.toHaveBeenCalled();

                fooHandler.mockClear();

                proxy.off('foo');
                serverSocket.emit('foo', 4); // not received
                expect(fooHandler).not.toHaveBeenCalled();

                serverSocket.emit('bar', 1); // received
            });
        });

        it('on error, should call its onProxyEvent handler', async () => {
            const opts = { jwtTokenHandler, socketUrl, deliveryExecutionId };
            const proxy = await socketProxyFactory(opts);

            const clientSocket = await proxy.connect();

            expect(clientSocket.connected).toBe(true);

            return new Promise(done => {
                const errorSpy = vi.fn().mockImplementationOnce(arg => {
                    expect(arg && arg.message).toBe('oh!');
                    proxy.disconnect();
                    done();
                });
                proxy.onProxyEvent('error', errorSpy);

                expect(errorSpy).not.toHaveBeenCalled();

                serverSocket.emit('unexpected-error', 'oh!');
            });
        });

        it('on launch, should call its onProxyEvent handler', async () => {
            const opts = { jwtTokenHandler, socketUrl, deliveryExecutionId };
            const proxy = await socketProxyFactory(opts);

            return new Promise(done => {
                const launchSpy = vi.fn().mockImplementationOnce(() => {
                    proxy.disconnect();
                    done();
                });
                proxy.onProxyEvent('launch', launchSpy);

                expect(launchSpy).not.toHaveBeenCalled();

                proxy.connect();
            });
        });

        it('on force_logout, should disconnect and notify via onProxyEvent', async () => {
            const opts = { jwtTokenHandler, socketUrl, deliveryExecutionId };
            const proxy = await socketProxyFactory(opts);

            const clientSocket = await proxy.connect();
            expect(clientSocket.connected).toBe(true);

            return new Promise(done => {
                const forceLogoutSpy = vi.fn().mockImplementationOnce(err => {
                    expect(err && err.errorCode).toBe(actionErrorCodes.forceLogout);
                    expect(proxy.isConnected()).toBe(false);
                    done();
                });
                proxy.onProxyEvent('force_logout', forceLogoutSpy);

                expect(forceLogoutSpy).not.toHaveBeenCalled();

                serverSocket.emit('force_logout', 'session taken over');
            });
        });

        test.each([
            ['with payload', true],
            ['without payload', false]
        ])('should emit message with callback %s', async hasPayload => {
            const msg = 'testt-msgg';
            const payload = hasPayload ? { foo: 'bar' } : void 0;
            const opts = { jwtTokenHandler, socketUrl, deliveryExecutionId };
            const proxy = await socketProxyFactory(opts);

            const clientSocket = await proxy.connect();

            expect(clientSocket.connected).toBe(true);

            return new Promise(done => {
                serverSocket.once(msg, (received, cb) => {
                    expect(received).toEqual(payload);
                    expect(cb).toBeTypeOf('function');
                    cb('ack');
                });
                clientSocket.emit(msg, payload, ack => {
                    expect(ack).toBe('ack');
                    proxy.disconnect();
                    done();
                });
            });
        });

        //this test case should be the last in this test suite
        // sometimes it causes a timing issue for the following tests
        test.each([
            ['with payload', true],
            ['without payload', false]
        ])('should emit message %s', async hasPayload => {
            const msg = 'test-msg';
            const payload = hasPayload ? { foo: 'bar' } : void 0;
            const opts = { jwtTokenHandler, socketUrl, deliveryExecutionId };
            const proxy = await socketProxyFactory(opts);

            const clientSocket = await proxy.connect();

            expect(clientSocket.connected).toBe(true);

            return new Promise(done => {
                serverSocket.once(msg, received => {
                    expect(received).toEqual(payload);
                    proxy.disconnect();
                    done();
                });
                clientSocket.emit(msg, payload);
            });
        });
    });
});
