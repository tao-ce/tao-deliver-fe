<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;
    import { defaultPin } from './resources/pins.js';

    /**
     * Component to display a row of small SVG pins (indicators to support SelectPoint interaction)
     * @property {Number} used - amount of used (dimmed) pins to render
     * @property {Number} unused - amount of unused pins to render
     */
    export let used = 0;
    export let unused = 0;
    const displayLimit = 10;

    let pins;
    $: {
        const usedPins = Array(used).fill({ used: true });
        const unusedPins = Array(unused).fill({ used: false });
        pins = usedPins.concat(unusedPins).slice(0, displayLimit);
    }
</script>

<style>
    .mini-pins {
        background: var(--color-bg-info);
        padding: var(--space-1x);
        margin: 0 0 var(--space-3x) 0;
        list-style: none;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;

        & li {
            display: flex;
            align-items: center;
            width: 4.5rem;
            max-height: 3.5rem;

            &.dimmed {
                opacity: 0.53;
            }
        }
        & li :global(svg) {
            transform: scale(0.4) translateY(5px);
        }
    }
</style>

<ul class="mini-pins">
    {#each pins as pin}
        <li class:dimmed={pin.used}>
            {@html defaultPin}
        </li>
    {/each}
</ul>
