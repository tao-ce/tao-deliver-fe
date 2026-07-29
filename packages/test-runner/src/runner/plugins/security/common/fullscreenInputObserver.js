// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export const defaultConfig = {
    threshold: 500, // threshold in ms, while blur is not triggered
    unselectionTimeout: 100 // timeout in ms, while input is unselected
};

let instance = null;
const keyboardInputSelector = [
    'input[type="text"]',
    'textarea',
    '[role="textbox"]',
    '[contenteditable]',
    '[data-allow-copy]',
    '.qti-extendedTextInteraction'
].join(', ');
const inputSelectionStartEvents = ['pointerdown', 'touchstart', 'mousedown'];
const delegatedListenerOptions = true;

function getKeyboardInputTarget(element) {
    return element instanceof Element ? element.closest(keyboardInputSelector) : null;
}

export default function fullScreenKeyboardInputObserver() {
    if (instance) {
        return instance;
    }

    let isInputSelected = false;
    let browserApi;
    let inputSelectionStartedAt = 0;
    let inputSelectionStateTimeoutId = null;
    let inputUnselectionTimeoutId = null;

    function isFullScreenKeyboardInputAllowed() {
        return document.webkitFullScreenKeyboardInputAllowed !== false;
    }

    function resetInputSelectionState(delay = defaultConfig.threshold) {
        clearTimeout(inputSelectionStateTimeoutId);
        inputSelectionStateTimeoutId = setTimeout(() => {
            if (!isInputFocus()) {
                isInputSelected = false;
            }
        }, delay);
    }

    function markInputSelection() {
        isInputSelected = true;
        inputSelectionStartedAt = Date.now();
        resetInputSelectionState();
    }

    function handleInputUnSelection() {
        const isFullscreen = browserApi?.isFullscreen();
        const isInputFocused = isInputFocus();
        const isRecentSelection = isInputSelectionRecentlyStarted();

        if (!isFullscreen && !isInputFocused && isRecentSelection) {
            const remainingProtectionTime = Math.max(defaultConfig.threshold - (Date.now() - inputSelectionStartedAt), 0);
            resetInputSelectionState(remainingProtectionTime);
            inputUnselectionTimeoutId = setTimeout(handleInputUnSelection, remainingProtectionTime);
            return;
        }

        if (!isFullscreen && !isInputFocused) {
            browserApi?.enterFullscreen();
        }

        // timeout prevents bouncing between fullscreen and non-fullscreen mode when the next input is focused
        resetInputSelectionState();
    }

    function handleInputSelection() {
        markInputSelection();
    }

    function handleInputSelectionStart() {
        markInputSelection();
    }

    function isInputFocus() {
        return Boolean(getKeyboardInputTarget(document.activeElement));
    }

    function isInputSelectionRecentlyStarted() {
        return isInputSelected && Date.now() - inputSelectionStartedAt < defaultConfig.threshold;
    }

    function isFullScreenAllowed() {
        return isFullScreenKeyboardInputAllowed() || (!isInputFocus() && !isInputSelected);
    }

    const debouncedHandleInputUnSelection = () => {
        clearTimeout(inputUnselectionTimeoutId);
        inputUnselectionTimeoutId = setTimeout(handleInputUnSelection, defaultConfig.unselectionTimeout);
    };

    function handleDelegatedInputSelection(event) {
        if (!getKeyboardInputTarget(event.target)) {
            return;
        }
        handleInputSelection();
    }

    function handleDelegatedInputSelectionStart(event) {
        if (!getKeyboardInputTarget(event.target)) {
            return;
        }
        handleInputSelectionStart();
    }

    function handleDelegatedInputUnSelection(event) {
        if (!getKeyboardInputTarget(event.target)) {
            return;
        }
        debouncedHandleInputUnSelection();
    }

    function observeFullScreenKeyboardInput(api) {
        browserApi = api;
        document.addEventListener('focus', handleDelegatedInputSelection, delegatedListenerOptions);
        document.addEventListener('blur', handleDelegatedInputUnSelection, delegatedListenerOptions);
        // On iPad Safari fullscreen can drop before focus is applied, so track the tap itself too.
        inputSelectionStartEvents.forEach(eventName => {
            document.addEventListener(eventName, handleDelegatedInputSelectionStart, delegatedListenerOptions);
        });
    }

    function unsubscribe() {
        document.removeEventListener('focus', handleDelegatedInputSelection, delegatedListenerOptions);
        document.removeEventListener('blur', handleDelegatedInputUnSelection, delegatedListenerOptions);
        inputSelectionStartEvents.forEach(eventName => {
            document.removeEventListener(eventName, handleDelegatedInputSelectionStart, delegatedListenerOptions);
        });
        clearTimeout(inputSelectionStateTimeoutId);
        clearTimeout(inputUnselectionTimeoutId);
        isInputSelected = false;
        inputSelectionStartedAt = 0;
    }

    instance = {
        observeFullScreenKeyboardInput,
        isFullScreenAllowed,
        isInputSelectionRecentlyStarted,
        unsubscribe
    };

    return instance;
}
