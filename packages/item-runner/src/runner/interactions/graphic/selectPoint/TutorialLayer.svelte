<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';
</script>

<style>
    div {
        height: 100%;
        width: 100%;
        padding: var(--space-3x);
        @add-mixin flex-center-center;
        background: hsla(208, 100%, 22%, 0.69); /* colorPrimary + alpha */
        color: var(--color-text-inverted);
        pointer-events: none;

        & ul {
            flex-basis: 80%;
            max-width: 71rem;

            & li {
                margin-bottom: var(--space-1x);
            }
        }
    }
</style>

<div class="tutorial-layer">
    <ul>
        <li>{__('To add an answer, press Space/Enter')}</li>
        <li>{__('To move it around use arrow keys, or Shift + arrow keys for more precise placement')}</li>
        <li>{__('Press Space/Enter again to place your answer')}</li>
        <li>{__('Press Backspace/Delete to remove a selected answer')}</li>
    </ul>
</div>
