<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;
    import { onMount, onDestroy } from 'svelte';
    import { getDefaultCursorSvgTemplate, getPointerCursorSvgTemplate } from './cursorTemplates.js';

    let transform = 'translate(0px, 0px)';
    let cursorType = 'default';

    export let size;
    export let color;
    export let targetElement;
    export let position;

    export function addSvgCursor(event = null) {
        // hide svgCursor on browser scroll bar
        if (event && isScrollBar(event)) {
            cursorType = '';
            return;
        }
        if (!position && !event) {
            //if position is not known (=it's initial page load with restored settings),
            // then wait until first 'mousemove' before actually rendering
            cursorType = '';
            return;
        }

        // load cursor position
        let x = position?.x;
        let y = position?.y;
        let hoverElement;
        if (event) {
            x = event.clientX;
            y = event.clientY;
            hoverElement = event.target;
        } else {
            hoverElement = document.elementFromPoint(x, y);
        }

        // cursor type
        const elementStyles = window.getComputedStyle(hoverElement);
        const currentCursor = elementStyles.getPropertyValue('cursor');
        const originalCursorIfOverriden = elementStyles.getPropertyValue('--is-hover');

        if (currentCursor !== 'none') {
            hoverElement.style.setProperty('cursor', 'none', 'important');
            hoverElement.style.setProperty('--is-hover', currentCursor);
            hoverElement.classList.add('is-hover');
        }

        if (
            (originalCursorIfOverriden &&
                originalCursorIfOverriden !== 'default' &&
                originalCursorIfOverriden !== 'none') ||
            (currentCursor !== 'default' && currentCursor !== 'none')
        ) {
            // hand's finger is not on the left top border of the svg
            x -= size.w / 4;
            y -= size.h / 7;
            cursorType = 'pointer';
        } else {
            cursorType = 'default';
        }

        // set cursor position
        transform = `translate(${x}px, ${y}px)`;
    }

    function isOverflow(params) {
        const { isRtl, isWidth, isHeight, clientWidth, clientHeight, clientX, clientY, top, right, left } = params;
        if (isWidth && isHeight) {
            let checkWidth = clientX < left || clientX > left + clientWidth;
            if (isRtl) {
                checkWidth = clientX < right - clientWidth || clientX > right;
            }
            return checkWidth || clientY < top || clientY > top + clientHeight;
        } else if (isWidth) {
            if (isRtl) {
                return clientX < right - clientWidth || clientX > right;
            }
            return clientX < left || clientX > left + clientWidth;
        } else if (isHeight) {
            return clientY < top || clientY > top + clientHeight;
        }
    }

    function isScrollBar(event) {
        const element = event.target;
        if (element.clientHeight < element.scrollHeight || element.clientWidth < element.scrollWidth) {
            const styles = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            const isRtl = styles.direction === 'rtl';

            const params = {
                isRtl,
                clientWidth: element.clientWidth,
                clientHeight: element.clientHeight,
                clientX: event.clientX,
                clientY: event.clientY,
                top: rect.top,
                right: rect.right,
                left: rect.left
            };

            if (['scroll', 'auto'].includes(styles.overflowY) && ['scroll', 'auto'].includes(styles.overflowX)) {
                return isOverflow({ isWidth: true, isHeight: true, ...params });
            } else if (['scroll', 'auto'].includes(styles.overflowY)) {
                // if Y axe is scroll, then I must check the width to see if the cursor is outside
                return isOverflow({ isWidth: true, isHeight: false, ...params });
            } else if (['scroll', 'auto'].includes(styles.overflowX)) {
                // if X axe is scroll, then I must check the height to see if the cursor is outside
                return isOverflow({ isWidth: false, isHeight: true, ...params });
            }
        }
        return false;
    }

    onMount(() => {
        targetElement.addEventListener('mousemove', addSvgCursor);
        // hide browser cursor
        targetElement.dataset.cursor = 'svgCursor';
        targetElement.style.setProperty('cursor', 'none', 'important');
    });

    onDestroy(() => {
        targetElement.removeEventListener('mousemove', addSvgCursor);
        targetElement.style.removeProperty('cursor');
        const allElements = targetElement.querySelectorAll('.is-hover');
        allElements.forEach(element => {
            element.style.removeProperty('cursor');
            element.style.removeProperty('--is-hover');
            element.classList.remove('is-hover');
        });
        delete targetElement.dataset.cursor;
    });
</script>

<style>
    :global([data-cursor='svgCursor'] *) {
        cursor: inherit;
    }
</style>

<div
    style={`position: fixed; pointer-events: none; z-index: 10000; width: ${size.w}px; height: ${size.h}px; left: -2px; top: -5px; transform: ${transform};`}>
    {#if cursorType === 'default'}
        {@html getDefaultCursorSvgTemplate(size, color)}
    {:else if cursorType === 'pointer'}
        {@html getPointerCursorSvgTemplate(size, color)}
    {/if}
</div>
