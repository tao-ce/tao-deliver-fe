<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';
    import { Button } from '@oat-sa-private/ui-elements';
    import { readable } from 'svelte/store';
    import { onMount, createEventDispatcher } from 'svelte';
    import { endAssessment } from '../util/endAssessment.js';

    export let waitTimeRemaining;
    export let testTitle;
    export let testTakerName;
    export let exitUrl;
    export let endAssessmentUrl;
    export let jwtTokenHandler;
    export let theme;
    export let startsAt;
    export let endsAt;
    export let locale;

    const logo = (theme && (theme.fullLogo || theme.logo)) || {
        src: 'logo.svg',
        alt: __('TAO Logo')
    };

    const { waitingPage } = theme || {};
    const { sideImage, declarationOfAvailability } = waitingPage || {};

    const dispatch = createEventDispatcher();

    const mstime = readable(new Date().getTime(), set => {
        let animationFrame;
        const next = () => {
            set(new Date().getTime());
            animationFrame = window.requestAnimationFrame(next);
        };
        if (window.requestAnimationFrame) {
            next();
            return () => cancelAnimationFrame(animationFrame);
        }
    });

    let start;
    onMount(() => {
        start = new Date().getTime();
    });

    $: timeSinceMount = $mstime - start;
    $: toWait = Math.max(waitTimeRemaining - timeSinceMount, 0);
    $: minutes = Math.floor(toWait / 1000 / 60);
    $: seconds = Math.floor(toWait / 1000 - minutes * 60);

    $: if (!toWait) {
        dispatch('timeout');
    }

    // Chrome has no `nn` locale support @see https://bugs.chromium.org/p/chromium/issues/detail?id=1215606#c63
    $: locales = [locale, locale.replace('nn', 'no')];
    $: dateTimeFormatLocale = Intl.DateTimeFormat.supportedLocalesOf(locales)[0] ?? locale;
    $: displayNameLocale = Intl.DisplayNames.supportedLocalesOf(locales)[0] ?? locale;

    function logout() {
        endAssessment({ jwtTokenHandler, exitUrl, endAssessmentUrl });
    }

    function getExamIntervalText() {
        const onlyTime = { hour: '2-digit', minute: '2-digit' };
        const onlyDate = { day: '2-digit', month: 'long' };
        const dateTime = { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' };
        const startDate = new Intl.DateTimeFormat(dateTimeFormatLocale, onlyDate).format(new Date(startsAt));
        const startTime = new Intl.DateTimeFormat(dateTimeFormatLocale, onlyTime).format(new Date(startsAt));

        if (!endsAt) {
            return __('You are enrolled in %s, %s from %s.', testTitle, startDate, startTime);
        }

        const endDate = new Intl.DateTimeFormat(dateTimeFormatLocale, onlyDate).format(new Date(endsAt));
        const endTime = new Intl.DateTimeFormat(dateTimeFormatLocale, onlyTime).format(new Date(endsAt));
        const sameDay = startDate === endDate;

        if (sameDay) {
            return __('You are enrolled in %s, %s from %s to %s.', testTitle, startDate, startTime, endTime);
        }

        return __(
            'You are enrolled in %s, from %s to %s.',
            testTitle,
            new Intl.DateTimeFormat(dateTimeFormatLocale, dateTime).format(new Date(startsAt)),
            new Intl.DateTimeFormat(dateTimeFormatLocale, dateTime).format(new Date(endsAt))
        );
    }
</script>

<style>
    .layout-centered {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .wrapper {
        max-width: 150rem;
        background-color: var(--color-bg-info);
        padding: 5rem 8rem;
        display: flex;
        flex-wrap: wrap;
        overflow: auto;
    }
    header {
        flex: 1 0 100%;
        display: flex;
        justify-content: space-between;
        height: 6rem;
        /**
         * See https://www.w3.org/TR/css-flexbox-1/ and https://stackoverflow.com/a/27474971
         * According to this flex children inside flex parents need to have some sort of definite
         * constraint, without them flexbox behaviour in Firefox will be broken
         */
        max-width: 100%;
    }

    section {
        flex: 1 0 50%;
        padding: 4rem;

        @media screen and (--mq-maxwidth-large) {
            flex-basis: 100%;
            padding: 4rem 0;
        }

        &.image-container {
            display: flex;

            & img {
                max-width: 100%;
            }
        }
    }

    article {
        background-color: white;
        padding: 4rem 4rem 2.5rem; /* 2.5 = 4rem - <p> 1.5rem margin on bottom */
        margin: 2rem 0;

        & h3 {
            margin-top: 0;
        }
    }

    .link-container a {
        color: var(--color-text-default);
        text-decoration: underline;
    }
</style>

<div class="layout-centered">
    <div class="wrapper">
        <header>
            <img src={logo.src} alt={logo.alt} />
            {#if exitUrl}
                <Button label={__('Logout')} size="small" skin="secondary" on:click={logout} />
            {/if}
        </header>
        <section>
            <h2>{__('Hello')}{testTakerName ? `, ${testTakerName}` : ''}!</h2>
            <article class="welcome">
                <h3>{__("Great! You are ready, but the exam hasn't started yet.")}</h3>
                <p>
                    {getExamIntervalText()}
                    {__('If you have extra time, it is not shown here.')}
                </p>
                <p>
                    {__(
                        'You are registered with %s as your main language. Contact a proctor if this is not correct.',
                        new Intl.DisplayNames([displayNameLocale], { type: 'language' }).of(locale)
                    )}
                </p>
            </article>
            <article class="countdown">
                <p>
                    {__('In %d minutes and %d seconds the exam will start. Good luck!', minutes, seconds)}
                </p>
            </article>
        </section>
        <section class="image-container">
            {#if sideImage}
                <img alt={sideImage.alt} src={sideImage.src} />
            {/if}
        </section>
        <div class="link-container">
            {#if declarationOfAvailability}
                <a href={declarationOfAvailability} target="about:blank">{__('Declaration of availability')}</a>
            {/if}
        </div>
    </div>
</div>
