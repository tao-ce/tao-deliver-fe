// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import itemsStateStore, { getItemStateStore, getInteractionStateStore } from '../itemsStateStore.js';

describe('item state store', () => {
    const exampleItemState = {
        RESPONSE: { response: { base: { integer: 0 } }, player: { position: 0, muted: false, volume: 100 } },
        RESPONSE_3: { response: { base: { integer: 179000 } } },
        RESPONSE_1: { response: { list: { identifier: ['choice_2'] } } },
        RESPONSE_2: { foo: 'bar' }
    };

    afterEach(() => {
        itemsStateStore.clear();
    });

    it('should return empty object as initial state', () => {
        const itemStateStore = getItemStateStore('id');
        expect(Object.keys(itemStateStore.get()).length).toBe(0);
    });

    it('should provide previously stored data', () => {
        const itemStateStore = getItemStateStore('foo');
        itemStateStore.set(exampleItemState);

        expect(itemStateStore.get()).toMatchObject(exampleItemState);
    });

    it('should not provide cleared data', () => {
        const itemStateStore = getItemStateStore('bar');
        itemStateStore.set(exampleItemState);
        itemStateStore.clear();

        expect(Object.keys(itemStateStore.get()).length).toBe(0);
    });

    it('should notify about store changes', () => {
        const onChange = vi.fn();
        const itemStateStore = getItemStateStore('foo');
        const unsubscribe = itemStateStore.subscribe(onChange);

        itemStateStore.set(exampleItemState);
        expect(onChange).toHaveBeenLastCalledWith(exampleItemState);

        itemStateStore.clear();
        expect(onChange).toHaveBeenLastCalledWith({});

        unsubscribe();
        itemStateStore.set({ foo: 'bar' });
        expect(onChange).toHaveBeenCalledTimes(3); // there is an initial call on subscribe
    });

    it('should not notify about store changes in another item state', () => {
        const onChange = vi.fn();
        const itemStateStore = getItemStateStore('foo');
        const anotherItemStateStore = getItemStateStore('bar');
        const unsubscribe = itemStateStore.subscribe(onChange);

        anotherItemStateStore.set(exampleItemState);
        expect(onChange).toHaveBeenCalledTimes(1); // only the inital call on subscribe

        anotherItemStateStore.clear();
        expect(onChange).toHaveBeenCalledTimes(1); // only the inital call on subscribe

        unsubscribe();
    });

    it('should be able to request item responses', () => {
        const itemStateStore = getItemStateStore('foo');
        itemStateStore.set(exampleItemState);

        expect(itemStateStore.getItemResponses()).toMatchObject({
            RESPONSE: { base: { integer: 0 } },
            RESPONSE_3: { base: { integer: 179000 } },
            RESPONSE_1: { list: { identifier: ['choice_2'] } }
        });
    });

    it('should ignore sibling keys of item responses', () => {
        const itemStateStore = getItemStateStore('foo');
        itemStateStore.set(exampleItemState);
        itemStateStore.setItemElementState('extra', { something: 'else' });

        expect(itemStateStore.getItemResponses()).toMatchObject({
            RESPONSE: { base: { integer: 0 } },
            RESPONSE_3: { base: { integer: 179000 } },
            RESPONSE_1: { list: { identifier: ['choice_2'] } }
        });
    });

    it('should be able to set item responses', () => {
        const onChange = vi.fn();
        const itemStateStore = getItemStateStore('foo');
        const unsubscribe = itemStateStore.subscribe(onChange);

        itemStateStore.setItemResponses({
            RESPONSE: { base: { integer: 0 } }
        });
        expect(itemStateStore.getItemResponses()).toMatchObject({
            RESPONSE: { base: { integer: 0 } }
        });
        expect(onChange).toHaveBeenCalledTimes(2); // there is an initial call on subscribe
        expect(onChange).toHaveBeenLastCalledWith({
            RESPONSE: { response: { base: { integer: 0 } } }
        });
        unsubscribe();

        itemStateStore.setItemResponses({
            RESPONSE: { base: { integer: 1 } },
            NEWRESPONSE: { base: { float: -12.3 } }
        });

        expect(itemStateStore.getItemResponses()).toMatchObject({
            RESPONSE: { base: { integer: 1 } },
            NEWRESPONSE: { base: { float: -12.3 } }
        });

        itemStateStore.setItemResponses(); //it should do nothing, not even fail
        expect(itemStateStore.getItemResponses()).toMatchObject({
            RESPONSE: { base: { integer: 1 } },
            NEWRESPONSE: { base: { float: -12.3 } }
        });
    });

    it('should be able to get item element state', () => {
        const itemStateStore = getItemStateStore('foo');

        expect(Object.keys(itemStateStore.getItemElementState('foo')).length).toBe(0);

        itemStateStore.set(exampleItemState);

        expect(itemStateStore.getItemElementState('RESPONSE')).toMatchObject({
            response: { base: { integer: 0 } },
            player: { position: 0, muted: false, volume: 100 }
        });
    });

    it('should be able to set item element state', () => {
        const onChange = vi.fn();
        const itemStateStore = getItemStateStore('foo');
        const unsubscribe = itemStateStore.subscribe(onChange);

        itemStateStore.setItemElementState('RESPONSE', { response: { base: { integer: -1 } } });
        expect(itemStateStore.getItemElementState('RESPONSE')).toMatchObject({ response: { base: { integer: -1 } } });
        expect(onChange).toHaveBeenCalledTimes(2); // there is an initial call on subscribe
        expect(onChange).toHaveBeenLastCalledWith({
            RESPONSE: { response: { base: { integer: -1 } } }
        });
        unsubscribe();

        itemStateStore.setItemElementState('RESPONSE', { response: { base: { integer: 0 } } });
        expect(itemStateStore.getItemElementState('RESPONSE')).toMatchObject({ response: { base: { integer: 0 } } });

        itemStateStore.setItemElementState('RESPONSE_2', { foo: 'bar' });
        expect(itemStateStore.getItemElementState('RESPONSE')).toMatchObject({ response: { base: { integer: 0 } } });
        expect(itemStateStore.getItemElementState('RESPONSE_2')).toMatchObject({ foo: 'bar' });
    });

    it('should be able to update item element state', () => {
        const onChange = vi.fn();
        const itemStateStore = getItemStateStore('foo');

        itemStateStore.setItemElementState('RESPONSE', { response: { base: { integer: -1 } }, count: 5 });
        itemStateStore.setItemElementState('RESPONSE_2', { response: { base: { string: 'foo' } } });

        const unsubscribe = itemStateStore.subscribe(onChange);

        itemStateStore.updateItemElementState('RESPONSE', { count: 7 });

        expect(itemStateStore.getItemElementState('RESPONSE')).toMatchObject({
            response: { base: { integer: -1 } },
            count: 7
        });
        expect(itemStateStore.getItemElementState('RESPONSE_2')).toMatchObject({
            response: { base: { string: 'foo' } }
        });

        expect(onChange).toHaveBeenCalledTimes(2); // there is an initial call on subscribe
        expect(onChange).toHaveBeenLastCalledWith({
            RESPONSE: { response: { base: { integer: -1 } }, count: 7 },
            RESPONSE_2: { response: { base: { string: 'foo' } } }
        });
        unsubscribe();
    });

    it('should be able to check interaction response existence', () => {
        const itemStateStore = getItemStateStore('foo');

        expect(itemStateStore.hasInteractionResponse('RESPONSE')).toBe(false);

        itemStateStore.set(exampleItemState);

        expect(itemStateStore.hasInteractionResponse('RESPONSE')).toBe(true);
        expect(itemStateStore.hasInteractionResponse('RESPONSE_2')).toBe(false);
        expect(itemStateStore.hasInteractionResponse('NON_EXISTENCE_RESPONSE')).toBe(false);
    });

    it('should be able to get interaction response', () => {
        const itemStateStore = getItemStateStore('foo');
        itemStateStore.set(exampleItemState);

        expect(itemStateStore.getInteractionResponse('RESPONSE')).toMatchObject({
            base: { integer: 0 }
        });

        expect(Object.keys(itemStateStore.getInteractionResponse('foo')).length).toBe(0);
    });

    it('should be able to set interaction response', () => {
        const onChange = vi.fn();
        const itemStateStore = getItemStateStore('foo');
        const unsubscribe = itemStateStore.subscribe(onChange);

        itemStateStore.setInteractionResponse('RESPONSE', { base: { integer: 0 } });
        expect(itemStateStore.getInteractionResponse('RESPONSE')).toMatchObject({ base: { integer: 0 } });
        expect(onChange).toHaveBeenCalledTimes(2); // there is an initial call on subscribe
        expect(onChange).toHaveBeenLastCalledWith({
            RESPONSE: { response: { base: { integer: 0 } }, validity: true }
        });
        expect(itemStateStore.getInteractionValidity('RESPONSE')).toBe(true);
        unsubscribe();

        itemStateStore.setInteractionResponse('RESPONSE', { base: { integer: -1 } });
        expect(itemStateStore.getInteractionResponse('RESPONSE')).toMatchObject({ base: { integer: -1 } });

        itemStateStore.setInteractionResponse('NEWRESPONSE', { foo: 'bar' });
        expect(itemStateStore.getInteractionResponse('RESPONSE')).toMatchObject({ base: { integer: -1 } });
        expect(itemStateStore.getInteractionResponse('NEWRESPONSE')).toMatchObject({ foo: 'bar' });
    });

    it('should be a valid response by default', () => {
        const itemStateStore = getItemStateStore('foo');
        expect(itemStateStore.getInteractionValidity('RESPONSE')).toBe(true);
    });

    it('should be able to set and get back validity of interaction response', () => {
        const itemStateStore = getItemStateStore('foo');
        itemStateStore.setInteractionValidity('RESPONSE', false);
        expect(itemStateStore.getInteractionValidity('RESPONSE')).toBe(false);

        itemStateStore.setInteractionValidity('RESPONSE', 123); // set some truly value
        expect(itemStateStore.getInteractionValidity('RESPONSE')).toBe(true);

        itemStateStore.setInteractionValidity('RESPONSE', void 0); // set some falsy value
        expect(itemStateStore.getInteractionValidity('RESPONSE')).toBe(false);
    });
});

describe('interaction state store', () => {
    const exampleInteractionState = {
        response: { base: { integer: 0 } },
        player: { position: 0, muted: false, volume: 100 }
    };
    const exampleResponse = { base: { integer: 1 } };

    afterEach(() => {
        itemsStateStore.clear();
    });

    it('subscribes interaction state', () => {
        const itemStateStore = getItemStateStore('foo');
        const interactionStateStore = getInteractionStateStore('foo', 'bar');
        const onChange = vi.fn();

        const unsubscribe = interactionStateStore.subscribe(onChange);
        itemStateStore.setItemElementState('bar', exampleInteractionState);

        expect(onChange).toHaveBeenCalledTimes(2);
        expect(onChange).toHaveBeenLastCalledWith(exampleInteractionState);

        unsubscribe();
    });

    it('do not subscribe to other interaction modification', () => {
        const itemStateStore = getItemStateStore('foo');
        const interactionStateStore = getInteractionStateStore('foo', 'bar');
        const onChange = vi.fn();

        const unsubscribe = interactionStateStore.subscribe(onChange);
        itemStateStore.setItemElementState('baz', exampleInteractionState);

        expect(onChange).toHaveBeenCalledTimes(1); // only initial call on subscribe

        unsubscribe();
    });

    it('can get previously set state', () => {
        const itemStateStore = getItemStateStore('foo');
        const interactionStateStore = getInteractionStateStore('foo', 'bar');

        interactionStateStore.set(exampleInteractionState);

        expect(interactionStateStore.get()).toBe(exampleInteractionState);
        expect(itemStateStore.getItemElementState('bar')).toBe(exampleInteractionState);
    });

    it('can update previously set state', () => {
        const itemStateStore = getItemStateStore('foo');
        const interactionStateStore = getInteractionStateStore('foo', 'bar');

        interactionStateStore.set(exampleInteractionState);
        interactionStateStore.update({ count: 7 });
        interactionStateStore.update({ player: { position: 10, muted: true, volume: 50 } });

        const expectedInteractionState1 = { ...exampleInteractionState, count: 7 };
        const expectedInteractionState2 = {
            ...exampleInteractionState,
            count: 7,
            player: { position: 10, muted: true, volume: 50 }
        };

        expect(interactionStateStore.get()).toStrictEqual(expectedInteractionState1);
        expect(itemStateStore.getItemElementState('bar')).toStrictEqual(expectedInteractionState2);
    });

    it('can detect response existence', () => {
        const interactionStateStore = getInteractionStateStore('foo', 'bar');

        expect(interactionStateStore.hasResponse()).toBe(false);

        interactionStateStore.set({ foo: 'bar' });
        expect(interactionStateStore.hasResponse()).toBe(false);

        interactionStateStore.setResponse(exampleResponse);
        expect(interactionStateStore.hasResponse()).toBe(true);
    });

    it('can get previously set response', () => {
        const itemStateStore = getItemStateStore('foo');
        const interactionStateStore = getInteractionStateStore('foo', 'bar');

        interactionStateStore.setResponse(exampleResponse);

        expect(interactionStateStore.getResponse()).toBe(exampleResponse);
        expect(itemStateStore.getInteractionResponse('bar')).toBe(exampleResponse);
    });

    it('can get previously set response value', () => {
        const interactionStateStore = getInteractionStateStore('foo', 'bar');

        interactionStateStore.setResponseValue({
            baseType: 'integer',
            cardinality: 'single',
            value: 123
        });

        expect(interactionStateStore.getResponseValue()).toBe(123);

        interactionStateStore.setResponseValue({
            baseType: 'string',
            cardinality: 'single',
            value: '123'
        });

        expect(interactionStateStore.getResponseValue()).toBe('123');
    });

    it('can get previously set validity', () => {
        const itemStateStore = getItemStateStore('foo');
        const interactionStateStore = getInteractionStateStore('foo', 'bar');

        // default validity is true
        expect(interactionStateStore.getValidity()).toBe(true);

        interactionStateStore.setValidity(false);

        expect(interactionStateStore.getValidity()).toBe(false);
        expect(itemStateStore.getInteractionValidity('bar')).toBe(false);

        interactionStateStore.setResponse(exampleResponse, true);

        expect(interactionStateStore.getValidity()).toBe(true);
        expect(itemStateStore.getInteractionValidity('bar')).toBe(true);
    });
});
