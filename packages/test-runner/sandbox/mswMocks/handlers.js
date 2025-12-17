// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import { timers } from './timersBackend.js';

// Simulate the websockets backend
const socket = ws.link('wss://localhost:5500');

let io;

export const handlers = [
    socket.addEventListener('connection', connection => {
        io = toSocketIo(connection);

        // receive from socketProxy
        io.client.on('launch-test', () => {
            io.client.on('start-timers', (event, parsedData) => {
                timers.on('time-update', detail => {
                    // send back to socketProxy
                    io.client.emit('refresh-timers', detail);
                });
                timers.start(parsedData);
            });
            io.client.on('stop-timers', () => {
                timers.stop();
            });
        });
    })
];

// Manually triggered sandbox events
window.addEventListener('presetsocket-send', ({ detail: { eventName, payloadStr } }) => {
    if (!io || !eventName) {
        return;
    }
    let payload;
    try {
        payload = payloadStr ? JSON.parse(payloadStr) : void 0;
    } catch (err) {
        payload = payloadStr;
    }

    if (eventName === 'refresh-timers') {
        timers.setTimersData(payload);
    } else if (eventName.startsWith('proctoring-acs-action')) {
        if (typeof payload.extra_time === 'number') {
            timers.setExtraTime(payload.extra_time * 60 * 1000);
        }
        io.client.emit(eventName, payload);
    }
});
