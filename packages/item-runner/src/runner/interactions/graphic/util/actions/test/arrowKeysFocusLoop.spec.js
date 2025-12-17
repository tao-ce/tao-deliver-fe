// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
// mock the utils
vi.mock('../../focusorder.js', () => ({
    __esModule: true
}));
import { fireEvent } from '@testing-library/dom';
import arrowKeysFocusLoop from '../arrowKeysFocusLoop.js';

/**
 * Insert fixture nodes
 * @returns {HTMLElement} the container
 */
function createDomFixture() {
    const div = document.createElement('div');
    div.class = 'fixture';
    div.innerHTML = `
        <svg>
            <g id="group1" />
        </svg>
    `;
    document.body.appendChild(div);
    return div;
}

/**
 * Remove the fixture nodes
 */
function removeDomFixture() {
    Array.from(document.querySelectorAll('.fixture')).forEach(elt => elt.remove());
}

describe('the arrowKeysFocusLoop action', () => {
    let container;

    const choiceKeysInTabOrder = ['choice_3', 'choice_2', 'choice_1'];
    const lastFocusedChoiceKey = 'choice_2';
    const focusChoiceWithKey = vi.fn().mockImplementation(value => value);

    beforeEach(() => {
        container = createDomFixture();
    });
    afterEach(() => {
        removeDomFixture();
        focusChoiceWithKey.mockClear();
    });

    // KEY HANDLING

    test.each([
        ['down', 'forwards', false, 'choice_1'],
        ['right', 'forwards', false, 'choice_1'],
        ['left', 'forwards', true, 'choice_1'],
        ['up', 'backwards', false, 'choice_3'],
        ['left', 'backwards', false, 'choice_3'],
        ['right', 'backwards', true, 'choice_3']
    ])(
        '%s key moves focus %s (RTL %s)',
        (key, _direction, isRTL, expectedKey) =>
            new Promise(resolve => {
                const node = container.querySelector('#group1');

                const action = arrowKeysFocusLoop(node, {
                    choiceKeysInTabOrder,
                    lastFocusedChoiceKey,
                    isRTL,
                    focusChoiceWithKey
                });

                node.addEventListener('setLastFocusedChoiceKey', () => {
                    expect(focusChoiceWithKey).toHaveBeenCalled();
                    expect(focusChoiceWithKey.mock.calls[0][0]).toBe(expectedKey);

                    action.destroy();
                    resolve();
                });
                fireEvent.keyDown(node, { key });
            })
    );

    // EVENTS

    it('dispatches setLastFocusedChoiceKey with value', () =>
        new Promise(resolve => {
            const node = container.querySelector('#group1');

            const action = arrowKeysFocusLoop(node, { choiceKeysInTabOrder, lastFocusedChoiceKey, focusChoiceWithKey });

            node.addEventListener('setLastFocusedChoiceKey', event => {
                expect(event instanceof CustomEvent).toBe(true);
                expect(event.detail).toBe('choice_1');

                action.destroy();
                resolve();
            });
            fireEvent.keyDown(node, { key: 'right' });
        }));

    it('dispatches setHasFocus true', () =>
        new Promise(resolve => {
            const node = container.querySelector('#group1');

            const action = arrowKeysFocusLoop(node, { choiceKeysInTabOrder, lastFocusedChoiceKey, focusChoiceWithKey });

            node.addEventListener('setHasFocus', event => {
                expect(event instanceof CustomEvent).toBe(true);
                expect(event.detail).toBe(true);

                action.destroy();
                resolve();
            });
            fireEvent.keyDown(node, { key: 'right' });
        }));

    // ACTION

    it('updates with new params', () =>
        new Promise(resolve => {
            const node = container.querySelector('#group1');

            const action = arrowKeysFocusLoop(node, { choiceKeysInTabOrder, lastFocusedChoiceKey, focusChoiceWithKey });

            action.update({
                choiceKeysInTabOrder: ['foo', 'bar', 'baz'],
                lastFocusedChoiceKey: 'bar',
                focusChoiceWithKey
            });

            node.addEventListener('setLastFocusedChoiceKey', event => {
                expect(event instanceof CustomEvent).toBe(true);
                expect(event.detail).toBe('baz');

                action.destroy();
                resolve();
            });
            fireEvent.keyDown(node, { key: 'right' });
        }));
});
