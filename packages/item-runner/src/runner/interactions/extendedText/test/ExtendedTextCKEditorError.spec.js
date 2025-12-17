// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// Unsetting the usual ckeditor mock in order trigger an error at initialisation.
// Due to this, this test must live in its own file, away from ExtendedTextInteraction.spec.js
vi.mock('@oat-sa-private/ui-elements/richTextEditor/ckeditor.js', () => ({
    __esModule: true,
    EditorWatchdog: function EditorWatchdog() {
        return {
            on: vi.fn(),
            setCreator: vi.fn(),
            setDestructor: vi.fn(),
            create: vi.fn(),
            destroy: vi.fn()
        };
    },
    ClassicEditor: {
        create: vi.fn().mockRejectedValue(new Error('not loaded'))
    }
}));
import { render } from '@testing-library/svelte';
import ExtendedTextInteraction from '../ExtendedTextInteraction.svelte';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';

const itemIdentifier = 'iabcd';
const responseIdentifier = 'RESPONSE_123';

// Mocked item context methods
const registerLoadingElement = vi.fn();
const triggerError = vi.fn();
const logger = {
    error: vi.fn()
};
const getLogger = () => logger;
const removeItemNotification = vi.fn();
const getWritingMode = vi.fn();

const testContext = {
    registerLoadingElement,
    triggerError,
    getInstructionsLang: () => 'nb-NO',
    getUserLang: () => 'nb-NO',
    getItemLang: () => 'fr-FR',
    getLogger,
    removeItemNotification,
    getWritingMode
};

describe('ExtendedTextInteraction', () => {
    afterEach(() => {
        registerLoadingElement.mockClear();
        triggerError.mockClear();
    });

    it('rejects loading promise when error precedes ready', async () => {
        render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    format: 'xhtml'
                }
            }
        });

        expect(registerLoadingElement).toHaveBeenCalled();
        expect(registerLoadingElement.mock.calls[0][0]).toEqual(expect.any(Promise));
        await expect(registerLoadingElement.mock.calls[0][0]).rejects.toThrow();
        expect(triggerError).not.toHaveBeenCalled();
    });
});
