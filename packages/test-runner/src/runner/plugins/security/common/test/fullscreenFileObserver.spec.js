// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import fullscreenFileObserver from '../fullscreenFileObserver.js';

beforeAll(() => {
    vi.useFakeTimers();
});

afterAll(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe('fullscreenFileObserver', () => {
    let observerInstance;
    let browserApiMock;
    let fileElement;

    beforeEach(() => {
        browserApiMock = {
            isFullscreen: vi.fn(),
            enterFullscreen: vi.fn()
        };
        fileElement = document.createElement('input');
        fileElement.type = 'file';

        document.body.appendChild(fileElement);

        observerInstance = fullscreenFileObserver();
    });

    it('returns the same instance on multiple calls', () => {
        const newObserverInstance = fullscreenFileObserver();
        expect(observerInstance).toBe(newObserverInstance);
    });

    it('on file selection sets "isFileSelection", after - invokes exit callback', () => {
        const exitCallback = vi.fn();
        let windowFocusCallback = null;
        vi.spyOn(window, 'addEventListener').mockImplementation((eventType, callback, params) => {
            windowFocusCallback = callback;
            expect(eventType).toBe('focus');
            expect(params).toEqual({ once: true });
        });
        observerInstance.observeFileInputs(browserApiMock, exitCallback);
        expect(observerInstance.isFileSelection()).toBe(false);

        fileElement.click();
        expect(browserApiMock.enterFullscreen).not.toHaveBeenCalled();
        expect(exitCallback).not.toHaveBeenCalled();
        expect(observerInstance.isFileSelection()).toBe(true);

        expect(windowFocusCallback).toBeTypeOf('function'); // check that addEventListener was called
        windowFocusCallback(); //mock firing 'focus' on window
        expect(exitCallback).toHaveBeenCalled();
        expect(browserApiMock.enterFullscreen).toHaveBeenCalled();
        expect(observerInstance.isFileSelection()).toBe(false);
    });

    it('removes event listeners on unsubscribe', () => {
        observerInstance.observeFileInputs(browserApiMock, () => {});

        const inputElements = document.querySelectorAll('input[type="file"]');
        inputElements.forEach(input => {
            vi.spyOn(input, 'removeEventListener').mockImplementation(() => {});
        });

        observerInstance.unsubscribe();

        inputElements.forEach(input => {
            expect(input.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });
    });
});
