<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-21 (original work) Open Assessment Technologies SA ;

    import { onMount, onDestroy, getContext } from 'svelte';
    import itemsStateStore from '../itemsStateStore.js';
    import { debounce } from 'lodash';
    import { reRankHeadings } from '../util/heading.js';
    import ItemBlocks from '../item/blocks/ItemBlocks.svelte';
    import { hasClass } from '../interactions/util/attributes.js';

    /**
     * The include component displays an article (for passages or shared stimulus).
     * The articleScrollParent is a wrapper outside of this component.
     * If articleScrollParent's classes contains "tao-overflow-y", the passage is scrollable and
     * the position saved in the itemsStateStore (by include href, not the itemIdentifier)
     *
     * @property {Object} attributes - element attributes
     * @property {string} [attributes.content] - the content as an HTML string
     * @property {Object[]} [attributes.blockTree] - complex content
     * @property {string} attributes.class - the list of css classes
     * @property {string} attributes.href - the reference of the passage (URL or id)
     * @property {string} itemIdentifier
     */
    export let attributes = {};
    export let itemIdentifier;

    const itemContext = getContext(itemIdentifier);
    const itemRunnerConfigContext = getContext('itemRunnerConfig') || {};

    /**
     * Centralised list of current item's xinclude hrefs
     * @type {string[]}
     */
    const hrefsInItem = itemContext ? itemContext.getXIncludeHrefs() : [];

    // check if this component is the first occurrence of this href in the item - if so, add it as data-href
    const { href } = attributes;
    let dataHref;
    if (href && !hrefsInItem.includes(href)) {
        dataHref = href;
        hrefsInItem.push(href);
    }

    const immediateScroll = hasClass(attributes.class, 'tao-immediate-scroll');

    let article;
    let articleScrollParent;
    let scrollable = false;

    /**
     * Save the scroll position of the position in the items store,
     * using the passage 'href' as identifier
     */
    function saveScrollPosition() {
        if (articleScrollParent) {
            itemsStateStore.update(store => {
                store.passageScroll = store.passageScroll || {};
                store.passageScroll[attributes.href] = articleScrollParent.scrollTop;
                return store;
            });
        }
    }

    /**
     * Restore the saved scroll position from the items store
     */
    function restoreScrollPosition() {
        const smoothScrollingSupported = 'scrollBehavior' in document.documentElement.style && !immediateScroll;
        const position = $itemsStateStore.passageScroll && $itemsStateStore.passageScroll[attributes.href];

        if (position > 0 && articleScrollParent) {
            if (smoothScrollingSupported) {
                articleScrollParent.scrollTo({
                    top: position,
                    behavior: 'smooth'
                });
            } else {
                articleScrollParent.scrollTop = position;
            }
        }
    }

    /**
     * Scroll to stored page position
     */
    function scrollToPosition() {
        if (!articleScrollParent) {
            return;
        }
        restoreScrollPosition();
        articleScrollParent.addEventListener('scroll', debounce(saveScrollPosition, 500));
    }

    let restoreScrollTimeout = null;
    onMount(() => {
        //if the passage contains h1 or h2
        //we re rank the heading levels (only when enabled via itemRunnerConfig)
        if (itemRunnerConfigContext.options?.reRankHeadings) {
            reRankHeadings(article);
        }

        // scroll parent exists if tao-overflow-y was set on the custom wrapper
        articleScrollParent = article.closest('.tao-overflow-y');
        if (articleScrollParent) {
            articleScrollParent.setAttribute('tabindex', '0');
        }

        scrollable = Boolean(articleScrollParent);

        if (attributes.href && scrollable) {
            if (immediateScroll) {
                scrollToPosition();
            } else {
                //wait a delay before scrolling
                restoreScrollTimeout = setTimeout(() => {
                    scrollToPosition();
                }, 600);
            }
        }
    });

    onDestroy(() => {
        clearTimeout(restoreScrollTimeout);
    });
</script>

<style>
    article {
        position: relative;
    }

    @media screen and (--mq-minwidth-large) {
        .scrollable {
            /* tiny padding-left avoids clipping highlight outline if present */
            padding-inline: 0.125rem 2rem;
        }
    }
</style>

<article class="qti-include {attributes.class || ''}" class:scrollable data-href={dataHref} bind:this={article}>
    {#if attributes.blockTree}
        <ItemBlocks blockTree={attributes.blockTree} />
    {/if}
</article>
