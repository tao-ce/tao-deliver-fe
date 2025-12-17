<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2020-2022 (original work) Open Assessment Technologies SA ;
    import itemRunnerFactory from 'taoItems/runner/api/itemRunner';
    import itemSessionStatus from '../src/runner/itemSessionStatus.js';
    import samples from '../samples/index.js';
    import { Button, Textarea, Dropdown, Feedback, RadioGroup, Label, RadioSwitch } from '@oat-sa-private/ui-elements';
    import { HeaderBar, SearchableDropdown } from '@oat-sa-private/ui-components';
    import {
        DIRECTION_LTR,
        DIRECTION_RTL,
        __,
        getLanguageDirection,
        getLocaleDirection
    } from '@oat-sa-private/ui-core';
    import { getItemSessionStatusStore } from '../src/runner/itemsSessionStatusStore.js';
    import { providerName } from '../src/runner/qti.js';
    import getAssetManager from '../src/runner/asset/assetManager.js';
    import { onMount } from 'svelte';

    //this prop is passed through replace rollup plugin
    // eslint-disable-next-line no-undef
    const production = process.env.NODE_ENV === 'production';

    // elements
    let itemContainer;

    // direction
    const DIRECTION_DEFAULT = 'default';
    let dir = getLocaleDirection();

    // item data
    let itemData;
    let itemState;

    // runner instance
    let runner;
    let itemSessionStatusStore;

    // store unsubscribe
    let unsubscribe;

    //current preset
    let preset;

    //default preset
    let defaultPreset;

    let renderer = 'default';

    //locale
    const locales = {
        'ar-arb': 'ar-arb',
        'en-US': 'en-US',
        'es-ES': 'es-ES',
        'fr-FR': 'fr-FR',
        'ja-JP': 'ja-JP',
        'lt-LT': 'lt-LT',
        'nb-NO': 'nb-NO',
        'nn-NO': 'nn-NO',
        'pt-BR': 'pt-BR',
        'pt-PT': 'pt-PT',
        'se-NO': 'se-NO',
        'sma-NO': 'sma-NO',
        'smj-NO': 'smj-NO',
        'val-ES': 'val-ES'
    };
    const originalLang = document.documentElement.lang;
    let locale = null;

    // items's language
    let itemLang = null;
    let itemDir = DIRECTION_DEFAULT;

    // feedback
    let error = '';
    let feedbackTimeout;
    $: if (error) {
        console.error(error); //eslint-disable-line
        clearTimeout(feedbackTimeout);
        feedbackTimeout = setTimeout(() => {
            error = '';
        }, 3000);
    }

    const itemRunnerConfig = {
        itemStyles: '',
        elements: {
            HottextInteraction: {
                qtiClassesOverride: []
            }
        },
        options: {
            hideTooltips: false
        }
    };

    function render() {
        // parse provided item data
        let itemDataObject;
        try {
            itemDataObject = JSON.parse(itemData);
        } catch (e) {
            error = e;
            return;
        }

        // force item language when needed
        if (itemDataObject && itemDataObject.itemData) {
            if (itemLang) {
                itemDataObject.itemData.data.attributes['xml:lang'] = itemLang;
            }
            if (itemDir !== DIRECTION_DEFAULT) {
                itemDataObject.itemData.data.attributes.dir = itemDir;
            }
        }

        // initialize runner
        runner = itemRunnerFactory(providerName, itemDataObject, {
            itemRunnerConfig,
            assetManager: getAssetManager({ workerBase: 'dist/' }),
            renderer,
            itemContainerHeight: 'var(--sandbox-main-height)',
            itemContainerOffsetTop: '8rem',
            hasNotificationContainer: true,
            getAttachmentsUploadData: () =>
                Promise.resolve({
                    uploadServiceType: 'sandbox'
                })
        })
            .on('error', e => {
                error = e;
            })
            .on('render', () => {
                itemSessionStatusStore = getItemSessionStatusStore(itemDataObject.itemIdentifier);
                const interactionElements = itemContainer.querySelectorAll('.qti-interaction');
                for (const interaction of interactionElements) {
                    interaction.addEventListener('interactiontrace', ({ detail }) => {
                        // eslint-disable-next-line no-console
                        console.log('interactiontrace', detail);
                    });
                }
            })
            .on('statechange', newState => {
                itemState = JSON.stringify(newState, void 0, 4);
            })
            .init()
            .render(itemContainer);
    }

    function destroy() {
        // unsubscribe from store
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        // clear runner
        if (runner) {
            runner
                .on('clear', () => {
                    runner = null;
                })
                .clear();
        }
    }

    function setState() {
        if (runner) {
            runner.setState(JSON.parse(itemState));
        }
    }

    // panel resizing
    let setupPanelWidth = 400;
    let xOffset = 0;
    let resizing = false;
    let startWidth;

    function dragStart(e) {
        e.preventDefault();
        xOffset = e.pageX;
        startWidth = setupPanelWidth;
        resizing = true;
    }

    function pointerMove(e) {
        if (e.buttons !== 1) {
            resizing = false;
            return;
        }
        setupPanelWidth = Math.max(e.pageX - xOffset + startWidth, 200);
    }

    // preset loader
    function loadPreset(e) {
        preset = e.detail.key;
        if (preset) {
            itemData = JSON.stringify(samples[preset].itemData, void 0, 4);
        } else {
            itemData = '';
        }
    }

    /**
     * Handles default item checkbox change
     * @param {CustomEvent} e
     */
    function handleDefaultPresetChange(e) {
        if (e.target.checked) {
            sessionStorage.setItem('defaultPreset', preset);
        } else {
            sessionStorage.removeItem('defaultPreset');
        }
    }

    let showSetupPanel = true;
    function handleHeaderBarAction(e) {
        if (e.detail.key === 'menu') {
            showSetupPanel = !showSetupPanel;
        }
    }

    function suspend() {
        if (runner) {
            runner.suspend();
        }
    }
    function close() {
        if (runner) {
            runner.close();
        }
    }
    function resume() {
        if (runner) {
            runner.resume();
        }
    }

    //Locale change
    function handleLocaleChange(e) {
        locale = e.detail.value;
        if (locale) {
            import(`../locale/${locale}/messages.json`)
                .then(dictionaryModule => dictionaryModule.default)
                .then(messages => {
                    if (locale === e.detail.value) {
                        __.setDictionary(locale, messages);
                        dir = getLocaleDirection();
                        document.documentElement.lang = locale;
                    }
                });
        } else {
            __.setDictionary(null, {});
            dir = getLocaleDirection();
            document.documentElement.lang = originalLang;
        }
    }
    function handleItemLocaleChange(e) {
        itemLang = e.detail.value;
        if (itemLang) {
            itemDir = getLanguageDirection(itemLang);
        } else {
            itemDir = DIRECTION_DEFAULT;
        }
    }

    onMount(() => {
        defaultPreset = sessionStorage.getItem('defaultPreset');
        if (defaultPreset && samples[defaultPreset]) {
            preset = defaultPreset;
            itemData = JSON.stringify(samples[defaultPreset].itemData, void 0, 4);
            setTimeout(render, 100);
        }
    });

    function extractKeywords(sampleValue) {
        const { meta } = sampleValue;
        if (!meta) return '';
        const { interactions, features, i18n } = meta;
        return [interactions, features, i18n].filter(s => s?.length).join(' ');
    }

    function labelWithKeywords({ label, keywords }) {
        return `${label} [${keywords}]`;
    }
</script>

<style>
    main {
        --sandbox-main-height: calc(100vh - 8rem);

        height: var(--sandbox-main-height);
        position: relative;
        overflow-y: hidden;
        display: flex;

        & .item-setup {
            flex: 0 0 var(--setup-panel-width);
            background-color: rgb(244, 247, 252);
            padding: 2rem 1rem 2rem 2rem;
            overflow-y: auto;
            height: 100%;

            & .section {
                padding-top: 2rem;
            }

            & :global(textarea) {
                resize: vertical;
            }

            & .sandbox-tools {
                padding-top: 2rem;
            }

            & :global(label:not(.radio-label)) {
                padding-top: 2rem;
            }
            & :global(.radioSwitch label) {
                padding-top: 0.25rem;
            }
        }

        & .resizer {
            flex: 0 0 0.5rem;
            cursor: col-resize;
            box-shadow: inset -0.5rem 0 0.5rem 0 rgba(0, 0, 0, 0.3);
        }

        & .scroll-container {
            overflow: auto;
            flex-grow: 1;
        }
    }

    .feedback {
        position: absolute;
        top: 6rem;
        left: 50%;
        width: 50%;
        transform: translateX(-50%);
        z-index: var(--layer-5);
    }

    :global(.headerbar) {
        border-bottom: var(--border-thin) solid var(--color-gs-light-secondary);
    }

    .label {
        margin: 0 var(--space-1x) var(--space-1x) 0;
        font-size: var(--fontsize-heading);
        font-weight: 700;
    }
</style>

<svelte:body on:pointermove={e => resizing && pointerMove(e)} />

<HeaderBar
    logoSrc="./logo.svg"
    startActions={[{ key: 'menu', icon: 'menu', label: 'Menu' }]}
    on:action={handleHeaderBarAction}>
    <h3>QTI Item Runner Sandbox</h3>
</HeaderBar>
<main>
    {#if error}
        <div class="feedback">
            <Feedback status="warning" fullwidth content={error} />
        </div>
    {/if}
    <section
        class="item-setup"
        class:hidden={!showSetupPanel}
        style="--setup-panel-width: {setupPanelWidth}px"
        data-theme="default">
        <span class="label">Renderer</span>
        <RadioGroup
            options={{ common: 'Common', review: 'Review' }}
            value="common"
            layout="grid"
            on:change={e => {
                renderer = e.detail.value;
            }} />
        <SearchableDropdown
            value={preset}
            options={Object.entries(samples).map(([presetKey, presetValue]) => ({
                key: presetKey,
                label: presetValue.label,
                data: presetValue.data,
                keywords: extractKeywords(presetValue)
            }))}
            optionLabel={labelWithKeywords}
            trackBy="key"
            placeholder="Select preset"
            disabled={runner}
            fullwidth
            on:change={loadPreset}>
            <span slot="singleLabel">
                <strong>{samples[preset].label}</strong>
            </span>
        </SearchableDropdown>
        <div class="item-data section">
            <div>
                <Textarea bind:value={itemData} rows={4} disabled={runner} fullwidth label="Item data" />
                {#if !$itemSessionStatusStore || $itemSessionStatusStore === itemSessionStatus.initial}
                    <Button
                        on:click={render}
                        size="small"
                        disabled={!itemData || runner}
                        label="Render"
                        icon="submit-16" />
                {:else if runner}
                    <Button on:click={destroy} size="small" label="Destroy" icon="remove-16" />

                    {#if $itemSessionStatusStore === itemSessionStatus.suspended || $itemSessionStatusStore === itemSessionStatus.closed}
                        <Button on:click={resume} size="small" label="Resume" icon="play-16" skin="secondary" />
                    {:else}
                        <Button
                            on:click={suspend}
                            size="small"
                            label="Suspend"
                            icon="pause-16"
                            skin="secondary"
                            disabled={$itemSessionStatusStore !== itemSessionStatus.interacting} />
                    {/if}

                    <Button
                        on:click={close}
                        size="small"
                        label="Close"
                        icon="finish-16"
                        skin="secondary"
                        disabled={$itemSessionStatusStore !== itemSessionStatus.interacting} />
                {/if}
            </div>
            {#if preset && !production}
                <div>
                    Autorender
                    {samples[preset] ? samples[preset].label : ''}
                    <input
                        type="checkbox"
                        value={preset}
                        on:change={handleDefaultPresetChange}
                        disabled={!preset}
                        checked={!!defaultPreset} />
                </div>
            {/if}
            <div>Session state <strong>{$itemSessionStatusStore}</strong></div>
        </div>
        <div class="item-state section">
            <Textarea bind:value={itemState} rows={4} disabled={!runner} fullwidth label="Item state" />
            <Button on:click={setState} size="small" disabled={!itemData || !runner} label="Set state" />
        </div>
        <div class="sandbox-tools section">
            <Label label="User's locale" fullwidth>
                <Dropdown options={locales} value={locale} on:change={handleLocaleChange} reset={true} height="small" />
                <RadioSwitch
                    bind:value={dir}
                    options={[
                        { value: DIRECTION_LTR, label: 'LTR' },
                        { value: DIRECTION_RTL, label: 'RTL' }
                    ]} />
            </Label>
            <Label label="Item's locale" fullwidth>
                <Dropdown
                    options={locales}
                    value={itemLang}
                    on:change={handleItemLocaleChange}
                    reset={true}
                    height="small" />
                <RadioSwitch
                    bind:value={itemDir}
                    options={[
                        { value: DIRECTION_LTR, label: 'LTR' },
                        { value: DIRECTION_RTL, label: 'RTL' },
                        { value: DIRECTION_DEFAULT, label: 'default' }
                    ]} />
            </Label>
        </div>
    </section>
    <div class="resizer" class:hidden={!showSetupPanel} on:mousedown={dragStart} />
    <section class="scroll-container">
        <section bind:this={itemContainer} class="item-container" {dir} />
    </section>
</main>
