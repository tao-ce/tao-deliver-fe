// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('@oat-sa-private/ui-core/media/media.js');

vi.mock('@oat-sa-private/ui-components', async () => {
    const originalModule = await vi.importActual('@oat-sa-private/ui-components');
    const MockPlayer = (await import('./MockPlayer.svelte')).default;

    return {
        __esModule: true,
        ...originalModule,
        Player: MockPlayer
    };
});

import { checkCanAudioAutostart } from '@oat-sa-private/ui-core/media/media.js';
import { render, fireEvent } from '@testing-library/svelte';
import MediaInteraction from '../MediaInteractionImpl.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';
import { tick } from 'svelte';
import { get } from 'svelte/store';
import { getItemSequentialInteractionsStore } from '../../../itemsSequentialInteractionsStore.js';

const itemIdentifier = 'iabcd';
const responseIdentifier = 'RESPONSE_123';
const mediaUrl = 'speech.ogg';

function awaitTimeout(timeout) {
    return Promise.resolve().then(() => new Promise(r => setTimeout(() => r(), timeout)));
}
function triggerMockPlayerStart() {
    fireEvent(document.body, new CustomEvent('mockplayer-start'));
}
function triggerMockPlayerFinish() {
    fireEvent(document.body, new CustomEvent('mockplayer-finish'));
}
function triggerMockPlayerTimeUpdate(currentTime) {
    fireEvent(document.body, new CustomEvent('mockplayer-timeupdate', { detail: currentTime }));
}

describe('MediaInteraction - Mocked Player', () => {
    const sequence = getItemSequentialInteractionsStore(itemIdentifier);

    beforeEach(() => {
        checkCanAudioAutostart.mockResolvedValue(true);
        sequence.register(responseIdentifier);
    });

    afterEach(() => {
        itemsStateStore.clear();
        sequence.clear();
    });

    it('sets initial autostart value if no delay', async () => {
        const { container } = render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                type: 'audio/ogg',
                classes: 'sequential',
                autostart: true,
                dataAttrs: {
                    'data-autostart-delay-ms': 0
                }
            }
        });
        sequence.start(responseIdentifier);
        expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);

        await tick();
        await tick();
        await awaitTimeout(1);
        await tick();
        expect(container.querySelector('#mock-player').textContent).toMatch('"autostart":true');
    });

    it('toggles autostart value after specified delay', () =>
        new Promise(resolve => {
            const { container } = render(MediaInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    data: mediaUrl,
                    type: 'audio/ogg',
                    classes: 'sequential',
                    autostart: true,
                    dataAttrs: {
                        'data-autostart-delay-ms': 25
                    }
                }
            });
            expect(get(sequence.currentResponseIdentifier)).toBe(null);
            expect(container.querySelector('#mock-player').textContent).toMatch('"autostart":false');

            sequence.start(responseIdentifier);
            expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);

            setTimeout(() => {
                expect(container.querySelector('#mock-player').textContent).toMatch('"autostart":true');
                resolve();
            }, 100);
        }));

    it('requires button click to resume if startTime is set', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.set({
            time: 29,
            playsUsed: 0
        });

        const { container } = render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                type: 'audio/ogg',
                classes: 'hide-player sequential',
                autostart: true,
                dataAttrs: {
                    'data-autostart-delay-ms': 500
                }
            }
        });
        expect(get(sequence.currentResponseIdentifier)).toBe(null);
        expect(container.querySelector('#mock-player').textContent).toMatch('"startTime":29');
        expect(container.querySelector('#mock-player').textContent).toMatch('"autostart":false');

        sequence.start(responseIdentifier);
        expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);

        return tick()
            .then(tick)
            .then(() => {
                expect(container.querySelector('.interact-button-container')).toBeInTheDocument();
            });
    });

    it('autostarts when click-to-listen button is clicked', () => {
        checkCanAudioAutostart.mockResolvedValueOnce(false).mockResolvedValueOnce(false); // to make button show

        const { container } = render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                type: 'audio/ogg',
                classes: 'hide-player sequential',
                autostart: true
            }
        });

        sequence.start(responseIdentifier);
        expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);

        return tick()
            .then(tick)
            .then(() => {
                expect(container.querySelector('.interact-button-container')).toBeInTheDocument();
                expect(container.querySelector('#mock-player').textContent).not.toMatch('"autostart":true');

                container.querySelector('.interact-button-container button').click();

                return tick();
            })
            .then(() => {
                expect(container.querySelector('.interact-button-container')).not.toBeInTheDocument();
                expect(container.querySelector('#mock-player').textContent).toMatch('"autostart":true');
            });
    });

    it('informs sequence to finish as soon as it starts, if maxPlays reached', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.set({
            playsUsed: 1
        });

        render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                type: 'audio/ogg',
                classes: 'sequential',
                autostart: true,
                maxPlays: 1
            }
        });

        sequence.register('second_interaction');
        expect(sequence.length).toBe(2);
        expect(get(sequence.currentResponseIdentifier)).toBe(null);

        sequence.start(responseIdentifier);

        return tick().then(() => {
            expect(get(sequence.currentResponseIdentifier)).toBe('second_interaction');
        });
    });

    it('finish playing: repeats and delay-between', async () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        const { container } = render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                type: 'audio/ogg',
                classes: 'sequential hide-player',
                autostart: true,
                dataAttrs: {
                    'data-sequence-repeats': 3,
                    'data-sequence-delay-between-ms': 50
                }
            }
        });

        sequence.register('second_interaction');
        sequence.start(responseIdentifier);
        expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);

        await tick();
        triggerMockPlayerStart();
        await tick();
        triggerMockPlayerTimeUpdate(1234);
        await tick();
        expect(interactionStateStore.get()).toMatchObject({
            time: 1234,
            playsUsed: 0
        });
        const playerEl0 = container.querySelector('#mock-player');
        triggerMockPlayerFinish();

        //repeat 1
        await tick();
        await awaitTimeout(1);
        await tick();
        let playerEl1 = container.querySelector('#mock-player');
        expect(playerEl1).toBe(playerEl0); //not re-rendered yet
        expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);
        expect(interactionStateStore.get()).toMatchObject({
            time: 0,
            playsUsed: 1
        });
        await awaitTimeout(100);
        await tick();
        playerEl1 = container.querySelector('#mock-player');
        expect(playerEl1).not.toBe(playerEl0); //re-rendered
        expect(playerEl1.textContent).toMatch('"autostart":true');

        await tick();
        triggerMockPlayerStart();
        await tick();
        triggerMockPlayerTimeUpdate(1234);
        await tick();
        triggerMockPlayerFinish();

        //repeat 2
        await tick();
        await awaitTimeout(100);
        await tick();
        const playerEl2 = container.querySelector('#mock-player');
        expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);
        expect(interactionStateStore.get()).toMatchObject({
            time: 0,
            playsUsed: 2
        });
        expect(playerEl2).not.toBe(playerEl1); //re-rendered
        expect(playerEl2.textContent).toMatch('"autostart":true');

        await tick();
        triggerMockPlayerStart();
        await tick();
        triggerMockPlayerTimeUpdate(1234);
        await tick();
        triggerMockPlayerFinish();

        //no more repeats, advance sequence
        await tick();
        expect(get(sequence.currentResponseIdentifier)).toBe('second_interaction');
        expect(interactionStateStore.get()).toMatchObject({
            time: 0,
            playsUsed: 3
        });
    });

    it('finish playing: delay-after', async () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                type: 'audio/ogg',
                classes: 'sequential hide-player',
                autostart: true,
                dataAttrs: {
                    'data-sequence-delay-after-ms': 50
                }
            }
        });

        sequence.register('second_interaction');
        sequence.start(responseIdentifier);
        expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);

        await tick();
        triggerMockPlayerStart();
        await tick();
        triggerMockPlayerTimeUpdate(1234);
        await tick();
        expect(interactionStateStore.get()).toMatchObject({
            time: 1234,
            playsUsed: 0
        });
        triggerMockPlayerFinish();

        //advance sequence, but only after delay
        await tick();
        await awaitTimeout(1);
        await tick();
        expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);
        expect(interactionStateStore.get()).toMatchObject({
            time: 0,
            playsUsed: 1
        });
        await awaitTimeout(100);
        await tick();
        expect(get(sequence.currentResponseIdentifier)).toBe('second_interaction');
        expect(interactionStateStore.get()).toMatchObject({
            time: 0,
            playsUsed: 1
        });
    });

    it('restore after interruption: during repeat', async () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.set({
            time: 1234,
            playsUsed: 1
        });

        const { container } = render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                type: 'audio/ogg',
                classes: 'sequential hide-player',
                autostart: true,
                dataAttrs: {
                    'data-sequence-repeats': 3,
                    'data-sequence-delay-between-ms': 50,
                    'data-sequence-delay-after-ms': 50
                }
            }
        });

        sequence.register('second_interaction');
        sequence.start(responseIdentifier);
        expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);

        //show 'click to play' button
        await tick();
        await Promise.resolve();
        await tick();
        expect(container.querySelector('.interact-button-container')).toBeInTheDocument();
        expect(container.querySelector('#mock-player').textContent).not.toMatch('"autostart":true');
        container.querySelector('.interact-button-container button').click();

        await tick();
        await Promise.resolve();
        await tick();
        expect(container.querySelector('.interact-button-container')).not.toBeInTheDocument();
        expect(container.querySelector('#mock-player').textContent).toMatch('"autostart":true');
    });

    it('restore after interruption: during delay between repeats', async () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.set({
            time: 0,
            playsUsed: 1
        });

        const { container } = render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                type: 'audio/ogg',
                classes: 'sequential hide-player',
                autostart: true,
                dataAttrs: {
                    'data-sequence-repeats': 3,
                    'data-sequence-delay-between-ms': 50,
                    'data-sequence-delay-after-ms': 50
                }
            }
        });

        sequence.register('second_interaction');
        sequence.start(responseIdentifier);
        expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);

        //show 'click to play' button
        await tick();
        await Promise.resolve();
        await tick();
        expect(container.querySelector('.interact-button-container')).toBeInTheDocument();
        expect(container.querySelector('#mock-player').textContent).not.toMatch('"autostart":true');
        container.querySelector('.interact-button-container button').click();

        await tick();
        await Promise.resolve();
        await tick();
        expect(container.querySelector('.interact-button-container')).not.toBeInTheDocument();
        expect(container.querySelector('#mock-player').textContent).toMatch('"autostart":true');
    });

    it('restore after interruption: during delay-after', async () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.set({
            time: 0,
            playsUsed: 3
        });
        expect(sequence.completedTimes).toBe(0);

        const { container } = render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                type: 'audio/ogg',
                classes: 'sequential hide-player',
                autostart: true,
                dataAttrs: {
                    'data-sequence-repeats': 3,
                    'data-sequence-delay-between-ms': 50,
                    'data-sequence-delay-after-ms': 50
                }
            }
        });

        sequence.register('second_interaction');
        sequence.start(responseIdentifier);

        //wait for delay-after, then advance sequence
        await tick();
        await awaitTimeout(1);
        await tick();
        expect(container.querySelector('.interact-button-container')).not.toBeInTheDocument();
        expect(container.querySelector('#mock-player').textContent).not.toMatch('"autostart":true');
        expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);
        expect(sequence.didStart).toBe(false);
        expect(interactionStateStore.get()).toMatchObject({
            time: 0,
            playsUsed: 3
        });

        await awaitTimeout(100);
        await tick();
        expect(get(sequence.currentResponseIdentifier)).toBe('second_interaction');
        expect(sequence.didStart).toBe(true);
        expect(interactionStateStore.get()).toMatchObject({
            time: 0,
            playsUsed: 3
        });
    });
});
