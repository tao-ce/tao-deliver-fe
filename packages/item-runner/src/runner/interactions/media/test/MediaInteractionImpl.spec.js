// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('@oat-sa-private/ui-core/media/media.js');
vi.mock('@oat-sa-private/ui-components/player/Plyr.js');

// Stores
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../../itemsSessionStatusStore.js';
// Utils
import { checkCanAudioAutostart } from '@oat-sa-private/ui-core/media/media.js';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
// Components
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';
import Plyr from '@oat-sa-private/ui-components/player/Plyr.js';
import MediaInteraction from '../MediaInteractionImpl.svelte';
// Constants
import itemSessionStatus from '../../../itemSessionStatus.js';

const qtiClass = 'qti-mediaInteraction';
const itemIdentifier = 'iabcd';
const responseIdentifier = 'RESPONSE_123';

const mediaUrl = 'View_From_A_Blue_Moon_Trailer-576p.mp4';
let lastPlyrSource;
let lastPlyrConfig;

const mockDocument = vi.fn(() => document);

let mockListeners = [];

const resolvedSource = `http://localhost/assets/${mediaUrl}`;
const defaultInstructionLang = 'nb-NO';
let instructionLang = defaultInstructionLang;
const getInstructionsLang = () => instructionLang;
const getAssetManager = vi.fn(() => ({
    resolve() {
        return resolvedSource;
    }
}));
const testContext = {
    getInstructionsLang,
    getAssetManager
};

function mockTriggerMockedListeners(name) {
    const event = new CustomEvent({ type: name });
    mockListeners.filter(listener => listener.name === name).forEach(listener => listener.callback(event));
}

function waitForPlyr(delay = 100) {
    // Wait for dynamic import and Plyr instantiation
    return tick()
        .then(tick)
        .then(
            () =>
                // Give extra time for dynamic imports to complete
                new Promise(resolve => setTimeout(resolve, delay))
        )
        .then(tick);
}

Plyr.mockImplementation((id, config) => {
    const document = mockDocument();

    // getPlayerConfig() can be called twice or more per instance
    // which calls this Plyr module mock twice
    // so we must remove previous mock controls before adding new ones
    const mockControls = document.querySelectorAll('.player > div.plyr');
    mockControls.forEach(divEl => document.querySelector('.player').removeChild(divEl));

    lastPlyrConfig = config;

    config.controls.forEach(controlName => {
        const plyrWrapper = document.createElement('div');
        plyrWrapper.classList.add('plyr');
        plyrWrapper.setAttribute('tabindex', '0');

        const controlEl = document.createElement('div');
        controlEl.classList.add('control', controlName);
        controlEl.setAttribute('data-plyr', controlName);

        plyrWrapper.appendChild(controlEl);

        document.querySelector('.player').appendChild(plyrWrapper);
    });

    mockListeners = [];

    return {
        on: (names, callback) => names.split(/\s+/).forEach(name => mockListeners.push({ name, callback })),
        once: (name, callback) => mockListeners.push({ name, callback }),
        play: vi.fn(() => mockTriggerMockedListeners('play')),
        stop: vi.fn(() => mockTriggerMockedListeners('stop')),
        error: vi.fn(() => mockTriggerMockedListeners('error')),
        pause: vi.fn(() => mockTriggerMockedListeners('pause')),
        ended: vi.fn(() => mockTriggerMockedListeners('ended')),
        destroy: vi.fn(() => mockTriggerMockedListeners('destroyed')),
        fullscreen: {
            active: false
        },
        set source(source) {
            lastPlyrSource = source;
        },
        media: {
            addEventListener: vi.fn()
        },
        elements: {
            container: document.createElement('div'),
            controls: document.createElement('div')
        },
        currentTime: 0,
        config
    };
});

describe('MediaInteraction', () => {
    beforeEach(() => {
        checkCanAudioAutostart.mockResolvedValue(true);
    });

    afterEach(() => {
        itemsStateStore.clear();
        itemsSessionStatusStore.clear();
        lastPlyrSource = null;
        lastPlyrConfig = null;
        instructionLang = defaultInstructionLang;
    });

    it('renders base props into markup', () => {
        const { container } = render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                role: 'someUniqueRole',
                ariaAttrs: {
                    'aria-foo': 12,
                    'aria-bar': 'baz'
                },
                dataAttrs: {
                    'data-foo': 'bar',
                    'data-baz': 24
                },
                language: 'hu',
                id: 'interactionId',
                classes: 'foo bar baz',
                dir: 'rtl',
                prompt: 'watch trailer'
            }
        });

        return waitForPlyr().then(() => {
            expect(container.querySelectorAll('.control').length).toBe(6);
            expect(container).toMatchSnapshot();
        });
    });

    it('renders feedback when there is min plays', () => {
        const { container } = render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                minPlays: 1
            }
        });

        return waitForPlyr().then(() => {
            expect(container.querySelector('.feedback').innerHTML).toEqual('You must play this media at least 1 times');
        });
    });

    it('renders feedback when there is max plays', () => {
        const { container } = render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                maxPlays: 1
            }
        });

        return waitForPlyr()
            .then(() => {
                mockTriggerMockedListeners('play');
                mockTriggerMockedListeners('ended');

                return tick();
            })
            .then(() => {
                const feedbackElt = container.querySelector('.feedback');
                expect(feedbackElt.innerHTML).toEqual('You have played this media maximum times');
                expect(feedbackElt).toHaveClass('error');
                expect(feedbackElt).toHaveAttribute('aria-live', 'assertive');
            });
    });

    it('sets a Plyr config with no controls, when audio player hidden', () => {
        render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                type: 'audio/mp3',
                classes: 'hide-player'
            }
        });

        return waitForPlyr().then(() => {
            expect(lastPlyrConfig.controls).toEqual([]);
            expect(lastPlyrConfig.listeners.seek()).toBe(false); //does not allow to seek
        });
    });

    test.each([
        [false, 0, 0, false],
        [true, 50, 100, true],
        [true, 0, 1, true]
    ])(
        '{autostart: %s, delay: %s} sets a Plyr config with autostart %s',
        (autostart, delayMs, testTimeout, expectedAutostart) => {
            const { container } = render(MediaInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    data: mediaUrl,
                    autostart: autostart,
                    dataAttrs: {
                        'data-autostart-delay-ms': delayMs
                    }
                }
            });

            return waitForPlyr()
                .then(() => new Promise(r => setTimeout(() => r(), testTimeout)))
                .then(tick)
                .then(() => {
                    expect(container.querySelector('.player').classList.contains('autostart')).toBe(expectedAutostart);
                });
        }
    );

    it("renders click-to-listen button when player hidden and audio can't autoplay", () => {
        checkCanAudioAutostart.mockResolvedValue(false);

        const { container } = render(MediaInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                data: mediaUrl,
                type: 'audio/mp3',
                autostart: true,
                classes: 'hide-player'
            }
        });

        return waitForPlyr().then(() => {
            expect(container.querySelector('.interact-button-container')).toBeInTheDocument();
        });
    });

    it('response is changed only after video was ended', () => {
        const responseId = 'RESPONSE_1';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseId);

        render(MediaInteraction, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier: responseId
            }
        });

        return waitForPlyr().then(() => {
            expect(interactionStateStore.getResponse()).toMatchObject({ base: null });
            mockTriggerMockedListeners('play');
            expect(interactionStateStore.getResponseValue()).toBe(0);
            mockTriggerMockedListeners('ended');
            expect(interactionStateStore.getResponseValue()).toBe(1);
        });
    });

    it('stores progress in state', () => {
        const responseId = 'RESPONSE_2';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseId);

        render(MediaInteraction, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier: responseId
            }
        });
        expect(interactionStateStore.get().qtiClass).toBe(qtiClass);

        return waitForPlyr().then(() => {
            expect(interactionStateStore.getResponse()).toMatchObject({ base: null });
            expect(interactionStateStore.get().playsUsed).toBe(0);
            expect(interactionStateStore.get().time).toBe(0);

            mockTriggerMockedListeners('play');
            expect(interactionStateStore.getResponseValue()).toBe(0);
            expect(interactionStateStore.get().playsUsed).toBe(0);
            expect(interactionStateStore.get().time).toBe(0);
            expect(interactionStateStore.get().qtiClass).toBe(qtiClass);
        });
    });

    it('player is reactive to store change', () => {
        const responseId = 'RESPONSE_3';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseId);

        const { container } = render(MediaInteraction, {
            props: {
                data: mediaUrl,
                maxPlays: 1,
                itemIdentifier,
                responseIdentifier: responseId
            }
        });

        return waitForPlyr()
            .then(() => {
                mockTriggerMockedListeners('ready');

                expect(container.querySelector('.max-plays').innerHTML).toBe('Play: 0 / 1');
                interactionStateStore.setResponseValue({
                    cardinality: 'single',
                    baseType: 'integer',
                    value: 1
                });

                return tick();
            })
            .then(() => expect(container.querySelector('.max-plays').innerHTML).toBe('Play: 1 / 1'));
    });

    it('resolves src through the asset manager', () => {
        render(ContextWrapper, {
            props: {
                testContextKey: 'item3',
                testContext,
                testComponent: MediaInteraction,
                testComponentProps: {
                    itemIdentifier: 'item3',
                    attributes: {
                        src: mediaUrl
                    }
                }
            }
        });

        return waitForPlyr().then(() => {
            expect(lastPlyrSource.sources[0].src).toBe(resolvedSource);
        });
    });

    it('does not allow to seek during linear mode', () => {
        render(MediaInteraction, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier,
                classes: 'foo tao-media-mode-linear bar'
            }
        });

        return waitForPlyr().then(() => {
            expect(lastPlyrConfig.listeners.seek()).toBe(false);
        });
    });

    it('pass disabled property to player', async () => {
        const { container } = render(MediaInteraction, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier,
                disabled: true
            }
        });

        await waitForPlyr();
        expect(container.querySelector('.player').classList.contains('disabled')).toBe(true);
    });

    it('disables player if session is closed', async () => {
        const { container } = render(MediaInteraction, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier,
                disabled: false
            }
        });
        const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
        itemSessionStatusStore.set(itemSessionStatus.closed);

        await waitForPlyr();
        expect(container.querySelector('.player').classList.contains('disabled')).toBe(true);
    });

    it('disables player if session is suspended', async () => {
        const { container } = render(MediaInteraction, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier,
                disabled: false
            }
        });
        const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
        itemSessionStatusStore.set(itemSessionStatus.suspended);

        await waitForPlyr();
        expect(container.querySelector('.player').classList.contains('disabled')).toBe(true);
    });

    it('restores previous plays count', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponseValue(
            {
                cardinality: 'single',
                baseType: 'integer',
                value: 3
            },
            true
        );
        const { container } = render(MediaInteraction, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier,
                maxPlays: 12
            }
        });

        return waitForPlyr()
            .then(() => {
                mockTriggerMockedListeners('ready');

                return tick();
            })
            .then(() => {
                expect(container.querySelector('.max-plays').innerHTML).toBe('Play: 3 / 12');
            });
    });

    it('restores previous plays count from state', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.set({ playsUsed: 5 });
        interactionStateStore.setResponseValue(
            {
                cardinality: 'single',
                baseType: 'integer',
                value: 4
            },
            true
        );
        const { container } = render(MediaInteraction, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier,
                maxPlays: 12
            }
        });

        return waitForPlyr()
            .then(() => {
                mockTriggerMockedListeners('ready');

                return tick();
            })
            .then(() => {
                expect(container.querySelector('.max-plays').innerHTML).toBe('Play: 5 / 12');
                expect(container.querySelector('.player').classList.contains('disabled')).toBe(false);
            });
    });

    it('restores previous plays count if time is not 0', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.set({ time: 2 }); // time that should be restored
        interactionStateStore.setResponseValue(
            {
                cardinality: 'single',
                baseType: 'integer',
                value: 1
            },
            true
        );
        const { container } = render(MediaInteraction, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier,
                maxPlays: 5
            }
        });

        return waitForPlyr()
            .then(() => {
                mockTriggerMockedListeners('ready');

                return tick();
            })
            .then(() => {
                expect(container.querySelector('.max-plays').innerHTML).toBe('Play: 2 / 5');
                expect(container.querySelector('.player').classList.contains('disabled')).toBe(false);
            });
    });

    it('restores plays count when no more plays and disables player', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.set({ playsUsed: 12, time: 0 });
        interactionStateStore.setResponseValue(
            {
                cardinality: 'single',
                baseType: 'integer',
                value: 12
            },
            true
        );
        const { container } = render(MediaInteraction, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier,
                maxPlays: 12
            }
        });

        return waitForPlyr()
            .then(() => {
                mockTriggerMockedListeners('ready');

                return tick();
            })
            .then(() => {
                expect(container.querySelector('.max-plays').innerHTML).toBe('Play: 12 / 12');
                expect(container.querySelector('.player').classList.contains('disabled')).toBe(true);
            });
    });

    it('increases plays count when play ended', () => {
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
        const { container } = render(MediaInteraction, {
            props: {
                data: mediaUrl,
                itemIdentifier,
                responseIdentifier,
                maxPlays: 2
            }
        });
        const expectPlays = ({ playsStr, disabled, response }) => {
            expect(container.querySelector('.max-plays').innerHTML).toBe(playsStr);
            expect(container.querySelector('.player').classList.contains('disabled')).toBe(disabled);
            expect(interactionStateStore.getResponseValue()).toEqual(response);
        };
        return waitForPlyr()
            .then(() => {
                mockTriggerMockedListeners('ready');
                return tick();
            })
            .then(() => {
                expectPlays({ playsStr: 'Play: 0 / 2', disabled: false, response: void 0 });
                mockTriggerMockedListeners('play');
            })
            .then(() => {
                expectPlays({ playsStr: 'Play: 1 / 2', disabled: false, response: 0 });
                mockTriggerMockedListeners('ended');
            })
            .then(() => {
                expectPlays({ playsStr: 'Play: 1 / 2', disabled: false, response: 1 });
                mockTriggerMockedListeners('play');
            })
            .then(() => {
                expectPlays({ playsStr: 'Play: 2 / 2', disabled: false, response: 1 });
                mockTriggerMockedListeners('pause');
            })
            .then(() => {
                expectPlays({ playsStr: 'Play: 2 / 2', disabled: false, response: 1 });
                mockTriggerMockedListeners('play');
                mockTriggerMockedListeners('ended');
            })
            .then(() => {
                expectPlays({ playsStr: 'Play: 2 / 2', disabled: true, response: 2 });
                itemSessionStatusStore.set(itemSessionStatus.closed);
                return tick();
            })
            .then(() => {
                expectPlays({ playsStr: 'Play: 2 / 2', disabled: true, response: 2 });
                itemSessionStatusStore.set(itemSessionStatus.interacting);
                return tick();
            })
            .then(() => {
                //disabled-by-maxPLays is kept even after item was un-disabled by another reason
                expectPlays({ playsStr: 'Play: 2 / 2', disabled: true, response: 2 });
            });
    });

    it.each([['en-US'], ['ar-arb']])('renders player and controls labels with correct lang "%s"', lang => {
        instructionLang = lang;
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: 'item3',
                testContext,
                testComponent: MediaInteraction,
                testComponentProps: {
                    itemIdentifier: 'item3',
                    minPlays: 1,
                    maxPlays: 1,
                    attributes: {
                        src: mediaUrl
                    }
                }
            }
        });

        return waitForPlyr().then(() => {
            //with vi, `dir` for ar-arb will be 'ltr', because computed styles are not calculated properly
            expect(container).toMatchSnapshot();
        });
    });
});
