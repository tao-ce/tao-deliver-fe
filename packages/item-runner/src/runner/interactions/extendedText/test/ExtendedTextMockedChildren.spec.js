// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import MockRichTextEditor from './MockRichTextEditor.svelte';

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

const itemIdentifier = 'iabcd';
const responseIdentifier = 'RESPONSE_123';

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

    afterEach(() => {
        registerLoadingElement.mockClear();
        spyCreateUploadAdapterFactory.mockClear();
        vi.resetModules();
    });

    test.each([
        [
            { interaction: 'fr-FR', item: void 0, user: void 0, instructions: void 0 },
            { 'data-math-entry': 'true' },
            spellCheckConfigWP,
            'simple roman',
            [...imagePlugins],
            [...imageToolbar],
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
            { ui: 'ar', content: 'ar' },
            true
        ],
        [
            { interaction: void 0, item: 'ar-arb', user: 'hu', instructions: 'hu' },
            { 'data-math-entry': 'false' },
            spellCheckConfigNativeOff,
            'simple roman',
            [...mathboxPlugins, ...imagePlugins, ...wproofreaderPlugins],
            [...maxboxToolbar, ...imageToolbar, ...wproofreaderToolbar],
            { ui: 'hu', content: 'ar' },
            false
        ],
        [
            { interaction: void 0, item: 'hu', user: 'ar-arb', instructions: 'ar-arb' },
            { 'data-image-upload': 'true' },
            spellCheckConfigDefault,
            'simple roman',
            [...mathboxPlugins, ...wproofreaderPlugins],
            [...maxboxToolbar, ...wproofreaderToolbar],
            { ui: 'ar', content: 'hu' },
            true
        ],
        [
            { interaction: 'fr-FR', item: 'hu', user: 'hu', instructions: void 0 },
            { 'data-image-upload': 'false' },
            spellCheckConfigDefault,
            'simple roman',
            [...mathboxPlugins, ...imagePlugins, ...wproofreaderPlugins],
            [...maxboxToolbar, ...imageToolbar, ...wproofreaderToolbar],
            { ui: 'hu', content: 'fr' },
            true
        ],
        [
            { interaction: void 0, item: void 0, user: 'hu', instructions: void 0 },
            { 'data-math-entry': 'true', 'data-image-upload': 'true', 'data-spellcheck': 'true' },
            spellCheckConfigWP,
            'simple roman',
            [],
            [],
            { ui: 'hu', content: 'hu' },
            true
        ],
        [
            { interaction: void 0, item: void 0, user: void 0, instructions: void 0 },
            { 'data-special-characters': 'latinAndMaths' },
            spellCheckConfigDefault,
            'simple roman',
            [...mathboxPlugins, ...imagePlugins, ...specialCharsDefaultPlugins, ...wproofreaderPlugins],
            [...maxboxToolbar, ...imageToolbar, ...wproofreaderToolbar],
            { ui: 'en', content: 'en' },
            true
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
            expectedLangs,
            expectedSpellCheck
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
            expect(rteProps.spellcheck).toBe(expectedSpellCheck);
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
