// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024-2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import editorConfigFactory from '../editorConfig.js';
import specialCharsPluginsMapping from '../specialCharacters/index.js';
import { SpecialCharactersUpdaterPlugin, SpecialCharactersDiacriticsPlugin } from '@oat-sa-private/ui-elements';

describe('editorConfigFactory', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns default configuration', () => {
        const config = editorConfigFactory({});
        expect(config).toMatchSnapshot();
    });

    it('sets language configuration', () => {
        const config = editorConfigFactory({
            toolbarLang: 'fr-FR',
            inputLang: 'de-DE'
        });
        expect(config.language.ui).toBe('fr');
        expect(config.language.content).toBe('de');
    });

    it('removes math entry plugins if hasMathEntry is false', () => {
        const config = editorConfigFactory({
            hasMathEntry: false
        });
        expect(config.removePlugins).toContain('MathBox');
        expect(config.toolbar.removeItems).toContain('mathBox');
    });

    it('sets wiris as math editor provider when hasMathEntry and isWirisMathEditorEnabled are true', () => {
        const config = editorConfigFactory({
            isWirisMathEditorEnabled: true,
            hasMathEntry: true
        });
        expect(config.mathEditor.provider).toBe('wiris');
    });


    it('sets math entry keyboards if hasMathEntry is true', () => {
        const config = editorConfigFactory({
            hasMathEntry: true,
            mathEntryKeyboards: 'advanced'
        });
        expect(config.mathBox.virtualKeyboards).toBe('advanced');
    });

    it('removes image upload plugins if hasImageUpload is false', () => {
        const config = editorConfigFactory({
            hasImageUpload: false
        });
        expect(config.removePlugins).toEqual(
            expect.arrayContaining([
                'UploadAdapterPlugin',
                'Image',
                'ImageToolbar',
                'ImageStyle',
                'ImageResize',
                'ImageUpload'
            ])
        );
        expect(config.toolbar.removeItems).toContain('uploadImage');
    });

    it('sets special characters if specialCharacterSetName is provided', () => {
        const config = editorConfigFactory({
            specialCharacterSetName: 'latinAndMaths'
        });
        expect(config.removePlugins).toEqual(expect.arrayContaining(specialCharsPluginsMapping.defaultList));
        expect(config.extraPlugins).toEqual([
            specialCharsPluginsMapping.latinAndMaths,
            SpecialCharactersDiacriticsPlugin
        ]);
    });

    it('applies specialCharactersConfig property if provided', () => {
        const specialCharactersConfig = {
            addGroups: [
                {
                    identifier: 'foo',
                    label: 'bar',
                    items: [
                        {
                            character: 'A',
                            title: 'the letter A'
                        }
                    ]
                }
            ],
            order: ['foo']
        };
        const config = editorConfigFactory({
            specialCharactersConfig
        });
        expect(config.extraPlugins).toEqual([SpecialCharactersUpdaterPlugin, SpecialCharactersDiacriticsPlugin]);
        expect(config.specialCharacters).toEqual(specialCharactersConfig);
    });

    it('removes wproofreader plugin and toolbar item if no config', () => {
        const config = editorConfigFactory({
            hasMathEntry: true,
            hasImageUpload: true,
            spellCheckConfig: { enabled: false }
        });
        expect(config.removePlugins).toEqual(expect.arrayContaining(['WProofreader']));
        expect(config.toolbar.removeItems).toEqual(expect.arrayContaining(['wproofreader']));
    });

    it('removes additional plugins and toolbar items if specified', () => {
        const config = editorConfigFactory({
            removePlugins: ['Plugin1', 'Plugin2'],
            toolbarRemoveItems: ['item1', 'item2']
        });
        expect(config.removePlugins).toEqual(expect.arrayContaining(['Plugin1', 'Plugin2']));
        expect(config.toolbar.removeItems).toEqual(expect.arrayContaining(['item1', 'item2']));
    });

    it('sets toolbar.shouldNotGroupWhenFull if provided', () => {
        const config = editorConfigFactory({
            toolbarShouldNotGroupWhenFull: false
        });
        expect(config.toolbar.shouldNotGroupWhenFull).toBe(false);
    });
});
