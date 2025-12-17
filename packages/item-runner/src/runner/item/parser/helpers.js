// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import blockTypes from '../blocks/blockTypes.js';
import { generateElementId } from '@oat-sa-private/ui-core';

/**
 * Prepares rubric block element and injects it to itemData
 * @param {object} itemData
 * @param {string} rubricBlockBody
 * @returns {object} itemData
 */
export const prepareRubricBlock = (itemData, rubricBlockBody) => {
    if (!rubricBlockBody) {
        return itemData;
    }

    if (!itemData.itemData.data.body) {
        return itemData;
    }

    const rubricBlockQtiClass = 'rubricBlock';
    let itemDataBody = itemData.itemData.data.body;

    let alreadyExists = false;
    for (const key of Object.keys(itemDataBody.elements)) {
        alreadyExists = itemDataBody.elements[key].qtiClass === rubricBlockQtiClass;
        if (alreadyExists) {
            return itemData;
        }
    }

    const rubricBlockId = generateElementId('rubricBlock');
    itemDataBody.body = `{{${rubricBlockId}}}${itemDataBody.body}`;
    itemDataBody.elements[rubricBlockId] = {
        qtiClass: rubricBlockQtiClass,
        type: blockTypes.element,
        attributes: {
            body: rubricBlockBody
        }
    };

    return itemData;
};
