// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getLanguageShortCode } from '@oat-sa-private/ui-core';
import specialCharacters from './specialCharacters';
import defaultSpecialCharsList from './specialCharacters/defaultList.js';
import createUploadAdapterFactory from './uploadAdapter.js';
import { spellCheckConfigs } from './spellcheck/config.js';

function getDefaultEditorConfig() {
    return {
        removePlugins: [],
        extraPlugins: [],
        toolbar: {
            removeItems: []
        },
        language: {
            ui: 'en',
            content: 'en'
        },
        mathBox: {
            virtualKeyboards: 'simple roman'
        },
        uploadAdapterPlugin: {
            identifierAttribute: 'data-img-id',
            inlineAlignImageStyles: true
        }
    };
}

export default function editorConfigFactory({
    //basic
    removePlugins,
    toolbarRemoveItems,
    toolbarLang,
    inputLang,
    //math entry
    hasMathEntry,
    mathEntryKeyboards,
    //special characters
    specialCharacterSetName,
    //image upload
    hasImageUpload,
    uploadServiceType,
    uploadTimeout,
    uploadMaxSize,
    responseIdentifier,
    itemIdentifier,
    getAttachmentsUploadData,
    onUploadStarted,
    onUploadFinished,
    //spellcheck
    spellCheckConfig
}) {
    const editorConfig = getDefaultEditorConfig();

    if (toolbarLang || inputLang) {
        if (!editorConfig.language) {
            editorConfig.language = {};
        }
        if (toolbarLang) {
            editorConfig.language.ui = getLanguageShortCode(toolbarLang);
        }
        if (inputLang) {
            editorConfig.language.content = getLanguageShortCode(inputLang);
        }
    }
    if (!hasMathEntry) {
        editorConfig.removePlugins.push('MathBox');
        editorConfig.toolbar.removeItems.push('mathBox');
    }
    if (hasMathEntry && mathEntryKeyboards) {
        editorConfig.mathBox.virtualKeyboards = mathEntryKeyboards;
    }

    if (!hasImageUpload) {
        const imagePlugins = [
            'UploadAdapterPlugin',
            'Image',
            'ImageToolbar',
            'ImageStyle',
            'ImageResize',
            'ImageUpload'
        ];
        editorConfig.removePlugins.push(...imagePlugins);
        editorConfig.toolbar.removeItems.push('uploadImage');
    } else {
        editorConfig.uploadAdapterPlugin.uploadAdapterFactory = createUploadAdapterFactory({
            getAttachmentsUploadData:
                uploadServiceType === 'sandbox'
                    ? () => Promise.resolve({ uploadServiceType })
                    : getAttachmentsUploadData,
            uploadTimeout,
            uploadMaxSize,
            responseIdentifier,
            itemIdentifier,
            identifierAttribute: editorConfig.uploadAdapterPlugin.identifierAttribute,
            onUploadStarted,
            onUploadFinished
        });
    }

    if (specialCharacterSetName && specialCharacters[specialCharacterSetName]) {
        editorConfig.removePlugins.push(...defaultSpecialCharsList);
        editorConfig.extraPlugins.push(specialCharacters[specialCharacterSetName]);
    }

    if (!spellCheckConfig || spellCheckConfig.enabled === false || spellCheckConfig.providerId !== 'wproofreader') {
        editorConfig.removePlugins.push('WProofreader');
        editorConfig.toolbar.removeItems.push('wproofreader');
    } else {
        editorConfig.wproofreader = spellCheckConfigs.wproofreader.getEditorConfig(spellCheckConfig.providerConfig);
    }

    // removePlugins and toolbarRemoveItems take precendence over other parameters
    if (removePlugins) {
        editorConfig.removePlugins.push(...removePlugins);
    }
    if (toolbarRemoveItems) {
        editorConfig.toolbar.removeItems.push(...toolbarRemoveItems);
    }

    return editorConfig;
}
