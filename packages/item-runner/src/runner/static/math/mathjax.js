// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import 'mathjax/es5/startup.js';
import 'mathjax/es5/core.js';
import 'mathjax/es5/input/mml.js';
import 'mathjax/es5/output/svg.js';
import 'mathjax/es5/output/svg/fonts/tex.js';
import 'mathjax/es5/a11y/assistive-mml.js';

let initialized = false;

/**
 * Get an initialized instance of MathJax
 * @returns {Promise<MathJax>} the initialized MathJax
 */
export function getMathJax() {
    if (initialized) {
        return window.MathJax;
    }
    window.MathJax.startup.defaultReady();
    return window.MathJax.startup.promise.then(() => {
        const originalLoader = window.MathJax.loader.load;
        window.MathJax.loader.load = function (moduleName, ...rest) {
            //only to silence console error produced by 'readAloud' plugin 'textHelp' provider
            //remove if actual module will be properly loaded
            if (moduleName === 'a11y/semantic-enrich') {
                window.MathJax._.a11y.sre = { Sre: {} };
                return Promise.resolve();
            }
            return originalLoader(moduleName, ...rest);
        };

        initialized = true;
        return window.MathJax;
    });
}

/**
 * Get the MathJax object
 * @property {MathJax} MathJax
 */
export default window.MathJax;
