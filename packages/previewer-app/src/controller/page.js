// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import router from '../core/router.js';
import logger from 'core/logger';
import Page from '../component/Page.svelte';

let container;
let pageComponent;

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
         * Getter of page component.
         * Has to be dynamic to return an up-to-date reference when called from child controller.
         * @returns {SvelteComponent}
         */
        getPageComponent() {
            return pageComponent;
        },

        /**
         * Common prepare function before controller starts
         */
        prepare() {
            this.container.dataset.controller = this.name;
            if (!pageComponent) {
                pageComponent = new Page({
                    target: this.container
                });
            }
        },

        /**
         * Common clean function after controller stopped
         */
        clean() {
            const pageContainer = this.container;
            if (pageComponent) {
                pageComponent.$destroy();
                pageComponent = null;
            }
            delete pageContainer.dataset.controller;
            pageContainer.innerHTML = '';
        }
    });
