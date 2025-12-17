// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2019-2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import router from '../core/router.js';
import logger from 'core/logger';

let container;

/**
 * The provided controller object will be extended with page controller functions.
 * Usage:
 *  import pageController from 'controller/page';
 *  const controller = pageController(controller, {
 *      foo() {
 *          // in controller functions, page controller functions are available
 *          this.logger('message');
 *      }
 *  });
 *
 * @param {Object} controller - controller object that should be extended
 * @returns {Object} controller object that is extended with page controller functions.
 */
export default controller =>
    Object.assign(controller, {
        /**
         * Getter of page container
         * @returns {Element} Page container element
         */
        get container() {
            return container || (container = document.querySelector('#page'));
        },

        /**
         * Getter of router
         * @returns {Router} Router instance
         */
        get router() {
            return router;
        },

        /**
         * Getter of logger
         * @returns {Logger} Scoped logger based on controller name
         */
        get logger() {
            return logger(controller.name);
        },

        /**
         * Common prepare function before controller starts
         */
        prepare() {
            this.container.classList.add(this.name);
        },

        /**
         * Common clean function after controller stopped
         */
        clean() {
            const pageContainer = this.container;
            pageContainer.classList.remove(this.name);
            pageContainer.innerHTML = '';
        }
    });
