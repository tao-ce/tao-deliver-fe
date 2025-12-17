<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;

    /**
     * Component is used to render the language selection page for the test.
     * @property {String} submitSelectionEndpoint endpoint for the language selection request
     * @property {String} defaultLocale default locale for the select input
     * @property {String[]} supportedLocales array of supported locales
     * @property {Object} jwtTokenHandler handler so that the request is authorized
     */
    import { createEventDispatcher } from 'svelte';
    import { __, getLanguageNativeName } from '@oat-sa-private/ui-core';
    import { Button, Dropdown } from '@oat-sa-private/ui-elements';
    import { Notification } from '@oat-sa-private/ui-components';
    import request from 'core/fetchRequest';

    export let submitSelectionEndpoint;
    export let defaultLocale;
    export let supportedLocales = [];
    export let jwtTokenHandler;

    const languages = supportedLocales.reduce((prev, next) => {
        const languageNativeName = getLanguageNativeName(next);
        if (languageNativeName) {
            prev[next] = languageNativeName;
        }
        return prev;
    }, {});

    let error = null;
    let buttonDisabled = false;
    let selectedLocale = languages[defaultLocale] ? defaultLocale : supportedLocales[0];

    const dispatch = createEventDispatcher();

    async function handleClick() {
        buttonDisabled = true;
        error = null;
        try {
            await request(submitSelectionEndpoint, {
                method: 'PUT',
                body: JSON.stringify({
                    locale: selectedLocale
                }),
                headers: {
                    'Content-Type': 'application/json'
                },
                jwtTokenHandler
            });
            dispatch('selected', { selectedLocale });
        } catch (e) {
            error = {
                title: __('Something went wrong.'),
                message: __('Please try again.')
            };
        } finally {
            buttonDisabled = false;
        }
    }
</script>

<style>
    main.main {
        width: 100%;
        height: 100%;

        display: flex;
        justify-content: center;
        align-items: center;
    }

    .layout-centered {
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
        background-size: cover;
    }

    .container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
        align-items: center;
    }

    .form-container {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .error-container {
        width: 100%;
        margin-bottom: 1rem;
    }
</style>

<div class="layout-centered">
    <main class="main">
        <div class="container">
            <h3>{__('Please select a language')}</h3>
            {#if error}
                <div class="error-container">
                    <Notification hierarchy="alert" title={error.title} message={error.message} />
                </div>
            {/if}
            <div class="form-container">
                <Dropdown
                    value={selectedLocale}
                    options={languages}
                    required={true}
                    reset={false}
                    on:change={e => {
                        selectedLocale = e.detail.value;
                    }} />
                <Button
                    shape="pill"
                    size="small"
                    label={__('Select')}
                    on:click={handleClick}
                    disabled={buttonDisabled} />
            </div>
        </div>
    </main>
</div>
