// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { throttle } from 'lodash';
import { ResizeObserver } from '../../../../runner/polyfills.js';
/**
 * Get element which will go into fullscreen mode. This is top-level (document) element.
 * @returns {HTMLElement}
 */
const getTargetElement = () => document.documentElement;

/**
 * Check if fullscreen mode is on.
 * Also handle shortcuts like F11 by checking size of window and screen
 * because fullscreenElement in this case is not set
 * @returns {boolean}
 */
const isFullscreen = () => {
    // Most browsers
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
        return true;
    }

    // Safari and some other browsers
    if (document.webkitFullscreenElement) {
        return true;
    }

    // Firefox
    if (document.mozFullScreenElement) {
        return true;
    }

    // IE/Edge
    if (document.msFullscreenElement) {
        return true;
    }

    return false;
};
/**
 * Go into fullscreen mode.
 * Potentially it may fail, so use `addChangeListener` to determine when mode has actually changed.
 * @returns {Promise|void}
 */
const enterFullscreen = () => {
    if (document.fullscreenEnabled) {
        if (!document.fullscreenElement || document.webkitFullScreenKeyboardInputAllowed === false) {
            return getTargetElement().requestFullscreen();
        } else {
            // fail to launch fullscreen by js, try to exit before
            return document.exitFullscreen().then(() => getTargetElement().requestFullscreen());
        }
    } else if (document.webkitFullscreenEnabled) {
        getTargetElement().webkitRequestFullscreen();
    }
};
/**
 * Exit fullscreen mode.
 * @returns {Promise|void}
 */
const exitFullscreen = () => {
    if (document.fullscreenEnabled) {
        return document.exitFullscreen();
    } else if (document.webkitFullscreenEnabled) {
        document.webkitExitFullscreen();
    }
};
/**
 * Flag that represents the previous state of the full screen mode
 * @type {Boolean}
 */
let prevIsFullScreen = false;
let listeners = 0;
/**
 * If the user uses the keyboard shortcut F11 then the fullscreenchange event is not triggered
 * listen to resize event to catch fullscreen change
 */
function checkFullScreenChange() {
    const isFS = isFullscreen();
    if (!isFS || isFS !== prevIsFullScreen) {
        const event = new Event('observefullscreenchange');
        document.dispatchEvent(event);
    }
    prevIsFullScreen = isFS;
}
const observer = new ResizeObserver(throttle(checkFullScreenChange, 400));
/**
 * Remove listener for resize event to catch fullscreen change
 */
function startFullScreenChangeObserver() {
    listeners++;
    if (listeners === 1) {
        observer.observe(getTargetElement());
    }
}
/**
 * Listen for resize event to catch fullscreen change
 */
function stopFullScreenChangeObserver() {
    --listeners;
    if (!listeners) {
        observer.unobserve(getTargetElement());
    }
}
/**
 * Wrapper over browser Fullscreen API.
 * Toggles fullscreen for top-level (document) element.
 * @returns {Object}
 */
export default function fullscreenApiFactory() {
    return {
        /**
         * Check if fullscreen mode is on.
         * Fullscreen may have been initiated by another element (e.g. video player), so we check that element is ours.
         * @returns {boolean}
         */
        isFullscreen,
        /**
         * Go into fullscreen mode.
         * Potentially it may fail, so use `isFullscreen` to determine when mode has actually changed.
         */
        enterFullscreen,
        /**
         * Exit fullscreen mode.
         * Potentially it may fail, so use `isFullscreen` to determine when mode has actually changed.
         */
        exitFullscreen,
        /**
         * Add event listener for when we successfully enter/exit fullscreen mode.
         * No arguments are passed to callback, use `isFullscreen` to determine if we are in fullscreen or not.
         * @param {function} callback
         */
        addChangeListener: callback => {
            document.addEventListener('observefullscreenchange', callback);
            startFullScreenChangeObserver();
        },
        /**
         * Remove event listener added with `addChangeListener`.
         * @param {function} callback
         */
        removeChangeListener: callback => {
            document.removeEventListener('observefullscreenchange', callback);
            stopFullScreenChangeObserver();
        }
    };
}
