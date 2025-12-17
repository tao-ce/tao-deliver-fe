// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { mapEventTypeToDomEventType, wrapWithLogger, createLastPressedKeyListener } from '../analytics.js';
import { wait } from '../../../util/async';

describe('mapEventTypeToDomEventType', () => {
    const eventTypeToDomEventTypeMap = {
        keySelect: 'keyup',
        update: 'drop',
        remove: 'click'
    };

    it.each([
        ['keySelect', 'keyup'],
        ['update', 'drop'],
        ['remove', 'click'],
        ['mousedown', 'mousedown'],
        ['resize', 'resize']
    ])('should return the correct dom event type for %s', (inputEventType, expectedDomEventType) => {
        const result = mapEventTypeToDomEventType(inputEventType, eventTypeToDomEventTypeMap);
        expect(result).toBe(expectedDomEventType);
    });
});

describe('wrapWithLogger', () => {
    const interactionElementMock = {
        dispatchEvent: vi.fn()
    };

    afterEach(() => {
        interactionElementMock.dispatchEvent.mockClear();
    });

    it('should call dispatch for each call of wrapped event handler', async () => {
        const interactionStateStore = {
            snapshotResponse: () => void 0,
            getResponseIfChanged: () => 'new response'
        };
        const handleTextChange = wrapWithLogger({
            getInteractionElement: () => interactionElementMock,
            interactionStateStore
        });

        await handleTextChange(new CustomEvent('keydown'));

        expect(interactionElementMock.dispatchEvent).toHaveBeenCalled();
    });

    it('should dispatch event within passed detail data', async () => {
        const interactionStateStore = {
            snapshotResponse: () => void 0,
            getResponseIfChanged: () => 'new response'
        };
        const handleTextChange = wrapWithLogger({
            getInteractionElement: () => interactionElementMock,
            interactionStateStore
        });

        await handleTextChange(new CustomEvent('keydown', { detail: { pressedKey: 'Enter' } }));

        expect(interactionElementMock.dispatchEvent.mock.calls[0][0].detail).toMatchObject({
            pressedKey: 'Enter'
        });
    });

    it('should dispatch event within domEventType', async () => {
        const interactionStateStore = {
            snapshotResponse: () => void 0,
            getResponseIfChanged: () => 'new response'
        };
        const handleTextChange = wrapWithLogger({
            getInteractionElement: () => interactionElementMock,
            interactionStateStore
        });

        await handleTextChange(new CustomEvent('keydown'));

        expect(interactionElementMock.dispatchEvent.mock.calls[0][0].detail).toMatchObject({
            domEventType: 'keydown'
        });
    });

    it('should dispatch event within newResponse, if response is changed by handler', async () => {
        let response = 40;
        const interactionStateStore = {
            snapshotResponse: () => response,
            getResponseIfChanged: () => response,
            setResponse: newResponse => (response = newResponse)
        };
        const handleTextChange = wrapWithLogger({
            getInteractionElement: () => interactionElementMock,
            handler() {
                interactionStateStore.setResponse(42);
            },
            interactionStateStore
        });

        await handleTextChange(new CustomEvent('keydown'));

        expect(interactionElementMock.dispatchEvent.mock.calls[0][0].detail).toMatchObject({
            newResponse: 42
        });
    });

    it('should not dispatch event within newResponse, if response was not changed by handler', async () => {
        let response = 40;
        const interactionStateStore = {
            snapshotResponse: () => response,
            // If response does not change, getResponseIfChanged returns nothing
            getResponseIfChanged: () => void 0,
            setResponse: newResponse => (response = newResponse)
        };
        const handleTextChange = wrapWithLogger({
            getInteractionElement: () => interactionElementMock,
            interactionStateStore
        });

        await handleTextChange(new CustomEvent('keydown'));

        expect(interactionElementMock.dispatchEvent.mock.calls[0][0].detail).toMatchObject({
            domEventType: 'keydown',
            target: null,
            timeStamp: expect.any(Number)
        });
    });

    it('should dispatch event with extra details', async () => {
        const details = {
            foo: 'bar',
            baz: 123
        };
        const newResponse = 'new response';

        const interactionStateStore = {
            snapshotResponse: () => void 0,
            getResponseIfChanged: () => newResponse
        };

        const handleTextChange = wrapWithLogger({
            getInteractionElement: () => interactionElementMock,
            interactionStateStore,
            getDetails() {
                return details;
            }
        });

        await handleTextChange(new CustomEvent('keydown'));

        expect(interactionElementMock.dispatchEvent.mock.calls[0][0].detail).toMatchObject({
            newResponse,
            ...details
        });
    });

    it('should debounce logging if debounce options are passed', async () => {
        // Prepare
        const debounceWaitInterval = 10;
        const interactionStateStore = {
            snapshotResponse: () => void 0,
            getResponseIfChanged: () => 'new response'
        };
        const handleTextChange = wrapWithLogger({
            getInteractionElement: () => interactionElementMock,
            interactionStateStore,
            logDebounceOptions: {
                wait: debounceWaitInterval
            }
        });

        // Run
        await handleTextChange(new CustomEvent('keydown'));
        await handleTextChange(new CustomEvent('keydown'));
        await handleTextChange(new CustomEvent('keydown'));
        await handleTextChange(new CustomEvent('keydown'));
        await handleTextChange(new CustomEvent('keydown'));

        // Check
        expect(interactionElementMock.dispatchEvent).not.toHaveBeenCalled();

        // Wait and check again
        await wait(debounceWaitInterval + 10);
        expect(interactionElementMock.dispatchEvent).toHaveBeenCalledTimes(1);
    });

    it('should log immediately the 1st event ONLY, if leading = true and trailing = false are set for debounce', async () => {
        // Prepare
        const debounceWaitInterval = 10;
        const interactionStateStore = {
            snapshotResponse: () => void 0,
            getResponseIfChanged: () => 'new response'
        };
        const handleTextChange = wrapWithLogger({
            getInteractionElement: () => interactionElementMock,
            interactionStateStore,
            logDebounceOptions: {
                wait: debounceWaitInterval,
                leading: true,
                trailing: false
            }
        });

        // Run
        await handleTextChange(new CustomEvent('keydown1'));
        await handleTextChange(new CustomEvent('keydown2'));
        await handleTextChange(new CustomEvent('keydown3'));
        await handleTextChange(new CustomEvent('keydown4'));
        await handleTextChange(new CustomEvent('keydown5'));

        // Check
        expect(interactionElementMock.dispatchEvent).toHaveBeenCalledTimes(1);
        expect(interactionElementMock.dispatchEvent.mock.calls[0][0].detail.domEventType).toBe('keydown1');

        // Wait and check again
        await wait(debounceWaitInterval + 10);
        // Meaning no new events are logged!
        expect(interactionElementMock.dispatchEvent).toHaveBeenCalledTimes(1);
    });

    it('should log immediately the 1st event and log after interval the last event, if leading = true and trailing = true are set for debounce', async () => {
        // Prepare
        const debounceWaitInterval = 10;
        const interactionStateStore = {
            snapshotResponse: () => void 0,
            getResponseIfChanged: () => 'new response'
        };
        const handleTextChange = wrapWithLogger({
            getInteractionElement: () => interactionElementMock,
            interactionStateStore,
            logDebounceOptions: {
                wait: debounceWaitInterval,
                leading: true,
                trailing: true
            }
        });

        // Run
        await handleTextChange(new CustomEvent('keydown1'));
        await handleTextChange(new CustomEvent('keydown2'));
        await handleTextChange(new CustomEvent('keydown3'));
        await handleTextChange(new CustomEvent('keydown4'));
        await handleTextChange(new CustomEvent('keydown5'));

        // Check
        expect(interactionElementMock.dispatchEvent).toHaveBeenCalledTimes(1);
        expect(interactionElementMock.dispatchEvent.mock.calls[0][0].detail.domEventType).toBe('keydown1');

        // Wait and check again
        await wait(debounceWaitInterval + 10);

        expect(interactionElementMock.dispatchEvent).toHaveBeenCalledTimes(2);
        expect(interactionElementMock.dispatchEvent.mock.calls[1][0].detail.domEventType).toBe('keydown5');
    });
});

describe('createLastPressedKeyListener', () => {
    it('should return an object with a `lastPressedKey` property', () => {
        const listener = createLastPressedKeyListener();
        expect(listener.lastPressedKey).toBeUndefined();
    });

    it('should set the `lastPressedKey` property when a key is pressed', () => {
        const listener = createLastPressedKeyListener();
        listener.saveLastPressedKey(new KeyboardEvent('keydown', { key: 'A' }));
        expect(listener.lastPressedKey).toBe('A');
    });

    it('should clear the `lastPressedKey` property after a timeout', () =>
        new Promise(done => {
            const listener = createLastPressedKeyListener(1000);
            listener.saveLastPressedKey(new KeyboardEvent('keydown', { key: 'A' }));
            setTimeout(() => {
                expect(listener.lastPressedKey).toBeUndefined();
                done();
            }, 1000);
        }));
});
