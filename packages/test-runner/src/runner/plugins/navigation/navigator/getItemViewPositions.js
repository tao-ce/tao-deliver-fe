// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * For all items in the testPart, calculates numeric index of item as the user will see it (=viewPosition):
 * viewPosition is relative to the start of the testPart, and doesn't include informational items.
 * @param {Object} testPart - TestPart object from store
 * @returns {Object.<number, number?>} - dictionary of viewPositions with item.position as a key
 */
export default function getItemViewPositions(testPart) {
    const testPartOffset = testPart.position;
    let infoItemsOffset = 0;
    const viewPositions = {};
    for (const sectionId in testPart.sections) {
        const section = testPart.sections[sectionId];
        for (const itemId in section.items) {
            const item = section.items[itemId];
            let viewPosition;
            if (item.informational) {
                infoItemsOffset += 1;
                viewPosition = null;
            } else {
                viewPosition = item.position - testPartOffset - infoItemsOffset + 1;
            }
            viewPositions[item.position] = viewPosition;
        }
    }
    return viewPositions;
}
