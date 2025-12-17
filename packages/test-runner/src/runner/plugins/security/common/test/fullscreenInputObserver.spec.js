// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import fullScreenKeyboardInputObserver, { defaultConfig } from '../fullscreenInputObserver';

let originalWebkitFullScreenKeyboardInputAllowed;

beforeAll(() => {
    originalWebkitFullScreenKeyboardInputAllowed = document.webkitFullScreenKeyboardInputAllowed;

    Object.defineProperty(document, 'webkitFullScreenKeyboardInputAllowed', {
        value: false,
        configurable: true
    });

    vi.useFakeTimers();
});

afterAll(() => {
    Object.defineProperty(document, 'webkitFullScreenKeyboardInputAllowed', {
        value: originalWebkitFullScreenKeyboardInputAllowed,
        configurable: true
    });

    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe('fullScreenKeyboardInputObserver', () => {
    let observerInstance;
    let browserApiMock;
    let inputElement;
    let textareaElement;

    beforeEach(() => {
        browserApiMock = {
            isFullscreen: vi.fn(),
            enterFullscreen: vi.fn()
        };
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        textareaElement = document.createElement('textarea');

        document.body.appendChild(inputElement);
        document.body.appendChild(textareaElement);

        observerInstance = fullScreenKeyboardInputObserver();
    });

    it('should return the same instance on multiple calls', () => {
        const newObserverInstance = fullScreenKeyboardInputObserver();
        expect(observerInstance).toBe(newObserverInstance);
    });

    it('should handle input selection and unselection correctly', () => {
        observerInstance.observeFullScreenKeyboardInput(browserApiMock);

        inputElement.focus();
        expect(browserApiMock.enterFullscreen).not.toHaveBeenCalled();

        inputElement.blur();
        vi.advanceTimersByTime(defaultConfig.unselectionTimeout);
        expect(browserApiMock.enterFullscreen).toHaveBeenCalled();
    });

    it('should remove event listeners on unsubscribe', () => {
        observerInstance.observeFullScreenKeyboardInput(browserApiMock);

        const inputElements = document.querySelectorAll('input[type="text"], textarea, [role="textbox"]');
        inputElements.forEach(input => {
            vi.spyOn(input, 'removeEventListener').mockImplementation(() => {});
            vi.spyOn(input, 'removeEventListener').mockImplementation(() => {});
        });

        observerInstance.unsubscribe();

        inputElements.forEach(input => {
            expect(input.removeEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
            expect(input.removeEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
        });
    });
});
