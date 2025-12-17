<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2023-2025 (original work) Open Assessment Technologies SA ;

    /**
     * Component is used to render the password page for the test.
     * @property {String} validationEndpoint endpoint for the validation request
     * @property {String} deliveryId delivery id
     * @property {Object} jwtTokenHandler handler so that the request is authorized
     */
    import { createEventDispatcher } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';
    import { Label, Input, Button } from '@oat-sa-private/ui-elements';
    import { Notification } from '@oat-sa-private/ui-components';
    import request from 'core/fetchRequest';

    export let validationEndpoint;
    export let deliveryId;
    export let jwtTokenHandler;

    let error = null;
    const dispatch = createEventDispatcher();
    async function handleSubmit({ target }) {
        error = null;
        const formData = [...new FormData(target).entries()].reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
        try {
            await request(validationEndpoint, {
                method: 'POST',
                body: JSON.stringify({
                    password: formData.password,
                    deliveryId
                }),
                headers: {
                    'Content-Type': 'application/json'
                },
                jwtTokenHandler
            });
            dispatch('success');
        } catch (e) {
            if (e.response?.status === 401) {
                error = {
                    title: __('Wrong Password.'),
                    message: __('Please try again.')
                };
            } else {
                error = {
                    title: __('Something went wrong.'),
                    message: __('Please try again.')
                };
            }
        }
    }

    let passwordInputType = 'text'; // set initial text type to prevent browser from autofilling password

    function onFocus() {
        passwordInputType = 'password';
    }
</script>

<style>
    .main {
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .password-form {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        flex-direction: column;
        width: 100%;
        margin-top: 3rem;
    }

    .password-form :global(button) {
        margin-top: 5rem;
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
        flex-direction: row;
        justify-content: center;
        height: 100%;
        align-items: stretch;
    }

    .password-card {
        background-color: white;
        height: 100%;
        display: flex;
        flex-flow: column;
        align-items: flex-start;
        justify-content: center;
        width: 70%;
    }

    .password-card :global(label),
    .error-container {
        width: 100%;
        margin-bottom: 1rem;
    }

    main {
        width: 100%;
        height: 100%;
    }

    @media only screen and (--mq-maxwidth-small) {
        .password-card {
            width: 90%;
        }
    }
</style>

<div class="layout-centered">
    <main class="main">
        <div class="container">
            <div class="password-card">
                <h3>{__('Please wait until you are given the password to begin')}</h3>
                <form
                    class="password-form"
                    on:submit|preventDefault={handleSubmit}
                    aria-live="assertive"
                    autocomplete="off">
                    {#if error}
                        <div class="error-container">
                            <Notification hierarchy="alert" title={error.title} message={error.message} />
                        </div>
                    {/if}
                    <Label fullwidth label={__('Password')}>
                        <Input
                            name="password"
                            type={passwordInputType}
                            placeholder={__('Type here')}
                            required
                            on:focus={onFocus}
                            hasIcon
                            fullwidth />
                    </Label>
                    <Button type="submit" shape="pill" size="small" label={__('Start')} />
                </form>
            </div>
        </div>
    </main>
</div>
