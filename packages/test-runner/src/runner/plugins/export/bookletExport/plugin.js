// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { tick } from 'svelte';
import pluginFactory from 'taoTests/runner/plugin';
import Toolbar from './Toolbar.svelte';
import { bookletFileConverterFactory } from './bookletFileConverter.js';
import { bookletHtmlBuilderFactory } from './bookletHtmlBuilder.js';
import Transition from './Transition.svelte';
import { __ } from '@oat-sa-private/ui-core';
import { defaultsDeep } from 'lodash';

const defaultConfig = {
    interactive: false,
    start: null,
    end: null,
    renderDelay: 500
};

/**
 * Booklet export:
 * - render all items
 * - get and transform their html
 * - pass this html to conversion package/service
 * - download result from conversion package/service
 * - toolbar to control this process
 * - option to do all that automatically on page load
 */
export default pluginFactory({
    name: 'bookletExport',

    install() {
        const testRunner = this.getTestRunner();
        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        const pluginConfig = defaultsDeep({}, providedConfig, defaultConfig);
        this.setConfig(pluginConfig);

        const config = this.getConfig();

        this.getItemsForBooklet = () => {
            const testMap = this.getTestRunner().getTestMap();
            let allItems = [];
            for (const testPart of Object.values(testMap.parts)) {
                for (const section of Object.values(testPart.sections)) {
                    allItems = allItems.concat(Object.values(section.items));
                }
            }
            if (Number.isInteger(config.start) || Number.isInteger(config.end)) {
                allItems = allItems.slice(
                    Number.isInteger(config.start) ? config.start - 1 : 0,
                    Number.isInteger(config.end) ? config.end : allItems.length
                );
            }
            return allItems;
        };

        this.updateTransitionText = (doneCount, allCount) => {
            if (this.transition) {
                this.transition.$set({
                    text: __('exporting item %d of %d', doneCount, allCount)
                });
            }
        };
    },

    init() {},

    render() {
        /**
         * `bookletHtmlBuilder` will measure the actual size of the rendered image.
         * So try to make image have the same size, no matter on which user device is export running.
         *  - force test-runner to have fixed width (170.75rem - 1366px) - since that's how it would look on majority of devices
         *  - force item-runner to not stack columns even on mobile
         * proper solution would be to run export-mode-testrunner on server, not on user's device.
         */
        document.body.classList.add('booklet-export-mode');

        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const config = this.getConfig();

        const allItems = this.getItemsForBooklet();
        this.bookletFileConverter = bookletFileConverterFactory();

        this.toolbar = new Toolbar({
            target: areaBroker.getTopBarArea()
        });

        this.toolbar.$on('html', () => {
            this.toolbar.$set({ canConvert: false, canDownload: false });
            this.bookletFile = null;
            this.bookletHtml = null;
            this.bookletFilename = this.bookletFileConverter.getFilenameForTest(
                testRunner.getTestContext(),
                testRunner.getTestMap(),
                allItems[0]?.position,
                allItems[allItems.length - 1]?.position
            );
            this.bookletHtmlBuilder = bookletHtmlBuilderFactory();

            let requestedItemIndex = 0;
            const buildItemBookletHtmlAndContinue = async () => {
                this.updateTransitionText(requestedItemIndex + 1, allItems.length);

                //for some customer PCIs (RFE-435/TR-5164),
                // PCI iframe is empty right after renderitem, so add some delay to let it finish rendering
                const waitUntilPCIRendered = new Promise(r => setTimeout(r, config.renderDelay));
                await waitUntilPCIRendered;

                try {
                    await this.bookletHtmlBuilder.appendItem(document.querySelector('.qti-item'));
                } catch (err) {
                    if (!config.interactive) {
                        testRunner.trigger('error', err);
                    }
                    throw err;
                }

                requestedItemIndex++;
                if (requestedItemIndex < allItems.length) {
                    testRunner.jump(allItems[requestedItemIndex].position);
                } else {
                    testRunner.off('renderitem.bookletexport');
                    try {
                        this.bookletHtml = this.bookletHtmlBuilder.getResult();
                    } catch (err) {
                        if (!config.interactive) {
                            testRunner.trigger('error', err);
                        }
                        throw err;
                    }
                    this.toolbar.$set({ canConvert: true });

                    if (!config.interactive) {
                        await tick();
                        document.querySelector('.booklet-toolbar [name="booklet-convert"]').click();
                    }
                }
            };

            testRunner.after('renderitem.bookletexport', buildItemBookletHtmlAndContinue);
            if (testRunner.getTestContext().itemPosition !== allItems[requestedItemIndex].position) {
                testRunner.jump(allItems[requestedItemIndex].position);
            } else {
                //workaround which allows to make manual modifications to on-page html in dev-tools, then process this modified version
                buildItemBookletHtmlAndContinue();
            }
        });

        this.toolbar.$on('convert', async () => {
            try {
                this.bookletFile = await this.bookletFileConverter.convert(this.bookletHtml);
            } catch (err) {
                if (!config.interactive) {
                    testRunner.trigger('error', err);
                }
                throw err;
            }

            this.toolbar.$set({ canDownload: true });

            if (!config.interactive) {
                this.transition.$set({ done: true });
                await tick();
                this.bookletFileConverter.downloadBooklet(
                    this.bookletFile,
                    this.bookletFilename,
                    document.querySelector('.transition > a.booklet-download')
                );
            }
        });

        this.toolbar.$on('download', () => {
            this.bookletFileConverter.downloadBooklet(this.bookletFile, this.bookletFilename);
        });

        this.toolbar.$on('download-html', () => {
            this.bookletFileConverter.downloadHtml(this.bookletHtml, this.bookletFilename);
        });

        this.toolbar.$on('upload-html', ({ detail: { uploadedHtml } }) => {
            this.toolbar.$set({ canDownload: false, canConvert: true });
            this.bookletFile = null;
            this.bookletHtml = uploadedHtml;
            this.bookletFilename = 'uploaded';
        });

        if (!config.interactive) {
            this.transition = new Transition({
                target: areaBroker.getTestRunnerArea(),
                props: { subtext: __('Please wait while booklet export is in progress') }
            });
            this.updateTransitionText(0, 0);

            //wait for first renderitem (otherwise will need to cancel it)
            testRunner.after('renderitem.autobookletexport', () => {
                testRunner.off('renderitem.autobookletexport');
                document.querySelector('.booklet-toolbar [name="booklet-html"]').click();
            });
        }
    },

    destroy() {
        document.body.classList.remove('booklet-export-mode');

        if (this.toolbar) {
            this.toolbar.$destroy();
        }
        if (this.transition) {
            this.transition.$destroy();
        }
        this.getTestRunner().off('.bookletexport');
        this.getTestRunner().off('.autobookletexport');
    }
});
