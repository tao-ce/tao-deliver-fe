// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import ReadAloudBar from '../ReadAloudBar.svelte';
import testsStateStore, { getTestSessionStatusStore } from '../../../../testsStateStore.js';

describe('ReadAloudBar', () => {
    const serviceCallId = 'test-session-123';

    afterEach(() => {
        testsStateStore.clear();
    });

    it('renders with default props', () => {
        const { container } = render(ReadAloudBar, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();

        const buttonElement = container.querySelector('.icon-bar-btn');
        return tick().then(() => {
            expect(buttonElement).not.toHaveFocus();
        });
    });

    it('renders with playOnClick button instead of playSelection', () => {
        const { container } = render(ReadAloudBar, {
            props: {
                serviceCallId,
                clickToSpeakEnable: true
            }
        });
        const buttonTestIds = Array.from(container.querySelectorAll('.icon-bar-btn')).map(elt => elt.dataset.testId);

        expect(buttonTestIds).toEqual(['readaloud-play', 'readaloud-play-on-click', 'readaloud-settings']);
    });

    it('renders in disabled state', () => {
        const { container } = render(ReadAloudBar, {
            props: {
                serviceCallId,
                disabled: true
            }
        });
        expect(container.querySelector('[data-test-id="readaloud-play-selection"]')).toHaveAttribute('disabled');
        expect(container.querySelector('[data-test-id="readaloud-play"]')).toHaveAttribute('disabled');
        expect(container.querySelectorAll('button:not(:disabled)')).toHaveLength(0);
    });

    test.each([
        ['playOnClick', true, false, {}],
        ['playSelection', false, true, {}],
        ['settings', false, false, { open: true }]
    ])('renders %s footer', (title, playOnClickToggled, playSelectionToggled, readAloudSettings) => {
        const { container } = render(ReadAloudBar, {
            props: {
                serviceCallId,
                clickToSpeakEnable: playOnClickToggled,
                playOnClickToggled,
                playSelectionToggled,
                readAloudSettings
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('hides if session status is overlay', () => {
        getTestSessionStatusStore(serviceCallId).set('interacting');
        const { container } = render(ReadAloudBar, {
            props: {
                serviceCallId
            }
        });
        expect(container.querySelector('.readAloud-bar.hidden')).toBeFalsy();
        getTestSessionStatusStore(serviceCallId).set('overlay');

        return tick().then(() => {
            expect(container.querySelector('.readAloud-bar.hidden')).toBeTruthy();
        });
    });

    test.each([
        ['playAll', true, 0],
        ['playAll', false, 0],
        ['playOnClick', true, 1],
        ['playSelection', false, 1],
        ['settings', true, 2],
        ['settings', false, 2]
    ])('fires action event with "%s" on nth button click', (key, clickToSpeakEnable, index) => {
        const { container, component } = render(ReadAloudBar, {
            props: {
                serviceCallId,
                clickToSpeakEnable
            }
        });
        const onAction = vi.fn();
        component.$on('action', onAction);

        const button = container.querySelectorAll('.icon-bar-btn')[index];
        fireEvent.click(button);

        return tick().then(() => {
            expect(onAction).toHaveBeenCalled();
            expect(onAction.mock.calls[0][0].detail).toEqual({
                key
            });
        });
    });

    it('fires "close" event on escape key', () => {
        const { container, component } = render(ReadAloudBar, {
            props: {
                serviceCallId
            }
        });
        const onClose = vi.fn();
        component.$on('close', onClose);

        const buttonElement = container.querySelector('.icon-bar-btn');
        buttonElement.focus();
        fireEvent.keyDown(buttonElement, { keyCode: 27 }); //esc

        return tick().then(() => {
            expect(onClose).toHaveBeenCalled();
        });
    });

    it('focuses first button if "autofocus"', () => {
        const { container } = render(ReadAloudBar, {
            props: {
                serviceCallId,
                autofocus: true
            }
        });
        const buttonElement = container.querySelector('.icon-bar-btn');

        return tick().then(() => {
            expect(buttonElement).toHaveFocus();
        });
    });
});
