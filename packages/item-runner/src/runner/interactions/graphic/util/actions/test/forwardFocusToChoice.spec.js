// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// mock the utils
vi.mock('../../focusorder.js', () => ({
    __esModule: true,
    sortChoicesByBoundingBox: vi.fn().mockImplementation(arr => arr.map(choice => choice.key))
}));
import forwardFocusToChoice from '../forwardFocusToChoice.js';
import { sortChoicesByBoundingBox } from '../../focusorder.js';

/**
 * Insert fixture nodes
 * @returns {HTMLElement} the container
 */
function createDomFixture() {
    const div = document.createElement('div');
    div.class = 'fixture';
    div.innerHTML = `<div tabindex="0" />`;
    document.body.appendChild(div);
    return div;
}

/**
 * Remove the fixture nodes
 */
function removeDomFixture() {
    Array.from(document.querySelectorAll('.fixture')).forEach(elt => elt.remove());
}

describe('the forwardFocusToChoice action', () => {
    let container;

    const choices = [
        { key: 'choice_1', svg: {} },
        { key: 'choice_2', svg: {} },
        { key: 'choice_3', svg: {} }
    ];
    const choiceKeysInDefaultOrder = ['choice_1', 'choice_2', 'choice_3'];
    const choiceKeysInTabOrder = ['choice_3', 'choice_2', 'choice_1'];
    const lastFocusedChoiceKey = 'choice_2';
    const focusChoiceWithKey = vi.fn().mockImplementation(value => value);

    beforeEach(() => {
        container = createDomFixture();
    });
    afterEach(() => {
        removeDomFixture();
        sortChoicesByBoundingBox.mockClear();
        focusChoiceWithKey.mockClear();
    });

    it('calculates and dispatches setChoiceKeysInTabOrder when not known', () =>
        new Promise(resolve => {
            const node = container.querySelector('div');

            const action = forwardFocusToChoice(node, { choices, focusChoiceWithKey });

            node.addEventListener('setChoiceKeysTabOrder', event => {
                expect(sortChoicesByBoundingBox).toHaveBeenCalled();
                expect(sortChoicesByBoundingBox.mock.calls[0][0]).toStrictEqual(choices);
                expect(event.detail).toStrictEqual(choiceKeysInDefaultOrder);

                action.destroy();
                resolve();
            });
            node.focus();
        }));

    it('tries to focus the lastFocusedChoiceKey if known', () =>
        new Promise(resolve => {
            const node = container.querySelector('div');

            const action = forwardFocusToChoice(node, {
                choices,
                choiceKeysInTabOrder,
                lastFocusedChoiceKey,
                focusChoiceWithKey
            });

            node.addEventListener('setLastFocusedChoiceKey', () => {
                expect(focusChoiceWithKey).toHaveBeenCalled();
                expect(focusChoiceWithKey.mock.calls[0][0]).toStrictEqual(lastFocusedChoiceKey);

                action.destroy();
                resolve();
            });
            node.focus();
        }));

    it('tries to focus the first choice in tab order if no lastFocusedChoiceKey', () =>
        new Promise(resolve => {
            const node = container.querySelector('div');

            const action = forwardFocusToChoice(node, { choices, choiceKeysInTabOrder, focusChoiceWithKey });

            node.addEventListener('setLastFocusedChoiceKey', () => {
                expect(focusChoiceWithKey).toHaveBeenCalled();
                expect(focusChoiceWithKey.mock.calls[0][0]).toStrictEqual(choiceKeysInTabOrder[0]);

                action.destroy();
                resolve();
            });
            node.focus();
        }));

    it('dispatches setLastFocusedChoiceKey with value after focusing choice', () =>
        new Promise(resolve => {
            const node = container.querySelector('div');

            const action = forwardFocusToChoice(node, {
                choices,
                choiceKeysInTabOrder,
                lastFocusedChoiceKey,
                focusChoiceWithKey
            });

            node.addEventListener('setLastFocusedChoiceKey', event => {
                expect(event instanceof CustomEvent).toBe(true);
                expect(event.detail).toBe(lastFocusedChoiceKey);

                action.destroy();
                resolve();
            });
            node.focus();
        }));

    it('dispatches setHasFocus true on focus', () =>
        new Promise(resolve => {
            const node = container.querySelector('div');

            const action = forwardFocusToChoice(node, {
                choices,
                choiceKeysInTabOrder,
                lastFocusedChoiceKey,
                focusChoiceWithKey
            });

            node.addEventListener('setHasFocus', event => {
                expect(event instanceof CustomEvent).toBe(true);
                expect(event.detail).toBe(true);

                action.destroy();
                resolve();
            });
            node.focus();
        }));

    it('dispatches setHasFocus false on window focusin', () =>
        new Promise(resolve => {
            const node = container.querySelector('div');

            const action = forwardFocusToChoice(node, {
                choices,
                choiceKeysInTabOrder,
                lastFocusedChoiceKey,
                focusChoiceWithKey
            });

            node.focus();
            expect(node).toHaveFocus();

            action.update({ hasFocus: true });

            node.addEventListener('setHasFocus', event => {
                expect(event instanceof CustomEvent).toBe(true);
                expect(event.detail).toBe(false);

                action.destroy();
                resolve();
            });
            container.dispatchEvent(new Event('focusin', { bubbles: true }));
        }));

    it('updates with new params', () =>
        new Promise(resolve => {
            const node = container.querySelector('div');

            const action = forwardFocusToChoice(node, {
                choices,
                choiceKeysInTabOrder,
                lastFocusedChoiceKey,
                focusChoiceWithKey
            });

            action.update({ choiceKeysInTabOrder: ['foo', 'bar'], lastFocusedChoiceKey: void 0, focusChoiceWithKey });

            node.addEventListener('setLastFocusedChoiceKey', () => {
                expect(focusChoiceWithKey).toHaveBeenCalled();
                expect(focusChoiceWithKey.mock.calls[0][0]).toStrictEqual('foo');

                action.destroy();
                resolve();
            });
            node.focus();
        }));
});
