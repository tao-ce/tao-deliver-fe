// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { timersProxyFactory } from '../timersProxy.js';
import timerModes from '../timerModes.js';

describe('timersProxy', () => {
    let callbacks = {};
    let proxyCallbacks = {};
    const socketProxyMock = {
        on: vi.fn().mockImplementation((eventName, callback) => {
            callbacks[eventName] = callback;
        }),
        onProxyEvent: vi.fn().mockImplementation((eventName, callback) => {
            proxyCallbacks[eventName] = callback;
        }),
        emit: vi.fn().mockImplementation((eventName, ...other) => {
            if (callbacks[eventName]) {
                callbacks[eventName](...other);
            }
        }),
        launch: vi.fn().mockImplementation(() => {
            if (proxyCallbacks['launch']) {
                proxyCallbacks['launch']();
            }
        })
    };

    const testContext = {
        testPartId: 'testPart-1',
        sectionId: 'assessmentSection-1',
        itemIdentifier: 'item-1'
    };

    describe('API', () => {
        it('should fail without a valid mode', () => {
            const opts = {};
            expect(() => timersProxyFactory(socketProxyMock, opts)).toThrow(TypeError);
            opts.mode = 'unknownMode';
            expect(() => timersProxyFactory(socketProxyMock, opts)).toThrow(TypeError);
        });

        it('should return a Promise with the API', () => {
            const opts = { mode: timerModes.server };
            const timersProxy = timersProxyFactory(socketProxyMock, opts);
            expect(timersProxy.start).toBeTypeOf('function');
            expect(timersProxy.stop).toBeTypeOf('function');
            expect(timersProxy.on).toBeTypeOf('function');
            expect(timersProxy.off).toBeTypeOf('function');
        });
    });

    describe('socket messages', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        describe('common to both modes', () => {
            test.each([timerModes.server, timerModes.client])(
                'should handle incoming refresh-timers only between start-timers and stop-timers (mode: %s)',
                mode => {
                    const opts = { mode };
                    const proxy = timersProxyFactory(socketProxyMock, opts); // running: false

                    const onRefreshTimers = vi.fn();
                    proxy.on('refresh-timers', onRefreshTimers);

                    socketProxyMock.emit('refresh-timers', 1);
                    expect(onRefreshTimers).not.toHaveBeenCalled();

                    proxy.start(testContext); // running: true

                    socketProxyMock.emit('refresh-timers', 2);
                    expect(onRefreshTimers).toHaveBeenCalledWith(2);
                    onRefreshTimers.mockClear();

                    proxy.stop(); // running: false

                    socketProxyMock.emit('refresh-timers', 3);
                    expect(onRefreshTimers).not.toHaveBeenCalled();
                }
            );
        });

        describe('server-controlled mode', () => {
            const mode = timerModes.server;

            it('should not emit messages for start-timers or stop-timers', () => {
                const opts = { mode };
                const proxy = timersProxyFactory(socketProxyMock, opts);

                const onStartTimers = vi.fn();
                const onStopTimers = vi.fn();
                socketProxyMock.on('start-timers', onStartTimers);
                socketProxyMock.on('stop-timers', onStopTimers);

                proxy.start(testContext);
                expect(onStartTimers).not.toHaveBeenCalled();

                proxy.stop();
                expect(onStopTimers).not.toHaveBeenCalled();
            });
        });

        describe('client-controlled mode', () => {
            const mode = timerModes.client;

            it('should emit messages for start-timers and stop-timers', () => {
                expect.assertions(4);

                const opts = { mode };
                const proxy = timersProxyFactory(socketProxyMock, opts);

                const onStartTimers = vi.fn().mockImplementation((msg, cb) => {
                    expect(msg).toEqual({
                        testPart: { id: testContext.testPartId },
                        section: { id: testContext.sectionId },
                        item: { id: testContext.itemIdentifier }
                    });
                    cb({ processed: true });
                });
                const onStopTimers = vi.fn().mockImplementation((msg, cb) => {
                    expect(msg).toBeUndefined();
                    cb({ processed: true });
                });
                socketProxyMock.on('start-timers', onStartTimers);
                socketProxyMock.on('stop-timers', onStopTimers);

                proxy.start(testContext);
                expect(onStartTimers).toHaveBeenCalled();

                proxy.stop();
                expect(onStopTimers).toHaveBeenCalled();
            });

            it('should emit start-timers again on "launch"', () => {
                //"launch" is emitted by socketProxy on reconnect;
                //it's also emitted on initial connect, but timersProxy itself is not created yet (and even if it was, `runningContext` is null there)

                const opts = { mode };
                const proxy = timersProxyFactory(socketProxyMock, opts);

                const onStartTimers = vi.fn();
                socketProxyMock.on('start-timers', onStartTimers);

                socketProxyMock.launch();
                expect(onStartTimers).not.toHaveBeenCalled();

                proxy.start(testContext);
                expect(onStartTimers).toHaveBeenCalled();
                expect(onStartTimers.mock.calls[0][0]).toEqual({
                    testPart: { id: testContext.testPartId },
                    section: { id: testContext.sectionId },
                    item: { id: testContext.itemIdentifier }
                });
                onStartTimers.mockClear();

                socketProxyMock.launch();
                expect(onStartTimers).toHaveBeenCalled();
                expect(onStartTimers.mock.calls[0][0]).toEqual({
                    testPart: { id: testContext.testPartId },
                    section: { id: testContext.sectionId },
                    item: { id: testContext.itemIdentifier }
                });
                onStartTimers.mockClear();

                proxy.stop();

                socketProxyMock.launch();
                expect(onStartTimers).not.toHaveBeenCalled();
            });
        });
    });
});
