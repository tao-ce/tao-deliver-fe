// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getLanguageShortCode } from '@oat-sa-private/ui-core';
import specialCharsPluginsMapping from './specialCharacters';
import defaultSpecialCharsList from './specialCharacters/defaultList.js';
import {
    enrichStaticSpecialCharsConfig,
    SpecialCharactersUpdaterPlugin,
    SpecialCharactersDiacriticsPlugin
} from '@oat-sa-private/ui-elements';
import createUploadAdapterFactory from './uploadAdapter.js';
import { spellCheckConfigs } from './spellcheck/config.js';

function getDefaultEditorConfig() {
    return {
        removePlugins: [],
        extraPlugins: [],
        toolbar: {
            removeItems: [],
            shouldNotGroupWhenFull: true
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
        },
        mathEditor: {
            provider: null,
        }
    };
}

export default function editorConfigFactory({
    //basic
    toolbarItems,
    removePlugins,
    toolbarRemoveItems,
    toolbarShouldNotGroupWhenFull,
    toolbarLang,
    inputLang,
    //math entry
    hasMathEntry,
    mathEntryKeyboards,
    isWirisMathEditorEnabled,
    //special characters
    specialCharacterSetName,
    specialCharactersConfig,
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

    if (Array.isArray(toolbarItems) && toolbarItems.length) {
        editorConfig.toolbar.items = toolbarItems;
    }
    if (toolbarShouldNotGroupWhenFull === false) {
        editorConfig.toolbar.shouldNotGroupWhenFull = false;
    }

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
    if (hasMathEntry && mathEntryKeyboards && !isWirisMathEditorEnabled) {
        editorConfig.mathBox.virtualKeyboards = mathEntryKeyboards;
    }
    if (hasMathEntry && isWirisMathEditorEnabled) {
        editorConfig.mathEditor.provider = 'wiris';
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

    // Replace default special characters by one of the preset names
    if (specialCharacterSetName && specialCharsPluginsMapping[specialCharacterSetName]) {
        editorConfig.removePlugins.push(...defaultSpecialCharsList);
        editorConfig.extraPlugins.push(specialCharsPluginsMapping[specialCharacterSetName]);
    }
    // Another way of customising special characters
    if (specialCharactersConfig) {
        editorConfig.specialCharacters = enrichStaticSpecialCharsConfig(specialCharactersConfig);
        editorConfig.extraPlugins.push(SpecialCharactersUpdaterPlugin);
    }
    editorConfig.extraPlugins.push(SpecialCharactersDiacriticsPlugin);

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
