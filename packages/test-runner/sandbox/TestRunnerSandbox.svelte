<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2020-2025 (original work) Open Assessment Technologies SA ;
    import {
        Button,
        Checkbox,
        Textarea,
        Dropdown,
        Feedback,
        Label,
        RadioSwitch,
        RadioGroup
    } from '@oat-sa-private/ui-elements';
    import { onMount } from 'svelte';
    import presets from './presets/index.js';
    import PresetSocketProxyControls from './PresetSocketProxyControls.svelte';
    import testRunnerFactory from 'taoTests/runner/runner.js';
    import {
        DIRECTION_LTR,
        DIRECTION_RTL,
        __,
        getLanguageDirection,
        getLocaleDirection
    } from '@oat-sa-private/ui-core';
    import {
        titlePlugin,
        menuPanelPlugin,
        a11yMenuPanelPlugin,
        settingsPlugin,
        jumpMenuPlugin,
        navigatorPlugin,
        areaHiderPlugin,
        reviewNavigatorPlugin,
        localItemStatePlugin,
        scratchpadPlugin,
        highlighterPlugin,
        readAloudPlugin,
        lineReaderPlugin,
        fullscreenPlugin,
        calculatorPlugin,
        printPlugin,
        eventsForwarderPlugin,
        proctoringPlugin,
        lifecycleEventsPlugin,
        anchorBaseUrlConverterPlugin,
        PCINavigationHelperPlugin,
        bookletExportPlugin,
        inlineCommentsPlugin,
        preventDropToInputPlugin,
        attachmentsPlugin
    } from '../src/runner/plugins';
    import { timers } from './mswMocks/timersBackend.js';

    // elements
    let testContainer;
    let testRunner;

    // sandbox config
    const themes = {
        default: 'default',
        dark: 'dark',
        funky: 'funky',
        'neon-dark': 'neon-dark'
    };
    const DIRECTION_DEFAULT = 'default';
    const locales = {
        'ar-arb': 'ar-arb',
        'en-US': 'en-US',
        'es-ES': 'es-ES',
        'ja-JP': 'ja-JP',
        'lt-LT': 'lt-LT',
        'nb-NO': 'nb-NO',
        'nn-NO': 'nn-NO',
        'pt-BR': 'pt-BR',
        'se-NO': 'se-NO',
        'sma-NO': 'sma-NO',
        'smj-NO': 'smj-NO'
    };
    const defaultPluginsConfig = {
        localItemState: {
            saveState: {
                enabled: true,
                minWait: 2000,
                maxWait: 5000,
                liveSaveIndicator: {
                    enabled: true
                }
            }
        },
        a11yMenuPanel: {
            convertPxToRem: {
                enabled: true,
                cssProperties: ['font-size']
            }
        },
        readAloud: {
            // providerId can be manually set to 'texthelp' or 'readweb', and the providerConfig adapted to match
            // If using 'texthelp', sandbox must be reconfigured to run on localhost:5400 as this is the supported domain/port
            providerId: 'native',
            providerConfig: {
                ignoreSelector: '.do-not-read, #test-navigation button'
            }
        },
        inlineComments: {
            mode: ['read', 'write']
        }
    };
    const launchModes = {
        delivery: 'delivery',
        review: 'review',
        reviewAllInOne: 'reviewAllInOne',
        export: 'export'
    };
    const originalLang = document.documentElement.lang;

    let theme = 'default';
    let dir = getLocaleDirection();
    let locale = null;
    let itemLang = null;
    let itemDir = DIRECTION_DEFAULT;

    //this prop is passed through replace rollup plugin
    // eslint-disable-next-line no-undef
    const production = process.env.NODE_ENV === 'production';

    // test data
    let preset;
    let defaultPreset;
    let testContext;
    let testMap;
    let pluginsConfig;
    let timer;
    let testContextString = '';
    let testMapString = '';
    let pluginsConfigString = JSON.stringify(defaultPluginsConfig, null, 2);
    let timerString = '';
    let liteMode = false;
    let launchMode = launchModes.delivery;
    let preserveServiceCallId = false;

    // sandbox error feedback
    let feedback;
    let feedbackTimeout;
    $: if (feedback) {
        if (feedback.status === 'warning') {
            console.error(feedback.content); //eslint-disable-line
        }
        clearTimeout(feedbackTimeout);
        feedbackTimeout = setTimeout(() => {
            feedback = null;
        }, 4000);
    }

    function getPlugins() {
        let plugins;

        if (launchMode === launchModes.review) {
            plugins = [
                titlePlugin,
                menuPanelPlugin,
                reviewNavigatorPlugin,
                jumpMenuPlugin,
                highlighterPlugin,
                inlineCommentsPlugin
            ];
        } else if (launchMode === launchModes.reviewAllInOne) {
            plugins = [jumpMenuPlugin, highlighterPlugin, inlineCommentsPlugin];
        } else if (launchMode === launchModes.export) {
            plugins = [bookletExportPlugin, reviewNavigatorPlugin];
        } else {
            plugins = [
                titlePlugin,
                menuPanelPlugin,
                jumpMenuPlugin,
                navigatorPlugin,
                areaHiderPlugin,
                localItemStatePlugin,
                settingsPlugin,
                scratchpadPlugin,
                highlighterPlugin,
                readAloudPlugin,
                lineReaderPlugin,
                fullscreenPlugin,
                calculatorPlugin,
                printPlugin,
                eventsForwarderPlugin,
                proctoringPlugin,
                lifecycleEventsPlugin,
                anchorBaseUrlConverterPlugin,
                a11yMenuPanelPlugin,
                PCINavigationHelperPlugin,
                preventDropToInputPlugin,
                attachmentsPlugin
            ];
        }

        return plugins;
    }

    function getReviewModeOptions() {
        if (launchMode === launchModes.review) {
            return {
                showCorrect: true,
                showScore: true,
                showQuestion: true,
                showResponse: true
            };
        } else if (launchMode === launchModes.reviewAllInOne) {
            return {
                showCorrect: false,
                showScore: false,
                showQuestion: false,
                showResponse: true,
                allInOne: true
            };
        }
    }

    function getQtiName() {
        if (launchMode === launchModes.review || launchMode === launchModes.reviewAllInOne) {
            return 'qtinuiReview';
        } else if (launchMode === launchModes.export) {
            return 'qtinuiExport';
        } else {
            return 'qtinui';
        }
    }

    function render() {
        // parse provided testContext & testMap
        try {
            testContext = JSON.parse(testContextString);
            testMap = JSON.parse(testMapString);

            pluginsConfig = JSON.parse(pluginsConfigString);
            timer = timerString ? JSON.parse(timerString) : void 0;
        } catch (err) {
            feedback = {
                type: 'warning',
                content: err
            };
            return;
        }
        timers.setTimersData(timer || {});
        testRunner = testRunnerFactory(getQtiName(), getPlugins(), {
            staticUrl: './dist',
            serviceCallId: `test-session-id-${preserveServiceCallId ? '' : Date.now()}`,
            renderTo: testContainer,
            proxy: 'preset',
            preset,
            testMap,
            testContext,
            timer,
            deliveryExecutionId: `delivery-execution-id-${preserveServiceCallId ? '' : Date.now()}`,
            jwtTokenHandler: { getToken: () => Promise.resolve() },
            options: {
                liteMode,
                itemRunnerConfig: {
                    options: {
                        hideTooltips: false
                    },
                    elements: {
                        HottextInteraction: {
                            qtiClassesOverride: []
                        },
                        ExtendedTextInteraction: {
                            propertyOverride: {
                                uploadMaxSize: 1000000,
                                uploadTimeout: 300000
                            }
                        }
                    }
                },
                review: getReviewModeOptions(),

                plugins: pluginsConfig,
                realTimeService: {
                    enabled: true,
                    socketConnectionUrl: 'wss://localhost:5500'
                },
                timersService: {
                    throttleConfig: {
                        minutesThreshold: 10
                    }
                }
            },
            testTaker: {
                id: 'sandbox-taker',
                name: 'Sandbox Taker',
                firstName: null,
                lastName: null
            },
            themes: {
                testRunner: {
                    showUserMenu: true
                }
            }
        })
            .on('loaditem', (ref, itemDataObject) => {
                if (!itemDataObject || !itemDataObject.itemData) {
                    return;
                }

                if (itemLang) {
                    itemDataObject.itemData.data.attributes['xml:lang'] = itemLang;
                }
                if (itemDir !== DIRECTION_DEFAULT) {
                    itemDataObject.itemData.data.attributes.dir = itemDir;
                }
            })
            .on('testreset', () => {
                if (timers.running) {
                    timers.stop();
                }
                destroy();
                render();
            })
            .on('finish', () => {
                feedback = {
                    status: 'info',
                    content: 'Test finished'
                };
                if (timers.running) {
                    timers.stop();
                }
            })
            .on('destroy', () => {
                if (timers.running) {
                    timers.stop();
                }
            })
            .on('error', err => {
                feedback = {
                    status: 'warning',
                    content: err
                };
            });

        testRunner.init();
    }

    function destroy() {
        if (testRunner) {
            testRunner.itemRunner?.clear();
            testRunner.destroy();
            testRunner = null;
        }
    }

    // panel resizing
    let setupPanelWidth = 460;
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
        setupPanelWidth = Math.max(e.pageX - xOffset + startWidth, 460);
    }

    // preset loader
    function loadPreset(e) {
        preset = e.detail.value;
        // Load/unload real values
        if (preset) {
            sessionStorage.setItem('defaultPreset', preset);
            ({ testContext, testMap, timer } = presets[preset].test);
        } else {
            sessionStorage.removeItem('defaultPreset');
            testContext = {};
            testMap = {};
            timer = void 0;
        }
        // Regenerate editable text values
        testContextString = JSON.stringify(testContext || {}, void 0, 2);
        testMapString = JSON.stringify(testMap || {}, void 0, 2);
        timerString = timer ? JSON.stringify(timer, void 0, 2) : '';
    }

    /**
     * Handles default item checkbox change
     * @param {CustomEvent} e
     */
    function handleDefaultPresetChange(e) {
        if (e.target.checked) {
            sessionStorage.setItem('defaultPreset', preset);
            sessionStorage.setItem('liteMode', liteMode);
        } else {
            sessionStorage.removeItem('defaultPreset');
            sessionStorage.removeItem('liteMode');
        }
    }

    let showSetupPanel = true;
    let showSocketProxy = false;

    function handleWindowKeydown(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            toggleSetupPanel();
        }
    }
    // Sandbox panel toggler
    function toggleSetupPanel() {
        showSetupPanel = !showSetupPanel;
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

    function togglePreserveServiceCallId(e) {
        preserveServiceCallId = e.target.checked;
        sessionStorage.setItem('preserveServiceCallId', preserveServiceCallId);
    }

    onMount(() => {
        preserveServiceCallId = sessionStorage.getItem('preserveServiceCallId') === 'true';
        defaultPreset = sessionStorage.getItem('defaultPreset');
        if (defaultPreset && presets[defaultPreset]) {
            preset = defaultPreset;
            loadPreset({ detail: { value: preset } });
            liteMode = sessionStorage.getItem('liteMode') === 'true';
            setTimeout(render, 100);
        }
    });
</script>

<style>
    :global(body) {
        height: 100%;
    }
    #test-runner-sandbox {
        height: 100%;
        position: relative;
        overflow-y: hidden;
        display: flex;

        & .sandbox-setup {
            z-index: 1000; /*above modal feedback*/
            flex: 0 0 var(--setup-panel-width);
            background-color: var(--color-brand-light);
            height: 100%;
            position: relative;

            & .sandbox-setup-content {
                padding: 2rem;
                overflow-y: scroll;
                height: 100%;
                color: var(--color-text-default);
                background-color: var(--color-brand-light);

                & :global(.radio-group.grid) {
                    --options-distance: 1rem;
                }

                & .sandbox-data {
                    margin-bottom: 2rem;

                    & :global(textarea) {
                        resize: vertical;
                        font-family: var(--font-monospace);
                    }
                }

                & :global(label) {
                    padding-top: 2rem;
                }
                & :global(.radioSwitch label) {
                    padding-top: 0.25rem;
                }
                & :global(textarea) {
                    background: var(--color-bg-default);
                }
                & :global(.radio-label) {
                    padding-block: 0 1rem;
                }

                & .autorender {
                    padding-top: 1rem;
                }
            }

            & .resizer {
                position: absolute;
                top: 0;
                bottom: 0;
                right: 0;
                width: 1rem;
                cursor: ew-resize;
                box-shadow: inset -0.5rem 0 0.5rem 0 rgba(0, 0, 0, 0.3);
            }
        }

        & .test-container {
            flex: 1 1 auto;
            max-width: 100%;
            overflow: auto;
            position: relative;
        }

        & :global(.presetsocket-setup) {
            position: absolute;
            bottom: 0;
            left: var(--setup-panel-width);
            width: 350px;
            z-index: 1000; /*above modal feedback*/
        }
    }
    .feedback {
        position: absolute;
        top: 6rem;
        left: 50%;
        width: 50%;
        transform: translateX(-50%);
        z-index: var(--layer-2);
    }

    @media print {
        :global(html),
        :global(body),
        #test-runner-sandbox,
        #test-runner-sandbox .test-container {
            height: auto;
            overflow: visible;
        }
    }
</style>

<svelte:window on:keydown={handleWindowKeydown} />

<svelte:body on:pointermove={e => resizing && pointerMove(e)} />

<div id="test-runner-sandbox">
    <!-- data-theme should ideally go on body -->
    {#if showSetupPanel}
        <section class="sandbox-setup" style="--setup-panel-width: {setupPanelWidth}px">
            <div class="sandbox-setup-content" data-theme="default">
                <p class="ui-heading-l">TAO Test Runner Sandbox</p>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <p class="text-xs" on:click={toggleSetupPanel}>
                    <em> <kbd>Esc</kbd> or Click here to hide/show this panel </em>
                </p>
                <RadioGroup
                    options={{
                        [launchModes.delivery]: 'Delivery',
                        [launchModes.review]: 'Review',
                        [launchModes.reviewAllInOne]: 'Review all-in-one',
                        [launchModes.export]: 'Export'
                    }}
                    disabled={testRunner}
                    value={launchMode}
                    layout="grid"
                    gridProps={{ colNum: 2 }}
                    on:change={e => {
                        launchMode = e.detail.value;
                    }} />
                <label> <input type="checkbox" bind:checked={liteMode} disabled={testRunner} /> Lite mode </label>
                <label>
                    <input
                        type="checkbox"
                        checked={preserveServiceCallId}
                        on:change={togglePreserveServiceCallId}
                        disabled={testRunner} />
                    Preserve serviceCallId
                </label>
                <Label label="Test Preset" fullwidth>
                    <Dropdown
                        options={Object.keys(presets).map(presetName => ({
                            key: presetName,
                            label: presets[presetName].label
                        }))}
                        visibleOptions={10}
                        placeholder="Select preset"
                        disabled={testRunner}
                        fullwidth
                        on:change={loadPreset}
                        value={preset} />
                </Label>
                {#if preset && !production}
                    <div class="autorender">
                        Autorender
                        {presets[preset] ? presets[preset].label : ''}
                        {liteMode ? ' in lite mode' : ''}
                        <input
                            type="checkbox"
                            value={preset}
                            on:change={handleDefaultPresetChange}
                            disabled={!preset}
                            checked={!!defaultPreset} />
                    </div>
                {/if}
                <Button
                    on:click={render}
                    size="small"
                    disabled={!testContext || !testMap || testRunner}
                    label="Render" />
                <Button on:click={destroy} size="small" disabled={!testRunner} label="Destroy" />
                <div class="sandbox-data">
                    <Textarea
                        bind:value={testContextString}
                        rows={8}
                        disabled={testRunner}
                        fullwidth
                        label="Test Context" />
                    <Textarea bind:value={testMapString} rows={8} disabled={testRunner} fullwidth label="Test Map" />
                    <Textarea
                        bind:value={pluginsConfigString}
                        rows={8}
                        disabled={testRunner}
                        fullwidth
                        label="Plugins Config" />
                </div>
                <div class="sandbox-tools">
                    <Label label="Theme" fullwidth>
                        <Dropdown options={themes} bind:value={theme} reset={false} height="small" fullwidth />
                    </Label>
                    <Label label="User's locale" fullwidth>
                        <Dropdown
                            options={locales}
                            value={locale}
                            on:change={handleLocaleChange}
                            reset={true}
                            height="small" />
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
                    <p>
                        <Checkbox bind:checked={showSocketProxy} label="Show socket proxy controls" />
                    </p>
                </div>
            </div>
            <div class="resizer" on:mousedown={dragStart} />
            {#if showSocketProxy}
                <PresetSocketProxyControls on:close={() => (showSocketProxy = false)} />
            {/if}
        </section>
    {/if}
    <div bind:this={testContainer} class="test-container" {dir}>
        {#if feedback}
            <div class="feedback">
                <Feedback {...feedback} fullwidth />
            </div>
        {/if}
    </div>
</div>
