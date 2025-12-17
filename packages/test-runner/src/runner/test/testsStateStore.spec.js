// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import testsStateStore, { getTestStateStore, getTestSessionStatusStore } from '../testsStateStore';

const testMap = {
    title: 'foo',
    parts: {
        p1: {
            id: 'p1',
            sections: {
                s1: {
                    label: 'Section 1',
                    items: {
                        i1: {
                            label: 'item 1',
                            position: 0,
                            answered: false
                        }
                    }
                }
            }
        }
    }
};

describe('testStateStore', () => {
    afterEach(() => {
        testsStateStore.clear();
    });

    it('should fail without a serviceCallId', () => {
        expect(() => getTestStateStore()).toThrow(TypeError);
    });

    it('should return an initial state', () => {
        const testStateStore = getTestStateStore('foo');
        expect(testStateStore.get()).toEqual({});
    });

    it('should return a set state', () => {
        const value = { someData: [12, 13] };
        const testStateStore = getTestStateStore('foo');
        testStateStore.set('a', value);
        expect(testStateStore.get()).toEqual({ a: value });
        expect(testStateStore.get('a')).toEqual(value);
    });

    it('should support multiple session states', () => {
        const value = { someOtherData: [11, 7] };
        const fooTestStateStore = getTestStateStore('foo');
        const barTestStateStore = getTestStateStore('bar');

        barTestStateStore.set('b', value);
        expect(barTestStateStore.get()).toEqual({ b: value });
        expect(fooTestStateStore.get()).toEqual({});
    });

    it('should clear the session state', () => {
        const value = [0, 1, 2, 3];
        const testStateStore = getTestStateStore('123456');

        testStateStore.set('value', value);

        expect(testStateStore.get()).toEqual({ value: value });

        testStateStore.clear();

        expect(testStateStore.get()).toEqual({});
    });

    it('should clear only one session state', () => {
        const fValue = { someOtherData: [1, 5] };
        const bValue = { someOtherData: [1, 5] };
        const fooTestStateStore = getTestStateStore('foo');
        const barTestStateStore = getTestStateStore('bar');

        fooTestStateStore.set('f', fValue);
        barTestStateStore.set('b', bValue);

        expect(fooTestStateStore.get()).toEqual({ f: fValue });
        expect(barTestStateStore.get()).toEqual({ b: bValue });

        fooTestStateStore.clear();

        expect(fooTestStateStore.get()).toEqual({});
        expect(barTestStateStore.get()).toEqual({ b: bValue });
    });

    it('should notify about store changes', () => {
        const onChange = vi.fn();
        const value = { someData: [12, 13] };
        const testStateStore = getTestStateStore('foo');
        const unsubscribe = testStateStore.subscribe(onChange);

        testStateStore.set('value', value);
        expect(onChange).toHaveBeenLastCalledWith({ value });
        expect(onChange).toHaveBeenCalledTimes(2); // there is an initial call on subscribe

        unsubscribe();
    });

    it('should notify about store changes only for a given serviceCallId', () => {
        const onChange1 = vi.fn();
        const onChange2 = vi.fn();
        const onChangeAll = vi.fn();
        const value = { someNewData: [true, 13] };
        const testStateStore1 = getTestStateStore('foo');
        const testStateStore2 = getTestStateStore('bar');
        const unsubscribe1 = testStateStore1.subscribe(onChange1);
        const unsubscribe2 = testStateStore2.subscribe(onChange2);

        const allUnsubscribe = testsStateStore.subscribe(onChangeAll);

        testStateStore1.set('value', value);
        expect(onChange1).toHaveBeenLastCalledWith({ value });
        expect(onChange1).toHaveBeenCalledTimes(2); // there is an initial call on subscribe

        expect(onChange2).toHaveBeenCalledTimes(1); //subscription call
        expect(onChangeAll).toHaveBeenCalledTimes(2);

        unsubscribe1();
        unsubscribe2();
        allUnsubscribe();
    });

    it('should stop listening after unsubscribe', () => {
        const onChange = vi.fn();
        const value = { someData: [12, 13] };
        const testStateStore = getTestStateStore('foo');
        const unsubscribe = testStateStore.subscribe(onChange);

        testStateStore.set('value', value);
        expect(onChange).toHaveBeenLastCalledWith({ value });
        expect(onChange).toHaveBeenCalledTimes(2);

        unsubscribe();

        expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('should access the testMap', () => {
        const testStateStore = getTestStateStore('test1');

        expect(testStateStore.getTestMap()).toEqual({});
        testStateStore.setTestMap(testMap);
        expect(testStateStore.getTestMap()).toEqual(testMap);
    });

    it('should access the testContext', () => {
        const testContext = { itemPosition: 12 };
        const testStateStore = getTestStateStore('test2');

        expect(testStateStore.getTestContext()).toEqual({});
        testStateStore.setTestContext(testContext);
        expect(testStateStore.getTestContext()).toEqual(testContext);
    });

    it('should get a test part by id', () => {
        const testStateStore = getTestStateStore('t0');
        testStateStore.setTestMap(testMap);

        expect(testStateStore.getTestPart()).toBeFalsy();
        expect(testStateStore.getTestPart('foo')).toBeFalsy();
        expect(testStateStore.getTestPart('p1')).toHaveProperty('id', 'p1');
    });

    it('should get the current test map', () => {
        const testStateStore = getTestStateStore('t0');
        testStateStore.setTestMap(testMap);

        expect(testStateStore.getCurrentTestPart()).toBeFalsy();

        testStateStore.setTestContext({ testPartId: 'foo' });
        expect(testStateStore.getCurrentTestPart()).toBeFalsy();

        testStateStore.setTestContext({ testPartId: 'p1' });
        expect(testStateStore.getCurrentTestPart()).toHaveProperty('id', 'p1');
    });

    it('should get a section by id', () => {
        const testStateStore = getTestStateStore('t1');
        testStateStore.setTestMap(testMap);

        expect(testStateStore.getSection()).toBeFalsy();
        expect(testStateStore.getSection('foo', 'bar')).toBeFalsy();
        expect(testStateStore.getSection('foo', 'p1')).toBeFalsy();
        expect(testStateStore.getSection('s1')).toBeFalsy();
        expect(testStateStore.getSection('s1', 'bar')).toBeFalsy();
        expect(testStateStore.getSection('s1', 'p1')).toHaveProperty('label', 'Section 1');
    });

    it('should get the current section', () => {
        const testStateStore = getTestStateStore('t0');
        testStateStore.setTestMap(testMap);

        expect(testStateStore.getCurrentSection()).toBeFalsy();

        testStateStore.setTestContext({ testPartId: 'foo', sectionId: 'bar' });
        expect(testStateStore.getCurrentSection()).toBeFalsy();

        testStateStore.setTestContext({
            testPartId: 'p1',
            sectionId: 's1'
        });
        expect(testStateStore.getCurrentSection()).toHaveProperty('label', 'Section 1');
    });

    it('should get an item by id', () => {
        const testStateStore = getTestStateStore('t2');
        testStateStore.setTestMap(testMap);

        expect(testStateStore.getItem()).toBeFalsy();
        expect(testStateStore.getItem('noz', 'foo', 'bar')).toBeFalsy();
        expect(testStateStore.getItem('noz', 's1', 'p1')).toBeFalsy();
        expect(testStateStore.getItem('item1')).toBeFalsy();
        expect(testStateStore.getItem('i1', 's1')).toBeFalsy();

        expect(testStateStore.getItem('i1', 's1', 'p1')).toHaveProperty('label', 'item 1');
    });

    it('should get the current item', () => {
        const testStateStore = getTestStateStore('t0');
        testStateStore.setTestMap(testMap);

        expect(testStateStore.getCurrentItem()).toBeFalsy();

        testStateStore.setTestContext({
            testPartId: 'foo',
            sectionId: 'bar',
            itemIdentifier: 'noz'
        });
        expect(testStateStore.getCurrentItem()).toBeFalsy();

        testStateStore.setTestContext({
            testPartId: 'p1',
            sectionId: 's1',
            itemIdentifier: 'i1'
        });
        expect(testStateStore.getCurrentItem()).toHaveProperty('label', 'item 1');
    });
});

describe('testSessionStatusStore', () => {
    afterEach(() => {
        testsStateStore.clear();
    });

    it('should fail without a serviceCallId', () => {
        expect(() => getTestSessionStatusStore()).toThrow(TypeError);
    });

    it('should return an initial status', () => {
        const statusStore = getTestSessionStatusStore('foo');
        expect(statusStore.get()).toEqual('initial');
    });

    it('should return a set status', () => {
        const statusStore = getTestSessionStatusStore('foo');
        statusStore.set('interacting');
        expect(statusStore.get()).toEqual('interacting');

        statusStore.set('loading');
        expect(statusStore.get()).toEqual('loading');
    });

    it('should throw with an invalid status', () => {
        const statusStore = getTestSessionStatusStore('foo');
        expect(() => statusStore.set('moving')).toThrow(TypeError);
    });

    it('should clear only one session state', () => {
        const fStatusStore = getTestSessionStatusStore('foo');
        const bStatusStore = getTestSessionStatusStore('bar');
        fStatusStore.set('interacting');
        bStatusStore.set('loading');
        expect(fStatusStore.get()).toEqual('interacting');
        expect(bStatusStore.get()).toEqual('loading');

        bStatusStore.clear();

        expect(fStatusStore.get()).toEqual('interacting');
        expect(bStatusStore.get()).toEqual('initial');
    });

    it('should notify about store changes', () => {
        const onChange = vi.fn();

        const statusStore = getTestSessionStatusStore('foo');
        statusStore.set('interacting');
        const unsubscribe = statusStore.subscribe(onChange);

        statusStore.set('overlay');
        expect(onChange).toHaveBeenLastCalledWith('overlay');
        expect(onChange).toHaveBeenCalledTimes(2);

        unsubscribe();
    });

    it('returns correct values for "is" status queries', () => {
        const statusStore = getTestSessionStatusStore('foo');

        expect(statusStore.isInitial).toBe(true);
        expect(statusStore.isLoading).toBe(false);
        expect(statusStore.isInteracting).toBe(false);
        expect(statusStore.isOverlay).toBe(false);
        expect(statusStore.isProctorWait).toBe(false);

        statusStore.set('loading');
        expect(statusStore.isInitial).toBe(false);
        expect(statusStore.isLoading).toBe(true);
        statusStore.set('interacting');
        expect(statusStore.isLoading).toBe(false);
        expect(statusStore.isInteracting).toBe(true);
        statusStore.set('overlay');
        expect(statusStore.isInteracting).toBe(false);
        expect(statusStore.isOverlay).toBe(true);
        statusStore.set('proctorwait');
        expect(statusStore.isOverlay).toBe(false);
        expect(statusStore.isProctorWait).toBe(true);
        statusStore.set('initial');
        expect(statusStore.isProctorWait).toBe(false);
        expect(statusStore.isInitial).toBe(true);
    });
});
