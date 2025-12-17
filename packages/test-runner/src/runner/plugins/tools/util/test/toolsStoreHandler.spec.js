// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import toolsStoreHandler from '../toolsStoreHandler.js';
import { clearAllTestSessionsUserData } from '../../../../session/testSessionUserDataService.js';

describe('Test for functin which handle tools store', () => {
    beforeEach(() => {
        clearAllTestSessionsUserData();
    });
    it('allow get/set value in store', () => {
        const handler = toolsStoreHandler('id1', 'name');
        handler.set('length', '10');
        expect(handler.get('length')).toEqual('10');
    });
    it('do not overwrite store for other tool', () => {
        const handler1 = toolsStoreHandler('id1', 'name');
        const handler2 = toolsStoreHandler('id2', 'name');
        handler1.set('testValue', '1');
        handler2.set('testValue', '2');
        expect(handler1.get('testValue')).toEqual('1');
    });
});
