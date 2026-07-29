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
    let removeEventListenerSpy;

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
        removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
        observerInstance?.unsubscribe();
        Object.defineProperty(document, 'webkitFullScreenKeyboardInputAllowed', {
            value: false,
            configurable: true
        });
        document.body.innerHTML = '';
        vi.clearAllTimers();
        removeEventListenerSpy.mockRestore();
    });

    it('should return the same instance on multiple calls', () => {
        const newObserverInstance = fullScreenKeyboardInputObserver();
        expect(observerInstance).toBe(newObserverInstance);
    });

    it('should delay fullscreen re-entry while recent input selection is still protected', () => {
        observerInstance.observeFullScreenKeyboardInput(browserApiMock);

        browserApiMock.isFullscreen.mockReturnValue(false);

        inputElement.focus();
        inputElement.blur();

        vi.advanceTimersByTime(defaultConfig.unselectionTimeout);
        expect(browserApiMock.enterFullscreen).not.toHaveBeenCalled();

        vi.advanceTimersByTime(defaultConfig.threshold);
        expect(browserApiMock.enterFullscreen).toHaveBeenCalled();
    });

    it('should mark input selection as active on pointer interaction before focus', () => {
        observerInstance.observeFullScreenKeyboardInput(browserApiMock);

        expect(observerInstance.isFullScreenAllowed()).toBe(true);

        inputElement.dispatchEvent(new Event('pointerdown'));

        expect(observerInstance.isFullScreenAllowed()).toBe(false);

        vi.advanceTimersByTime(defaultConfig.threshold);

        expect(observerInstance.isFullScreenAllowed()).toBe(true);
    });

    it('should mark extended text interaction as active on pointer interaction before focus', () => {
        const interactionElement = document.createElement('div');
        const editorElement = document.createElement('div');

        interactionElement.className = 'qti-extendedTextInteraction';
        interactionElement.appendChild(editorElement);
        document.body.appendChild(interactionElement);

        observerInstance.observeFullScreenKeyboardInput(browserApiMock);

        expect(observerInstance.isFullScreenAllowed()).toBe(true);

        editorElement.dispatchEvent(new Event('pointerdown'));

        expect(observerInstance.isFullScreenAllowed()).toBe(false);

        vi.advanceTimersByTime(defaultConfig.threshold);

        expect(observerInstance.isFullScreenAllowed()).toBe(true);
    });

    it('should keep observing keyboard targets added after observer setup and after fullscreen allowance changes', () => {
        Object.defineProperty(document, 'webkitFullScreenKeyboardInputAllowed', {
            value: true,
            configurable: true
        });

        observerInstance.observeFullScreenKeyboardInput(browserApiMock);

        const interactionElement = document.createElement('div');
        const editorElement = document.createElement('div');

        interactionElement.className = 'qti-extendedTextInteraction';
        interactionElement.appendChild(editorElement);
        document.body.appendChild(interactionElement);

        Object.defineProperty(document, 'webkitFullScreenKeyboardInputAllowed', {
            value: false,
            configurable: true
        });

        editorElement.dispatchEvent(new Event('pointerdown'));

        expect(observerInstance.isFullScreenAllowed()).toBe(false);
    });

    it('should remove event listeners on unsubscribe', () => {
        observerInstance.observeFullScreenKeyboardInput(browserApiMock);

        observerInstance.unsubscribe();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function), true);
        expect(removeEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function), true);
        expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
        expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), true);
        expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function), true);
    });
});
