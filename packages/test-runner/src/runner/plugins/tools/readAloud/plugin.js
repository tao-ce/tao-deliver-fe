// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import pluginFactory from 'taoTests/runner/plugin';
import ReadAloudBar from './ReadAloudBar.svelte';
import { actionKeys } from './readAloudActionKeys.js';
import { getItemProperty } from '../../../util/testMap.js';
import getReadAloudClient from '@oat-sa-private/read-aloud-client';
import { pitches, speeds, volumes } from '@oat-sa-private/read-aloud-client/lib/preferences.js';
import toolsStoreHandler from '../util/toolsStoreHandler.js';
import settingsKeys from '../../settings/settingsKeys.js';
import { getToolbarButtonElement, isMutuallyExclusiveTool } from '../../../layout/toolbarItems.js';
import { showNotification } from '@oat-sa-private/ui-components';
import { __ } from '@oat-sa-private/ui-core';
import queueFactory from '../../integration/eventsForwarder/queue.js';
import { defaultsDeep } from 'lodash';

// can be found on an AssessmentItemRef (testMap item)
const ttsCategoryNames = ['x-tao-option-tts', 'x-tao-option-textToSpeech'];
const hasCategory = category => ttsCategoryNames.includes(category);

const defaultIgnoredElements = '.visually-hidden, .hidden, .do-not-read';
const mathOverrideIgnoredElements = 'mjx-container';

const defaultConfig = {
    providerId: 'native',
    providerConfig: {},
    overrideMathExpr: {
        enabled: true
    },
    eventLog: {
        enabled: true
    },
    hideVoiceGender: false
};

const defaultPreferences = {
    speed: speeds.normal,
    pitch: pitches.medium,
    volume: volumes.medium,
    autoscroll: true
};

/**
 * the readAloud plugin allows to read aloud the item content
 */
export default pluginFactory({
    name: 'readAloud',

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        const areaBroker = this.getAreaBroker();

        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        const pluginConfig = defaultsDeep({}, providedConfig, defaultConfig);
        this.setConfig(pluginConfig);

        /**
         * toolsStore['readAloud']: {
         *   enabled, // always true
         *   visible, // value depends on item categories
         *   open, // when toolbar opened
         *   settingsOpen, // == this.settingsOpen
         *   toolState: { //  == this.readAloudToolState
         *     voice,
         *     speed,
         *     pitch
         *   }
         * }
         */
        this.toolsStoreHandler = toolsStoreHandler(testConfig.serviceCallId, this.getName()); // preferred

        /**
         * Initialized read aloud client
         */
        this.client = null;

        /**
         * Toolbar component, if mounted
         * @type {Object|null}
         */
        this.toolbar = null;

        /**
         * Is 'playOnClick' feature on/off (given by the provider's constraints)
         * @type {Boolean}
         */
        this.clickToSpeakEnable = false;

        /**
         * toggled state of 'playOnClick' button
         * @type {Boolean}
         */
        this.playOnClickToggled = false;

        /**
         * reflect's provider's internal toggleClickToSpeak status
         * @type {boolean}
         */
        this.playOnClickWasActivated = false;

        /**
         * playing state of 'playOnClick' function
         * @type {Boolean}
         */
        this.playOnClickPlaying = false;

        /**
         * toggled state of 'playSelection' button
         * @type {Boolean}
         */
        this.playSelectionToggled = false;

        /**
         * playing state of 'playSelection' function
         * @type {Boolean}
         */
        this.playSelectionPlaying = false;

        /**
         * playing state of 'playAll' function
         * @type {Boolean}
         */
        this.playAllPlaying = false;

        /**
         * drawer state
         * @type {Boolean}
         */
        this.settingsOpen = false;

        /**
         * Constraints: object of supported features, from read-aloud-client provider
         * @type {Object}
         */
        this.readAloudConstraints = {};

        /**
         * The ReadAloud tool's state (voice, speed, pitch) - settable by UI
         * @type {Object}
         * @property {string} [voice]
         * @property {string} [speed]
         * @property {string} [pitch]
         */
        this.readAloudToolState = {};

        /**
         * disabled state of toolbar
         * @type {Boolean}
         */
        this.toolbarDisabled = true; // provider must load and an item must render, to enable toolbar

        /**
         * Handle when a selection is made.
         * Causes playing to start if the 'playSelection' button is in toggled state.
         */
        let timeoutId;

        this.setMathOverride = () => {
            if (pluginConfig.overrideMathExpr?.enabled) {
                const container = areaBroker.getContentArea().querySelector('.qti-item');
                if (container) {
                    for (const el of container.querySelectorAll('mjx-container')) {
                        if (!el.previousElementSibling?.matches('.tts-math-placeholder')) {
                            const spanEl = document.createElement('span');
                            spanEl.textContent = __('Look at the formula.');
                            spanEl.classList.add('tts-math-placeholder');
                            el.parentElement.insertBefore(spanEl, el);
                        }
                    }
                }
            }
        };

        /**
         * Handle when the document's text selection changes
         */
        const handleSelectionChange = () => {
            if (window.getSelection().isCollapsed) {
                return;
            }
            clearTimeout(timeoutId);
            //debounce event handling, because it is fired on any letter selection
            timeoutId = setTimeout(() => {
                if (this.isSelectionNotEmpty()) {
                    this.playSelectionPlaying = true;
                    this.playSelectionToggled = false;
                    this.syncToolbarProps();
                    this.removeSelectionChangeListener();
                    this.eventsQueueEnqueue('selectionchange', {
                        type: 'playSelection',
                        selection: window.getSelection().toString().slice(0, 500)
                    });
                    this.setMathOverride();
                    this.client.playSelection();
                }
            }, 500);
        };

        /**
         * Handle click on 'playOnClick' toolbar button
         */
        const handlePlayOnClickAction = () => {
            // stop playing other modes
            if (this.playSelectionPlaying || this.playAllPlaying) {
                this.client.stop();
                this.playAllPlaying = false;
                this.playSelectionPlaying = false;
                this.enqueueStop('click');
            }
            this.playSelectionToggled = false;

            if (this.playOnClickToggled && this.playOnClickPlaying) {
                // stop playback, keep the mode activated, keep the button toggled on
                this.playOnClickPlaying = false;
                this.client.stop();
                this.enqueueStop('click');
            } else if (this.playOnClickToggled) {
                // toggle the button off, deactivate the mode, clean up listeners
                this.playOnClickToggled = false;
                if (this.playOnClickWasActivated) {
                    this.playOnClickWasActivated = this.client.toggleClickToSpeak();
                }
                this.removeItemClickListener();
                this.removeForbiddenElementsListeners();
                this.enqueueStop('click');
            } else {
                // toggle the button on, add listeners
                // activation of the client.clickToSpeak mode needs to wait until user clicks
                this.playOnClickToggled = true;
                this.addItemClickListener();
                this.addForbiddenElementsListeners();
            }

            this.syncToolbarProps();
        };

        /**
         * Handle click on 'playSelection' toolbar button
         */
        const handlePlaySelectionAction = () => {
            // stop playing
            if (this.playAllPlaying) {
                this.playAllPlaying = false;
                this.client.stop();
                this.enqueueStop('click');
            }

            if (this.playSelectionPlaying) {
                this.playSelectionPlaying = false;
                this.playSelectionToggled = false;
                this.syncToolbarProps();
                this.client.stop();
                this.enqueueStop('click');
                return;
            }

            // toggle button off, or start playing selection, or wait for selection
            if (this.playSelectionToggled) {
                this.playSelectionToggled = false;
                this.removeSelectionChangeListener();
            } else {
                if (this.isSelectionNotEmpty()) {
                    this.playSelectionPlaying = true;
                    this.eventsQueueEnqueue('click', {
                        type: 'playSelection',
                        selection: window.getSelection().toString()
                    });
                    this.setMathOverride();
                    this.client.playSelection();
                } else {
                    this.playSelectionToggled = true;
                    document.addEventListener('selectionchange', handleSelectionChange);
                }
            }

            this.syncToolbarProps();
        };

        /**
         * Handle click on 'playAll' toolbar button
         */
        const handlePlayAllAction = () => {
            this.removeSelectionChangeListener();
            //remove text selection
            window.getSelection().removeAllRanges();

            // stop playSelection and playOnClick
            if (this.playSelectionPlaying) {
                this.playSelectionPlaying = false;
                this.client.stop();
                this.enqueueStop();
            }
            this.playSelectionToggled = false;

            if (this.playOnClickPlaying) {
                this.playOnClickPlaying = false;
                this.client.stop();
                this.enqueueStop();
            }
            if (this.playOnClickToggled) {
                this.playOnClickToggled = false;

                if (this.playOnClickWasActivated) {
                    this.playOnClickWasActivated = this.client.toggleClickToSpeak();
                }
                this.removeItemClickListener();
                this.removeForbiddenElementsListeners();
            }

            // start or stop playAll
            if (!this.playAllPlaying) {
                const itemEl = areaBroker.getContentArea().querySelector('.qti-item');
                if (itemEl) {
                    this.playAllPlaying = true;
                    this.setMathOverride();
                    this.client.play(itemEl);
                    this.eventsQueueEnqueue('click', {
                        type: 'playAll'
                    });
                }
            } else {
                this.playAllPlaying = false;
                this.client.stop();
                this.enqueueStop('click');
            }

            this.syncToolbarProps();
        };

        /**
         * Reset any speech mode which was activated
         */
        this.resetModes = () => {
            if (this.client && this.playOnClickWasActivated) {
                this.playOnClickWasActivated = this.client.toggleClickToSpeak();
            }
        };

        /**
         * Reset button states to initial values
         * Props are not synced to toolbar, call syncToolbarProps() afterwards if needed
         */
        this.resetButtons = () => {
            this.playOnClickPlaying = false;
            this.playOnClickToggled = false;
            this.playSelectionPlaying = false;
            this.playSelectionToggled = false;
            this.playAllPlaying = false;
        };

        /**
         * Handle a click on any part of the item (playOnClick mode)
         * @param {Event} e - The event object that triggered the click handler.
         */
        const handleItemClick = e => {
            if (this.playOnClickToggled && !this.playOnClickWasActivated) {
                this.playOnClickWasActivated = this.client.toggleClickToSpeak();
                const textValue = e.target.innerText || e.target.textContent;
                if (textValue !== '') {
                    this.eventsQueueEnqueue('click', {
                        type: 'playOnClick',
                        text: textValue
                    });
                }
            }
        };

        /**
         * Attach 'click' listener for item
         */
        this.addItemClickListener = () => {
            const clickableArea = areaBroker.getContentArea().querySelector('.qti-item');
            clickableArea?.addEventListener('click', handleItemClick);
        };

        /**
         * Remove 'click' listener for item
         */
        this.removeItemClickListener = () => {
            const clickableArea = areaBroker.getContentArea().querySelector('.qti-item');
            clickableArea?.removeEventListener('click', handleItemClick);
        };

        /**
         * Prevent speaking of a not-to-be-spoken clicked element
         * @param {Event} event
         */
        const handleForbiddenElementClick = event => {
            this.client.stop();
            event.stopPropagation(); // prevent detection by .qti-item click handler
        };

        /**
         * Attach 'click' listeners for not-to-be-spoken elements
         */
        this.addForbiddenElementsListeners = () => {
            const forbiddenElements = document.querySelectorAll('.do-not-read');
            forbiddenElements.forEach(element => {
                element.addEventListener('click', handleForbiddenElementClick);
            });
        };

        /**
         * Remove 'click' listeners for not-to-be-spoken elements
         */
        this.removeForbiddenElementsListeners = () => {
            const forbiddenElements = document.querySelectorAll('.do-not-read');
            forbiddenElements.forEach(element => {
                element.removeEventListener('click', handleForbiddenElementClick);
            });
        };

        /**
         * Remove 'selectionchange' listener
         */
        this.removeSelectionChangeListener = () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };

        /**
         * Check if some text is selected
         * @returns {boolean}
         */
        this.isSelectionNotEmpty = () => {
            const sel = window.getSelection();
            return sel.rangeCount > 0 && sel.getRangeAt(0).toString().trim().length > 0;
        };

        /**
         * Mount readAloud toolbar and listen to its events
         * @param {Boolean} autofocus
         */
        this.renderToolbar = autofocus => {
            if (!this.toolbar) {
                const toolbarContainerSelector = `.toolbar-${this.getName()}`;
                const toolbarContainer = areaBroker.getToolsArea().querySelector(toolbarContainerSelector);
                if (!toolbarContainer) {
                    throw new Error(`No container '${toolbarContainerSelector}' found to render plugin into.`);
                }

                this.toolbar = new ReadAloudBar({
                    target: toolbarContainer,
                    props: {
                        serviceCallId: testConfig.serviceCallId,
                        clickToSpeakEnable: this.clickToSpeakEnable,
                        playOnClickPlaying: this.playOnClickPlaying,
                        playOnClickToggled: this.playOnClickToggled,
                        playSelectionToggled: this.playSelectionToggled,
                        playSelectionPlaying: this.playSelectionPlaying,
                        playAllPlaying: this.playAllPlaying,
                        readAloudSettings: {
                            open: this.settingsOpen,
                            toolState: this.readAloudToolState,
                            constraints: this.readAloudConstraints
                        },
                        disabled: this.toolbarDisabled,
                        autofocus
                    }
                });
                this.toolbar.$on('action', e => {
                    const { key } = e.detail;
                    switch (key) {
                        case actionKeys.playOnClick:
                            handlePlayOnClickAction();
                            break;
                        case actionKeys.playSelection:
                            handlePlaySelectionAction();
                            break;
                        case actionKeys.playAll:
                            handlePlayAllAction();
                            break;
                        case actionKeys.settings:
                            this.settingsOpen = !this.settingsOpen;
                            this.toolsStoreHandler.set('settingsOpen', this.settingsOpen);
                            this.syncToolbarProps();
                            break;
                    }
                });
                this.toolbar.$on('change', ({ detail }) => {
                    // store new value for voice/speed/pitch
                    this.readAloudToolState[detail.key] = detail.value;
                    this.toolsStoreHandler.set('toolState', this.readAloudToolState);

                    if (this.client) {
                        switch (detail.key) {
                            case settingsKeys.readAloudVoice:
                                this.client.setPreferences({ voice: detail.value });
                                break;
                            case settingsKeys.readAloudSpeed:
                                this.client.setPreferences({ speed: detail.value });
                                break;
                            case settingsKeys.readAloudPitch:
                                this.client.setPreferences({ pitch: detail.value });
                                break;
                        }
                    }

                    this.eventsQueueEnqueue('change', {
                        toolKey: detail.key,
                        toolState: detail.value
                    });
                });
                this.toolbar.$on('close', () => {
                    this.close(true);
                });
            }
        };

        /**
         * Unmount readAloud toolbar
         */
        this.destroyToolbar = () => {
            if (this.toolbar) {
                this.toolbar.$destroy();
            }
            this.toolbar = null;
        };

        /**
         * When toolbar state has changed, propagate changes to the component
         */
        this.syncToolbarProps = () => {
            if (this.toolbar) {
                this.toolbar.$set({
                    clickToSpeakEnable: this.clickToSpeakEnable,
                    playOnClickPlaying: this.playOnClickPlaying,
                    playOnClickToggled: this.playOnClickToggled,
                    playSelectionToggled: this.playSelectionToggled,
                    playSelectionPlaying: this.playSelectionPlaying,
                    playAllPlaying: this.playAllPlaying,
                    readAloudSettings: {
                        open: this.settingsOpen,
                        toolState: this.readAloudToolState,
                        constraints: this.readAloudConstraints
                    },
                    disabled: this.toolbarDisabled
                });
            }
        };

        /**
         * Tell the client which elements to ignore (again)
         * This must be re-done after each item renders (texthelp registers only currently rendered elements)
         */
        this.ignoreIgnoredElements = () => {
            if (this.client) {
                this.client.ignoreElements(defaultIgnoredElements);
                this.client.ignoreElements(pluginConfig.providerConfig.ignoreElements || '');
                if (pluginConfig.overrideMathExpr?.enabled) {
                    this.client.ignoreElements(mathOverrideIgnoredElements);
                }
            }
        };

        /**
         * Open the readAloud toolbar
         * @param {Boolean} autofocus
         */
        this.open = (autofocus = false) => {
            this.renderToolbar(autofocus);
            this.toolsStoreHandler.set('open', true);
            this.eventsQueueEnqueue('custom', {
                type: 'toolbar-open'
            });
        };

        /**
         * Close the readAloud toolbar
         * @param {Boolean} autofocus
         */
        this.close = (autofocus = false) => {
            this.removeSelectionChangeListener();
            this.resetModes();
            this.resetButtons();
            this.destroyToolbar();
            this.toolsStoreHandler.set('open', false);

            if (this.client) {
                this.client.stop();
                this.enqueueStop();
            }
            if (autofocus) {
                const toolbarBtn = getToolbarButtonElement('readAloud', areaBroker);
                if (toolbarBtn) {
                    toolbarBtn.focus();
                }
            }
            this.eventsQueueEnqueue('custom', {
                type: 'toolbar-close'
            });
        };

        /**
         * Returns preferences of readAloud provider
         * @returns {Object}
         */
        this.getProviderPreferences = () =>
            Object.assign({}, defaultPreferences, pluginConfig.providerPreferences, {
                voice: this.readAloudToolState[settingsKeys.readAloudVoice],
                speed: this.readAloudToolState[settingsKeys.readAloudSpeed],
                pitch: this.readAloudToolState[settingsKeys.readAloudPitch]
            });

        // setup ui-log queue (async)
        this.eventsQueuePromise = queueFactory({
            id: `${this.getName()}.${testRunner.getConfig().serviceCallId}`,
            bufferSize: 10,
            flush(events) {
                return testRunner.getProxy().callTestAction('ui-log', { events });
            }
        }).then(eventsQueue => {
            this.eventsQueue = eventsQueue;
        });

        this.eventsQueueEnqueue = (domEventType, metadata) => {
            if (pluginConfig.eventLog?.enabled) {
                this.eventsQueue?.enqueue({
                    domEventType,
                    itemIdentifier: testRunner.getCurrentItemIdentifier(),
                    metadata: {
                        timeStamp: Date.now(),
                        component: `plugin-${this.getName()}`,
                        ...metadata
                    }
                });
            }
        };

        this.enqueueStop = (domEventType = 'none') => {
            this.eventsQueueEnqueue(domEventType, {
                type: 'stop'
            });
        };

        // We load MathJax early (including mocking part of it),
        // otherwise TextHelp tries to load it and throws an error about SRE
        if (pluginConfig.providerId === 'texthelp') {
            /** @type {Promise} awaited by plugin lifecycle */
            return import('taoQtiNuiItem/runner/static/math/mathjax.js').then(({ getMathJax }) => getMathJax());
        }
    },

    init() {
        this.settingsOpen = this.toolsStoreHandler.get('settingsOpen') || false;
        this.readAloudToolState = this.toolsStoreHandler.get('toolState') || {};

        const testRunner = this.getTestRunner();
        const pluginConfig = testRunner.getPluginConfig(this.getName()) || {};

        testRunner
            .on('proctor-reset', async () => {
                if (this.eventsQueue) {
                    await this.eventsQueue.clear();
                }
            })
            .on('toolbaraction.readAloud', key => {
                if (key === 'readAloud') {
                    if (this.toolsStoreHandler.get('open')) {
                        this.close();
                    } else {
                        this.open(true);
                    }
                } else if (isMutuallyExclusiveTool('readAloud', key)) {
                    if (this.toolsStoreHandler.get('open')) {
                        this.close();
                    }
                }
            })

            /**
             * When loading item, check for mandatory category to show or hide the entire plugin
             */
            .on('loaditem.readAloud', () => {
                const testMap = testRunner.getTestMap();
                const { testPartId, sectionId, itemIdentifier } = testRunner.getTestContext();
                const categories = getItemProperty(testMap, testPartId, sectionId, itemIdentifier, 'categories');

                const openBar = () => {
                    this.show();
                    // sync open state from store
                    if (this.toolsStoreHandler.get('open')) {
                        this.open();
                    }
                };

                if (Array.isArray(categories) && categories.some(hasCategory)) {
                    if (!this.client) {
                        getReadAloudClient(pluginConfig.providerId, pluginConfig.providerConfig)
                            .then(client => {
                                client.setPreferences(this.getProviderPreferences());

                                client.onReadStart(() => {
                                    if (this.playOnClickToggled) {
                                        this.playOnClickPlaying = true;
                                        this.syncToolbarProps();
                                    }
                                });
                                client.onReadEnd(() => {
                                    this.playOnClickPlaying = false;
                                    this.playSelectionPlaying = false;
                                    this.playAllPlaying = false;
                                    this.syncToolbarProps();
                                });
                                this.client = client;
                                this.ignoreIgnoredElements();

                                // Different TTS providers have different set of config options exposed
                                this.readAloudConstraints = client.getSupport();
                                if (pluginConfig.hideVoiceGender) {
                                    this.readAloudConstraints.voice ??= {};
                                    this.readAloudConstraints.voice.disabled = true;
                                }
                                this.clickToSpeakEnable = this.readAloudConstraints.clickToSpeak || false;

                                openBar();
                                this.toolbarDisabled = false;
                                this.syncToolbarProps();
                            })
                            .catch(error => {
                                console.error(error); // eslint-disable-line no-console
                                // notification will be rendered in TestLayout
                                showNotification(
                                    {
                                        title: __('Read aloud not available'),
                                        message: __('Please launch your test again or contact your administrator.'),
                                        hierarchy: 'warning',
                                        closeable: true
                                    },
                                    'persistent'
                                );
                                this.hide();
                            });
                    } else {
                        openBar();
                    }
                } else {
                    this.hide();
                }
            })
            /**
             * Enable toolbar buttons after a navigation, refresh or overlay
             */
            .on('renderitem.readAloud enableitem.readAloud', () => {
                if (this.client) {
                    this.toolbarDisabled = false;
                    this.syncToolbarProps();
                }
                this.ignoreIgnoredElements();
            })
            /**
             * When unloading item (before navigation away), or disabling item (for overlay)
             * reset the toolbar's play buttons state (opened state remains the same)
             */
            .on('unloaditem.readAloud disableitem.readAloud', () => {
                if (this.client) {
                    this.client.stop();
                }
                this.removeItemClickListener();
                this.removeForbiddenElementsListeners();
                this.removeSelectionChangeListener();
                this.resetModes();
                this.resetButtons();
                this.toolbarDisabled = true;
                this.syncToolbarProps();
            })
            .on('itemModalFeedback.readAloud', () => {
                if (this.client) {
                    this.client.stop();
                }
                this.resetButtons();
                this.syncToolbarProps();
            });
    },

    /**
     * Show the readAloud toolbar button
     */
    show() {
        this.toolsStoreHandler.set('visible', true);
    },

    /**
     * Hide the readAloud toolbar button (and hide the toolbar)
     */
    hide() {
        if (this.client) {
            this.client.stop();
        }
        this.removeItemClickListener();
        this.removeForbiddenElementsListeners();
        this.removeSelectionChangeListener();
        this.resetModes();
        this.resetButtons();
        this.destroyToolbar();
        this.toolsStoreHandler.set('visible', false);
    },

    /**
     * Destroy the plugin and its components. Normally called only at the end of a test session.
     */
    destroy() {
        this.close();

        if (this.client) {
            this.client.destroy();
        }

        this.eventsQueue?.flush();

        // remove *all* listeners created on init()
        this.getTestRunner().off('.readAloud');
    }
});
