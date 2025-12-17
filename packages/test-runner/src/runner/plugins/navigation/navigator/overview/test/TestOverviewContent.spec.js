// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import TestOverviewContent from '../TestOverviewContent.svelte';
import testsStateStore, { getTestStateStore } from '../../../../../testsStateStore.js';
import { getTimersStore, clearAllTimersStores } from '../../../../../timers/timersStore.js';
import preset from '../../test/testStoreMocks/overviewPreset.json';
import presetFourSectionsNonLinear from '../../test/testStoreMocks/presetFourSectionsNonLinear.json';

const severalSectionsPreset = {
    testContext: preset.testContext,
    testMap: preset.testMap
};

const oneSectionPreset = {
    testContext: Object.assign({}, preset.testContext, {
        testPartId: 'testPart-1',
        sectionId: 'assessmentSection-1',
        itemIdentifier: 'item-24',
        itemPosition: 0
    }),
    testMap: preset.testMap
};

describe('TestOverviewContent', () => {
    afterEach(() => {
        testsStateStore.clear();
        clearAllTimersStores();
    });

    it('fails to render without a serviceCallId', () => {
        expect(() => {
            render(TestOverviewContent, { props: {} });
        }).toThrowErrorMatchingSnapshot();
    });

    it('renders with empty store', () => {
        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId: 'abc'
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders steps with different states, grouped into sections, on 3 tabs, from current test part, and indicates current step', () => {
        const serviceCallId = 'test-12';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(severalSectionsPreset.testMap);
        stateStore.setTestContext(severalSectionsPreset.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders with bookmarks disabled', () => {
        const serviceCallId = 'test-12';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(severalSectionsPreset.testMap);
        stateStore.setTestContext(severalSectionsPreset.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId,
                allowBookmarks: false
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders without section header if only one section', () => {
        const serviceCallId = 'test-1r62';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(oneSectionPreset.testMap);
        stateStore.setTestContext(oneSectionPreset.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId
            }
        });

        expect(container).toMatchSnapshot();

        const headers = container.querySelectorAll('[role="tabpanel"] > .ui-heading');
        expect(headers.length).toBe(0);
    });

    it('renders in disabled state', () => {
        const serviceCallId = 'test-1r620';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(oneSectionPreset.testMap);
        stateStore.setTestContext(oneSectionPreset.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId,
                disabled: true
            }
        });
        return tick().then(() => {
            const stepButtons = container.querySelectorAll('button.step');
            const disabledStepButtons = container.querySelectorAll('button.step:disabled');
            expect(stepButtons.length).toBeGreaterThan(0);
            expect(disabledStepButtons.length).toEqual(stepButtons.length);
        });
    });

    it('disables unvisited', () => {
        const serviceCallId = 'test-1r620';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(presetFourSectionsNonLinear.testMap);
        stateStore.setTestContext(presetFourSectionsNonLinear.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId,
                disableUnvisited: true
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('gets timers state to render timed-out steps and sections', () => {
        const serviceCallId = 'test-1r620';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(severalSectionsPreset.testMap);
        stateStore.setTestContext(severalSectionsPreset.testContext);

        const timersStore = getTimersStore(serviceCallId);
        timersStore.initializeTimers([
            {
                level: 'item',
                id: 'item-21', //section-1
                timerValue: {
                    timeAssigned: 10000,
                    timeLeft: 0,
                    timeStr: '0s'
                }
            },
            {
                level: 'item',
                id: 'item-3', //section-1
                timerValue: {
                    timeAssigned: 70000,
                    timeLeft: 65000,
                    timeStr: '65s'
                }
            },
            {
                level: 'item',
                id: 'item-2', //assessmentSection-3
                timerValue: {
                    timeAssigned: 30000,
                    timeLeft: 0,
                    timeStr: '0s'
                }
            },
            {
                level: 'item',
                id: 'item-4', //assessmentSection-3
                timerValue: {
                    timeAssigned: 80000,
                    timeLeft: 75000,
                    timeStr: '75s'
                }
            },
            {
                level: 'section',
                id: 'section-1',
                timerValue: {
                    timeAssigned: 40000,
                    timeLeft: 0,
                    timeStr: '0s'
                }
            },
            {
                level: 'section',
                id: 'assessmentSection-3',
                timerValue: {
                    timeAssigned: 50000,
                    timeLeft: 30000,
                    timeStr: '30s'
                }
            },
            {
                level: 'extra',
                timerValue: {
                    timeAssigned: 0,
                    timeLeft: 0,
                    timeStr: '0s'
                }
            }
        ]);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId
            }
        });
        return tick()
            .then(() => {
                //first section timed out
                //second (active) section has max time left
                expect(container.querySelector('[role="tabpanel"]')).toMatchSnapshot();

                timersStore.updateTimeLeft([
                    {
                        level: 'item',
                        id: 'item-21', //section-1
                        timerValue: {
                            timeAssigned: 10000,
                            timeLeft: 10000,
                            timeStr: '10s'
                        }
                    },
                    {
                        level: 'item',
                        id: 'item-3', //section-1
                        timerValue: {
                            timeAssigned: 70000,
                            timeLeft: 0,
                            timeStr: '0s'
                        }
                    },
                    {
                        level: 'item',
                        id: 'item-2', //assessmentSection-3
                        timerValue: {
                            timeAssigned: 30000,
                            timeLeft: 5000,
                            timeStr: '5s'
                        }
                    },
                    {
                        level: 'item',
                        id: 'item-4', //assessmentSection-3
                        timerValue: {
                            timeAssigned: 80000,
                            timeLeft: 0,
                            timeStr: '0s'
                        }
                    },
                    {
                        level: 'section',
                        id: 'section-1',
                        timerValue: {
                            timeAssigned: 40000,
                            timeLeft: 40000,
                            timeStr: '40s'
                        }
                    },
                    {
                        level: 'section',
                        id: 'assessmentSection-3',
                        timerValue: {
                            timeAssigned: 50000,
                            timeLeft: 0,
                            timeStr: '0s'
                        }
                    },
                    {
                        level: 'extra',
                        timerValue: {
                            timeAssigned: 0,
                            timeLeft: 0,
                            timeStr: '0s'
                        }
                    }
                ]);
                return tick();
            })
            .then(() => {
                //first section has less-than-max time left
                //second (active) section timed out
                expect(container.querySelector('[role="tabpanel"]')).toMatchSnapshot();

                timersStore.updateTimeLeft([
                    {
                        level: 'item',
                        id: 'item-21', //section-1
                        timerValue: {
                            timeAssigned: 10000,
                            timeLeft: 10000,
                            timeStr: '10s'
                        }
                    },
                    {
                        level: 'item',
                        id: 'item-3', //section-1
                        timerValue: {
                            timeAssigned: 70000,
                            timeLeft: 10000,
                            timeStr: '10s'
                        }
                    },
                    {
                        level: 'item',
                        id: 'item-2', //assessmentSection-3
                        timerValue: {
                            timeAssigned: 30000,
                            timeLeft: 5000,
                            timeStr: '5s'
                        }
                    },
                    {
                        level: 'item',
                        id: 'item-4', //assessmentSection-3
                        timerValue: {
                            timeAssigned: 80000,
                            timeLeft: 10000,
                            timeStr: '10s'
                        }
                    },
                    {
                        level: 'section',
                        id: 'section-1',
                        timerValue: {
                            timeAssigned: 40000,
                            timeLeft: 40000,
                            timeStr: '40s'
                        }
                    },
                    {
                        level: 'section',
                        id: 'assessmentSection-3',
                        timerValue: {
                            timeAssigned: 50000,
                            timeLeft: 0,
                            timeStr: '0s'
                        }
                    },
                    {
                        level: 'extra',
                        timerValue: {
                            timeAssigned: 8000,
                            timeLeft: 3000,
                            timeStr: '3s'
                        }
                    }
                ]);
                return tick();
            })
            .then(() => {
                //second section shows info about extra-time
                const headers = Array.from(container.querySelectorAll('[role="tabpanel"] .tabpanel-heading'));
                expect(headers[0]).toMatchSnapshot();
                expect(headers[1]).toMatchSnapshot();
            });
    });

    it('changes shown content on tab change', () => {
        const serviceCallId = 'test-azf62';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(oneSectionPreset.testMap);
        stateStore.setTestContext(oneSectionPreset.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            const tabs = container.querySelectorAll('[role="tab"]');
            const tabpanels = container.querySelectorAll('[role="tabpanel"]');
            const expectHidden = (index, value) => {
                expect(tabpanels[index].classList.contains('hidden')).toBe(value);
            };

            expectHidden(0, false);
            expectHidden(1, true);
            expectHidden(2, true);

            fireEvent.click(tabs[1]);

            return tick().then(() => {
                expectHidden(0, true);
                expectHidden(1, false);
                expectHidden(2, true);
            });
        });
    });

    it('fires move event', () => {
        const serviceCallId = 'test-1ax2';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(severalSectionsPreset.testMap);
        stateStore.setTestContext(severalSectionsPreset.testContext);

        const { component, container } = render(TestOverviewContent, {
            props: {
                serviceCallId
            }
        });

        const onmove = vi.fn();
        component.$on('move', onmove);

        return tick()
            .then(() => {
                const step = container.querySelectorAll('[role="tabpanel"] button')[6];
                fireEvent.click(step);

                return tick();
            })
            .then(() => {
                expect(onmove).toHaveBeenCalled();
                const eventDetails = onmove.mock.calls[0][0].detail;
                expect(eventDetails.position).toEqual(7);
            });
    });

    it('disables non viewed item when nonLinearRestricted is true', async () => {
        const serviceCallId = 'test-nonlinear-restricted';
        const stateStore = getTestStateStore(serviceCallId);

        const modifiedPreset = JSON.parse(JSON.stringify(presetFourSectionsNonLinear));

        stateStore.setTestMap(modifiedPreset.testMap);
        stateStore.setTestContext(modifiedPreset.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId,
                nonLinearRestricted: true
            }
        });

        await tick();

        const steps = container.querySelectorAll('.tabpanel:not(.hidden) .step');
        expect(steps.length).toBe(20);

        // step 0, 1 is viewed true; so currently is on step 2, so tep 0,1,2,3 have to be enabled
        expect(steps[0].classList.contains('disabled')).toBe(false);
        expect(steps[1].classList.contains('disabled')).toBe(false);
        expect(steps[2].classList.contains('disabled')).toBe(false);
        expect(steps[3].classList.contains('disabled')).toBe(false);
        expect(steps[4].classList.contains('disabled')).toBe(true);

        // Check that all remaining steps are disabled
        for (let i = 5; i < steps.length; i++) {
            expect(steps[i].classList.contains('disabled')).toBe(true);
        }
    });
});
