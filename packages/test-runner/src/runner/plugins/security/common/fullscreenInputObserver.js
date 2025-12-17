// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export const defaultConfig = {
    threshold: 500, // threshold in ms, while blur is not triggered
    unselectionTimeout: 100 // timeout in ms, while input is unselected
};

let instance = null;
const getInputElements = () => document.querySelectorAll('input[type="text"], textarea, [role="textbox"]');

export default function fullScreenKeyboardInputObserver() {
    if (instance) {
        return instance;
    }

    let isInputSelected = false;
    let browserApi;

    function isFullScreenKeyboardInputAllowed() {
        return document.webkitFullScreenKeyboardInputAllowed !== false;
    }

    function handleInputUnSelection() {
        const isFullscreen = browserApi?.isFullscreen();
        const isInputFocused = isInputFocus();
        if (!isFullscreen && !isInputFocused) {
            browserApi?.enterFullscreen();
            // timeout prevents bouncing between fullscreen and non-fullscreen mode when the next input is focused
            setTimeout(() => {
                isInputSelected = false;
            }, defaultConfig.threshold);
        }
    }

    function handleInputSelection() {
        isInputSelected = true;
    }

    function isInputFocus() {
        const inputElements = getInputElements();
        const inputArray = Array.from(inputElements);
        return inputArray.includes(document.activeElement);
    }

    function isFullScreenAllowed() {
        return isFullScreenKeyboardInputAllowed() || (!isInputFocus() && !isInputSelected);
    }

    const debouncedHandleInputUnSelection = () => setTimeout(handleInputUnSelection, defaultConfig.unselectionTimeout);

    function observeFullScreenKeyboardInput(api) {
        if (isFullScreenKeyboardInputAllowed()) {
            return;
        }
        browserApi = api;
        const inputElements = getInputElements();
        inputElements.forEach(input => {
            input.addEventListener('blur', debouncedHandleInputUnSelection);
            input.addEventListener('focus', handleInputSelection);
        });
    }

    function unsubscribe() {
        if (isFullScreenKeyboardInputAllowed()) {
            return;
        }
        const inputElements = getInputElements();
        inputElements.forEach(input => {
            input.removeEventListener('blur', debouncedHandleInputUnSelection);
            input.removeEventListener('focus', handleInputSelection);
        });
        isInputSelected = false;
    }

    instance = {
        observeFullScreenKeyboardInput,
        isFullScreenAllowed,
        unsubscribe
    };

    return instance;
}
