// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import itemsSessionStatusStore, { getItemSessionStatusStore } from '../itemsSessionStatusStore.js';

describe('itemSessionStatusStore', () => {
    afterEach(() => {
        itemsSessionStatusStore.clear();
    });

    it('should fail without an itemIdentifier', () => {
        expect(() => getItemSessionStatusStore()).toThrow(TypeError);
    });

    it('should return an initial status', () => {
        const sessionStatusStore = getItemSessionStatusStore('foo');
        expect(sessionStatusStore.get()).toEqual('initial');
    });

    it('should return a set status', () => {
        const sessionStatusStore = getItemSessionStatusStore('foo');
        sessionStatusStore.set('interacting');
        expect(sessionStatusStore.get()).toEqual('interacting');

        sessionStatusStore.set('closed');
        expect(sessionStatusStore.get()).toEqual('closed');
    });

    it('should throw with an invalid status', () => {
        const sessionStatusStore = getItemSessionStatusStore('foo');
        expect(() => sessionStatusStore.set('moving')).toThrow(TypeError);
    });

    it('should clear only one session state', () => {
        const fStatusStore = getItemSessionStatusStore('foo');
        const bStatusStore = getItemSessionStatusStore('bar');
        fStatusStore.set('interacting');
        bStatusStore.set('suspended');
        expect(fStatusStore.get()).toEqual('interacting');
        expect(bStatusStore.get()).toEqual('suspended');

        bStatusStore.clear();

        expect(fStatusStore.get()).toEqual('interacting');
        expect(bStatusStore.get()).toEqual('initial');
    });

    it('should notify about store changes', () => {
        const onChange = vi.fn();

        const sessionStatusStore = getItemSessionStatusStore('foo');
        sessionStatusStore.set('interacting');
        const unsubscribe = sessionStatusStore.subscribe(onChange);

        sessionStatusStore.set('review');
        expect(onChange).toHaveBeenLastCalledWith('review');
        expect(onChange).toHaveBeenCalledTimes(2);

        unsubscribe();
    });

    it('should not notify about store changes in another item state', () => {
        const onChange = vi.fn();
        const fStatusStore = getItemSessionStatusStore('foo');
        const bStatusStore = getItemSessionStatusStore('bar');
        fStatusStore.set('interacting');
        bStatusStore.set('suspended');
        const unsubscribe = fStatusStore.subscribe(onChange);

        bStatusStore.set('closed');
        expect(onChange).toHaveBeenCalledTimes(1); // only the inital call on subscribe

        bStatusStore.clear();
        expect(onChange).toHaveBeenCalledTimes(1); // only the inital call on subscribe

        unsubscribe();
    });

    it('isInteracting', () => {
        const sessionStatusStore = getItemSessionStatusStore('foo');
        sessionStatusStore.set('closed');
        expect(sessionStatusStore.isInteracting).toBe(false);

        sessionStatusStore.set('interacting');
        expect(sessionStatusStore.isInteracting).toBe(true);
    });

    it('isSuspended', () => {
        const sessionStatusStore = getItemSessionStatusStore('foo');
        sessionStatusStore.set('interacting');
        expect(sessionStatusStore.isSuspended).toBe(false);

        sessionStatusStore.set('suspended');
        expect(sessionStatusStore.isSuspended).toBe(true);
    });

    it('isClosed', () => {
        const sessionStatusStore = getItemSessionStatusStore('foo');
        sessionStatusStore.set('interacting');
        expect(sessionStatusStore.isClosed).toBe(false);

        sessionStatusStore.set('closed');
        expect(sessionStatusStore.isClosed).toBe(true);
    });

    it('isModalFeedback', () => {
        const sessionStatusStore = getItemSessionStatusStore('foo');
        sessionStatusStore.set('interacting');
        expect(sessionStatusStore.isModalFeedback).toBe(false);

        sessionStatusStore.set('modalFeedback');
        expect(sessionStatusStore.isModalFeedback).toBe(true);
    });
});
