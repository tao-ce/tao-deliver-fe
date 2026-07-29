// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import ItemBlocks from './ItemBlocks.svelte';
import { mount } from 'svelte';

/**
 * Get the rendered HTML from a blockTree.
 * Use this method only when you want to retrieve the HTML string, otherwise
 * render the blockTree using the ItemBlock component.
 *
 * @param {Object[]} blockTree - the blockTree to render
 * @returns {String} the rendered HTML from the block tree
 */
export default function blockTreePreRender(blockTree = []) {
    //render the block tree in a fragment, of course
    //only the initial state will be taken
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    fragment.appendChild(container);

    mount(ItemBlocks, {
        target: container,
        props: {
            blockTree
        }
    });

    //retrieve the content inserted in the fragment
    return container.innerHTML;
}
