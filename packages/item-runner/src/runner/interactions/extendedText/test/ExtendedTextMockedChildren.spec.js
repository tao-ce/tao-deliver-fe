// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import MockRichTextEditor, { triggerChange } from './MockRichTextEditor.svelte';

var spyCreateUploadAdapterFactory;

vi.mock('@oat-sa-private/ui-elements/richTextEditor/RichTextEditor.svelte', () => ({
    default: MockRichTextEditor
}));

vi.mock('../uploadAdapter.js', async importOriginal => {
    const originalModule = await importOriginal();
    const spy = vi.fn();
    spyCreateUploadAdapterFactory = spy;
    return {
        ...originalModule,
        __esModule: true,
        default: spy
    };
});

import { render } from '@testing-library/svelte';
import ExtendedTextInteraction from '../ExtendedTextInteraction.svelte';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';
import { getItemPendingOperationsStore } from '../../../itemsPendingOperationsStore.js';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';

const itemIdentifier = 'iabcd';
const responseIdentifier = 'RESPONSE_123';
const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
const pendingOperationsStore = getItemPendingOperationsStore(itemIdentifier);

const registerLoadingElement = vi.fn();
const getInstructionsLang = () => 'nb-NO';
const getAttachmentsUploadData = () => {};
const getGetAttachmentsUploadData = () => getAttachmentsUploadData;
const logger = {
    error: vi.fn()
};
const getLogger = () => logger;
const removeItemNotification = vi.fn();
const getWritingMode = vi.fn();
const getUserLang = vi.fn();
const getItemLang = vi.fn();

const testContext = {
    registerLoadingElement,
    getInstructionsLang,
    getLogger,
    getGetAttachmentsUploadData,
    removeItemNotification,
    getWritingMode,
    getUserLang,
    getItemLang
};

describe('ExtendedTextInteraction', () => {
    const mathboxPlugins = ['MathBox'];
    const maxboxToolbar = ['mathBox'];
    const imagePlugins = ['UploadAdapterPlugin', 'Image', 'ImageToolbar', 'ImageStyle', 'ImageResize', 'ImageUpload'];
    const imageToolbar = ['uploadImage'];
    const specialCharsDefaultPlugins = [
        'SpecialCharactersArrows',
        'SpecialCharactersCurrency',
        'SpecialCharactersLatin',
        'SpecialCharactersMathematical',
        'SpecialCharactersText'
    ];
    const wproofreaderPlugins = ['WProofreader'];
    const wproofreaderToolbar = ['wproofreader'];
    const spellCheckConfigDefault = {};
    const spellCheckConfigWP = {
        providerId: 'wproofreader',
        enabled: true
    };
    const spellCheckConfigNativeOn = {
        providerId: 'native',
        enabled: true
    };
    const spellCheckConfigNativeOff = {
        providerId: 'native',
        enabled: false
    };
    const keyboardsDefault = 'simple roman';
    const removePluginsDefault = [...mathboxPlugins, ...imagePlugins, ...wproofreaderPlugins];
    const toolbarRemoveItemsDefault = [...maxboxToolbar, ...imageToolbar, ...wproofreaderToolbar];

    afterEach(() => {
        itemsStateStore.clear();
        pendingOperationsStore.clear();
        registerLoadingElement.mockClear();
        spyCreateUploadAdapterFactory.mockClear();
        vi.resetModules();
    });

    test.each([
        [
            { interaction: 'fr-FR', item: void 0, user: void 0, instructions: void 0 },
            { 'data-math-entry': 'true' },
            spellCheckConfigWP,
            keyboardsDefault,
            [...imagePlugins],
            [...imageToolbar],
            true,
            { ui: 'en', content: 'fr' },
            true
        ],
        [
            { interaction: void 0, item: 'ar-arb', user: 'ar-arb', instructions: void 0 },
            { 'data-math-entry': 'true', 'data-math-entry-keyboards': 'kb1 kb2' },
            spellCheckConfigNativeOn,
            'kb1 kb2',
            [...imagePlugins, ...wproofreaderPlugins],
            [...imageToolbar, ...wproofreaderToolbar],
            true,
            { ui: 'ar', content: 'ar' },
            true
        ],
        [
            { interaction: void 0, item: 'ar-arb', user: 'hu', instructions: 'hu' },
            { 'data-math-entry': 'false' },
            spellCheckConfigNativeOff,
            keyboardsDefault,
            removePluginsDefault,
            toolbarRemoveItemsDefault,
            true,
            { ui: 'hu', content: 'ar' },
            false
        ],
        [
            { interaction: void 0, item: 'hu', user: 'ar-arb', instructions: 'ar-arb' },
            { 'data-image-upload': 'true' },
            spellCheckConfigDefault,
            keyboardsDefault,
            [...mathboxPlugins, ...wproofreaderPlugins],
            [...maxboxToolbar, ...wproofreaderToolbar],
            true,
            { ui: 'ar', content: 'hu' },
            true
        ],
        [
            { interaction: 'fr-FR', item: 'hu', user: 'hu', instructions: void 0 },
            { 'data-image-upload': 'false' },
            spellCheckConfigDefault,
            keyboardsDefault,
            removePluginsDefault,
            toolbarRemoveItemsDefault,
            true,
            { ui: 'hu', content: 'fr' },
            true
        ],
        [
            { interaction: void 0, item: void 0, user: 'hu', instructions: void 0 },
            { 'data-math-entry': 'true', 'data-image-upload': 'true', 'data-spellcheck': 'true' },
            spellCheckConfigWP,
            keyboardsDefault,
            [],
            [],
            true,
            { ui: 'hu', content: 'hu' },
            true
        ],
        [
            { interaction: void 0, item: void 0, user: void 0, instructions: void 0 },
            { 'data-special-characters': 'latinAndMaths' },
            spellCheckConfigDefault,
            'simple roman',
            [...mathboxPlugins, ...imagePlugins, ...specialCharsDefaultPlugins, ...wproofreaderPlugins],
            toolbarRemoveItemsDefault,
            true,
            { ui: 'en', content: 'en' },
            true
        ],
        [
            { interaction: void 0, item: void 0, user: void 0, instructions: void 0 },
            { 'data-toolbar-should-not-group-when-full': 'false' },
            spellCheckConfigDefault,
            'simple roman',
            removePluginsDefault,
            toolbarRemoveItemsDefault,
            false,
            { ui: 'en', content: 'en' },
            true
        ],
        [
            { interaction: void 0, item: void 0, user: void 0, instructions: void 0 },
            { 'data-editor-type': 'document' },
            spellCheckConfigDefault,
            'simple roman',
            removePluginsDefault,
            toolbarRemoveItemsDefault,
            true,
            { ui: 'en', content: 'en' },
            true,
            'document'
        ]
    ])(
        'configures XHTML editorConfig according to attributes: case %#',
        (
            langSettings,
            dataAttrs,
            spellCheckConfig,
            expectedKeyboards,
            expectedRemovePlugins,
            expectedToolbarRemoveItems,
            expectedToolbarShouldNotGroupWhenFull,
            expectedLangs,
            expectedSpellCheck,
            expectedEditorType
        ) => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext: Object.assign({}, testContext, {
                        getUserLang: () => langSettings.user,
                        getItemLang: () => langSettings.item,
                        getInstructionsLang: () => langSettings.instructions
                    }),
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: 'xhtml',
                        language: langSettings.interaction,
                        dataAttrs,
                        spellCheckConfig
                    }
                }
            });
            const rte = container.querySelector('.rich-text-editor-mock');
            const rteProps = JSON.parse(rte.dataset.props);

            expect(rteProps.editorConfig.language.ui).toBe(expectedLangs.ui);
            expect(rteProps.editorConfig.language.content).toBe(expectedLangs.content);
            expect(rteProps.editorConfig.mathBox.virtualKeyboards).toBe(expectedKeyboards);
            expect(rteProps.editorConfig.removePlugins).toStrictEqual(expectedRemovePlugins);
            expect(rteProps.editorConfig.toolbar.removeItems).toStrictEqual(expectedToolbarRemoveItems);
            expect(rteProps.editorConfig.toolbar.shouldNotGroupWhenFull).toStrictEqual(
                expectedToolbarShouldNotGroupWhenFull
            );
            expect(rteProps.spellcheck).toBe(expectedSpellCheck);
            expect(rteProps.editorType).toBe(expectedEditorType);
        }
    );

    test.each([
        [{ uploadTimeout: 888, uploadMaxSize: 555 }, 888, 555, false],
        [{}, 60 * 1000, 20 * 1000 * 1000, false],
        [{ uploadServiceType: 'sandbox' }, 60 * 1000, 20 * 1000 * 1000, true]
    ])(
        'configures createUploadAdapterFactory according to property overrides: case %#',
        (propertyOverrides, uploadTimeout, uploadMaxSize, isImageUploadTypeSandbox) => {
            render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: 'xhtml',
                        dataAttrs: { 'data-image-upload': 'true' },
                        ...propertyOverrides
                    }
                }
            });
            expect(spyCreateUploadAdapterFactory).toHaveBeenCalled();
            const callArgs = spyCreateUploadAdapterFactory.mock.calls[0][0];
            expect(callArgs.uploadTimeout).toEqual(uploadTimeout);
            expect(callArgs.uploadMaxSize).toEqual(uploadMaxSize);

            if (isImageUploadTypeSandbox) {
                expect(typeof callArgs.getAttachmentsUploadData).toBe('function');
                const getAttachmentsUploadDataResult = callArgs.getAttachmentsUploadData();
                expect(getAttachmentsUploadDataResult.then).toBeTruthy();
                return getAttachmentsUploadDataResult.then(attachmentsUploadData => {
                    expect(attachmentsUploadData).toEqual({
                        uploadServiceType: 'sandbox'
                    });
                });
            } else {
                expect(callArgs.getAttachmentsUploadData).toEqual(getAttachmentsUploadData); //from itemContext
            }
        }
    );

    it('registers a pendingOperation when upload starts, and removes it after upload has completed and response is stored', () => {
        const uploadKey = 'upload-foo';

        expect(pendingOperationsStore.isEmpty()).toBe(true);
        render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    format: 'xhtml',
                    dataAttrs: { 'data-image-upload': 'true' },
                    uploadServiceType: 'sandbox'
                }
            }
        });
        expect(spyCreateUploadAdapterFactory).toHaveBeenCalled();

        const callArgs = spyCreateUploadAdapterFactory.mock.calls[0][0];
        expect(typeof callArgs.getAttachmentsUploadData).toBe('function');
        expect(typeof callArgs.onUploadStarted).toBe('function');
        expect(typeof callArgs.onUploadFinished).toBe('function');

        triggerChange({ value: '<p>text</p>' });
        expect(pendingOperationsStore.isEmpty()).toBe(true);

        callArgs.onUploadStarted(uploadKey);
        triggerChange({ value: '<p>text</p><img data-ck-upload-id="temp-123">' });
        expect(pendingOperationsStore.isEmpty()).toBe(false);

        callArgs.onUploadFinished(uploadKey, true);
        expect(pendingOperationsStore.isEmpty()).toBe(false);
        triggerChange({ value: '<p>text</p><img data-img-id="final-123">' });

        expect(interactionStateStore.getResponse()).toMatchObject({
            base: { string: '<p>text</p><img data-img-id="final-123">' }
        });
        expect(interactionStateStore.getValidity()).toBe(true);

        expect(pendingOperationsStore.isEmpty()).toBe(true);
    });

    test.each([
        ['default', {}, void 0, void 0],
        ['configured by tenant', { 'data-editor-type': 'document' }, void 0, 'document'],
        ['tenant overridden by claim', { 'data-editor-type': 'document' }, 'classic', 'classic']
    ])(
        'configures editorType according to property overrides and claims: %s',
        (title, tenantDataAttrs, contextEditorType, expectedDataEditorType) => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testContextKey2: 'itemRunnerConfig',
                    testContext2: {
                        elements: {
                            ExtendedTextInteraction: {
                                editorType: contextEditorType
                            }
                        }
                    },
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: 'xhtml',
                        dataAttrs: tenantDataAttrs
                    }
                }
            });
            const rte = container.querySelector('.rich-text-editor-mock');
            const rteProps = JSON.parse(rte.dataset.props);

            expect(rteProps.editorType).toBe(expectedDataEditorType);
        }
    );

    test.each([
        ['default', void 0, void 0],
        ['overridden by claim', 'tb1', ['bold', 'italic']]
    ])(
        'configures toolbar items according to property overrides and claims: %s',
        (title, toolbarPreset, expectedToolbarItems) => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testContextKey2: 'itemRunnerConfig',
                    testContext2: {
                        elements: {
                            ExtendedTextInteraction: {
                                toolbarPreset
                            }
                        }
                    },
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: 'xhtml',
                        toolbarPresets: {
                            tb1: { items: ['bold', 'italic'] }
                        }
                    }
                }
            });
            const rte = container.querySelector('.rich-text-editor-mock');
            const rteProps = JSON.parse(rte.dataset.props);

            expect(rteProps.editorConfig.toolbar.items).toEqual(expectedToolbarItems);
        }
    );

    test.each([
        ['default native', {}, {}, true, false],
        ['default native, disabled by claim', {}, { enabled: false }, false, false],
        ['provider disabled from tenant, enabled by claim', { enabled: false }, { enabled: true }, true, false],
        ['provider from tenant, no claim', { providerId: 'wproofreader' }, {}, true, true, 'auto'],
        [
            'provider + lang from tenant, no claim',
            { providerId: 'wproofreader', providerConfig: { lang: 'fr_FR' } },
            {},
            true,
            true,
            'fr_FR'
        ],
        [
            'provider from tenant, disabled by claim',
            { providerId: 'wproofreader' },
            { enabled: false },
            false,
            false,
            'auto'
        ],
        [
            'provider from tenant, lang from claim',
            { providerId: 'wproofreader' },
            { providerConfig: { lang: 'nb_NO' } },
            true,
            true,
            'nb_NO'
        ],
        [
            'provider + lang from tenant, other lang from claim',
            { providerId: 'wproofreader', providerConfig: { lang: 'auto' } },
            { providerConfig: { lang: 'nn_NO' } },
            true,
            true,
            'nn_NO'
        ],
        [
            'provider from tenant, other provider from claim',
            { providerId: 'wproofreader' },
            { providerId: 'native' },
            true,
            false,
            'auto'
        ]
    ])(
        'configures XHTML spellcheck according to property overrides and claims: %s',
        (
            title,
            tenantSpellCheckConfig,
            configuredSpellCheckConfig,
            expectedNativeSpellcheckProp,
            expectedWProofreader,
            expectedLang = 'auto'
        ) => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testContextKey2: 'itemRunnerConfig',
                    testContext2: {
                        elements: {
                            ExtendedTextInteraction: {
                                spellCheckConfig: configuredSpellCheckConfig
                            }
                        }
                    },
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: 'xhtml',
                        spellCheckConfig: tenantSpellCheckConfig
                    }
                }
            });
            const rte = container.querySelector('.rich-text-editor-mock');
            const rteProps = JSON.parse(rte.dataset.props);

            expect(rteProps.spellcheck).toBe(expectedNativeSpellcheckProp);
            if (expectedWProofreader) {
                expect(rteProps.editorConfig.wproofreader).toBeTypeOf('object');
                expect(rteProps.editorConfig.wproofreader.lang).toBe(expectedLang);
            } else {
                expect(rteProps.editorConfig).not.toHaveProperty('wproofreader');
            }
        }
    );
});
