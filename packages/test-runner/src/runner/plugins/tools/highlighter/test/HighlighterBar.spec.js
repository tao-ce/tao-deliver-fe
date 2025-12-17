// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import HighlighterBar from '../HighlighterBar.svelte';
import testsStateStore, { getTestSessionStatusStore } from '../../../../testsStateStore.js';
import { actionKeys } from '../highlighterActionKeys.js';

const defaultColors = [actionKeys.highlightYellow, actionKeys.highlightBlue, actionKeys.highlightPink];

describe('SettingsContent', () => {
    const serviceCallId = 'test-session-123';

    afterEach(() => {
        testsStateStore.clear();
    });

    it('renders with default props', () => {
        const { container } = render(HighlighterBar, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders with the provided colors in props', () => {
        const { container } = render(HighlighterBar, {
            props: {
                serviceCallId,
                colors: defaultColors
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders count of highlights inside color buttons', () => {
        const { container } = render(HighlighterBar, {
            props: {
                serviceCallId,
                highlightsPerColor: {
                    highlightYellow: 2,
                    highlightBlue: 99,
                    highlightPink: 0
                },
                colors: defaultColors
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders specified button in active state', () => {
        const { container } = render(HighlighterBar, {
            props: {
                serviceCallId,
                activeActionKey: 'eraser',
                colors: defaultColors
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('hides if session status is overlay', () => {
        getTestSessionStatusStore(serviceCallId).set('interacting');
        const { container } = render(HighlighterBar, {
            props: {
                serviceCallId
            }
        });
        expect(container.querySelector('div.hidden')).toBeFalsy();
        getTestSessionStatusStore(serviceCallId).set('overlay');

        return tick().then(() => {
            expect(container.querySelector('div.hidden')).toBeTruthy();
        });
    });

    test.each([
        ['yellow', 0, defaultColors],
        ['blue', 1, defaultColors],
        ['pink', 2, defaultColors],
        ['eraser', 3, defaultColors],
        ['clearAll', 4, defaultColors],
        ['green', 3, [actionKeys.highlightBlue, actionKeys.highlightPink, actionKeys.highlightGreen]],
        [
            'orange',
            4,
            [actionKeys.highlightBlue, actionKeys.highlightPink, actionKeys.highlightGreen, actionKeys.highlightOrange]
        ]
    ])('fires action event on %s button click', (key, index, colors) => {
        const { container, component } = render(HighlighterBar, {
            props: {
                serviceCallId,
                colors
            }
        });
        const onAction = vi.fn();
        component.$on('action', onAction);

        fireEvent.click(container.querySelectorAll('button')[index]);

        return tick().then(() => {
            expect(onAction).toHaveBeenCalled();
            expect(onAction.mock.calls[0][0].detail).toEqual({
                key
            });
        });
    });

    it('fires close event on escape key', () => {
        const { container, component } = render(HighlighterBar, {
            props: {
                serviceCallId
            }
        });
        const onClose = vi.fn();
        component.$on('close', onClose);

        const buttonElement = container.querySelector('.color-btn');
        buttonElement.focus();
        fireEvent.keyDown(buttonElement, { keyCode: 27 }); //esc

        return tick().then(() => {
            expect(onClose).toHaveBeenCalled();
        });
    });
});
