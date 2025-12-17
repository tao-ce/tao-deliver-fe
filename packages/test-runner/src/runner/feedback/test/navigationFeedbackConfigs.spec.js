// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import {
    confirmSkipConfig,
    confirmSubmitConfig,
    confirmUnsavedAttemptConfig,
    alertInvalidConfig,
    alertRequiredConfig,
    confirmTimerTimeoutConfig,
    alertProctorTerminateTestConfig,
    alertProctorPauseConfig,
    securityConfig
} from '../navigationFeedbackConfigs.js';

describe('navigationFeedbackConfig', () => {
    it('returns confirmSubmit config for linear test', () => {
        const testPart = {
            isLinear: true,
            position: 0,
            sections: {
                section1: {
                    id: 'section1',
                    items: {
                        item1: {}
                    }
                }
            }
        };
        const testMap = {
            parts: {
                part1: testPart
            }
        };
        expect(confirmSubmitConfig(testMap, testPart)).toStrictEqual({
            heading: 'You have reached the end of the test. Are you sure you want to submit the test for scoring?',
            message: '',
            buttons: [
                {
                    key: 'cancel',
                    skin: 'secondary',
                    label: 'Review my answers',
                    dataTestId: 'cancel'
                },
                {
                    key: 'proceed',
                    skin: 'primary',
                    label: 'Submit the Test',
                    dataTestId: 'submitpart',
                    initialFocus: true
                }
            ]
        });
    });

    it('returns confirmSubmit config for non-linear test', () => {
        const testPart = {
            isLinear: false,
            position: 0,
            sections: {
                section1: {
                    id: 'section1',
                    items: {
                        item1: {}
                    }
                }
            }
        };
        const testMap = {
            parts: {
                part1: testPart,
                part2: {
                    position: 1
                }
            }
        };

        const noIncompleteConfig = {
            heading: 'Are you sure you want to submit this part and proceed to the next one?',
            message: `You won't be able to go back to review or change your answers after submission.`,
            buttons: [
                {
                    key: 'cancel',
                    skin: 'secondary',
                    label: 'Review my answers',
                    dataTestId: 'cancel'
                },
                {
                    key: 'proceed',
                    skin: 'primary',
                    label: 'Submit and proceed',
                    dataTestId: 'submitpart',
                    initialFocus: true
                }
            ]
        };
        const withIncompleteConfig = {
            heading: 'Are you sure you want to submit this part and proceed to the next one?',
            message: `You still have 1 incomplete questions. If you submit this part you won't be able to go back to complete unanswered questions or change your answers.`,
            buttons: [
                {
                    key: 'proceed',
                    skin: 'secondary',
                    label: 'Submit and proceed',
                    dataTestId: 'submitpart'
                },
                {
                    key: 'cancel',
                    skin: 'primary',
                    label: 'Keep answering',
                    dataTestId: 'cancel',
                    initialFocus: true
                }
            ]
        };

        testPart.sections['section1'].items['item1'] = {
            informational: false,
            answered: true,
            viewed: true
        };
        expect(confirmSubmitConfig(testMap, testPart)).toStrictEqual(noIncompleteConfig);

        testPart.sections['section1'].items['item1'] = {
            informational: true,
            answered: false,
            viewed: false
        };
        expect(confirmSubmitConfig(testMap, testPart)).toStrictEqual(noIncompleteConfig);

        testPart.sections['section1'].items['item1'] = {
            informational: false,
            answered: false,
            viewed: true
        };
        expect(confirmSubmitConfig(testMap, testPart)).toStrictEqual(withIncompleteConfig);

        testPart.sections['section1'].items['item1'] = {
            informational: false,
            answered: false,
            viewed: false
        };
        expect(confirmSubmitConfig(testMap, testPart)).toStrictEqual(withIncompleteConfig);
    });

    it('returns confirmSkip config', () => {
        const item = {
            remainingAttempts: 5
        };
        expect(confirmSkipConfig(item)).toStrictEqual({
            heading: 'Are you sure you want to skip this question?',
            message: `You still have 5 attempts left. You won't be able to change your answer later if you skip this question.`,
            buttons: [
                {
                    key: 'cancel',
                    skin: 'secondary',
                    label: 'Keep attempting',
                    dataTestId: 'keepattempting'
                },
                {
                    key: 'proceed',
                    skin: 'primary',
                    label: 'Skip the question',
                    dataTestId: 'skipquestion',
                    initialFocus: true
                }
            ]
        });
    });

    it('returns confirmUnsavedAttempt config', () => {
        let item = {
            remainingAttempts: 5,
            maxAttempts: 5
        };
        expect(confirmUnsavedAttemptConfig(item)).toStrictEqual({
            heading: 'You have not made any attempt yet with your answer.',
            message: 'If you move away your last answer will be lost when you come back.',
            buttons: [
                {
                    key: 'cancel',
                    skin: 'secondary',
                    label: 'Stay',
                    dataTestId: 'cancel'
                },
                {
                    key: 'proceed',
                    skin: 'primary',
                    label: 'Move away',
                    dataTestId: 'moveaway',
                    initialFocus: true
                }
            ]
        });

        item = {
            remainingAttempts: 5,
            maxAttempts: 4
        };
        expect(confirmUnsavedAttemptConfig(item)).toStrictEqual({
            heading: 'You have changed your answer since your last attempt.',
            message: 'If you move away your last answer will be lost when you come back.',
            buttons: [
                {
                    key: 'cancel',
                    skin: 'secondary',
                    label: 'Stay',
                    dataTestId: 'cancel'
                },
                {
                    key: 'proceed',
                    skin: 'primary',
                    label: 'Move away',
                    dataTestId: 'moveaway',
                    initialFocus: true
                }
            ]
        });
    });

    it('returns alertInvalid config', () => {
        expect(alertInvalidConfig()).toStrictEqual({
            heading: 'Your answer is not valid.',
            message: 'Please provide a valid answer.',
            buttons: [{ key: 'cancel', skin: 'primary', label: 'Ok', dataTestId: 'invalidanswer' }]
        });
    });

    it('returns alertRequired config', () => {
        expect(alertRequiredConfig()).toStrictEqual({
            heading: 'An answer is required before leaving this question.',
            message: 'You will be able to navigate away once you answer the question.',
            buttons: [{ key: 'cancel', skin: 'primary', label: 'Ok', dataTestId: 'answerrequired' }]
        });
    });

    describe('returns confirmTimerTimeout config', () => {
        test.each([
            // test scope
            ['test', ['linearPart']], // t1
            ['test', []], // t1
            // // part scope
            ['testPart', ['linearPart', 'lastPartInTest']], // tp1
            ['testPart', ['linearPart']], // tp2
            ['testPart', ['lastPartInTest']], // tp3
            ['testPart', []], // tp4
            // // section scope
            ['section', ['linearPart', 'timeLeftAheadInPart']], // s1
            ['section', ['linearPart', 'lastPartInTest']], // s2
            ['section', ['linearPart']], // s3
            ['section', ['timeLeftInPart', 'timeLeftAheadInPart']], // s4
            ['section', ['timeLeftInPart', 'lastPartInTest']], // s5
            ['section', ['timeLeftInPart']], // s6
            ['section', ['lastPartInTest']], // s7
            ['section', []], // s8
            // item scope
            ['item', ['linearPart', 'timeLeftAheadInPart']], // i1
            ['item', ['linearPart', 'lastPartInTest']], // i2
            ['item', ['linearPart']], // i3
            ['item', ['timeLeftInPart', 'timeLeftAheadInPart']], // i4
            ['item', ['timeLeftInPart', 'lastPartInTest']], // i5
            ['item', ['timeLeftInPart']], // i6
            ['item', ['lastPartInTest']], // i7
            ['item', []] // i8
        ])('returns correct config for scope "%s" and true props: %s', (timedOutScope, trueProps = []) => {
            const config = {
                timedOutScope,
                timeLeftInPart: trueProps.includes('timeLeftInPart'),
                timeLeftAheadInPart: trueProps.includes('timeLeftAheadInPart'),
                lastPartInTest: trueProps.includes('lastPartInTest'),
                linearPart: trueProps.includes('linearPart')
            };
            expect(confirmTimerTimeoutConfig(config)).toMatchSnapshot();
        });
    });

    it('returns alertProctorTerminate & alertProctorPause config', () => {
        expect(alertProctorTerminateTestConfig()).toMatchSnapshot();
        expect(alertProctorPauseConfig(true)).toMatchSnapshot();
        expect(alertProctorPauseConfig(false)).toMatchSnapshot();
    });

    describe('securityConfig', () => {
        it('returns security config for forceFullscreen', () => {
            expect(securityConfig('forceFullscreen')).toStrictEqual({
                heading: '',
                message: 'This test needs to be taken in full screen mode',
                type: 'security'
            });
        });

        it('returns security config for pauseOnBlur', () => {
            expect(securityConfig('pauseOnBlur')).toStrictEqual({
                heading: '',
                message: 'Leaving the test window is not allowed',
                type: 'security'
            });
        });
    });
});
