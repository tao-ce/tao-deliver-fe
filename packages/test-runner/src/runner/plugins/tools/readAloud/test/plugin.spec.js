// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

vi.mock('@oat-sa-private/read-aloud-client');
import getReadAloudClient from '@oat-sa-private/read-aloud-client';

vi.mock('@oat-sa-private/ui-components', async () => {
    const originalModule = await vi.importActual('@oat-sa-private/ui-components');
    return Object.assign({ __esModule: true }, originalModule, {
        showNotification: vi.fn()
    });
});
import { showNotification } from '@oat-sa-private/ui-components';

import { tick } from 'svelte';
import { fireEvent } from '@testing-library/svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import {
    getTestSessionUserDataService,
    clearAllTestSessionsUserData
} from '../../../../session/testSessionUserDataService.js';
import { getTestSessionStatusStore, getTestStateStore } from '../../../../testsStateStore.js';
import { testSessionStatus } from '../../../../session/sessionStates.js';
import preset from '../../../navigation/navigator/test/testStoreMocks/presetOneSectionNonLinear.json';

function getDefaultSupport() {
    return {
        pitch: {
            disabled: true
        },
        speed: {
            disabled: false,
            options: ['slowest', 'normal', 'fastest']
        },
        voice: {
            disabled: false
        }
    };
}

function mockGetReadAloudClient(options = {}, delay) {
    let clickToSpeak = false;
    const client = {
        play: vi.fn(),
        playSelection: vi.fn(),
        stop: vi.fn(),
        toggleClickToSpeak: vi.fn(() => {
            clickToSpeak = !clickToSpeak;
            return clickToSpeak;
        }),
        onReadStart: vi.fn(),
        onReadEnd: vi.fn(),
        setPreferences: vi.fn(),
        ignoreElements: vi.fn(),
        getSupport: vi.fn().mockReturnValue(options.support || getDefaultSupport()),
        destroy: vi.fn()
    };
    return vi.fn().mockImplementation(provider => {
        if (provider === 'error') {
            return Promise.reject('ERROR');
        }
        if (delay) {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(client);
                }, delay);
            });
        }
        return Promise.resolve(client);
    });
}

describe('readAloud plugin', () => {
    let container;
    let getContainer;
    let getToolsArea;
    let getContentArea;
    let getMainArea;
    let getTopBarArea;
    let testProviderApi;
    let statusStore;
    let testStateStore;
    let toolsStore;
    const serviceCallId = 'test-session-xyz';

    // item1 will have the TTS category, item2 & item3 will not
    preset.testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item1'].categories = ['x-tao-option-tts'];

    function createTestRunner(scId = serviceCallId) {
        return testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId: scId
        });
    }

    function setupLayout() {
        const div = document.createElement('div');
        div.classList.add('fixture');
        div.innerHTML = `
            <div class="top-bar">
                <div class="floating-toolbars-wrapper">
                    <div class="floating-toolbars">
                        <div class="toolbar-readAloud" />
                    </div>
                </div>
            </div>
            <main id="test-main">
                <div class="qti-item-container">
                    <div class="qti-item">Item content</div>
                </div>
            </main>
        `;
        document.body.appendChild(div);

        return div;
    }

    function removeLayout() {
        const div = document.querySelector('.fixture');
        if (div) {
            div.remove();
        }
    }

    function expectInDOM(inDom) {
        expect(getToolsArea().querySelectorAll('.readAloud-bar').length).toBe(inDom ? 1 : 0);
    }

    function expectInstructionInDOM(inDom) {
        expect(getToolsArea().querySelectorAll('.readAloud-bar .footer .instruction').length).toBe(inDom ? 1 : 0);
    }

    function expectToolState(state) {
        expect(toolsStore.getTestToolState('readAloud')).toEqual(state);
    }

    function getButton(testId) {
        return getToolsArea().querySelector(`button[data-test-id="readaloud-${testId}"]`);
    }

    const proxyCallTestActionSpy = vi.fn().mockImplementation(() => Promise.resolve());

    beforeEach(() => {
        // read-aloud-client mock must be nested, so we can use another implementation later
        getReadAloudClient.mockImplementation(mockGetReadAloudClient());

        container = setupLayout();

        getContainer = () => container;
        getToolsArea = () => container.querySelector('.floating-toolbars-wrapper');
        getContentArea = () => container.querySelector('.qti-item-container');
        getMainArea = () => container.querySelector('#test-main');
        getTopBarArea = () => container.querySelector('.top-bar');

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getToolsArea,
                    getContentArea,
                    getMainArea,
                    getTopBarArea
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            loadProxy() {
                return proxyFactory('foo', {});
            },
            install() {
                this.getCurrentItemIdentifier = () => preset.testContext.itemIdentifier;
            },
            init() {
                return this.getProxy().init();
            }
        };
        proxyFactory.registerProvider('foo', {
            init: () => {},
            callTestAction: proxyCallTestActionSpy
        });
        testRunnerFactory.registerProvider('foo', testProviderApi);

        let presetData = Object.assign({}, preset);
        testStateStore = getTestStateStore(serviceCallId);
        testStateStore.setTestMap(presetData.testMap);
        testStateStore.setTestContext(presetData.testContext);

        statusStore = getTestSessionStatusStore(serviceCallId);
        statusStore.set(testSessionStatus.interacting);

        const testSessionUserDataService = getTestSessionUserDataService(serviceCallId);
        toolsStore = testSessionUserDataService.getToolsStore();

        window.getSelection().removeAllRanges();
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        removeLayout();
        clearAllTestSessionsUserData();
        statusStore.clear();
        vi.clearAllMocks();
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(false);
                    expectToolState({ visible: true });
                    runner.destroy();
                })
                .on('destroy', () => {
                    expectInDOM(false);
                    done();
                })
                .init();
        }));

    it.each(['x-tao-option-textToSpeech', 'x-tao-option-tts'])(
        'activate for category %s',
        category =>
            new Promise(done => {
                expect.assertions(3);

                const runner = createTestRunner();
                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('ready', () => {
                        preset.testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item1'].categories = [
                            category
                        ];
                        preset.testContext.itemIdentifier = 'item1';
                        runner.loadItem('item1');
                    })
                    .on('renderitem', () => {
                        expectInDOM(false);
                        expectToolState({ visible: true });
                        runner.destroy();
                    })
                    .on('destroy', () => {
                        expectInDOM(false);
                        done();
                    })
                    .init();
            })
    );

    it('does not render anything if the category x-tao-option-tts is absent', () =>
        new Promise(done => {
            expect.assertions(2);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item2';
                    runner.loadItem('item2');
                })
                .on('renderitem', () => {
                    expectInDOM(false);
                    expectToolState({ visible: false });
                    done();
                })
                .init();
        }));

    it('renders opened if the state was open before', () =>
        new Promise(done => {
            expect.assertions(3);

            toolsStore.setTestToolState('readAloud', { open: true });

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(true);
                    expectToolState({ visible: true, open: true });
                    done();
                })
                .init();
        }));

    it('waits until provider is first ready before rendering toolbar', () =>
        new Promise(done => {
            // simulate slow provider load
            getReadAloudClient.mockImplementation(mockGetReadAloudClient({ support: { clickToSpeak: true } }, 500));

            vi.useFakeTimers();

            expect.assertions(7);

            toolsStore.setTestToolState('readAloud', { open: true });

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(false);
                    expectToolState({ open: true });

                    vi.runAllTimers();

                    // now provider will load and open toolbar
                    tick().then(() => {
                        expectInDOM(true);
                        expectToolState({ visible: true, open: true });
                        expect(getButton('play')).not.toBeDisabled();
                        expect(getButton('play-on-click')).not.toBeDisabled();

                        vi.useRealTimers();
                        done();
                    });
                })
                .init();
        }));

    it('opens and closes on headerbar action, and updates state', () =>
        new Promise(done => {
            expect.assertions(5);

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    runner.trigger('toolbaraction', 'readAloud'); //open
                    tick()
                        .then(tick)
                        .then(() => {
                            expectInDOM(true);
                            expectToolState({ visible: true, open: true });

                            return tick();
                        })
                        .then(() => {
                            runner.trigger('toolbaraction', 'readAloud'); //close
                            return tick();
                        })
                        .then(tick)
                        .then(() => {
                            expectInDOM(false);
                            expectToolState({ visible: true, open: false });
                            done();
                        });
                })
                .init();
        }));

    test.each(['highlighter', 'scratchpad', 'calculator'])(
        'closes on headerbar action of %s open, and updates state',
        toolbarActionKey =>
            new Promise(done => {
                expect.assertions(5);

                const runner = createTestRunner();
                expectInDOM(false);

                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('ready', () => {
                        preset.testContext.itemIdentifier = 'item1';
                        runner.loadItem('item1');
                    })
                    .on('renderitem', () => {
                        runner.trigger('toolbaraction', 'readAloud'); //open
                        tick()
                            .then(tick)
                            .then(() => {
                                expectInDOM(true);
                                expectToolState({ visible: true, open: true });

                                return tick();
                            })
                            .then(() => {
                                runner.trigger('toolbaraction', toolbarActionKey); //close
                                return tick();
                            })
                            .then(tick)
                            .then(() => {
                                expectInDOM(false);
                                expectToolState({ visible: true, open: false });
                                done();
                            });
                    })
                    .init();
            })
    );

    it('closes on Escape key, and updates state', () =>
        new Promise(done => {
            expect.assertions(5);

            toolsStore.setTestToolState('readAloud', { open: true });

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(true);
                    expectToolState({ visible: true, open: true });

                    const buttonElement = container.querySelector('.icon-bar-btn');
                    buttonElement.focus();
                    fireEvent.keyDown(buttonElement, { keyCode: 27 }); //close

                    tick()
                        .then(tick)
                        .then(() => {
                            expectInDOM(false);
                            expectToolState({ visible: true, open: false });
                            done();
                        });
                })
                .init();
        }));

    it('play/stop reading with play selection button', () =>
        new Promise(done => {
            expect.assertions(7);

            toolsStore.setTestToolState('readAloud', { open: true });

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(true);
                    expectToolState({ visible: true, open: true });

                    const client = runner.getPlugin('readAloud').client;

                    const range = document.createRange();
                    range.selectNodeContents(document.querySelector('.qti-item'));
                    window.getSelection().addRange(range);

                    expect(document.getSelection().isCollapsed).toBe(false);

                    const buttonElement = getButton('play-selection');
                    buttonElement.click();

                    tick()
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expect(client.playSelection).toHaveBeenCalled();
                            expect(document.getSelection().isCollapsed).toBe(false);
                            buttonElement.click();
                            return tick();
                        })
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expect(client.stop).toHaveBeenCalled();
                            done();
                        });
                })
                .init();
        }));

    it('play/stop reading with play all button', () =>
        new Promise(done => {
            expect.assertions(9);

            toolsStore.setTestToolState('readAloud', { open: true });

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(true);
                    expectToolState({ visible: true, open: true });

                    const range = document.createRange();
                    range.selectNodeContents(document.querySelector('.qti-item'));
                    window.getSelection().addRange(range);

                    expect(document.getSelection().isCollapsed).toBe(false);

                    const client = runner.getPlugin('readAloud').client;

                    const buttonElement = getButton('play');
                    buttonElement.click();

                    tick()
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expect(client.play).toHaveBeenCalled();
                            expect(buttonElement).toMatchSnapshot();
                            expect(document.getSelection().isCollapsed).toBe(true);
                            buttonElement.click();
                            return tick();
                        })
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expect(client.stop).toHaveBeenCalled();
                            expect(buttonElement).toMatchSnapshot();
                            done();
                        });
                })
                .init();
        }));

    it('toggles client clickToSpeak state with play on click button', () =>
        new Promise(done => {
            getReadAloudClient.mockImplementation(mockGetReadAloudClient({ support: { clickToSpeak: true } }));

            expect.assertions(13);

            toolsStore.setTestToolState('readAloud', { open: true });

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(true);
                    expectToolState({ visible: true, open: true });

                    const client = runner.getPlugin('readAloud').client;

                    const buttonElement = getButton('play-on-click');
                    expect(buttonElement.getAttribute('aria-pressed')).toBe('false');
                    expectInstructionInDOM(false);

                    // toggle feature on
                    buttonElement.click();
                    expect(client.toggleClickToSpeak).toHaveBeenCalledTimes(0);

                    tick()
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expect(buttonElement.getAttribute('aria-pressed')).toBe('true');
                            expectInstructionInDOM(true);

                            // click item text
                            container.querySelector('.qti-item').click();
                            // we cannot really know if client played, because library is mocked
                            expect(client.toggleClickToSpeak).toHaveBeenCalledTimes(1);

                            // toggle feature off
                            buttonElement.click();
                            expect(client.toggleClickToSpeak).toHaveBeenCalledTimes(2);
                            expect(client.stop).toHaveBeenCalled();
                            return tick();
                        })
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expect(buttonElement.getAttribute('aria-pressed')).toBe('false');
                            expectInstructionInDOM(false);
                            done();
                        });
                })
                .init();
        }));

    it('play selection button stops playing all', () =>
        new Promise(done => {
            expect.assertions(7);

            toolsStore.setTestToolState('readAloud', { open: true });

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(true);
                    expectToolState({ visible: true, open: true });
                    expectInstructionInDOM(false);

                    const client = runner.getPlugin('readAloud').client;

                    getButton('play').click();

                    tick()
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expect(client.play).toHaveBeenCalled();
                            expectInstructionInDOM(false);
                            getButton('play-selection').click();
                            return tick();
                        })
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expect(client.stop).toHaveBeenCalled();
                            done();
                        });
                })
                .init();
        }));

    it('hide button and show notification if exception during client initialisation', () =>
        new Promise(done => {
            vi.spyOn(console, 'error').mockImplementationOnce(() => {});

            expect.assertions(4);

            toolsStore.setTestToolState('readAloud', { open: true });

            const runner = createTestRunner();
            expectInDOM(false);

            const pluginConfig = {
                providerId: 'error'
            };
            runner.getPluginConfig = vi.fn().mockReturnValue(pluginConfig);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('loaditem', () => {
                    setTimeout(() => {
                        expect(showNotification).toHaveBeenCalledTimes(1);
                        expect(showNotification.mock.calls[0][0]).toEqual(
                            expect.objectContaining({
                                title: 'Read aloud not available',
                                hierarchy: 'warning'
                            })
                        );
                        expectInDOM(false);
                        done();
                    }, 0);
                })
                .init();
        }));

    it('stores changed settings into toolsStore and to client', () =>
        new Promise(done => {
            expect.assertions(9);

            toolsStore.setTestToolState('readAloud', { open: true, settingsOpen: true });

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(true);
                    expectToolState({ visible: true, open: true, settingsOpen: true });
                    expect(getToolsArea()).toMatchSnapshot();

                    const client = runner.getPlugin('readAloud').client;

                    // set male voice
                    container.querySelector('input[name="voice"]').click();
                    expect(client.setPreferences).toHaveBeenLastCalledWith({ voice: 'male' });
                    // set fastest speed
                    container.querySelector('.read-aloud-settings-drawer button').click();
                    expect(client.setPreferences).toHaveBeenLastCalledWith({ speed: 'fastest' });
                    expectToolState({
                        visible: true,
                        open: true,
                        settingsOpen: true,
                        toolState: {
                            voice: 'male',
                            speed: 'fastest'
                        }
                    });

                    // close drawer
                    getButton('settings').click();
                    return tick()
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expect(toolsStore.getTestToolState('readAloud').settingsOpen).toBe(false);
                            expect(container.querySelector('.read-aloud-settings-drawer')).toBeNull();
                            done();
                        });
                })
                .init();
        }));

    it('restores toolsStore values to settings UI and to client', () =>
        new Promise(done => {
            expect.assertions(6);

            toolsStore.setTestToolState('readAloud', {
                open: true,
                settingsOpen: true,
                toolState: {
                    voice: 'male',
                    speed: 'slowest'
                }
            });

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(true);

                    const client = runner.getPlugin('readAloud').client;

                    expect(client.setPreferences).toHaveBeenLastCalledWith(
                        expect.objectContaining({ voice: 'male', speed: 'slowest' })
                    );

                    const drawer = container.querySelector('.read-aloud-settings-drawer');
                    expect(drawer).not.toBeNull();
                    expect(drawer.querySelector('input[name="voice"]').value).toBe('male');
                    expect(drawer.querySelectorAll('.icon-bar-btn')[1].getAttribute('aria-disabled')).toBe('true');

                    done();
                })
                .init();
        }));

    it('respects pluginConfig.hideVoiceGender in UI', () =>
        new Promise(done => {
            expect.assertions(5);

            const pluginConfig = {
                providerConfig: {},
                hideVoiceGender: true
            };

            toolsStore.setTestToolState('readAloud', { open: true, settingsOpen: true });

            const runner = createTestRunner();
            runner.getPluginConfig = vi.fn().mockReturnValue(pluginConfig);
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(true);
                    expectToolState({ visible: true, open: true, settingsOpen: true });
                    expect(getToolsArea().querySelectorAll('.control-row').length).toBe(1);
                    expect(getToolsArea().querySelector('.control-row > label').textContent).toBe('Speed');

                    done();
                })
                .init();
        }));

    it('sends ui-logs to proxy for open, play, stop, change, close', () =>
        new Promise(done => {
            const timeStamp = '123';
            vi.spyOn(Date, 'now').mockImplementation(() => timeStamp);

            expect.assertions(6);

            const scId = 'unique-test-session-id-for-logging-queue';

            const testSessionUserDataService = getTestSessionUserDataService(scId);
            const localToolsStore = testSessionUserDataService.getToolsStore();

            localToolsStore.setTestToolState('readAloud', { open: false, settingsOpen: true });

            const runner = createTestRunner(scId);

            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.getPlugin('readAloud').eventsQueue.flush();
                    proxyCallTestActionSpy.mockClear();

                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    runner.trigger('toolbaraction', 'readAloud'); // 1. logs toolbar-open
                    tick()
                        .then(tick)
                        .then(() => {
                            expectInDOM(true);

                            const buttonElement = getButton('play');
                            buttonElement.click(); // 2. logs playAll
                            buttonElement.click(); // 3. logs stop

                            // set voice
                            const [maleInput, femaleInput] = container.querySelectorAll('input[name="voice"]');
                            maleInput.click(); // 4. logs change
                            femaleInput.click(); // 5. logs change
                            maleInput.click(); // 6. logs change
                            femaleInput.click(); // 7. logs change
                            maleInput.click(); // 8. logs change

                            // close toolbar
                            buttonElement.focus();
                            fireEvent.keyDown(buttonElement, { keyCode: 27 }); // 9. logs stop 10. logs toolbar-close

                            expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                            expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                            const loggedEvents = proxyCallTestActionSpy.mock.calls[0][1].events;
                            expect(loggedEvents.length).toBe(10);
                            expect(loggedEvents).toMatchSnapshot();

                            runner.destroy();
                        });
                })
                .on('destroy', () => {
                    Date.now.mockRestore();
                    done();
                })
                .init();
        }));

    it('sends unsent ui-logs on destroy', () =>
        new Promise(done => {
            const timeStamp = '123';
            vi.spyOn(Date, 'now').mockImplementation(() => timeStamp);

            expect.assertions(6);

            const scId = 'unique-test-session-id-for-logging-queue-2';

            const testSessionUserDataService = getTestSessionUserDataService(scId);
            const localToolsStore = testSessionUserDataService.getToolsStore();

            localToolsStore.setTestToolState('readAloud', { open: false, settingsOpen: true });

            const runner = createTestRunner(scId);

            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    // runner.getPlugin('readAloud').eventsQueue.flush();
                    proxyCallTestActionSpy.mockClear();

                    preset.testContext.itemIdentifier = 'item1';

                    runner.getPlugin('readAloud').eventsQueuePromise.then(() => {
                        runner.loadItem('item1');
                    });
                })
                .on('renderitem', () => {
                    runner.trigger('toolbaraction', 'readAloud'); // 1. logs toolbar-open
                    tick()
                        .then(tick)
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expectInDOM(true);

                            const buttonElement = getButton('play');
                            buttonElement.click(); // 2. logs playAll
                            buttonElement.click(); // 3. logs stop

                            runner.destroy(); // 4. logs stop 5. logs toolbar-close
                        });
                })
                .on('destroy', () => {
                    expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                    expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                    const loggedEvents = proxyCallTestActionSpy.mock.calls[0][1].events;
                    expect(loggedEvents.length).toBe(5);
                    expect(loggedEvents).toMatchSnapshot();

                    Date.now.mockRestore();
                    done();
                })
                .init();
        }));

    test.each(['unloaditem', 'disableitem', 'itemModalFeedback'])(
        'stops reading when %s occurs',
        itemEventName =>
            new Promise(done => {
                expect.assertions(4);

                toolsStore.setTestToolState('readAloud', { open: true });

                const runner = createTestRunner();
                expectInDOM(false);

                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('ready', () => {
                        preset.testContext.itemIdentifier = 'item1';
                        runner.loadItem('item1');
                    })
                    .on('renderitem', () => {
                        expectInDOM(true);

                        const client = runner.getPlugin('readAloud').client;

                        const range = document.createRange();
                        range.selectNodeContents(document.querySelector('.qti-item'));
                        window.getSelection().addRange(range);

                        const buttonElement = getButton('play-selection');
                        buttonElement.click();

                        expect(client.playSelection).toHaveBeenCalled();

                        runner.trigger(itemEventName);

                        expect(client.stop).toHaveBeenCalled();
                        done();
                    })
                    .init();
            })
    );

    it('tells client all ignoredElements', () =>
        new Promise(done => {
            expect.assertions(2);

            const runner = createTestRunner();

            const defaultIgnoredElements = '.visually-hidden, .hidden, .do-not-read';

            const pluginConfig = {
                providerConfig: {
                    ignoreElements: 'span, marquee'
                }
            };
            runner.getPluginConfig = vi.fn().mockReturnValue(pluginConfig);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    const client = runner.getPlugin('readAloud').client;

                    expect(client.ignoreElements).toHaveBeenCalledWith(defaultIgnoredElements);
                    expect(client.ignoreElements).toHaveBeenCalledWith(pluginConfig.providerConfig.ignoreElements);

                    done();
                })
                .init();
        }));

    it('does not read a clicked ignored element', () =>
        new Promise(done => {
            getReadAloudClient.mockImplementation(mockGetReadAloudClient({ support: { clickToSpeak: true } }));

            expect.assertions(5);

            const ignoredElt = document.createElement('span');
            ignoredElt.classList.add('.do-not-read');
            ignoredElt.innerHTML = 'Ignore me';
            container.appendChild(ignoredElt);

            toolsStore.setTestToolState('readAloud', { open: true });

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectInDOM(true);

                    const client = runner.getPlugin('readAloud').client;

                    const buttonElement = getButton('play-on-click');
                    // toggle feature on
                    buttonElement.click();

                    // trigger ignored
                    ignoredElt.click();

                    expect(client.stop).toHaveBeenCalled();
                    expect(client.toggleClickToSpeak).not.toHaveBeenCalled();

                    // trigger reading
                    container.querySelector('.qti-item').click();
                    expect(client.toggleClickToSpeak).toHaveBeenCalled();

                    done();
                })
                .init();
        }));

    describe('math', () => {
        function createMathElt() {
            const mathElt = document.createElement('span');
            mathElt.innerHTML = '<mjx-container><svg></svg><mjx-assistive-mml></mjx-assistive-mml></mjx-container>';
            container.querySelector('.qti-item').appendChild(mathElt);
            return mathElt;
        }
        const mathPlaceholderSelector = '.tts-math-placeholder';
        const mathIgnoreSelector = 'mjx-container';

        it('if overrideMathExpr.enabled config, uses placeholder string', () =>
            new Promise(done => {
                getReadAloudClient.mockImplementation(mockGetReadAloudClient());

                expect.assertions(4);

                const mathElt = createMathElt();

                toolsStore.setTestToolState('readAloud', { open: true });
                const runner = createTestRunner();
                const pluginConfig = {
                    overrideMathExpr: {
                        enabled: true
                    }
                };
                runner.getPluginConfig = vi.fn().mockReturnValue(pluginConfig);

                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('ready', () => {
                        preset.testContext.itemIdentifier = 'item1';
                        runner.loadItem('item1');
                    })
                    .on('renderitem', () => {
                        const client = runner.getPlugin('readAloud').client;

                        const buttonElement = getButton('play');
                        buttonElement.click();

                        tick()
                            .then(tick)
                            .then(tick)
                            .then(() => {
                                expect(client.play).toHaveBeenCalled();
                                expect(client.ignoreElements).toHaveBeenLastCalledWith(mathIgnoreSelector);
                                expect(mathElt.querySelector(mathPlaceholderSelector)?.textContent).toBe(
                                    'Look at the formula.'
                                );

                                buttonElement.click();
                                return tick();
                            })
                            .then(tick)
                            .then(tick)
                            .then(() => {
                                expect(client.stop).toHaveBeenCalled();
                                done();
                            });
                    })
                    .init();
            }));

        it('if no overrideMathExpr.enabled config, no placeholder string', () =>
            new Promise(done => {
                getReadAloudClient.mockImplementation(mockGetReadAloudClient());

                expect.assertions(4);

                const mathElt = createMathElt();

                toolsStore.setTestToolState('readAloud', { open: true });
                const runner = createTestRunner();
                const pluginConfig = {
                    overrideMathExpr: {
                        enabled: false
                    }
                };
                runner.getPluginConfig = vi.fn().mockReturnValue(pluginConfig);

                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('ready', () => {
                        preset.testContext.itemIdentifier = 'item1';
                        runner.loadItem('item1');
                    })
                    .on('renderitem', () => {
                        const client = runner.getPlugin('readAloud').client;

                        const buttonElement = getButton('play');
                        buttonElement.click();

                        tick()
                            .then(tick)
                            .then(tick)
                            .then(() => {
                                expect(client.play).toHaveBeenCalled();
                                expect(client.ignoreElements).not.toHaveBeenLastCalledWith(mathIgnoreSelector);
                                expect(mathElt.querySelector(mathPlaceholderSelector)).toBeFalsy();

                                buttonElement.click();
                                return tick();
                            })
                            .then(tick)
                            .then(tick)
                            .then(() => {
                                expect(client.stop).toHaveBeenCalled();
                                done();
                            });
                    })
                    .init();
            }));
    });
});
