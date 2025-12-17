// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import fullscreenApiFactory from '../fullscreenApi.js';
vi.mock('resize-observer-polyfill');

let originalNativeApi = {};

function mockNativeApiEnabled({ webkit }) {
    if (webkit) {
        delete document.fullscreenEnabled;
        document.webkitFullscreenEnabled = true;
    } else {
        document.fullscreenEnabled = true;
        delete document.webkitFullscreenEnabled;
    }
}
function mockNativeApiSizes({ fullscreen }) {
    if (fullscreen) {
        window.devicePixelRatio = 1;
        window.outerWidth = 2560;
        window.outerHeight = 1440;
    } else {
        window.devicePixelRatio = 1;
        window.outerWidth = 2560;
        window.outerHeight = 1332;
    }
    Object.defineProperty(screen, 'height', { writable: true, configurable: true, value: 1440 });
    Object.defineProperty(screen, 'width', { writable: true, configurable: true, value: 2560 });
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
            matches: fullscreen
        }))
    });
}
function saveOriginalNativeApi() {
    originalNativeApi = {
        fullscreenEnabled: document.fullscreenEnabled,
        webkitFullscreenEnabled: document.webkitFullscreenEnabled,
        fullscreenElement: document.fullscreenElement,
        webkitFullscreenElement: document.webkitFullscreenElement,
        exitFullscreen: document.exitFullscreen,
        webkitExitFullscreen: document.webkitExitFullscreen,
        requestFullscreen: document.documentElement.requestFullscreen,
        webkitRequestFullscreen: document.documentElement.webkitRequestFullscreen,
        windowDevicePixelRatio: window.devicePixelRatio,
        windowOuterWidth: window.outerWidth,
        windowOuterHeight: window.outerHeight,
        windowInnerHeight: window.innerHeight,
        screenHeight: screen.height,
        screenWidth: screen.width
    };
}

function restoreNativeApi() {
    document.fullscreenEnabled = originalNativeApi.fullscreenEnabled;
    document.webkitFullscreenEnabled = originalNativeApi.webkitFullscreenEnabled;
    document.fullscreenElement = originalNativeApi.fullscreenElement;
    document.webkitFullscreenElement = originalNativeApi.webkitFullscreenElement;
    document.exitFullscreen = originalNativeApi.exitFullscreen;
    document.webkitExitFullscreen = originalNativeApi.webkitExitFullscreen;
    document.documentElement.requestFullscreen = originalNativeApi.requestFullscreen;
    document.documentElement.requestFullscreen = originalNativeApi.webkitRequestFullscreen;
    window.devicePixelRatio = originalNativeApi.windowDevicePixelRatio;
    window.outerWidth = originalNativeApi.windowOuterWidth;
    window.outerHeight = originalNativeApi.windowOuterHeight;
    window.innerHeight = originalNativeApi.windowInnerHeight;
    Object.defineProperty(screen, 'height', {
        writable: true,
        configurable: true,
        value: originalNativeApi.screenHeight
    });
    Object.defineProperty(screen, 'width', {
        writable: true,
        configurable: true,
        value: originalNativeApi.screenWidth
    });
}

describe('fullscreenApiFactory', () => {
    beforeEach(() => {
        saveOriginalNativeApi();
    });

    afterEach(() => {
        restoreNativeApi();
    });

    it('exports a function', () => {
        expect(typeof fullscreenApiFactory).toBe('function');
    });

    it('the function returns an object with just the methods', () => {
        const api = fullscreenApiFactory();
        expect(typeof api.isFullscreen).toBe('function');
        expect(typeof api.enterFullscreen).toBe('function');
        expect(typeof api.exitFullscreen).toBe('function');
        expect(typeof api.addChangeListener).toBe('function');
        expect(typeof api.removeChangeListener).toBe('function');
    });

    test.each([[false], [true]])('isFullscreen checks size of screen (fullscreen: %s)', fullscreen => {
        mockNativeApiEnabled({ webkit: true });
        mockNativeApiSizes({ fullscreen });
        const api = fullscreenApiFactory();

        const targetElement = document.documentElement;
        expect(targetElement).toBeTruthy();

        expect(api.isFullscreen()).toBe(fullscreen);
    });

    test.each([
        [false, 'requestFullscreen'],
        [true, 'webkitRequestFullscreen']
    ])('enterFullscreen calls native enter method on document element (webkit: %s)', (webkit, methodName) => {
        mockNativeApiEnabled({ webkit });
        const api = fullscreenApiFactory();

        const targetElement = document.documentElement;
        expect(targetElement).toBeTruthy();
        targetElement[methodName] = webkit ? vi.fn() : vi.fn().mockResolvedValue();

        expect(targetElement[methodName]).not.toHaveBeenCalled();
        const result = api.enterFullscreen();
        expect(targetElement[methodName]).toHaveBeenCalled();
        expect(!!result && typeof result.then === 'function').toBe(!webkit);
    });

    test.each([
        [false, 'exitFullscreen'],
        [true, 'webkitExitFullscreen']
    ])('exitFullscreen calls native exit method (webkit: %s)', (webkit, methodName) => {
        mockNativeApiEnabled({ webkit });
        document[methodName] = webkit ? vi.fn() : vi.fn().mockResolvedValue();
        const api = fullscreenApiFactory();

        expect(document[methodName]).not.toHaveBeenCalled();
        const result = api.exitFullscreen();
        expect(document[methodName]).toHaveBeenCalled();
        expect(!!result && typeof result.then === 'function').toBe(!webkit);
    });
});
