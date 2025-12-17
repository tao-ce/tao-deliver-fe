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
        const selected = 'choice_1';
        const selectedKeys = [];
        const suggestedKey = [];
        const eventData = traceInteraction(e, selectedKeys, suggestedKey, selected);
        expect(eventData).toEqual({
            detail: {
                domEventType: 'click',
                qtiChoiceIdentifier: 'choice_1',
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
        const selected = 'choice_1';
        const selectedKeys = [];
        const suggestedKey = [];
        const eventData = traceInteraction(e, selectedKeys, suggestedKey, selected);
        expect(eventData).toEqual({
            detail: {
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
        const selected = 'choice_1';
        const selectedKeys = [];
        const suggestedKey = [];
        const eventData = traceInteraction(e, selectedKeys, suggestedKey, selected);
        expect(eventData).toEqual({
            detail: {
                domEventType: 'keyDown',
                qtiChoiceIdentifier: 'choice_1'
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
        const selected = 'choice_1';
        const selectedKeys = ['choice_1'];
        const suggestedKey = [];
        const eventData = traceInteraction(e, selectedKeys, suggestedKey, selected);
        expect(eventData).toEqual({
            detail: {
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
        const selected = void 0;
        const selectedKeys = ['choice_1'];
        const suggestedKey = [];
        const eventData = traceInteraction(e, selectedKeys, suggestedKey, selected);
        expect(eventData).toEqual({
            detail: {
                domEventType: 'drop',
                newResponse: ['choice_1'],
                qtiChoiceIdentifier: 'choice_1',
                areaFrom: 'answers',
                areaTo: 'answers'
            }
        });
    });
});