// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getTextItemPassagesHrefs } from '../passage.js';

function createMockItemRunnerData(assets = null) {
    return {
        itemData: {
            assets
        }
    };
}

describe('getTextItemPassagesHrefs', () => {
    it('returns an empty array when itemData incomplete', () => {
        expect(getTextItemPassagesHrefs()).toEqual([]);
    });

    it('returns an empty array when the item has no assets', () => {
        const itemRunnerData = createMockItemRunnerData();
        expect(getTextItemPassagesHrefs(itemRunnerData)).toEqual([]);
    });

    it('returns an empty array when the item assets contains no passage', () => {
        const itemRunnerData = createMockItemRunnerData({});
        expect(getTextItemPassagesHrefs(itemRunnerData)).toEqual([]);
    });

    it('returns an array of 2 hrefs when the item assets contains 2 passages', () => {
        const includeHref1 = 'http://path/to/something1.xml';
        const includeHref2 = 'http://path/to/something2.xml';
        const itemRunnerData = createMockItemRunnerData({
            xinclude: {
                [includeHref1]: 'somevalue1',
                [includeHref2]: 'somevalue2'
            },
            css: {
                csskey: 'cssvalue'
            }
        });
        // needs a DOM to query:
        const include1 = document.createElement('article');
        include1.classList.add('qti-include');
        include1.dataset.href = includeHref1;
        include1.innerHTML = 'Hello';
        document.body.appendChild(include1);

        const include2 = document.createElement('article');
        include2.classList.add('qti-include');
        include2.dataset.href = includeHref2;
        include2.innerHTML = 'world';
        document.body.appendChild(include2);

        expect(getTextItemPassagesHrefs(itemRunnerData)).toEqual([includeHref1, includeHref2]);
    });
});
