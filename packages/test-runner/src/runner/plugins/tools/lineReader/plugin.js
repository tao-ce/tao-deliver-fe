// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import pluginFactory from 'taoTests/runner/plugin';
import LineReaderMask from './LineReaderMask.svelte';
import ItemContentOverlay from './ItemContentOverlay.svelte';
import toolsStoreHandler from '../util/toolsStoreHandler.js';
import { getItemProperty } from '../../../util/testMap.js';
import { mount, unmount } from 'svelte';

const categoryName = 'x-tao-option-lineReader'; // can be found on an item

/**
 * the lineReader plugin allows to read content by using mask
 */
export default pluginFactory({
    name: 'lineReader',

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();

        this.toolsStoreHandler = toolsStoreHandler(testConfig.serviceCallId, this.getName());

        /**
         * Mask component, if mounted
         * @type {Object|null}
         */
        this.maskComponent = null;
        /**
         * Pointer event disabler component, if mounted
         * @type {Object|null}
         */
        this.itemContentOverlayComponent = null;

        const mainAreaScrollEventListener = evt => {
            this.itemContentOverlayComponent.$set({
                areaScrollTop: evt.target.scrollTop
            });
        };

        /**
         * Mount lineReader mask
         */
        this.renderMask = () => {
            const areaBroker = this.getAreaBroker();
            const mainArea = areaBroker.getMainArea();
            const testRunnerArea = areaBroker.getTestRunnerArea();
            if (!this.maskComponent) {
                this.maskComponent = mount(LineReaderMask, {
                    target: testRunnerArea,
                    props: {
                        gapSize: this.toolsStoreHandler.get('size'),
                        gapYOffset: this.toolsStoreHandler.get('offset')
                    }
                });
                testRunnerArea.style.setProperty('--testrunner-item-bottom-padding', '5.5rem');
            }
            if (!this.itemContentOverlayComponent) {
                this.itemContentOverlayComponent = mount(ItemContentOverlay, {
                    target: mainArea,
                    props: {
                        areaScrollTop: mainArea.scrollTop,
                        areaScrollHeight: mainArea.scrollHeight,
                        gapOffset: this.toolsStoreHandler.get('offset'),
                        gapSize: this.toolsStoreHandler.get('size')
                    }
                });
                this.maskComponent.$on('resize', ({ detail: { size } }) => {
                    this.toolsStoreHandler.set('size', size);
                    this.itemContentOverlayComponent.$set({
                        gapSize: size
                    });
                });
                this.maskComponent.$on('move', ({ detail: { offset } }) => {
                    this.toolsStoreHandler.set('offset', offset);
                    this.itemContentOverlayComponent.$set({
                        gapOffset: offset
                    });
                });
                this.itemContentOverlayComponent.$on('topareaclick', this.maskComponent.handleTopOverlayTap);
                this.itemContentOverlayComponent.$on('bottomareaclick', this.maskComponent.handleBottomOverlayTap);
                mainArea.addEventListener('scroll', mainAreaScrollEventListener);
            }
        };

        /**
         * Unmount lineReader mask
         */
        this.destroyMask = () => {
            const areaBroker = this.getAreaBroker();
            const testRunnerArea = areaBroker.getTestRunnerArea();
            const mainArea = areaBroker.getMainArea();

            if (testRunnerArea) {
                testRunnerArea.style.removeProperty('--testrunner-item-bottom-padding');
            }

            if (this.maskComponent) {
                unmount(this.maskComponent);
            }
            this.maskComponent = null;

            if (this.itemContentOverlayComponent) {
                unmount(this.itemContentOverlayComponent);
            }
            this.itemContentOverlayComponent = null;

            if (mainArea) {
                mainArea.removeEventListener('scroll', mainAreaScrollEventListener);
            }
        };

        /**
         * Open(show) the lineReader mask
         */
        this.open = () => {
            this.toolsStoreHandler.set('open', true);
            this.renderMask();
        };

        /**
         * Close(hide) the lineReader mask
         */
        this.close = () => {
            this.toolsStoreHandler.set('open', false);
            this.destroyMask();
        };
    },

    init() {
        const testRunner = this.getTestRunner();

        testRunner
            .on('loaditem.lineReader', () => {
                const testMap = testRunner.getTestMap();
                const { testPartId, sectionId, itemIdentifier } = testRunner.getTestContext();
                const categories = getItemProperty(testMap, testPartId, sectionId, itemIdentifier, 'categories');
                if (Array.isArray(categories) && categories.includes(categoryName)) {
                    this.show();
                } else {
                    this.hide();
                }
            })
            .on('renderitem.lineReader', () => {
                if (this.toolsStoreHandler.get('open')) {
                    this.renderMask();
                }
            })
            .on('unloaditem.lineReader itemModalFeedback.lineReader', () => {
                this.close();
            })
            .on('toolbaraction.lineReader', key => {
                if (key === 'lineReader') {
                    if (this.toolsStoreHandler.get('open')) {
                        this.close();
                    } else {
                        this.open();
                    }
                }
            });
    },

    /**
     * Show the lineReader toolbar button
     */
    show() {
        this.toolsStoreHandler.set('visible', true);
    },

    /**
     * Hide the lineReader toolbar button (and hide the mask)
     */
    hide() {
        this.toolsStoreHandler.set('visible', false);
        this.destroyMask();
    },
    /**
     * Destroy the plugin and its components. Normally called only at the end of a test session.
     */
    destroy() {
        this.close();

        // remove *all* listeners created on init()
        this.getTestRunner().off('.lineReader');
    }
});
