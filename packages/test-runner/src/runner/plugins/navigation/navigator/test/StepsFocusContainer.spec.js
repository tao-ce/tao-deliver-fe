// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent, createEvent } from '@testing-library/svelte';
import TestStepsFocusWithSlot from './TestStepsFocusWithSlot.svelte';

const stepsPropsOne = {
    firstFocusableKey: '1-3',
    current: '1-2',
    steps: [{ key: '1-1' }, { key: '1-2' }, { key: '1-3' }]
};
const stepsPropsTwo = {
    firstFocusableKey: '1-3',
    steps: [{ key: '2-1' }]
};

describe('StepsFocusContainer', () => {
    it('renders with StepProgress', () => {
        const { container } = render(TestStepsFocusWithSlot, {
            props: {
                containerProps: {},
                stepsPropsOne,
                stepsPropsTwo
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('focuses specified step', () => {
        let externalButton = document.createElement('button');
        document.body.appendChild(externalButton);

        const { container } = render(TestStepsFocusWithSlot, {
            props: {
                containerProps: {},
                stepsPropsOne,
                stepsPropsTwo
            }
        });
        const wrapperElement = container.querySelector('.withslot').children[0];
        const stepElements = container.querySelectorAll('button.step');

        expect(stepElements[2].getAttribute('tabindex')).toBe('0');
        expect(Array.from(wrapperElement.querySelectorAll('button.step[tabindex="-1"]')).length).toBe(3);
        stepElements[2].focus();
        return tick()
            .then(() => {
                expect(stepElements[2]).toHaveFocus();
                expect(Array.from(wrapperElement.querySelectorAll('button.step[tabindex="-1"]')).length).toBe(4);

                externalButton.focus();
                fireEvent(wrapperElement, createEvent('focusout', wrapperElement, {}));
                return new Promise(resolve => setTimeout(resolve, 150));
            })
            .then(() => {
                expect(wrapperElement).not.toHaveFocus();
                expect(stepElements[2]).not.toHaveFocus();
                expect(externalButton).toHaveFocus();
                expect(stepElements[2].getAttribute('tabindex')).toBe('0');
                expect(Array.from(wrapperElement.querySelectorAll('button.step[tabindex="-1"]')).length).toBe(3);

                document.body.removeChild(externalButton);
            });
    });

    it('responds to arrow key navigation', () => {
        const { container } = render(TestStepsFocusWithSlot, {
            props: {
                containerProps: {},
                stepsPropsOne,
                stepsPropsTwo
            }
        });

        const stepElements = container.querySelectorAll('button.step');
        stepElements[2].focus();
        return tick()
            .then(() => {
                expect(stepElements[2]).toHaveFocus();

                fireEvent.keyDown(document.activeElement, { key: 'Right' });
                return tick();
            })
            .then(() => {
                expect(stepElements[3]).toHaveFocus();

                fireEvent.keyDown(document.activeElement, { key: 'Down' });
                return tick();
            })
            .then(() => {
                expect(stepElements[0]).toHaveFocus();

                fireEvent.keyDown(document.activeElement, { key: 'Down' });
                return tick();
            })
            .then(() => {
                expect(stepElements[1]).toHaveFocus();

                fireEvent.keyDown(document.activeElement, { key: 'Left' });
                return tick();
            })
            .then(() => {
                expect(stepElements[0]).toHaveFocus();

                fireEvent.keyDown(document.activeElement, { key: 'Up' });
                return tick();
            })
            .then(() => {
                expect(stepElements[3]).toHaveFocus();
            });
    });
});
