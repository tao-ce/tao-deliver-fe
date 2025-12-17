// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, waitFor } from '@testing-library/svelte';
import AudioRecordingInteraction from '../AudioRecordingInteraction.svelte';
import { getItemSettingsStore, releaseItemSettingsStore } from '../../../../itemsSettingsStore.js';
import { getItemSequentialInteractionsStore } from '../../../../itemsSequentialInteractionsStore.js';

vi.mock('../AudioRecordingInteractionImpl.svelte', async () => ({
    default: (await import('./MockAudioRecordingInteractionImpl.svelte')).default
}));

vi.mock('../AudioRecordingUploader.svelte', async () => ({
    default: (await import('./MockAudioRecordingUploader.svelte')).default
}));

const itemIdentifier = 'item-123';

describe('AudioRecordingInteraction - Wrapper', () => {
    const sequence = getItemSequentialInteractionsStore(itemIdentifier);

    afterEach(() => {
        releaseItemSettingsStore(itemIdentifier);
        sequence.clear();
    });

    it.each([void 0, '1.2.9'])('renders actual AudioRecordingInteraction, passes isInitialMount prop: v%s', version => {
        const props = {
            hello: { xyz: 123 },
            itemIdentifier,
            responseIdentifier: 'abc',
            properties: { foo: 'bar' },
            classes: 'ghi',
            version
        };
        const { container } = render(AudioRecordingInteraction, {
            props
        });
        const elem = container.querySelector('.mock-audio-interaction');
        expect(elem).toBeTruthy();

        const passedToChildProps = {
            hello: { xyz: 123 },
            itemIdentifier,
            responseIdentifier: 'abc',
            properties: { foo: 'bar' },
            classes: 'ghi',
            isInitialMount: true,
            doNotPlayMedia: false
        };
        expect(elem.innerHTML).toBe(JSON.stringify(passedToChildProps));
    });

    it('if doNotPlayMedia setting, renders and passes doNotPlayMedia prop', () => {
        const itemSettingsStore = getItemSettingsStore(itemIdentifier);
        itemSettingsStore.set({ doNotPlayMedia: true });

        const props = {
            hello: { xyz: 123 },
            itemIdentifier,
            responseIdentifier: 'abc',
            properties: { foo: 'bar' },
            classes: 'ghi'
        };
        const { container } = render(AudioRecordingInteraction, {
            props
        });
        const elem = container.querySelector('.mock-audio-interaction');
        expect(elem).toBeTruthy();

        const passedToChildProps = Object.assign({}, props, { isInitialMount: true, doNotPlayMedia: true });
        expect(elem.innerHTML).toBe(JSON.stringify(passedToChildProps));
    });

    it('re-mounts if doNotPlayMedia setting changes', async () => {
        const itemSettingsStore = getItemSettingsStore(itemIdentifier);

        const props = {
            hello: { xyz: 123 },
            itemIdentifier,
            responseIdentifier: 'abc',
            properties: { foo: 'bar' },
            classes: 'ghi'
        };
        const { container } = render(AudioRecordingInteraction, {
            props
        });

        const elem1 = container.querySelector('.mock-audio-interaction');
        expect(elem1).toBeTruthy();

        itemSettingsStore.set({ doNotPlayMedia: true });
        await tick();
        await tick();
        const elem2 = container.querySelector('.mock-audio-interaction');
        expect(elem2).toBeFalsy();

        itemSettingsStore.set({ doNotPlayMedia: false });
        await tick();
        await tick();
        const elem3 = container.querySelector('.mock-audio-interaction');
        expect(elem3).toBeTruthy();
        expect(elem3 === elem1).toBe(false);
        const passedToChildProps = Object.assign({}, props, { isInitialMount: false, doNotPlayMedia: false });
        expect(elem3.innerHTML).toBe(JSON.stringify(passedToChildProps));
    });

    it('if sequential, registers in the sequence', async () => {
        const registerSpy = vi.spyOn(sequence, 'register');
        const itemSettingsStore = getItemSettingsStore(itemIdentifier);

        const props = {
            itemIdentifier,
            responseIdentifier: 'abc',
            properties: { autoStart: true },
            classes: 'sequential'
        };
        render(AudioRecordingInteraction, {
            props
        });

        expect(registerSpy).toHaveBeenCalled();
        registerSpy.mockClear();

        itemSettingsStore.set({ doNotPlayMedia: true });
        await tick();
        itemSettingsStore.set({ doNotPlayMedia: false });
        await tick();
        expect(registerSpy).not.toHaveBeenCalled();
    });

    it('does not register itself to sequence in review mode', () => {
        const registerSpy = vi.spyOn(sequence, 'register');

        const props = {
            itemIdentifier,
            responseIdentifier: 'abc',
            properties: { autoStart: true, isReviewMode: true },
            classes: 'sequential'
        };
        render(AudioRecordingInteraction, {
            props
        });

        expect(registerSpy).not.toHaveBeenCalled();
    });

    describe('AudioRecordingUploader', () => {
        it.each(['1.3.0', '1.3.1'])('renders AudioRecordingUploader if useUploader prop is set: v%s', async version => {
            const props = {
                xyz: '567',
                itemIdentifier,
                responseIdentifier: 'abc',
                properties: { foo: 'bar' },
                classes: 'ghi',
                version
            };
            const { container } = render(AudioRecordingInteraction, {
                ...props,
                useUploader: true
            });

            await waitFor(() => {
                const uploaderElem = container.querySelector('.mock-audio-recording-uploader');
                const pciElem = container.querySelector('.mock-audio-interaction');
                expect(uploaderElem).toBeTruthy();
                expect(pciElem).toBeTruthy();

                const passedToChildProps = Object.assign({
                    xyz: '567',
                    itemIdentifier: props.itemIdentifier,
                    responseIdentifier: props.responseIdentifier,
                    properties: props.properties,
                    classes: props.classes,
                    isInitialMount: true,
                    doNotPlayMedia: false
                });
                expect(pciElem.innerHTML).toBe(JSON.stringify(passedToChildProps));
            });
        });

        // Uploader is mandatory in review mode because the baseType might be fileHash (review cannot know what platform config was at time of delivery)
        it('renders AudioRecordingUploader if in review mode', async () => {
            const props = {
                xyz: '567',
                itemIdentifier,
                responseIdentifier: 'abc',
                properties: { foo: 'bar', isReviewMode: true },
                classes: 'ghi',
                version: '1.3.0'
            };
            const { container } = render(AudioRecordingInteraction, {
                ...props
            });

            await waitFor(() => {
                const uploaderElem = container.querySelector('.mock-audio-recording-uploader');
                const pciElem = container.querySelector('.mock-audio-interaction');
                expect(uploaderElem).toBeTruthy();
                expect(pciElem).toBeTruthy();

                const passedToChildProps = Object.assign({
                    xyz: '567',
                    itemIdentifier: props.itemIdentifier,
                    responseIdentifier: props.responseIdentifier,
                    properties: props.properties,
                    classes: props.classes,
                    isInitialMount: true,
                    doNotPlayMedia: false
                });
                expect(pciElem.innerHTML).toBe(JSON.stringify(passedToChildProps));
            });
        });
    });
});
