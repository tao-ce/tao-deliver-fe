// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';

vi.mock('@oat-sa-private/ui-components/player/Plyr.js');

import { tick } from 'svelte';
import { wait } from '../../util/async';
import { render } from '@testing-library/svelte';
import Video from '../Video.svelte';
import ContextWrapper from './ContextWrapper.svelte';
import itemsStateStore, { getItemStateStore } from '../../itemsStateStore.js';
import { getItemSettingsStore, releaseItemSettingsStore } from '../../itemsSettingsStore.js';
import Plyr from '@oat-sa-private/ui-components/player/Plyr.js';

const mockDocument = vi.fn(() => document);
const itemIdentifier = 'video';

let mockListeners = [];
let playerInstance = {};

function mockTriggerMockedListeners(name) {
    mockListeners.filter(listener => listener.name === name).forEach(listener => listener.callback());
}

function waitForPlyr() {
    return tick().then(tick).then(tick);
}

function mockPlyrForRendering() {
    Plyr.mockImplementation((id, config) => {
        const document = mockDocument();
        return {
            on: () => {},
            destroy: () => {},
            elements: {
                container: document.createElement('div')
            },
            config
        };
    });
}

function mockPlyrForBehavior() {
    Plyr.mockImplementation((id, config) => {
        const document = mockDocument();

        config.controls.forEach(controlName => {
            const plyrWrapper = document.createElement('div');
            plyrWrapper.classList.add('plyr');
            document.querySelector('.player').appendChild(plyrWrapper);

            const controlEl = document.createElement('div');
            controlEl.setAttribute('data-plyr', controlName);
            plyrWrapper.appendChild(controlEl);
        });

        mockListeners = [];

        playerInstance.value = {
            on: (names, callback) => names.split(/\s+/).forEach(name => mockListeners.push({ name, callback })),
            once: (name, callback) => mockListeners.push({ name, callback }),
            play: vi.fn(() => mockTriggerMockedListeners('play')),
            stop: vi.fn(() => mockTriggerMockedListeners('stop')),
            pause: vi.fn(() => mockTriggerMockedListeners('stop')),
            ended: vi.fn(() => mockTriggerMockedListeners('ended')),
            destroy: vi.fn(() => mockTriggerMockedListeners('destroyed')),
            fullscreen: {
                active: false
            },
            set source(source) {},
            media: {
                addEventListener: (name, callback) => mockListeners.push({ name, callback })
            },
            elements: {
                container: document.createElement('div'),
                controls: document.createElement('div')
            },
            currentTime: 0,
            config
        };
        return playerInstance.value;
    });
}

describe('Video', () => {
    describe('rendering', () => {
        beforeEach(() => {
            mockPlyrForRendering();
        });
        afterEach(() => {
            itemsStateStore.clear();
            itemsSessionStatusStore.clear();
            releaseItemSettingsStore(itemIdentifier);
        });

        it('renders correctly with min props', () => {
            const { container } = render(Video, {
                props: {
                    itemIdentifier
                }
            });

            return waitForPlyr().then(() => {
                expect(container).toMatchSnapshot();
            });
        });

        it('renders correctly with a source and type', () => {
            const { container } = render(Video, {
                props: {
                    itemIdentifier,
                    attributes: {
                        src: 'foo.mp4',
                        type: 'video/mp4'
                    }
                }
            });
            return waitForPlyr().then(() => {
                expect(container).toMatchSnapshot();
            });
        });

        it('renders correctly with HTML attributes', () => {
            const { container } = render(Video, {
                props: {
                    itemIdentifier,
                    attributes: {
                        src: 'foo.mp4',
                        type: 'video/mp4',
                        width: 600,
                        height: 300,
                        'aria-label': 'foo video',
                        class: 'fancy highlighted',
                        'data-foo': 'bar'
                    }
                }
            });
            return waitForPlyr().then(() => {
                expect(container).toMatchSnapshot();
            });
        });

        it('resolves src through the asset manager, sets "lang"', () => {
            const getAssetManager = vi.fn(() => ({
                resolve() {
                    return 'http://localhost/assets/bar.webm';
                }
            }));
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: 'item3',
                    testContext: {
                        getAssetManager,
                        getInstructionsLang: () => 'ar-arb'
                    },
                    testComponent: Video,
                    testComponentProps: {
                        itemIdentifier: 'item3',
                        attributes: {
                            src: 'foo.webm',
                            type: 'video/webm'
                        }
                    }
                }
            });
            return waitForPlyr().then(() => {
                expect(getAssetManager).toHaveBeenCalled();
                //with jest, `dir` for ar-arb will be 'ltr', because computed styles are not calculated properly
                expect(container).toMatchSnapshot();
            });
        });
    });

    describe('store', () => {
        beforeEach(() => {
            mockPlyrForBehavior();
        });

        afterEach(() => {
            itemsStateStore.clear();
            itemsSessionStatusStore.clear();
        });

        it('saves time progress', () => {
            const store = getItemStateStore('item1');

            render(Video, {
                props: {
                    itemIdentifier: 'item1',
                    attributes: {
                        src: 'foo.mp4',
                        type: 'video/mp4',
                        serial: 'abcdef'
                    }
                }
            });

            return waitForPlyr().then(() => {
                expect(store.getItemElementState('static_video_abcdef')).toEqual({});

                mockTriggerMockedListeners('ready');
                mockTriggerMockedListeners('timeupdate');

                expect(store.getItemElementState('static_video_abcdef')).toEqual({ time: 0 });
            });
        });

        it('restores time progress', async () => {
            const store = getItemStateStore('item1');
            store.setItemElementState('static_video_abcdef', { time: 2.5 });

            render(Video, {
                props: {
                    itemIdentifier: 'item1',
                    attributes: {
                        src: 'foo.mp4',
                        type: 'video/mp4',
                        serial: 'abcdef'
                    }
                }
            });

            await waitForPlyr();
            mockTriggerMockedListeners('ready');
            mockTriggerMockedListeners('loadeddata');

            await wait(0);

            expect(playerInstance.value.media.currentTime).toBe(2.5);
        });

        it('updates disabled state', () => {
            const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            const props = {
                itemIdentifier,
                attributes: {
                    src: 'foo.mp4',
                    type: 'video/mp4'
                }
            };
            const { container } = render(Video, {
                props
            });

            return waitForPlyr()
                .then(() => {
                    expect(container.querySelector('.player').classList.contains('disabled')).toBe(false);

                    itemSessionStatusStore.set('closed');
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.player').classList.contains('disabled')).toBe(true);
                    itemSessionStatusStore.set('interacting');
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.player').classList.contains('disabled')).toBe(false);
                    itemSettingsStore.set({ doNotPlayMedia: true });
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.player').classList.contains('disabled')).toBe(true);
                });
        });
    });
});
