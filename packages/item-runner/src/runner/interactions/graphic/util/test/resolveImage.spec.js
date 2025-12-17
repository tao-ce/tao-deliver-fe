// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { resolveImage } from '../resolveImage.js';

describe('resolveImage', () => {
    it('resolves source with assetManager', () => {
        const itemContextMock = {
            getAssetManager: () => ({
                resolve: url => `./myassets/${url}`
            })
        };
        expect(resolveImage(itemContextMock, 'folder/balloon.png')).toBe('./myassets/folder/balloon.png');
    });

    it('returns unresolved source if no assetManager', () => {
        expect(resolveImage(null, 'folder/balloon.png')).toBe('folder/balloon.png');
    });
});
