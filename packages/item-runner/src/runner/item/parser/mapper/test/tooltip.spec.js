// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import tooltipMapper from '../tooltip.js';

describe('Tooltip element mapper', () => {
    it('returns mapped tooltip object properties', () => {
        const element = {
            body: {},
            content: 'tooltip text'
        };
        const properties = {
            content: 'anchor',
            text: 'tooltip text'
        };
        const result = tooltipMapper.mapProperties(properties, element);
        expect(result).toMatchObject(properties);
    });
});
