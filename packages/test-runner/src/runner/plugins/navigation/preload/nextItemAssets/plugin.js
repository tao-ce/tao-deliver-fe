// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { writable, derived } from 'svelte/store';
import { getItemsStore } from '../../../../itemsStore.js';
import { itemPathForPosition } from '../../../../util/testMap.js';
import { preloadNextItemAssets } from './preloaders.js';
import { defaults } from 'lodash';

/**
 * The plugin's default configuration
 */
const defaultConfig = {
    preloadStrategy: {
        stylesheets: true,
        images: true,
        audios: true,
        videos: true,
        audiosThreshold: 5000000, // 5MB
        videosThreshold: 5000000 // 5MB
    }
};

/**
 * Preload the next item's assets
 */
export default pluginFactory({
    name: 'preloadNextItemAssets',

    install() {
        // merge pluginConfig from test runner with local defaults
        const testRunner = this.getTestRunner();
        const pluginConfig = testRunner.getPluginConfig('preloadNextItemAssets') || {};
        const preloadStrategy = defaults({}, pluginConfig.preloadStrategy, defaultConfig.preloadStrategy);
        this.setConfig(Object.assign({}, pluginConfig, { preloadStrategy }));
    },

    init() {
        const testRunner = this.getTestRunner();
        const testRunnerConfig = testRunner.getConfig();
        const itemsStore = getItemsStore(testRunnerConfig.serviceCallId);

        const nextItemIdentifier = writable();

        // Create a derived store to subscribe to both itemsStore (object) and nextItemIdentifier (string)
        const combinedItemsStore = derived([itemsStore, nextItemIdentifier], arr => arr);

        /**
         * Perform prefetching only when the next item's identifier and itemData are both known
         */
        // eslint-disable-next-line no-unused-vars
        this.unsubscribeFromItemsStore = combinedItemsStore.subscribe(([items, nextItemId]) => {
            const nextItem = nextItemId && itemsStore.getItem(nextItemId); // getItem takes care of TTL check
            if (nextItem && nextItem.flags && nextItem.flags.containsNonPreloadedAssets) {
                const { preloadStrategy } = this.getConfig();
                const preloadConfig = {
                    preloadStrategy,
                    requestTimeout: testRunnerConfig.requestTimeout
                };
                /**
                 * @type {Promise}
                 * Will resolve when done, but nothing here depends on its resolution
                 */
                preloadNextItemAssets(nextItem, preloadConfig);

                // prevent any future preloading for that item
                nextItem.flags.containsNonPreloadedAssets = false;
                itemsStore.setItem(nextItemId, nextItem);
            }
        });

        // when an item is rendered, look up the next item's position + identifier
        testRunner.on('renderitem.preloader', () => {
            const testMap = testRunner.getTestMap();
            const testContext = testRunner.getTestContext();
            const nextItemPath = itemPathForPosition(testMap, testContext.itemPosition + 1);
            if (nextItemPath && nextItemPath.itemId) {
                // combinedItemsStore subscription callback will run, when nextItemIdentifier changes
                nextItemIdentifier.set(nextItemPath.itemId);
            }
        });
    },

    render() {},

    destroy() {
        const testRunner = this.getTestRunner();
        testRunner.off('renderitem.preloader');
        if (this.unsubscribeFromItemsStore) {
            this.unsubscribeFromItemsStore();
        }
    }
});
