// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { traceInteraction } from '../util.js';

describe('traceInteraction', () => {
    it('should return the correct eventData for a click event', () => {
        const e = {
            type: 'click',
            detail: {
                draggableKey: 'choice_1',
                dropAreaKey: 'gap_1'
            }
        };
        const selectedKeys = [null, null, null];
        const selectedSnapshot = [null, null, null];
        const eventData = traceInteraction(e, selectedKeys, selectedSnapshot);
        expect(eventData).toEqual({
            detail: {
                target: null,
                domEventType: 'click',
                qtiChoiceIdentifier: 'choice_1'
            }
        });
    });

    it('should return the correct eventData for a keySelect event', () => {
        const e = {
            type: 'keySelect',
            detail: {
                draggableKey: 'choice_1',
                dropAreaKey: 'gap_1'
            }
        };
        const selectedKeys = [null, null, null];
        const selectedSnapshot = [null, null, null];
        const eventData = traceInteraction(e, selectedKeys, selectedSnapshot);
        expect(eventData).toEqual({
            detail: {
                target: null,
                domEventType: 'keyup',
                qtiChoiceIdentifier: 'choice_1'
            }
        });
    });

    it('should return the correct eventData for a keyDown event', () => {
        const e = {
            type: 'keyDown',
            key: 'Enter',
            detail: 0
        };
        const selectedKeys = [null, null, null];
        const selectedSnapshot = [null, null, null];
        const eventData = traceInteraction(e, selectedKeys, selectedSnapshot);
        expect(eventData).toEqual({
            detail: {
                target: null,
                domEventType: 'keyDown',
                qtiChoiceIdentifier: void 0
            }
        });
    });

    it('should return the correct eventData for a DragStart event', () => {
        const e = {
            type: 'dragStart',
            detail: {
                draggableKey: 'choice_1',
                dropAreaKey: 'gap_1'
            }
        };
        const selectedKeys = [{key:'choice_1', pending: true}, null, null];
        const selectedSnapshot = [null, null, null];
        const eventData = traceInteraction(e, selectedKeys, selectedSnapshot);
        expect(eventData).toEqual({
            detail: {
                target: null,
                domEventType: 'dragstart',
                qtiChoiceIdentifier: 'choice_1',
                area: 'answers'
            }
        });
    });

    it('should return the correct eventData for a Drop event', () => {
        const e = {
            type: 'drop',
            detail: {
                draggableKey: 'choice_1',
                dropAreaKey: 'gap_1'
            }
        };
        const selectedKeys = [{key:'choice_1', pending: true}, null, null];
        const selectedSnapshot = [null, null, null];
        const eventData = traceInteraction(e, selectedKeys, selectedSnapshot);
        expect(eventData).toEqual({
            detail: {
                target: null,
                domEventType: 'drop',
                newResponse: [{key:'choice_1'}, null, null],
                qtiChoiceIdentifier: 'choice_1',
                areaFrom: 'answers',
                areaTo: 'answers'
            }
        });
    });
});