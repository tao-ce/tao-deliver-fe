// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { disableContextMenuHandler, disableRightClickHandler, clearClipboardHandler } from '../handlers.js';

describe('handlers', () => {
    let container;
    let allowedTarget;
    let notAllowedTarget;
    let evt;
    beforeEach(() => {
        container = document.createElement('div');
        allowedTarget = document.createElement('input');
        notAllowedTarget = document.createElement('div');
        container.appendChild(allowedTarget);
        container.appendChild(notAllowedTarget);
        evt = {
            target: notAllowedTarget,
            preventDefault: vi.fn(),
            clipboardData: {
                setData: vi.fn()
            },
            button: 2
        };
    });
    describe('disableContextMenuHandler', () => {
        it('prevents default if target is not allowed', () => {
            disableContextMenuHandler(evt);
            expect(evt.preventDefault).toHaveBeenCalled();
        });
        it('does not prevent default if target is allowed', () => {
            evt.target = allowedTarget;
            disableContextMenuHandler(evt);
            expect(evt.preventDefault).not.toHaveBeenCalled();
        });
    });
    describe('disableRightClickHandler', () => {
        it('prevents default if target is not allowed', () => {
            disableRightClickHandler(evt);
            expect(evt.preventDefault).toHaveBeenCalled();
        });
        it('does not prevent default if target is allowed', () => {
            evt.target = allowedTarget;
            disableRightClickHandler(evt);
            expect(evt.preventDefault).not.toHaveBeenCalled();
        });
    });
    describe('clearClipboardHandler', () => {
        it('prevents default if target is not allowed', () => {
            clearClipboardHandler(evt);
            expect(evt.preventDefault).toHaveBeenCalled();
        });
        it('does not prevent default if target is allowed', () => {
            evt.target = allowedTarget;
            clearClipboardHandler(evt);
            expect(evt.preventDefault).not.toHaveBeenCalled();
        });
    });
});
