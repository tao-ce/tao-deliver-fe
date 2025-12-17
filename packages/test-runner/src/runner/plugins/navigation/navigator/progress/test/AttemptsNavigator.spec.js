// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { getTestStateStore } from '../../../../../testsStateStore.js';
import AttemptsNavigator from '../AttemptsNavigator.svelte';
import presetOneSection from '../../test/testStoreMocks/presetOneSectionLinear.json';

// One store sets up the component for all tests, we won't change the initial value
const serviceCallId = 'foo';
const stateStore = getTestStateStore(serviceCallId);
stateStore.setTestMap(presetOneSection.testMap);
stateStore.setTestContext(presetOneSection.testContext);

describe('AttemptsNavigator rendering', () => {
    it('renders numeric counter and no overview in linear attempts mode', () => {
        const { container } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: true,
                    remainingAttempts: 1,
                    allowed: {
                        attempt: true
                    }
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders overview and no numeric counter in non-linear attempts mode', () => {
        const { container } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    canNavigateFreely: true,
                    remainingAttempts: 1,
                    allowed: {
                        attempt: true,
                        overview: true
                    }
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders previous & skip buttons on non-linear attempt', () => {
        const { container } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    canNavigateFreely: true,
                    remainingAttempts: 1,
                    allowed: {
                        previous: true,
                        attempt: true,
                        skip: true
                    }
                }
            }
        });
        expect(container.querySelector('.center button[name="prev"]')).toBeInTheDocument();
        expect(container.querySelector('.center button[name="skip"]')).toBeInTheDocument();
    });

    it('renders central next question button when attempts are over', () => {
        const { container } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    remainingAttempts: 0,
                    allowed: {
                        attemptsDone: true,
                        skip: true
                    }
                }
            }
        });
        expect(container.querySelector('.center button[name="next"]')).toBeInTheDocument();
    });

    it('renders skip and attempt buttons on linear attempt', () => {
        const { container } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: true,
                    remainingAttempts: 1,
                    allowed: {
                        attempt: true,
                        skip: true
                    }
                }
            }
        });
        expect(container.querySelector('.end button[name="skip"]')).toBeInTheDocument();
        expect(container.querySelector('.end button[name="attempt"]')).toBeInTheDocument();
    });

    it('renders attempt button on non-linear attempt', () => {
        const { container } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    remainingAttempts: 1,
                    allowed: {
                        attempt: true,
                        skip: true
                    }
                }
            }
        });
        expect(container.querySelector('.end button[name="attempt"]')).toBeInTheDocument();
    });

    it('renders next question button when attempts are over', () => {
        const { container } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    remainingAttempts: 0,
                    allowed: {
                        attemptsDone: true,
                        skip: true
                    }
                }
            }
        });
        expect(container.querySelector('.end button[name="next"]')).toBeInTheDocument();
    });

    it('renders submit test part button', () => {
        const { container } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    canNavigateFreely: true,
                    isLast: true,
                    remainingAttempts: 0,
                    allowed: {
                        attemptsDone: true,
                        finishTestPart: true
                    }
                }
            }
        });
        expect(container.querySelector('.end button[name="submit"]')).toBeInTheDocument();
    });

    it('renders finish test button', () => {
        const { container } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    canNavigateFreely: true,
                    isLast: true,
                    remainingAttempts: 0,
                    allowed: {
                        attemptsDone: true,
                        finishTest: true
                    }
                }
            }
        });
        expect(container.querySelector('.end button[name="finish"]')).toBeInTheDocument();
    });
});

describe('AttemptsNavigator events', () => {
    /**
     * Button event listener assertion helper
     * @param {SvelteComponent} component
     * @param {DOMElement} container
     * @param {String} buttonName
     * @param {String} eventName
     * @returns {Promise} mock function - remember to return this value in tests, so Jest will wait for it!
     */
    function expectNamedButtonToDispatch(component, container, buttonName, eventName) {
        const button = container.querySelector(`button[name="${buttonName}"]`);
        const onclicked = vi.fn();
        component.$on(eventName, onclicked);
        fireEvent.click(button);

        return tick().then(() => {
            expect(onclicked).toHaveBeenCalled();
            return onclicked;
        });
    }

    it('fires overview event', () => {
        const { container, component } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    canNavigateFreely: true,
                    remainingAttempts: 1,
                    allowed: {
                        attempt: true,
                        overview: true
                    }
                }
            }
        });

        return expectNamedButtonToDispatch(component, container, 'overview', 'overview');
    });

    it('fires skip previous event', () => {
        const { container, component } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    canNavigateFreely: true,
                    remainingAttempts: 1,
                    allowed: {
                        previous: true,
                        attempt: true,
                        skip: true
                    }
                }
            }
        });

        expect.assertions(2);
        return expectNamedButtonToDispatch(component, container, 'prev', 'skip').then(onclicked => {
            expect(onclicked.mock.calls[0][0].detail).toStrictEqual({ direction: 'previous' });
        });
    });

    it('fires skip next event', () => {
        const { container, component } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    canNavigateFreely: true,
                    remainingAttempts: 1,
                    allowed: {
                        previous: true,
                        attempt: true,
                        skip: true
                    }
                }
            }
        });

        expect.assertions(2);
        return expectNamedButtonToDispatch(component, container, 'skip', 'skip').then(onclicked => {
            expect(onclicked.mock.calls[0][0].detail).toStrictEqual({ direction: 'next' });
        });
    });

    it('fires attempt event', () => {
        const { container, component } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    remainingAttempts: 1,
                    allowed: {
                        attempt: true
                    }
                }
            }
        });

        return expectNamedButtonToDispatch(component, container, 'attempt', 'attempt');
    });

    it('fires next event', () => {
        const { container, component } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    remainingAttempts: 0,
                    allowed: {
                        attemptsDone: true,
                        skip: true
                    }
                }
            }
        });

        expect.assertions(2);

        const centerContainer = container.querySelector('.button-container.center');
        return expectNamedButtonToDispatch(component, centerContainer, 'next', 'next').then(() => {
            const endContainer = container.querySelector('.button-container.end');
            return expectNamedButtonToDispatch(component, endContainer, 'next', 'skip');
        });
    });

    it('fires submitpart event', () => {
        const { container, component } = render(AttemptsNavigator, {
            props: {
                serviceCallId,
                navigationState: {
                    isLinear: false,
                    canNavigateFreely: true,
                    isLast: true,
                    remainingAttempts: 0,
                    allowed: {
                        attemptsDone: true,
                        finishTest: true
                    }
                }
            }
        });

        return expectNamedButtonToDispatch(component, container, 'finish', 'submitpart');
    });
});

describe('AttemptsNavigator behaviour', () => {
    it('updates rendered counter value on store change', () => {
        const stateStore1 = getTestStateStore('foo1');
        stateStore1.setTestMap({
            parts: {
                TP01: {
                    position: 0,
                    stats: {
                        questionsViewed: 1,
                        viewed: 1,
                        total: 3
                    }
                }
            }
        });
        stateStore1.setTestContext({
            itemIdentifier: 'item-1-Yohann',
            testPartId: 'TP01',
            sectionId: 'S01',
            itemPosition: 0
        });

        const { container } = render(AttemptsNavigator, {
            props: {
                serviceCallId: 'foo1',
                navigationState: {
                    isLinear: true,
                    allowed: {}
                }
            }
        });

        expect(container.querySelector('.counter')).toBeInTheDocument();
        expect(container.querySelector('.counter').innerHTML).toEqual('1 / 3');

        // simulate move
        stateStore1.setTestContext({
            itemIdentifier: 'item-2-Yohann',
            testPartId: 'TP01',
            sectionId: 'S01',
            itemPosition: 1
        });

        return tick().then(() => {
            expect(container.querySelector('.counter')).toBeInTheDocument();
            expect(container.querySelector('.counter').innerHTML).toEqual('2 / 3');
        });
    });
});
