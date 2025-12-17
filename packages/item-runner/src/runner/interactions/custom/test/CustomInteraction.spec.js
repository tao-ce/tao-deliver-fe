// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import MockCustomInteractionChild from './MockCustomInteractionChild.svelte';
import MockAudioRecordingInteractionChild from './MockAudioRecordingInteractionChild.svelte';
import MockTextReaderInteractionChild from './MockTextReaderInteractionChild.svelte';

vi.mock('../customInteractionTypes/CustomInteractionDefault.svelte', () => ({
    default: MockCustomInteractionChild
}));
vi.mock('../customInteractionTypes/AudioRecordingInteraction.svelte', () => ({
    default: MockAudioRecordingInteractionChild
}));
vi.mock('../customInteractionTypes/TextReaderInteraction.svelte', () => ({
    default: MockTextReaderInteractionChild
}));

import { render } from '@testing-library/svelte';
import CustomInteraction from '../CustomInteraction.svelte';

describe('CustomInteraction switcher', () => {
    test.each(['mathEntryInteraction', 'likertInteraction'])(
        'chooses the default component for typeIdentifier %s',
        typeIdentifier => {
            const { container } = render(CustomInteraction, {
                props: {
                    typeIdentifier
                }
            });
            expect(container.innerHTML.trim()).toBe(
                `<div data-typeidentifier="${typeIdentifier}">Default component</div>`
            );
        }
    );

    it('chooses the AudioRecordingInteraction component', () => {
        const typeIdentifier = 'audioRecordingInteraction';
        const { container } = render(CustomInteraction, {
            props: {
                typeIdentifier
            }
        });
        expect(container.innerHTML.trim()).toBe(
            `<div data-typeidentifier="${typeIdentifier}">AudioRecording component</div>`
        );
    });

    it('chooses the TextReaderInteraction component', () => {
        const typeIdentifier = 'textReaderInteraction';
        const { container } = render(CustomInteraction, {
            props: {
                typeIdentifier
            }
        });
        expect(container.innerHTML.trim()).toBe(
            `<div data-typeidentifier="${typeIdentifier}">TextReader component</div>`
        );
    });
});
