<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;
</script>

<style>
    /************************************/
    /* Global styles set by comment highlighter */
    /************************************/

    /* Highlighted text inside item */
    :global(.tao-comment-txt) {
        color: var(--color-text-default); /* force text inside to be of contrasting color with background */
        background-color: var(--color-brand-light);
        box-shadow: 0rem 0.25rem var(--color-brand); /*bottom*/
        cursor: pointer;

        &:focus-visible {
            outline: var(--border-medium) dotted var(--color-border-focus);
        }
    }

    /* .hover class of highlights is applied by JS, to target multiple matching highlights */
    :global(.tao-comment-txt.hover) {
        background-color: var(--color-brand);
        color: var(--color-text-inverted);
    }

    /* By default, only bottom shadow style is set. Using JS, sibling class is applied where: comment + comment OR comment + micro text node + comment */
    :global(.tao-comment-txt.sibling) {
        box-shadow: 0rem 0.25rem var(--color-brand) /*bottom*/, -0.125rem 0 0 0 var(--color-brand); /*left*/
    }

    /* Highlight container style when the tool is on */
    :global(.tao-comment-mode) {
        cursor: text;
    }
</style>
