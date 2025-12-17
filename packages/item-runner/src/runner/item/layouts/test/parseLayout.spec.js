// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { filterBlockByLayout, getCustomLayouts, getElementName, getLayouts } from '../parseLayout.js';

// mock the utils
vi.mock('./../dualColumnLayout.js', () => ({
    __esModule: true,
    getElementName: vi.fn().mockImplementation(() => 'customElement'),
    filterBlock: vi.fn().mockImplementation(node => (node ? node.classList.contains('correct') : false)), // eslint-disable-line no-confusing-arrow
    validate: vi.fn().mockImplementation(node => (node ? node.classList.contains('correct') : false)) // eslint-disable-line no-confusing-arrow
}));

const nonExistingLayout = 'superCoolLayout';
const existingLayout = 'dualColumnLayout';

describe('Test "custom layouts" handler', () => {
    describe('Test "getElementName" method', () => {
        it('returns "" if custom layout absent in list of supported', () => {
            expect(getElementName(nonExistingLayout)).toEqual('');
        });

        it('returns "" if custom layout not set', () => {
            expect(getElementName()).toEqual('');
        });

        it('returns element name if custom layout exists', () => {
            expect(getElementName(existingLayout)).toEqual('customElement');
        });
    });

    describe('Test "filterBlockByLayout" method', () => {
        it('returns false if custom layout not passed', () => {
            expect(filterBlockByLayout()).toBe(false);
        });

        it('returns false if custom layout not set', () => {
            expect(filterBlockByLayout(nonExistingLayout)).toBeFalsy();
        });

        it('returns false if node not passed or incorrect', () => {
            expect(filterBlockByLayout(existingLayout)).toBeFalsy();
            const node = document.createElement('div');
            node.classList.add('incorrect');
            expect(filterBlockByLayout(existingLayout)).toBe(false);
        });

        it('returns true if custom layout exists and node corresponds to layout', () => {
            const node = document.createElement('div');
            node.classList.add('correct');
            expect(filterBlockByLayout(existingLayout, node)).toBe(true);
        });
    });

    describe('Test "getLayouts" method', () => {
        it('returns default layout if node not passed', () => {
            expect(getLayouts()).toEqual(['defaultLayout']);
        });

        it('returns default layout if incorrect node passed', () => {
            const node = document.createElement('div');
            node.classList.add('incorrect');
            expect(getLayouts(node)).toEqual(['defaultLayout']);
        });

        it('returns list of all applied layouts if correct node passed', () => {
            const node = document.createElement('div');
            node.classList.add('correct');
            expect(getLayouts(node)).toEqual([existingLayout, 'defaultLayout']);
        });
    });
    describe('Test "getCustomLayouts" method', () => {
        it('returns empty list if node not passed', () => {
            expect(getCustomLayouts()).toEqual([]);
        });

        it('returns empty list if incorrect node passed', () => {
            const node = document.createElement('div');
            node.classList.add('incorrect');
            expect(getCustomLayouts(node)).toEqual([]);
        });

        it('returns list of only custom layouts if correct node passed', () => {
            const node = document.createElement('div');
            node.classList.add('correct');
            expect(getCustomLayouts(node)).toEqual([existingLayout]);
        });
    });
});
