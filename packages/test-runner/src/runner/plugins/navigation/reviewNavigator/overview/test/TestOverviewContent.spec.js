// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2026 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import TestOverviewContent from '../TestOverviewContent.svelte';
import testsStateStore, { getTestStateStore } from '../../../../../testsStateStore.js';
import preset from '../../../navigator/test/testStoreMocks/overviewPreset.json';
import presetWithScoreWithoutCutScore from '../../test/testStoreMocks/overviewPresetWithScoreWithoutCutScore.json';
import presetWithScoreWithCutScorePassed from '../../test/testStoreMocks/overviewPresetWithScoreWithCutScorePassed.json';
import presetWithScoreWithCutScoreFailed from '../../test/testStoreMocks/overviewPresetWithScoreWithCutScoreFailed.json';
import { cloneDeep, each } from 'lodash';

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

    it('renders steps with review states, grouped into parts / sections, and indicates current step', () => {
        const serviceCallId = 'test-12';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(severalSectionsPreset.testMap);
        stateStore.setTestContext(severalSectionsPreset.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId
            }
        });

        expect(container.querySelector('.tabpanel:not(.hidden)')).toMatchSnapshot();
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

        const headers = container.querySelectorAll('[role="tabpanel"] > .ui-heading');
        expect(headers.length).toBe(0);
        expect(container.querySelector('.tabs [role="tab"][aria-selected="true"]')).toHaveTextContent('all questions');
        expect(container.querySelector('.tabpanel:not(.hidden) .step')).toBeInTheDocument();
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
                expect(eventDetails.position).toEqual(6);
            });
    });

    it('renders total score without cut score', () => {
        const serviceCallId = 'test-123';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(presetWithScoreWithoutCutScore.testMap);
        stateStore.setTestContext(presetWithScoreWithoutCutScore.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId,
                showScore: true
            }
        });

        expect(container.querySelector('.total-score')).toMatchSnapshot();
        expect(container.querySelector('.total-score')).toMatchSnapshot();
    });

    it('renders total score with cut score passed', () => {
        const serviceCallId = 'test-123';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(presetWithScoreWithCutScorePassed.testMap);
        stateStore.setTestContext(presetWithScoreWithCutScorePassed.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId,
                showScore: true
            }
        });

        expect(container.querySelector('.total-score')).toMatchSnapshot();
        expect(container.querySelector('.total-score')).toMatchSnapshot();
    });

    it('renders total score with cut score failed', () => {
        const serviceCallId = 'test-123';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(presetWithScoreWithCutScoreFailed.testMap);
        stateStore.setTestContext(presetWithScoreWithCutScoreFailed.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId,
                showScore: true
            }
        });

        expect(container.querySelector('.total-score')).toMatchSnapshot();
        expect(container.querySelector('.total-score')).toMatchSnapshot();
    });

    it('renders if waitingForExternalScore with inline notification and no total score', () => {
        const testMap = cloneDeep(presetWithScoreWithoutCutScore.testMap);
        const sampleItem = testMap.parts['testPart-2'].sections['assessmentSection-3'].items['item-1'];
        sampleItem.externalScored = true;
        sampleItem.score = null;
        sampleItem.maxScore = 2;

        const serviceCallId = 'test-123';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(testMap);
        stateStore.setTestContext(presetWithScoreWithoutCutScore.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId,
                showScore: true
            }
        });

        expect(container.querySelector('.inline-notification')).toBeInTheDocument();
        expect(container.querySelector('.inline-notification')).toHaveTextContent(
            'There are still questions waiting to be scored'
        );
        expect(container.querySelector('.inline-notification')).toHaveTextContent(
            'Your total score cannot be calculated until all of the questions have been scored. Please come back later to see your total score.'
        );
        expect(container.querySelector('.total-score')).not.toBeInTheDocument();
        expect(container.querySelectorAll('.tabs [role="tab"]')).toHaveLength(2);
    });

    it('renders score without max score', () => {
        const testMap = cloneDeep(presetWithScoreWithoutCutScore.testMap);
        each(testMap.parts, ({ sections }) =>
            each(sections, ({ items }) => each(items, item => (item.maxScore = undefined)))
        );

        const serviceCallId = 'test-123';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(testMap);
        stateStore.setTestContext(presetWithScoreWithoutCutScore.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId,
                showScore: true
            }
        });

        expect(container.querySelector('.total-score')).toMatchSnapshot();
    });

    it('renders steps with correct state based on score', () => {
        const serviceCallId = 'test-123';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(presetWithScoreWithoutCutScore.testMap);
        stateStore.setTestContext(presetWithScoreWithoutCutScore.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId,
                showScore: true
            }
        });

        expect(container.querySelector('.tabpanel:not(.hidden)')).toMatchSnapshot();
    });

    it('renders steps with default state if score related state should not be shown', () => {
        const serviceCallId = 'test-123';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(presetWithScoreWithoutCutScore.testMap);
        stateStore.setTestContext(presetWithScoreWithoutCutScore.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId
            }
        });

        expect(container.querySelector('.tabpanel:not(.hidden)')).toMatchSnapshot();
    });

    it('renders incorrect tab and only incorrect elements on incorrect tab', () => {
        const serviceCallId = 'test-123';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(presetWithScoreWithoutCutScore.testMap);
        stateStore.setTestContext(presetWithScoreWithoutCutScore.testContext);

        const { container } = render(TestOverviewContent, {
            props: {
                serviceCallId,
                showScore: true
            }
        });

        const incorrectTabButton = document.querySelectorAll('.tabs [role="tab"]')[1];
        fireEvent.click(incorrectTabButton);

        return tick().then(() => {
            expect(container.querySelector('.tabpanel:not(.hidden)')).toMatchSnapshot();
        });
    });
});
