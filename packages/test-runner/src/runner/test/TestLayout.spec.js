// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { get } from 'svelte/store';
import { render, fireEvent } from '@testing-library/svelte';
import TestLayout from '../TestLayout.svelte';
import testsStateStore, { getTestSessionStatusStore, getTestStateStore } from '../testsStateStore.js';
import { testSessionStatus, itemSessionStates } from '../session/sessionStates.js';
import { getNavigationFeedbacksStore } from '../feedback';
import { screenSize } from '../screenSizeStore.js';
import { getTestSessionUserDataService, clearAllTestSessionsUserData } from '../session/testSessionUserDataService.js';
import { showNotification, removeNotification } from '@oat-sa-private/ui-components';
import { testLayoutStore, clearTestLayoutStore } from '../layout/testLayoutStore.js';

function resizeWindow(x, y) {
    window.innerWidth = x;
    window.innerHeight = y;
    window.dispatchEvent(new Event('resize'));
}

function expectInContainer(container, selector, expected = true) {
    expect(container.querySelector(selector))[expected ? 'toBeTruthy' : 'toBeFalsy']();
}

describe('TestLayout', () => {
    const serviceCallId = 'test-session-123654';
    const statusStore = getTestSessionStatusStore(serviceCallId);
    const testStateStore = getTestStateStore(serviceCallId);
    const feedbacksStore = getNavigationFeedbacksStore(serviceCallId);

    beforeEach(() => {
        statusStore.set(testSessionStatus.initial);
    });

    afterEach(() => {
        resizeWindow(1024, 768);
        screenSize.set({ unknown: true });
        clearAllTestSessionsUserData();
        feedbacksStore.clear();
        testsStateStore.clear();
        clearTestLayoutStore();
    });

    it('fails without a serviceCallId', () => {
        expect(() => render(TestLayout, { props: {} })).toThrow(TypeError);
    });

    it('renders correctly with a serviceCallId', () => {
        const { container } = render(TestLayout, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('mounts with the main areas', () =>
        new Promise(done => {
            const { component } = render(TestLayout, {
                props: {
                    serviceCallId
                }
            });
            component.$on('mount', e => {
                expect(e.detail.areas).toMatchSnapshot();
                done();
            });
        }));

    it('updates based on the test runner status', () => {
        const { container } = render(TestLayout, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();

        statusStore.set(testSessionStatus.loading);

        return tick()
            .then(() => {
                expect(container).toMatchSnapshot();

                statusStore.set(testSessionStatus.proctorwait);
                return tick();
            })
            .then(() => {
                expect(container).toMatchSnapshot();
            });
    });

    it('sets ariaHidden if modal feedback is shown and renders feedback container', () => {
        const { container } = render(TestLayout, {
            props: {
                serviceCallId
            }
        });
        const rootElement = container.querySelector('.test-runner');
        expect(rootElement.getAttribute('aria-hidden')).toBeNull();
        expect(container.querySelector('.modal-positioning')).toBeFalsy();

        feedbacksStore.set({
            feedbacksArray: [{ key: 'A', config: { message: 'ABC', buttons: [{ key: 'btn1', label: 'Btn1' }] } }]
        });

        return tick().then(() => {
            expect(rootElement.getAttribute('aria-hidden')).toEqual('true');
            expect(container.querySelector('.modal-positioning')).toBeTruthy();
        });
    });

    it('sets screenSizeStore value', () => {
        resizeWindow(760, 768);
        expect(get(screenSize)).toStrictEqual({ unknown: true });

        render(TestLayout, {
            props: {
                serviceCallId
            }
        });

        expect(get(screenSize)).toStrictEqual({ mobile: true, mobileLandscape: true });
        resizeWindow(1300, 768);

        return tick().then(() => {
            expect(get(screenSize)).toStrictEqual({ desktop: true });
        });
    });

    it('renders item content over the Transition layout on rendering', () => {
        const { container } = render(TestLayout, {
            props: {
                serviceCallId
            }
        });
        const itemElement = container.querySelector('.qti-item-container');
        statusStore.set(testSessionStatus.loading);

        return tick()
            .then(() => {
                expect(itemElement.classList.contains('hidden-item-container')).toBe(true);
                statusStore.set(testSessionStatus.interacting);
                return tick();
            })
            .then(() => {
                expect(itemElement.classList.contains('hidden-item-container')).toBe(false);
            });
    });

    it('updates based on itemSessionState', () => {
        const { container } = render(TestLayout, {
            props: {
                serviceCallId
            }
        });

        statusStore.set(testSessionStatus.interacting);
        testStateStore.setTestContext({ itemSessionState: itemSessionStates.modalFeedback });

        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('renders classes for asideStart and asideEnd based on testLayoutStore', () =>
        new Promise(done => {
            testLayoutStore.set({ asideStart: true, asideEnd: true });

            statusStore.set(testSessionStatus.loading);

            const { container } = render(TestLayout, {
                props: {
                    serviceCallId
                }
            });

            expect(container.querySelector('#test-content-aside-start')).toHaveClass('not-displayed');
            expect(container.querySelector('#test-content-aside-end')).toHaveClass('not-displayed');

            statusStore.set(testSessionStatus.interacting);

            return tick().then(() => {
                expect(container.querySelector('#test-content-aside-start')).not.toHaveClass('not-displayed');
                expect(container.querySelector('#test-content-aside-end')).not.toHaveClass('not-displayed');

                done();
            });
        }));

    it('collapses main area in loading state only', () => {
        statusStore.set(testSessionStatus.initial);

        const { container } = render(TestLayout, {
            props: {
                serviceCallId
            }
        });

        expectInContainer(container, '#test-main');
        expectInContainer(container, '#test-main.collapsed', false);

        statusStore.set(testSessionStatus.loading);

        return tick()
            .then(() => {
                expectInContainer(container, '#test-main.collapsed', true);

                statusStore.set(testSessionStatus.interacting);
                return tick();
            })
            .then(() => {
                expectInContainer(container, '#test-main.collapsed', false);

                statusStore.set(testSessionStatus.overlay);
                return tick();
            })
            .then(() => {
                expectInContainer(container, '#test-main.collapsed', false);

                statusStore.set(testSessionStatus.proctorwait);
                return tick();
            })
            .then(() => {
                expectInContainer(container, '#test-main.collapsed', false);
            });
    });

    describe('HeaderBar', () => {
        it('hides HeaderBar if sessionStatus overview and mobile screen', () => {
            resizeWindow(760, 768);

            statusStore.set(testSessionStatus.overlay);

            const { container, component } = render(TestLayout, {
                props: {
                    serviceCallId
                }
            });

            return tick().then(() => {
                const headerBarContainer = container.querySelector('#test-top-bar').firstChild;
                expect(headerBarContainer.classList.contains('hidden')).toBe(true);

                resizeWindow(780);
                return tick().then(() => {
                    expect(headerBarContainer.classList.contains('hidden')).toBe(false);
                    component.$destroy(); //stop listening to window resize event immediately
                });
            });
        });

        it('forwards events from HeaderBar', () => {
            const onClick = vi.fn();
            const { component, container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    plugins: {
                        settings: { getName: () => 'settings' }
                    }
                }
            });
            component.$on('toolbaraction', onClick);

            const settingsButton = container.querySelector('.headerbar [data-test-id="settings"]');
            fireEvent.click(settingsButton);

            return tick().then(() => {
                expect(onClick).toHaveBeenCalled();
                expect(onClick.mock.calls[0][0].detail.key).toBe('settings');
            });
        });

        it('update the logo based on the theme', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    theme: {
                        logo: {
                            src: 'bar.png',
                            alt: 'custom logo'
                        }
                    }
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('hide menu button based on the theme', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    theme: {
                        hideMenuButton: true
                    }
                }
            });
            expect(container.querySelector('.headerbar')).toMatchSnapshot();
        });

        it('hides areas based on areaHider plugin', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    plugins: {
                        areaHider: { getName: () => 'areaHider', hiddenAreas: ['topBar'] }
                    }
                }
            });
            expect(container.querySelector('#test-top-bar')).toHaveClass('not-displayed');
        });

        it('does not render buttons for disabled plugins', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    plugins: {}
                }
            });
            expect(container.querySelector('.headerbar [data-test-id="highlighter"]')).toBeFalsy();
            expect(container.querySelector('.headerbar [data-test-id="scratchpad"]')).toBeFalsy();
        });

        it('renders settings button if plugin enabled', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    plugins: {
                        settings: { getName: () => 'settings' }
                    }
                }
            });
            expect(container.querySelector('.headerbar [data-test-id="settings"]')).toBeTruthy();
        });

        it('renders scratchpad button if plugin enabled', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    plugins: {
                        scratchpad: { getName: () => 'scratchpad' }
                    }
                }
            });
            expect(container.querySelector('.headerbar [data-test-id="highlighter"]')).toBeFalsy();
            expect(container.querySelector('.headerbar [data-test-id="scratchpad"]')).toBeTruthy();
            expect(container.querySelector('.headerbar [data-test-id="settings"]')).toBeFalsy();
        });

        it('renders highlighter button if plugin enabled, as toggled if opened', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    plugins: {
                        highlighter: { getName: () => 'highlighter' }
                    }
                }
            });
            expect(container.querySelector('.headerbar [data-test-id="scratchpad"]')).toBeFalsy();
            const button = container.querySelector('.headerbar [data-test-id="highlighter"]');
            expect(button).toBeTruthy();
            expect(button).not.toHaveClass('toggled');

            const toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
            toolsStore.setTestToolState('highlighter', {
                open: true
            });

            return tick()
                .then(() => {
                    expect(button).toHaveClass('toggled');
                    toolsStore.setTestToolState('highlighter', {
                        open: false
                    });
                    return tick();
                })
                .then(() => {
                    expect(button).not.toHaveClass('toggled');
                });
        });

        it('user menu: renders if testTaker & showUserMenu', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    theme: { showUserMenu: true },
                    testTaker: {
                        id: 'user-123',
                        name: 'John Doe'
                    }
                }
            });
            expect(container.querySelector('.user-menu')).toBeTruthy();
            expect(container.querySelector('.user-menu').innerHTML).toContain('John Doe');
        });

        it('user menu: does not render if not showUserMenu', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    theme: {},
                    testTaker: {
                        id: 'user-123',
                        name: 'John Doe'
                    }
                }
            });
            expect(container.querySelector('.user-menu')).toBeFalsy();
        });

        it('user menu: does not render if anonymous testTaker', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    theme: { showUserMenu: true },
                    testTaker: {
                        id: null,
                        name: null
                    }
                }
            });
            expect(container.querySelector('.user-menu')).toBeFalsy();
        });
    });

    describe('notification (itemHanger)', () => {
        it('displays and clear messages', () => {
            const { container, component } = render(TestLayout, {
                props: {
                    serviceCallId,
                    itemHangerMessages: [{ content: 'Hello world' }]
                }
            });
            expect(container).toMatchSnapshot();

            component.$set({ itemHangerMessages: [] });
            return tick().then(() => {
                expect(container).toMatchSnapshot();
            });
        });

        it('displays messages at the bottom if a floating tool is opened', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId,
                    plugins: {
                        highlighter: { getName: () => 'highlighter' }
                    },
                    itemHangerMessages: [{ content: 'hello' }]
                }
            });
            const button = container.querySelector('.headerbar [data-test-id="highlighter"]');
            expect(button).toBeTruthy();
            expect(button).not.toHaveClass('toggled');
            const itemHanger = container.querySelector('.item-hanger');
            expect(itemHanger).toBeTruthy();
            expect(itemHanger).not.toHaveClass('bottom');

            // simulate resizeObserve action on toolbars wrapper
            container
                .querySelector('.floating-toolbars-wrapper')
                .dispatchEvent(new CustomEvent('resized', { detail: { height: 100 } }));

            const toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
            toolsStore.setTestToolState('highlighter', {
                open: true
            });

            return tick().then(() => {
                expect(button).toHaveClass('toggled');
                expect(itemHanger).toHaveClass('bottom');
            });
        });
    });

    describe('NotificationContainer', () => {
        it('can render and remove notifications', () => {
            const { container } = render(TestLayout, {
                props: {
                    serviceCallId
                }
            });
            expect(container.querySelector('.notification-container-wrapper')).toBeInTheDocument();
            expect(document.querySelectorAll('.notification-wrapper').length).toBe(0);

            const notifKey = showNotification({
                message: 'hello world',
                hierarchy: 'success'
            });

            return tick()
                .then(() => {
                    expect(container.querySelector('.notification-container-wrapper')).toMatchSnapshot();
                    expect(document.querySelectorAll('.notification-wrapper').length).toBe(1);

                    removeNotification(notifKey);

                    return tick();
                })
                .then(() => {
                    expect(document.querySelectorAll('.notification-wrapper').length).toBe(0);
                });
        });

        it('clears notifications on destroy', () => {
            showNotification({
                message: 'hello world',
                hierarchy: 'success'
            });

            const { container, component } = render(TestLayout, {
                props: {
                    serviceCallId
                }
            });

            return tick()
                .then(() => {
                    expect(container.querySelector('.notification-container-wrapper')).toBeInTheDocument();
                    expect(document.querySelectorAll('.notification-wrapper').length).toBe(1);
                })
                .then(() => {
                    component.$destroy();
                    render(TestLayout, {
                        props: {
                            serviceCallId
                        }
                    });
                    return tick();
                })
                .then(() => {
                    expect(document.querySelectorAll('.notification-wrapper').length).toBe(0);
                });
        });
    });
});
