// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import samples from '../../../../../samples';
import { prepareRubricBlock } from '../helpers.js';

// mock generateElementId function for snapshot
vi.mock('@oat-sa-private/ui-core', () => ({
    __esModule: true,
    generateElementId: vi.fn(nodeName => `tao-${nodeName}-123`),
    __: str => str
}));

describe('Helper prepareRubricBlock()', () => {
    it('should return itemData without rubric block elements when no rubric block body present', () => {
        const rubricBlockBody = '';
        let itemData = samples.shuttle.itemData;
        const output = prepareRubricBlock(itemData, rubricBlockBody);

        expect(output.itemData.data.body.body).not.toContain('rubricBlock');
        expect(output.itemData.data.body.elements).not.toHaveProperty('tao-rubricBlock-123');
    });
    it('should add rubric block to itemData', () => {
        const rubricBlockBody = '<div>Rubric Block Body</div>';
        let itemData = samples.shuttle.itemData;
        const output = prepareRubricBlock(itemData, rubricBlockBody);
        const rubricBlockId = 'tao-rubricBlock-123';
        expect(output.itemData.data.body.body).toContain('rubricBlock');
        expect(rubricBlockId).toContain('rubricBlock');
        expect(output.itemData.data.body.elements[rubricBlockId]).toMatchObject({
            qtiClass: 'rubricBlock',
            type: 'element',
            attributes: { body: '<div>Rubric Block Body</div>' }
        });
    });
});
