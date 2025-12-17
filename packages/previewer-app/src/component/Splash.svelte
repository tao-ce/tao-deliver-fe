<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';

    /**
     * Component is used to render splash page.
     * @property {String} title header of the message
     */
    export let title = __('TAO Previewer Service');
</script>

<style>
    .splash {
        width: 100vw;
        height: 100vh;
        @add-mixin flex-center-center;
        padding: 0 6rem;
    }

    .container {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .info {
        max-width: 55rem;
        text-align: center;
    }

    @media screen and (--mq-maxwidth-medium) {
        .splash {
            padding: 0 2rem;
        }

        .container {
            @add-mixin flex-center-center;
            flex-direction: column;
        }
    }
</style>

<div class="splash">
    <div class="container">
        <div class="icon-container">
            <img src="image/icon/icon-512x512.png" width="200" height="200" alt="" />
        </div>
        <div class="info">
            <h1 class="ui-heading-xxl">{title}</h1>
        </div>
    </div>
</div>
