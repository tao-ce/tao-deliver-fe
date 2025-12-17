// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import fullscreenApiFactory from '../fullscreenApi.js';

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

function saveOriginalNativeApi() {
    originalNativeApi = {
        fullscreenEnabled: document.fullscreenEnabled,
        webkitFullscreenEnabled: document.webkitFullscreenEnabled,
        fullscreenElement: document.fullscreenElement,
        webkitFullscreenElement: document.webkitFullscreenElement,
        exitFullscreen: document.exitFullscreen,
        webkitExitFullscreen: document.webkitExitFullscreen,
        requestFullscreen: document.documentElement.requestFullscreen,
        webkitRequestFullscreen: document.documentElement.webkitRequestFullscreen
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
        expect(typeof api.isSupported).toBe('function');
        expect(typeof api.isFullscreen).toBe('function');
        expect(typeof api.enterFullscreen).toBe('function');
        expect(typeof api.exitFullscreen).toBe('function');
        expect(typeof api.addChangeListener).toBe('function');
        expect(typeof api.removeChangeListener).toBe('function');
    });

    it('isSupported checks if native api is enabled, for webkit too', () => {
        delete document.fullscreenEnabled;
        delete document.webkitFullscreenEnabled;
        let api = fullscreenApiFactory();
        expect(api.isSupported()).toEqual(false);

        document.fullscreenEnabled = false;
        document.webkitFullscreenEnabled = false;
        api = fullscreenApiFactory();
        expect(api.isSupported()).toEqual(false);

        document.fullscreenEnabled = true;
        delete document.webkitFullscreenEnabled;
        api = fullscreenApiFactory();
        expect(api.isSupported()).toEqual(true);

        delete document.fullscreenEnabled;
        document.webkitFullscreenEnabled = true;
        api = fullscreenApiFactory();
        expect(api.isSupported()).toEqual(true);

        document.fullscreenEnabled = true;
        document.webkitFullscreenEnabled = true;
        api = fullscreenApiFactory();
        expect(api.isSupported()).toEqual(true);
    });

    test.each([
        [false, 'fullscreenElement'],
        [true, 'webkitFullscreenElement']
    ])('isFullscreen checks if native active fullscreen element is document (webkit: %s)', (webkit, elementName) => {
        mockNativeApiEnabled({ webkit });
        const api = fullscreenApiFactory();

        const targetElement = document.documentElement;
        expect(targetElement).toBeTruthy();

        document[elementName] = null;
        expect(api.isFullscreen()).toBe(false);
        document[elementName] = document.createElement('div');
        expect(api.isFullscreen()).toBe(false);
        document[elementName] = targetElement;
        expect(api.isFullscreen()).toBe(true);
    });

    test.each([
        [false, 'requestFullscreen'],
        [true, 'webkitRequestFullscreen']
    ])('enterFullscreen calls native enter method on document element (webkit: %s)', (webkit, methodName) => {
        mockNativeApiEnabled({ webkit });
        const api = fullscreenApiFactory();

        const targetElement = document.documentElement;
        expect(targetElement).toBeTruthy();
        targetElement[methodName] = vi.fn();

        expect(targetElement[methodName]).not.toHaveBeenCalled();
        api.enterFullscreen();
        expect(targetElement[methodName]).toHaveBeenCalled();
    });

    test.each([
        [false, 'exitFullscreen'],
        [true, 'webkitExitFullscreen']
    ])('exitFullscreen calls native exit method (webkit: %s)', (webkit, methodName) => {
        mockNativeApiEnabled({ webkit });
        document[methodName] = vi.fn();
        const api = fullscreenApiFactory();

        expect(document[methodName]).not.toHaveBeenCalled();
        api.exitFullscreen();
        expect(document[methodName]).toHaveBeenCalled();
    });

    test.each([
        [false, 'fullscreenchange'],
        [true, 'webkitfullscreenchange']
    ])('addChangeListener/removeChangeListener for native event (webkit: %s)', (webkit, eventName) => {
        mockNativeApiEnabled({ webkit });
        const onChangeSpy = vi.fn();
        const api = fullscreenApiFactory();

        document.dispatchEvent(new CustomEvent(eventName));
        expect(onChangeSpy).not.toHaveBeenCalled();

        api.addChangeListener(onChangeSpy);
        document.dispatchEvent(new CustomEvent(eventName));
        expect(onChangeSpy).toHaveBeenCalled();
        onChangeSpy.mockClear();

        api.removeChangeListener(onChangeSpy);
        document.dispatchEvent(new CustomEvent(eventName));
        expect(onChangeSpy).not.toHaveBeenCalled();
    });
});
