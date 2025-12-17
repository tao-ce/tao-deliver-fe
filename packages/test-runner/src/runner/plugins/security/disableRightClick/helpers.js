// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * @param {HTMLElement} target
 * @returns {boolean}
 */
export const isAllowedEvtTarget = (target) => {
    const allowedTags = ['INPUT', 'TEXTAREA'];
    const allowedInputTypes = ['text', 'password', 'email', 'number', 'search', 'tel', 'url'];
    if (allowedTags.includes(target.tagName)) {
        const inputType = target.getAttribute('type');
        if (allowedInputTypes.includes(inputType) || !inputType) {
            return true;
        }
    } else if (target.closest('[contenteditable], [data-allow-copy]')) {
        return true;
    }
    return false;
};
