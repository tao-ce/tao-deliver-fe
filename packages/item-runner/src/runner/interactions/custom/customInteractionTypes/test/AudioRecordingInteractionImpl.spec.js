// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import MockCustomInteractionDefault from './MockCustomInteractionDefault.svelte';

vi.mock('../CustomInteractionDefault.svelte', () => ({
    default: MockCustomInteractionDefault
}));

import { render } from '@testing-library/svelte';
import AudioRecordingInteraction from '../AudioRecordingInteractionImpl.svelte';
import { getItemStateStore } from '../../../../itemsStateStore.js';
import {
    getItemSequentialInteractionsStore,
    releaseItemSequentialInteractionsStore
} from '../../../../itemsSequentialInteractionsStore.js';
import { get } from 'svelte/store';
import { tick } from 'svelte';

const itemIdentifier = 'foo';
const responseIdentifier = 'RESPONSE_123';

describe('AudioRecordingInteraction', () => {
    it('renders props into markup', async () => {
        const { container } = render(AudioRecordingInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier: 'foo123',
                role: 'someUniqueRole',
                ariaAttrs: {
                    ariaFoo: 12,
                    ariaBar: 'baz'
                },
                dataAttrs: {
                    'data-foo': 'bar',
                    'data-baz': 24
                },
                language: 'hu',
                id: 'interactionId',
                classes: 'foo bar baz',
                dir: 'rtl',
                markup: '<div class="markup"></div>',
                properties: {
                    autoStart: false,
                    allowPlayback: true,
                    maxRecordingTime: 7
                }
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('passes autoStart value', () => {
        const { container } = render(AudioRecordingInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                properties: {
                    autoStart: true
                },
                isInitialMount: true,
                doNotPlayMedia: false
            }
        });
        const receivedProperties = JSON.parse(container.querySelector('.exposed-pci-properties').textContent);
        expect(receivedProperties.autoStart).toBe(true);
    });

    it('if doNotPlay=true, disables autoStart and  triggers config-change when doNotPlay becomes false', async () => {
        const props = {
            itemIdentifier,
            responseIdentifier,
            properties: {
                autoStart: true
            },
            isInitialMount: true,
            doNotPlayMedia: true
        };
        const { container, component } = render(AudioRecordingInteraction, {
            props
        });
        const configChangeSpy = vi.fn();
        container.querySelector('.container').addEventListener('config-change', configChangeSpy);

        const receivedProperties = JSON.parse(container.querySelector('.exposed-pci-properties').textContent);
        expect(receivedProperties.enableDomEvents).toBe(true);
        expect(receivedProperties.autoStart).toBe(false);
        //does not mutate original object
        expect(props.properties.autoStart).toBe(true);

        component.$set({ doNotPlayMedia: false });
        await tick();
        expect(configChangeSpy).toHaveBeenCalled();
        expect(configChangeSpy).toHaveBeenCalledWith(
            expect.objectContaining({ detail: expect.objectContaining({ autoStart: true }) })
        );
    });

    describe('Sequential', () => {
        let itemStateStore, sequence;

        beforeEach(() => {
            itemStateStore = getItemStateStore(itemIdentifier);
            sequence = getItemSequentialInteractionsStore(itemIdentifier);
            sequence.register(responseIdentifier);
        });

        afterEach(() => {
            releaseItemSequentialInteractionsStore(itemIdentifier);
            itemStateStore.clear();
        });

        it('initialises PCI with enableDomEvents and autostart:false', () => {
            const properties = {
                autoStart: true
            };
            const { container } = render(AudioRecordingInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes: 'sequential',
                    properties
                }
            });

            const receivedProperties = JSON.parse(container.querySelector('.exposed-pci-properties').textContent);
            expect(receivedProperties.enableDomEvents).toBe(true);
            expect(receivedProperties.autoStart).toBe(false);
            //does not mutate original object
            expect(properties.enableDomEvents).toBe(void 0);
            expect(properties.autoStart).toBe(true);
        });

        it('informs sequence to finish as soon as it starts, if disabled', () => {
            render(AudioRecordingInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes: 'sequential',
                    properties: {
                        autoStart: true
                    },
                    markup: '<div class="audio-rec"></div>'
                }
            });
            document.querySelector('.audio-rec').dataset.disabled = true;

            sequence.register('second_interaction');
            expect(sequence.length).toBe(2);
            expect(get(sequence.currentResponseIdentifier)).toBe(null);

            sequence.start(responseIdentifier);

            return tick().then(() => {
                expect(get(sequence.currentResponseIdentifier)).toBe('second_interaction');
            });
        });

        it('triggers config-change event on PCI container when started in sequence', async () => {
            const { container } = render(AudioRecordingInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes: 'sequential',
                    properties: {
                        autoStart: true
                    }
                }
            });
            const configChangeSpy = vi.fn();
            container.querySelector('.container').addEventListener('config-change', configChangeSpy);

            sequence.start(responseIdentifier);
            await tick();
            expect(configChangeSpy).toHaveBeenCalled();
            expect(configChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({ detail: expect.objectContaining({ autoStart: true }) })
            );
            await tick();
            expect(sequence.didStart).toBe(true);
        });

        it('if doNotPlay=true, does not trigger config-change until doNotPlay becomes false', async () => {
            const { container, component } = render(AudioRecordingInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes: 'sequential',
                    properties: {
                        autoStart: true
                    },
                    isInitialMount: true,
                    doNotPlayMedia: true
                }
            });
            const configChangeSpy = vi.fn();
            container.querySelector('.container').addEventListener('config-change', configChangeSpy);

            sequence.start(responseIdentifier);
            await tick();
            expect(configChangeSpy).not.toHaveBeenCalled();
            await tick();
            expect(sequence.didStart).toBe(false);

            component.$set({ doNotPlayMedia: false });
            await tick();
            expect(configChangeSpy).toHaveBeenCalledWith(
                expect.objectContaining({ detail: expect.objectContaining({ autoStart: true }) })
            );
            await tick();
            expect(sequence.didStart).toBe(true);
        });

        it('renders button if current in completed sequence', () => {
            const { unmount } = render(AudioRecordingInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes: 'sequential',
                    properties: {
                        autoStart: true
                    }
                }
            });

            sequence.start(responseIdentifier);
            sequence.finish(responseIdentifier);
            expect(sequence.completedTimes).toBe(1);
            unmount();
            sequence.clear(); // must not reset completedTimes

            sequence.register(responseIdentifier); //wrapper component registers
            const { container } = render(AudioRecordingInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    classes: 'sequential',
                    properties: {
                        autoStart: true
                    }
                }
            });

            sequence.start(responseIdentifier);

            return tick().then(() => {
                expect(get(sequence.currentResponseIdentifier)).toBe(responseIdentifier);
                expect(container.querySelector('.interact-button-container > button')).toBeInTheDocument();
            });
        });
    });
});
