// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
vi.mock('../../session/attempt.js');

import {
    showFeedback,
    showNavigationFeedback,
    checkNavigationFeedback,
    getNavigationFeedbacksStore,
    clearAllNavigationFeedbacksStores,
    getNavigationFeedbackConfig
} from '../navigationFeedback.js';
import preset from './navigationFeedbackPreset.json';
import { checkItemSubmission } from '../../session/attempt.js';
import { getConfigStore } from '../../config/configStore.js';

const serviceCallId = 'service-call-123';
let idx = { idx: 0 };

vi.mock('@oat-sa-private/ui-core', async () => {
    const originalModule = await vi.importActual('@oat-sa-private/ui-core');
    return Object.assign(
        {
            __esModule: true
        },
        originalModule,
        {
            generateElementId: nodeName => {
                idx.idx++;
                return `tao-${nodeName}-${idx.idx}`;
            },
            getLocale: () => 'en'
        }
    );
});

function setupSimple() {
    //any real preset so that calls to not-mocked feedback configs won't fail
    const testContext = preset.testContext;
    const testMap = preset.testMap;
    const testPart = testMap.parts[testContext.testPartId];
    const currentItem =
        testMap.parts[testContext.testPartId].sections[testContext.sectionId].items[testContext.itemIdentifier];
    return { testMap, testContext, testPart, currentItem };
}

beforeAll(() => {
    getConfigStore().set({ serviceCallId });
});
afterAll(() => {
    getConfigStore().clear();
});

describe('showFeedback', () => {
    const feedbacksStore = getNavigationFeedbacksStore(serviceCallId);
    const config = {
        heading: 'Header',
        message: 'Message',
        buttons: [{ key: 'ok1', label: 'Ok' }]
    };
    const feedbackTypeArgs = { feedbackTypeArg: 5 };

    afterEach(() => {
        feedbacksStore.clear();
    });

    it('adds feedback to store, returns a promise which resolves on feedback action', () =>
        new Promise(done => {
            expect(feedbacksStore.get()).toEqual({ feedbacksArray: [] });

            const promise = showFeedback(feedbackTypeArgs, config);
            expect(promise && typeof promise.then).toBe('function');
            promise.then(val => {
                expect(val).toBe('no2');
                expect(feedbacksStore.get()).toEqual({ feedbacksArray: [] });
                done();
            }); //leaves second feedback

            const feedbacksArray = feedbacksStore.get().feedbacksArray;
            expect(feedbacksArray.length).toBe(1);
            expect(typeof feedbacksArray[0].key === 'string' && feedbacksArray[0].key.length > 0).toBe(true);
            expect(feedbacksArray[0].feedbackTypeArgs).toEqual(feedbackTypeArgs);
            expect(feedbacksArray[0].config).toEqual(config);
            expect(typeof feedbacksArray[0].deferredPromise).toBe('object');
            expect(typeof feedbacksArray[0].deferredPromise.resolve).toBe('function');

            //resolve when somebody (FeedbackDialog[sContainer] component) calls `onDone`
            const onFeedbackDone = feedbacksStore.get().feedbacksArray[0].onDone;
            onFeedbackDone({ detail: { action: 'no2' } });
        }));

    it('can add a second feedback if one already exists', () =>
        new Promise(done => {
            expect(feedbacksStore.get()).toEqual({ feedbacksArray: [] });

            const promise1 = showFeedback(feedbackTypeArgs, config);
            expect(feedbacksStore.get().feedbacksArray.length).toBe(1);
            const key1 = feedbacksStore.get().feedbacksArray[0].key;
            promise1.then(() => {
                throw new Error('should not resolve');
            });

            const promise2 = showFeedback(feedbackTypeArgs, config);
            expect(feedbacksStore.get().feedbacksArray.length).toBe(2);
            const key2 = feedbacksStore.get().feedbacksArray[1].key;
            expect(key1 !== key2).toBe(true);
            promise2.then(() => {
                setTimeout(() => {
                    expect(feedbacksStore.get().feedbacksArray.length).toBe(1);
                    expect(feedbacksStore.get().feedbacksArray[0].key).toBe(key1);
                    done();
                }, 0);
            });

            const onFeedbackDone = feedbacksStore.get().feedbacksArray[1].onDone;
            onFeedbackDone({ detail: { action: 'no2' } });
        }));
});

describe('showNavigationFeedback', () => {
    const feedbacksStore = getNavigationFeedbacksStore(serviceCallId);

    afterEach(() => {
        feedbacksStore.clear();
    });

    it.each([
        [{ proceed: true }, 'proceed'],
        [{ proceed: false }, 'cancel'],
        [{ cancelled: true }, 'flowCancelled']
    ])(
        'resolves with %j for action:%s',
        (expectedResult, action) =>
            new Promise(done => {
                showNavigationFeedback(
                    { isSkipOnLinearTest: true },
                    {
                        header: 'my-header',
                        message: 'my-message',
                        buttons: [
                            {
                                key: action,
                                label: 'my-button'
                            }
                        ]
                    }
                ).then(val => {
                    expect(val).toEqual(expectedResult);
                    done();
                });

                expect(feedbacksStore.get().feedbacksArray.length).toBe(1);
                expect(feedbacksStore.get().feedbacksArray[0].config).toMatchSnapshot();
                feedbacksStore.get().feedbacksArray[0].onDone({ detail: { action: action } });
            })
    );
});

describe('getNavigationFeedbackConfig', () => {
    const feedbacksStore = getNavigationFeedbacksStore(serviceCallId);

    afterEach(() => {
        feedbacksStore.clear();
    });

    it('returns null when does not need to show feedback', () => {
        const { testMap, testPart, currentItem } = setupSimple();

        const feedbackArgs = {
            isRequiredAndNotAnswered: false,
            isAnsweredAndInvalid: false,
            isSubmitTestPart: false,
            isSkipOnLinearTest: false,
            isSkipOnNonLinearTestWithChanges: false
        };
        const config = getNavigationFeedbackConfig(feedbackArgs, { testMap, testPart, currentItem });
        expect(config).toBe(null);
    });

    it.each([
        ['alertInvalid', { isAnsweredAndInvalid: true }],
        ['alertRequired', { isRequiredAndNotAnswered: true }],
        ['confirmSubmit', { isSubmitTestPart: true }],
        ['confirmSkip', { isSkipOnLinearTest: true }],
        ['confirmUnsavedAttempt', { isSkipOnNonLinearTestWithChanges: true }],
        ['confirmTimerTimeout', { isTimerTimeout: true }],
        ['isPausedByProctor', { isPausedByProctor: true }],
        ['isTerminatedByProctor', { isTerminatedByProctor: true }]
    ])('returns config of specified type: %s', (feedbackConfigName, feedbackArgs) => {
        const { testMap, testPart, currentItem } = setupSimple();
        const config = getNavigationFeedbackConfig(feedbackArgs, { testMap, testPart, currentItem });
        expect(config).toMatchSnapshot();
    });
});

describe('checkNavigationFeedback', () => {
    function expectWithItemSubmissionMock(
        { canSkip, canSubmit, submitResponse, isLinear, isLeavingTestPart, isAnswerChanged, isTimerTimeout },
        expectPartial
    ) {
        const { testMap, testContext } = setupSimple();
        checkItemSubmission.mockImplementation(() => ({ canSkip, canSubmit }));
        const actualResult = checkNavigationFeedback({
            submitResponse,
            itemState: {},
            itemResponses: {},
            allowSkipping: false,
            validateResponses: false,
            submissionMode: 0,
            isLinear,
            isAnswerChanged,
            isTimerTimeout,
            moveParams: isLeavingTestPart
                ? { direction: 'next', scope: 'test' }
                : { scope: 'item', ref: testContext.itemPosition + 1 },
            testContext,
            testMap
        });
        if (expectPartial === null) {
            expect(actualResult).toBe(null);
        } else {
            const expectKey = Object.keys(expectPartial)[0];
            const expectValue = expectPartial[expectKey];
            if (actualResult) {
                expect(actualResult[expectKey]).toBe(expectValue);
            } else {
                expect(expectValue).toBe(false);
            }
        }
    }

    it('returns object of specified shape if need to show some feedback', () => {
        checkItemSubmission.mockImplementation(() => ({ canSkip: true, canSubmit: true }));
        const { testMap, testContext } = setupSimple();
        const actualResult = checkNavigationFeedback({
            submitResponse: true,
            itemState: {},
            itemResponses: {},
            allowSkipping: false,
            validateResponses: false,
            submissionMode: 0,
            isLinear: true,
            isAnswerChanged: false,
            isTimerTimeout: false,
            moveParams: { direction: 'next', scope: 'test' },
            testContext,
            testMap
        });
        expect(actualResult).toStrictEqual({
            isRequiredAndNotAnswered: false,
            isAnsweredAndInvalid: false,
            isSubmitTestPart: true,
            isSkipOnLinearTest: false,
            isSkipOnNonLinearTestWithChanges: false
        });
    });

    it('returns null if no feedback needed', () => {
        checkItemSubmission.mockImplementation(() => ({ canSkip: true, canSubmit: true }));
        const { testMap, testContext } = setupSimple();
        const actualResult = checkNavigationFeedback({
            submitResponse: true,
            itemState: {},
            itemResponses: {},
            allowSkipping: false,
            validateResponses: false,
            submissionMode: 0,
            isLinear: true,
            isAnswerChanged: false,
            isTimerTimeout: false,
            moveParams: { scope: 'item', ref: testContext.itemPosition + 1 },
            testContext,
            testMap
        });
        expect(actualResult).toBe(null);
    });

    it('passes correct arguments on internal checkItemSubmission call', () => {
        const spy = vi.fn(() => ({ canSkip: true, canSubmit: true }));
        checkItemSubmission.mockImplementation(spy);

        let itemResponses = { hello: 'hello' };
        let itemState = itemResponses;
        let allowSkipping = false;
        let validateResponses = true;
        let submissionMode = 0;
        const { testMap, testContext } = setupSimple();
        checkNavigationFeedback({
            submitResponse: true,
            itemState,
            itemResponses,
            allowSkipping,
            validateResponses,
            submissionMode,
            isLinear: false,
            isAnswerChanged: false,
            isTimerTimeout: false,
            moveParams: { scope: 'item', ref: testContext.itemPosition + 1 },
            testContext,
            testMap
        });

        expect(spy).toHaveBeenCalledWith(
            itemResponses,
            itemResponses,
            allowSkipping,
            validateResponses,
            submissionMode
        );

        itemResponses = {};
        itemState = itemResponses;
        allowSkipping = true;
        validateResponses = false;
        submissionMode = 1;
        checkNavigationFeedback({
            submitResponse: true,
            itemState,
            itemResponses,
            allowSkipping,
            validateResponses,
            submissionMode,
            isLinear: false,
            isAnswerChanged: false,
            isTimerTimeout: false,
            moveParams: { scope: 'item', ref: testContext.itemPosition + 1 },
            testContext,
            testMap
        });

        expect(spy).toHaveBeenCalledWith(
            itemResponses,
            itemResponses,
            allowSkipping,
            validateResponses,
            submissionMode
        );
    });

    it('checks for isRequiredAndNotAnswered feedback', () => {
        expectWithItemSubmissionMock(
            {
                canSkip: false,
                canSubmit: true,
                submitResponse: true,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isRequiredAndNotAnswered: true }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: false,
                canSubmit: true,
                submitResponse: false,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isRequiredAndNotAnswered: false }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: false,
                submitResponse: true,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isRequiredAndNotAnswered: false }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: true,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isRequiredAndNotAnswered: false }
        );
    });

    it('checks for isAnsweredAndInvalid feedback', () => {
        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: false,
                submitResponse: true,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isAnsweredAndInvalid: true }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: false,
                submitResponse: false,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isAnsweredAndInvalid: false }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: false,
                canSubmit: true,
                submitResponse: true,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isAnsweredAndInvalid: false }
        );
    });

    it('checks for isSubmitTestPart feedback', () => {
        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: true,
                isLinear: false,
                isLeavingTestPart: true,
                isAnswerChanged: false
            },
            { isSubmitTestPart: true }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: true,
                isLinear: true,
                isLeavingTestPart: true,
                isAnswerChanged: false
            },
            { isSubmitTestPart: true }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: false,
                isLinear: false,
                isLeavingTestPart: true,
                isAnswerChanged: false
            },
            { isSubmitTestPart: true }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: true,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isSubmitTestPart: false }
        );
    });

    it('checks for isSkipOnLinearTest feedback', () => {
        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: false,
                isLinear: true,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isSkipOnLinearTest: true }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: true,
                isLinear: true,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isSkipOnLinearTest: false }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: false,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isSkipOnLinearTest: false }
        );
    });

    it('checks for isSkipOnNonLinearTestWithChanges feedback', () => {
        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: false,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: true
            },
            { isSkipOnNonLinearTestWithChanges: true }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: false,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: false
            },
            { isSkipOnNonLinearTestWithChanges: false }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: true,
                isLinear: false,
                isLeavingTestPart: false,
                isAnswerChanged: true
            },
            { isSkipOnNonLinearTestWithChanges: false }
        );

        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: false,
                isLinear: true,
                isLeavingTestPart: false,
                isAnswerChanged: true
            },
            { isSkipOnNonLinearTestWithChanges: false }
        );
    });

    it('isTimerTimeout bypasses other feedbacks', () => {
        expectWithItemSubmissionMock(
            {
                canSkip: true,
                canSubmit: true,
                submitResponse: false,
                isLinear: true,
                isLeavingTestPart: false,
                isAnswerChanged: true,
                isTimerTimeout: true
            },
            null
        );
    });
});

describe('getNavigationFeedbacksStore', () => {
    afterEach(() => clearAllNavigationFeedbacksStores());

    it('should fail if not called with a serviceCallId', () => {
        expect(() => getNavigationFeedbacksStore()).toThrow(TypeError);
        expect(() => getNavigationFeedbacksStore(null)).toThrow(TypeError);
    });

    it('creates and returns a new store', () => {
        const store = getNavigationFeedbacksStore('abc');
        expect(store.subscribe).toBeTypeOf('function');
        expect(store.update).toBeTypeOf('function');
        expect(store.set).toBeTypeOf('function');
        expect(store.get).toBeTypeOf('function');
        expect(store.clear).toBeTypeOf('function');
        expect(store.cancel).toBeTypeOf('function');
        expect(store.isAnyShown).toBeTypeOf('function');
    });

    it('retrieves an existing store', () => {
        const store1 = getNavigationFeedbacksStore('def');
        store1.set({ foo: true });

        const store2 = getNavigationFeedbacksStore('def');
        expect(store1 === store2).toBe(true);
    });

    it('clear method', () => {
        const store1 = getNavigationFeedbacksStore('def');
        store1.set({ feedbacksArray: [{}, {}] });
        expect(store1.get()).toEqual({
            feedbacksArray: [{}, {}]
        });
        store1.clear();
        expect(store1.get()).toEqual({
            feedbacksArray: []
        });
    });

    it('cancel method', () => {
        const store1 = getNavigationFeedbacksStore('def');
        const feedbacksArray = [{ deferredPromise: { resolve: vi.fn() } }, { deferredPromise: { resolve: vi.fn() } }];
        store1.set({
            feedbacksArray
        });
        expect(store1.get()).toEqual({
            feedbacksArray
        });
        store1.cancel();
        expect(feedbacksArray[0].deferredPromise.resolve).toHaveBeenCalledWith('flowCancelled');
        expect(feedbacksArray[1].deferredPromise.resolve).toHaveBeenCalledWith('flowCancelled');
        expect(store1.get()).toEqual({
            feedbacksArray: []
        });
    });

    it('cancel method with filter', () => {
        const store1 = getNavigationFeedbacksStore('def');
        const initialFeedbacksArray = [
            { deferredPromise: { resolve: vi.fn() }, abc: 'a' },
            { deferredPromise: { resolve: vi.fn() }, abc: 'b' },
            { deferredPromise: { resolve: vi.fn() }, abc: 'c' },
            { deferredPromise: { resolve: vi.fn() }, abc: 'd' }
        ];
        store1.set({
            feedbacksArray: [...initialFeedbacksArray]
        });
        expect(store1.get()).toEqual({
            feedbacksArray: initialFeedbacksArray
        });
        store1.cancel(i => i.abc === 'b' || i.abc === 'c');
        expect(initialFeedbacksArray[0].deferredPromise.resolve).not.toHaveBeenCalled();
        expect(initialFeedbacksArray[1].deferredPromise.resolve).toHaveBeenCalledWith('flowCancelled');
        expect(initialFeedbacksArray[2].deferredPromise.resolve).toHaveBeenCalledWith('flowCancelled');
        expect(initialFeedbacksArray[3].deferredPromise.resolve).not.toHaveBeenCalled();
        expect(store1.get()).toEqual({
            feedbacksArray: [initialFeedbacksArray[0], initialFeedbacksArray[3]]
        });
    });

    it('disableButtons/enableButtons methods', () => {
        const store1 = getNavigationFeedbacksStore('def');
        const feedbacksArray = [{ config: { buttons: [{ key: 'A' }, { key: 'B' }] } }];
        store1.set({
            feedbacksArray
        });
        expect(store1.get()).toEqual({
            feedbacksArray
        });
        store1.disableButtons();
        expect(feedbacksArray[0].config.buttons[0].disabled).toBe(true);
        expect(feedbacksArray[0].config.buttons[1].disabled).toBe(true);

        store1.enableButtons();
        expect(feedbacksArray[0].config.buttons[0].disabled).toBe(false);
        expect(feedbacksArray[0].config.buttons[1].disabled).toBe(false);
    });

    it('disableButtons/enableButtons methods with filter', () => {
        const store1 = getNavigationFeedbacksStore('def');
        const feedbacksArray = [
            { config: { buttons: [{ key: 'A' }, { key: 'B' }] }, type: 'feedback' },
            { config: { buttons: [{ key: 'C' }] }, type: 'timeout' }
        ];
        store1.set({
            feedbacksArray
        });
        expect(store1.get()).toEqual({
            feedbacksArray
        });
        store1.disableButtons(fb => fb.type === 'timeout');
        expect(feedbacksArray[0].config.buttons[0].disabled).toBe(void 0);
        expect(feedbacksArray[0].config.buttons[1].disabled).toBe(void 0);
        expect(feedbacksArray[1].config.buttons[0].disabled).toBe(true);

        store1.enableButtons(fb => fb.type === 'timeout');
        expect(feedbacksArray[0].config.buttons[0].disabled).toBe(void 0);
        expect(feedbacksArray[0].config.buttons[1].disabled).toBe(void 0);
        expect(feedbacksArray[1].config.buttons[0].disabled).toBe(false);
    });

    it('isAnyShown method', () => {
        const store1 = getNavigationFeedbacksStore('def');
        expect(store1.isAnyShown()).toBe(false);

        store1.update(stored => {
            stored.feedbacksArray.push({});
            return stored;
        });
        expect(store1.isAnyShown()).toBe(true);

        store1.set({
            feedbacksArray: [{}, {}]
        });
        expect(store1.isAnyShown()).toBe(true);

        store1.set({
            feedbacksArray: []
        });
        expect(store1.isAnyShown()).toBe(false);
    });

    it('isSecurityShown method', () => {
        const store1 = getNavigationFeedbacksStore('def');
        expect(store1.isSecurityShown()).toBe(false);

        store1.set({
            feedbacksArray: [{}]
        });
        expect(store1.isSecurityShown()).toBe(false);

        store1.set({
            feedbacksArray: [{}, { config: { type: 'security' } }]
        });
        expect(store1.isSecurityShown()).toBe(true);
    });

    it('isTimeoutShown method', () => {
        const store1 = getNavigationFeedbacksStore('def');
        expect(store1.isTimeoutShown()).toBe(false);

        store1.set({
            feedbacksArray: [{}]
        });
        expect(store1.isTimeoutShown()).toBe(false);

        store1.set({
            feedbacksArray: [{}, { config: { type: 'timeout' } }]
        });
        expect(store1.isTimeoutShown()).toBe(true);
    });
});

describe('clearAllNavigationFeedbacksStores', () => {
    it('clears store contents', () => {
        const store1 = getNavigationFeedbacksStore('mno');
        const store2 = getNavigationFeedbacksStore('pqr');
        store1.set({ foo: true });
        store2.set({ bar: true });

        clearAllNavigationFeedbacksStores();

        expect(store1.get()).toEqual({
            feedbacksArray: []
        });
        expect(store2.get()).toEqual({
            feedbacksArray: []
        });
    });
});
