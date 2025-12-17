// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Resolve image source with asset manager.
 * @param {Object} itemContext - getContext(itemIdentifier)
 * @param {String} source
 * @returns {String} resolvedSrc
 */
export function resolveImage(itemContext, source) {
    let resolvedSrc = source;
    if (source && itemContext) {
        const assetManager = itemContext.getAssetManager();
        if (assetManager) {
            resolvedSrc = assetManager.resolve(source);
        }
    }
    return resolvedSrc;
}
