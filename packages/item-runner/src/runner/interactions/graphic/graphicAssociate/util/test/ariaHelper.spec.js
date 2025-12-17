// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import ariaHelperFactory from '../ariaHelper.js';

const choices = {
    c1: { key: 'c1' },
    c2: { key: 'c2' },
    c3: { key: 'c3', hotspotLabel: 'foo' },
    c4: { key: 'c4', hotspotLabel: 'bar' }
};
const choiceKeysInTabOrder = ['c4', 'c3', 'c2', 'c1'];

describe('ariaHelper for graphic association interaction', () => {
    describe('API', () => {
        it('exports a function', () => {
            expect(typeof ariaHelperFactory).toBe('function');
        });

        it('the function returns an object with the methods', () => {
            const ariaHelper = ariaHelperFactory();
            expect(typeof ariaHelper).toBe('object');
            expect(typeof ariaHelper.getChoiceDescribedBy).toBe('function');
            expect(typeof ariaHelper.getFulfilledChoiceDescribedBy).toBe('function');
            expect(typeof ariaHelper.getAssociationCreationDescribedBy).toBe('function');
            expect(typeof ariaHelper.getSelectedChoiceDescribedBy).toBe('function');
            expect(typeof ariaHelper.getDisabledChoiceDescribedBy).toBe('function');
            expect(typeof ariaHelper.getInactiveChoiceDescribedBy).toBe('function');
            expect(typeof ariaHelper.getChoiceMaxAssociationLabel).toBe('function');
            expect(typeof ariaHelper.getChoiceAriaLabel).toBe('function');
            expect(typeof ariaHelper.getRemoveButtonAriaLabel).toBe('function');
            expect(typeof ariaHelper.announceAdded).toBe('function');
            expect(typeof ariaHelper.announceRemoved).toBe('function');
            expect(typeof ariaHelper.announceCancelled).toBe('function');
            expect(Object.keys(ariaHelper).length).toEqual(12);
        });
    });

    describe('aria-described-by functions', () => {
        it('announces described by for choice', () => {
            const ariaHelper = ariaHelperFactory();
            const res = ariaHelper.getChoiceDescribedBy();
            expect(res).toBe(
                'Press enter or space to select and form an association. To move to the next available option, use the arrow keys'
            );
        });

        it('announces described by for association creation', () => {
            const ariaHelper = ariaHelperFactory();
            const res = ariaHelper.getAssociationCreationDescribedBy();
            expect(res).toBe(
                'Press space to associate. To move to next available option, use the arrow keys. Press escape to cancel.'
            );
        });

        it('announces described by for selected hotspot', () => {
            const ariaHelper = ariaHelperFactory();
            const res = ariaHelper.getSelectedChoiceDescribedBy();
            expect(res).toBe(
                'Selected. To move to next available option, use the arrow keys. Press escape or space to cancel.'
            );
        });
        it('announces described by for hotspot with max associations', () => {
            const ariaHelper = ariaHelperFactory();
            const res = ariaHelper.getFulfilledChoiceDescribedBy();
            expect(res).toBe('To move to next available option, use the arrow keys.');
        });
        it('announces described by for disabled', () => {
            const ariaHelper = ariaHelperFactory();
            const res = ariaHelper.getDisabledChoiceDescribedBy();
            expect(res).toBe('Disabled. To move to next available option, use the arrow keys.');
        });
        it('announces described by for inactive', () => {
            const ariaHelper = ariaHelperFactory();
            const res = ariaHelper.getInactiveChoiceDescribedBy();
            expect(res).toBe('Inactive. To move to next available option, use the arrow keys.');
        });
    });

    describe('aria-label functions', () => {
        test.each([
            [
                'c1',
                ['c2', void 0],
                choiceKeysInTabOrder,
                'option 4. Associated with option 3. Associated with option. Button.'
            ],
            [
                'c1',
                [void 0, 'c3'],
                choiceKeysInTabOrder,
                'option 4. Associated with option. Associated with foo. Button.'
            ],
            ['c1', [], choiceKeysInTabOrder, 'option 4. No association. Button.'],
            ['c1', void 0, choiceKeysInTabOrder, 'option 4. No association. Button.'],
            [
                void 0,
                ['c2', void 0],
                choiceKeysInTabOrder,
                'option. Associated with option 3. Associated with option. Button.'
            ],
            [
                void 0,
                [void 0, 'c3'],
                choiceKeysInTabOrder,
                'option. Associated with option. Associated with foo. Button.'
            ],
            [void 0, [], choiceKeysInTabOrder, 'option. No association. Button.'],
            [void 0, void 0, choiceKeysInTabOrder, 'option. No association. Button.'],
            ['c3', ['c2', 'c4'], choiceKeysInTabOrder, 'foo. Associated with option 3. Associated with bar. Button.']
        ])('announces label for choice  %s correctly', (key1, choicesKeys, tabOrder, expectedMsg) => {
            const ariaHelper = ariaHelperFactory();
            const associatedChoices = Array.isArray(choicesKeys) ? choicesKeys.map(key => choices[key]) : choicesKeys;
            const res = ariaHelper.getChoiceAriaLabel(choices[key1], associatedChoices, tabOrder);
            expect(res).toBe(expectedMsg);
        });

        test.each([
            ['c1', 'c2', choiceKeysInTabOrder, 'Delete association between option 4 and option 3. Button.'],
            ['c1', void 0, choiceKeysInTabOrder, 'Delete association between option 4 and option. Button.'],
            [void 0, 'c3', choiceKeysInTabOrder, 'Delete association between option and foo. Button.'],
            ['c3', 'c4', choiceKeysInTabOrder, 'Delete association between foo and bar. Button.']
        ])('announces label for remove button correctly', (key1, key2, tabOrder, expectedMsg) => {
            const ariaHelper = ariaHelperFactory();
            const res = ariaHelper.getRemoveButtonAriaLabel(choices[key1], choices[key2], tabOrder);
            expect(res).toBe(expectedMsg);
        });

        test.each([
            [
                'c1',
                ['c2', void 0],
                choiceKeysInTabOrder,
                'option 4. Max associations reached. Associated with option 3. Associated with option. Button.'
            ],
            [
                'c1',
                [void 0, 'c3'],
                choiceKeysInTabOrder,
                'option 4. Max associations reached. Associated with option. Associated with foo. Button.'
            ],
            [
                void 0,
                ['c2', void 0],
                choiceKeysInTabOrder,
                'option. Max associations reached. Associated with option 3. Associated with option. Button.'
            ],
            [
                void 0,
                [void 0, 'c3'],
                choiceKeysInTabOrder,
                'option. Max associations reached. Associated with option. Associated with foo. Button.'
            ],
            [
                'c3',
                ['c2', 'c4'],
                choiceKeysInTabOrder,
                'foo. Max associations reached. Associated with option 3. Associated with bar. Button.'
            ]
        ])(
            'announces label for choice which achieve associations limit',
            (key1, choicesKeys, tabOrder, expectedMsg) => {
                const ariaHelper = ariaHelperFactory();
                const associatedChoices = Array.isArray(choicesKeys)
                    ? choicesKeys.map(key => choices[key])
                    : choicesKeys;
                const res = ariaHelper.getChoiceMaxAssociationLabel(choices[key1], associatedChoices, tabOrder);
                expect(res).toBe(expectedMsg);
            }
        );
    });

    describe('aria-live functions', () => {
        test.each([
            ['c1', 'c2', choiceKeysInTabOrder, 'Association between option 4 and option 3 created.'],
            ['c1', void 0, choiceKeysInTabOrder, 'Association between option 4 and option created.'],
            [void 0, 'c3', choiceKeysInTabOrder, 'Association between option and foo created.'],
            ['c3', 'c4', choiceKeysInTabOrder, 'Association between foo and bar created.']
        ])('announces adding choice  %s correctly', (key1, key2, tabOrder, expectedMsg) => {
            const ariaHelper = ariaHelperFactory();
            const res = ariaHelper.announceAdded(choices[key1], choices[key2], tabOrder);
            expect(res.text).toBe(expectedMsg);
        });

        test.each([
            ['c1', 'c2', choiceKeysInTabOrder, 'The association between option 4 and option 3 has been deleted.'],
            ['c1', void 0, choiceKeysInTabOrder, 'The association between option 4 and option has been deleted.'],
            [void 0, 'c3', choiceKeysInTabOrder, 'The association between option and foo has been deleted.'],
            ['c3', 'c4', choiceKeysInTabOrder, 'The association between foo and bar has been deleted.']
        ])('announces remove association between %s and %s correctly', (key1, key2, tabOrder, expectedMsg) => {
            const ariaHelper = ariaHelperFactory();
            const res = ariaHelper.announceRemoved(choices[key1], choices[key2], tabOrder);
            expect(res.text).toBe(expectedMsg);
        });

        it('announce cancelling current action', () => {
            const ariaHelper = ariaHelperFactory();
            const res = ariaHelper.announceCancelled();
            expect(res.text).toBe('cancelled');
        });
    });
});
