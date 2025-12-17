// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { isAllowedEvtTarget } from "./helpers.js";

export const disableContextMenuHandler = (evt, callback) => {
    if (isAllowedEvtTarget(evt.target)) {
        return;
    }
    evt.preventDefault();
    if (typeof callback === 'function') {
        callback();
    }
};

export const disableRightClickHandler = (evt, callback) => {
    if (isAllowedEvtTarget(evt.target)) {
        return;
    }
    if (evt.button === 2) {
        evt.preventDefault();
        if (typeof callback === 'function') {
            callback();
        }
        return false;
    }
};

export const clearClipboardHandler = (evt, callback) => {
    if (isAllowedEvtTarget(evt.target)) {
        return;
    }
    evt.clipboardData.setData('text/plain', '');
    evt.preventDefault();
    if (typeof callback === 'function') {
        callback();
    }
};
