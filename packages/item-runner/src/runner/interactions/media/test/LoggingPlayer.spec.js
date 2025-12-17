// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('@oat-sa-private/ui-core/media/media.js');
vi.mock('@oat-sa-private/ui-components', async () => {
    const MockPlayer = (await import('./MockPlayer.svelte')).default;

    return {
        __esModule: true,
        Player: MockPlayer // exposes Player props through DOM
    };
});

vi.mock('../../../itemsStateStore.js', async () => {
    const originalModule = await vi.importActual('../../../itemsStateStore.js');
    const interactionStateStore = {
        snapshotResponse: vi.fn(),
        getResponseIfChanged: vi.fn()
    };
    return {
        __esModule: true,
        ...originalModule,
        default: originalModule.default,
        getInteractionStateStore: () => interactionStateStore
    };
});

// Components
import LoggingPlayer from '../LoggingPlayer.svelte';

// Store
import itemsStateStore from '../../../itemsStateStore';

// Utils
import { fireEvent, render } from '@testing-library/svelte';
import { checkCanAudioAutostart } from '@oat-sa-private/ui-core/media/media.js';
import { tick } from 'svelte';
import { wait } from '../../../util/async';
import { getInteractionStateStore } from '../../../itemsStateStore.js';

// Constants
const itemIdentifier = 'iabcd';
const responseIdentifier = 'RESPONSE_123';
const mediaUrl = 'speech.ogg';
const seekLogDebounceInterval = 1;

describe('LoggingPlayer', () => {
    const staticElementId = 'abracadabra';
    const interactionElement = document.createElement('div');
    const interactionTraceMock = vi.fn();
    const interactionStateStore = getInteractionStateStore();
    const onStart = vi.fn();
    const onFinish = vi.fn();
    const getInteractionElement = () => interactionElement;

    let container, player;

    beforeEach(() => {
        checkCanAudioAutostart.mockResolvedValue(true);

        // Render and subscribe to 'interactiontrace'
        container = render(LoggingPlayer, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier,
                classes: 'pause',
                seekLogDebounceInterval,
                getInteractionElement,
                onStart,
                onFinish,
                staticElementId
            }
        }).container;
        interactionElement.addEventListener('interactiontrace', interactionTraceMock);

        player = container.querySelector('#mock-player');
    });

    afterEach(() => {
        interactionTraceMock.mockClear();
        onStart.mockClear();
        onFinish.mockClear();
        interactionStateStore.getResponseIfChanged.mockRestore();
        itemsStateStore.clear();
    });

    it('calls onStart if player triggers start', async () => {
        // Run
        fireEvent(player, new CustomEvent('start', { bubbles: true, detail: {} }));
        await tick();

        // Check
        expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('calls onFinish if player triggers finish', async () => {
        // Run
        fireEvent(player, new CustomEvent('finish', { bubbles: true, detail: {} }));
        await tick();

        // Check
        expect(onFinish).toHaveBeenCalledTimes(1);
    });

    describe('Events', () => {
        it.each(['Enter', ' '])(
            'logs play-event with pressedKey "%s" on getting "start" event from Player',
            keyName => {
                // Run
                fireEvent.keyDown(player, { key: keyName, bubbles: true });
                fireEvent(player, new CustomEvent('start', { bubbles: true, detail: {} }));

                // Check
                return tick().then(() => {
                    expect(interactionTraceMock).toHaveBeenCalled();
                    expect(interactionTraceMock.mock.calls[0][0].detail).toMatchObject({
                        pressedKey: keyName,
                        domEventType: 'play',
                        target: expect.any(HTMLElement),
                        staticElementId
                    });
                });
            }
        );

        it('logs play-event on getting "start" event from Player', async () => {
            // Run
            fireEvent(player, new CustomEvent('start', { bubbles: true, detail: {} }));
            await tick();

            // Check
            expect(interactionTraceMock).toHaveBeenCalled();
            expect(interactionTraceMock.mock.calls[0][0].detail).toMatchObject({
                domEventType: 'play',
                target: expect.any(HTMLElement),
                staticElementId
            });
        });

        it('logs newResponse within play-event only if response is changed by handler', async () => {
            // Prepare
            const newResponse = 42;
            interactionStateStore.getResponseIfChanged.mockImplementation(() => newResponse);

            // Run
            fireEvent(player, new CustomEvent('start', { bubbles: true, detail: {} }));
            await tick();

            // Check
            expect(interactionTraceMock).toHaveBeenCalled();
            expect(interactionTraceMock.mock.calls[0][0].detail).toMatchObject({
                domEventType: 'play',
                target: expect.any(HTMLElement),
                newResponse,
                staticElementId
            });
        });

        it('logs play-event with autostart=true and touched=false, if start-event with autostart is captured ', async () => {
            // Run
            fireEvent(player, new CustomEvent('start', { bubbles: true, detail: { autostart: true } }));

            // Check
            await tick();
            expect(interactionTraceMock).toHaveBeenCalled();
            expect(interactionTraceMock.mock.calls[0][0].detail).toMatchObject({
                domEventType: 'play',
                target: expect.any(HTMLElement),
                autostart: true,
                touched: false,
                staticElementId
            });
        });

        it.each(['Enter', ' '])(
            'logs pause-event with pressedKey "%s" on getting "pause" event from Player',
            async keyName => {
                // Prepare: play before pause
                fireEvent(player, new CustomEvent('start', { bubbles: true, detail: {} }));
                await tick();

                // Run
                fireEvent.keyDown(player, { key: keyName, bubbles: true });
                fireEvent(player, new CustomEvent('pause', { bubbles: true, detail: {} }));
                await tick();

                // Check
                expect(interactionTraceMock).toHaveBeenCalledTimes(2);
                expect(interactionTraceMock.mock.calls[1][0].detail).toMatchObject({
                    pressedKey: keyName,
                    domEventType: 'pause',
                    target: expect.any(HTMLElement),
                    staticElementId
                });
            }
        );

        it('logs pause-event on getting "pause" event from Player', async () => {
            // Prepare: play before pause
            await fireEvent(player, new CustomEvent('start', { bubbles: true, detail: {} }));

            // Run
            await fireEvent(player, new CustomEvent('pause', { bubbles: true, detail: {} }));

            // Check
            expect(interactionTraceMock).toHaveBeenCalledTimes(2);
            expect(interactionTraceMock.mock.calls[1][0].detail).toMatchObject({
                domEventType: 'pause',
                target: expect.any(HTMLElement),
                staticElementId
            });
        });

        it('logs ended-event on getting "finish" event from Player', async () => {
            // Run
            await fireEvent(player, new CustomEvent('finish', { bubbles: true, detail: {} }));

            // Check
            expect(interactionTraceMock).toHaveBeenCalled();
            expect(interactionTraceMock.mock.calls[0][0].detail).toMatchObject({
                domEventType: 'ended',
                target: expect.any(HTMLElement),
                staticElementId,
                touched: false
            });
        });

        it('eventually logs seeked-event on getting "seeked" event from Player', async () => {
            // Prepare
            const playerState = { position: 42 };

            // Run
            await fireEvent(player, new CustomEvent('seeked', { bubbles: true, detail: playerState }));

            // Check
            await wait(seekLogDebounceInterval + 50);

            expect(interactionTraceMock).toHaveBeenCalled();
            expect(interactionTraceMock.mock.calls[0][0].detail).toMatchObject({
                domEventType: 'seeked',
                target: expect.any(HTMLElement),
                endPosition: 42,
                staticElementId
            });
        });

        it('ignores intermediate seeked-events from Player, logging only the last player position', async () => {
            // Run
            fireEvent(player, new CustomEvent('seeked', { bubbles: true, detail: { position: 21 } }));
            fireEvent(player, new CustomEvent('seeked', { bubbles: true, detail: { position: 42 } }));
            fireEvent(player, new CustomEvent('seeked', { bubbles: true, detail: { position: -42 } }));
            await fireEvent(player, new CustomEvent('seeked', { bubbles: true, detail: { position: 142 } }));

            // Check
            await wait(seekLogDebounceInterval + 50);

            expect(interactionTraceMock).toHaveBeenCalledTimes(1);
            expect(interactionTraceMock.mock.calls[0][0].detail).toMatchObject({
                domEventType: 'seeked',
                target: expect.any(HTMLElement),
                endPosition: 142,
                staticElementId
            });
        });

        it('immediately logs seeking-event on getting the 1st "seeking" event from Player', async () => {
            // Prepare
            const playerState = { position: 42 };

            // Run
            await fireEvent(player, new CustomEvent('seeking', { bubbles: true, detail: playerState }));

            // Check
            expect(interactionTraceMock).toHaveBeenCalled();
            expect(interactionTraceMock.mock.calls[0][0].detail).toMatchObject({
                domEventType: 'seeking',
                target: expect.any(HTMLElement),
                startPosition: 42,
                staticElementId
            });
        });

        it('ignores intermediate logs seeking-event logging only the 1st start position', async () => {
            // Run
            fireEvent(player, new CustomEvent('seeking', { bubbles: true, detail: { position: -142 } }));
            fireEvent(player, new CustomEvent('seeking', { bubbles: true, detail: { position: 21 } }));
            fireEvent(player, new CustomEvent('seeking', { bubbles: true, detail: { position: 42 } }));
            await fireEvent(player, new CustomEvent('seeking', { bubbles: true, detail: { position: 142 } }));

            // Check
            await wait(seekLogDebounceInterval + 50);

            expect(interactionTraceMock).toHaveBeenCalledTimes(1);
            expect(interactionTraceMock.mock.calls[0][0].detail).toMatchObject({
                domEventType: 'seeking',
                target: expect.any(HTMLElement),
                startPosition: -142,
                staticElementId
            });
        });
    });
});
