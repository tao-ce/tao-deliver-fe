// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Wrapper over browser Fullscreen API.
 * Toggles fullscreen for top-level (document) element.
 * Note that if user toggled fullscreen with native browser hotkey, we can't know about it.
 * We can detect and control only fullscreen that we toggled with our code.
 * @returns {Object}
 */
export default function fullscreenApiFactory() {
    /**
     * Get element which will go into fullscreen mode. This is top-level (document) element.
     * @returns {HTMLElement}
     */
    const getTargetElement = () => document.documentElement;

    return {
        /**
         * Check if browser supports fullscreen mode.
         * For example, iPhone Safari doesn't support it.
         * `webkit`-prefixed methods are used by iPad and Mac Safari.
         * @returns {boolean}
         */
        isSupported: () => Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled),
        /**
         * Check if fullscreen mode is on.
         * Fullscreen may have been initiated by another element (e.g. video player), so we check that element is ours.
         * @returns {boolean}
         */
        isFullscreen: () => {
            if (document.fullscreenEnabled) {
                return document.fullscreenElement === getTargetElement();
            } else if (document.webkitFullscreenEnabled) {
                return document.webkitFullscreenElement === getTargetElement();
            }
            return void 0;
        },
        /**
         * Go into fullscreen mode.
         * Potentially it may fail, so use `addChangeListener` to determine when mode has actually changed.
         */
        enterFullscreen: () => {
            if (document.fullscreenEnabled) {
                getTargetElement().requestFullscreen();
            } else if (document.webkitFullscreenEnabled) {
                getTargetElement().webkitRequestFullscreen();
            }
        },
        /**
         * Exit fullscreen mode.
         * Potentially it may fail, so use `addChangeListener` to determine when mode has actually changed.
         */
        exitFullscreen: () => {
            if (document.fullscreenEnabled) {
                document.exitFullscreen();
            } else if (document.webkitFullscreenEnabled) {
                document.webkitExitFullscreen();
            }
        },
        /**
         * Add event listener for when we successfully enter/exit fullscreen mode.
         * No arguments are passed to callback, use `isFullscreen` to determine if we are in fullscreen or not.
         * @param {function} callback
         */
        addChangeListener: callback => {
            if (document.fullscreenEnabled) {
                document.addEventListener('fullscreenchange', callback);
            } else if (document.webkitFullscreenEnabled) {
                document.addEventListener('webkitfullscreenchange', callback);
            }
        },
        /**
         * Remove event listener added with `addChangeListener`.
         * @param {function} callback
         */
        removeChangeListener: callback => {
            document.removeEventListener('fullscreenchange', callback);
            document.removeEventListener('webkitfullscreenchange', callback);
        }
    };
}
