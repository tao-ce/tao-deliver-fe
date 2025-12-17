// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { mapEventTypeToDomEventType } from '../../util/analytics';
import { eventTypeToDomEventTypeMap } from '../util';

describe('eventTypeToDomEventTypeMap', () => {
    it.each([
        ['keySelect', 'keyup'],
        ['update', 'drop'],
        ['remove', 'click'],
        ['mousedown', 'mousedown'],
        ['resize', 'resize']
    ])('should return the correct dom event type for %s', (inputEventType, expectedDomEventType) => {
        const result = mapEventTypeToDomEventType(inputEventType, eventTypeToDomEventTypeMap);
        expect(result).toBe(expectedDomEventType);
    });
});
