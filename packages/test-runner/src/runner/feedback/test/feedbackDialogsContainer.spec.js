// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import { getNavigationFeedbacksStore } from '../navigationFeedback.js';
import FeedbackDialogsContainer from '../FeedbackDialogsContainer.svelte';

describe('FeedbackDialogsContainer', () => {
    const serviceCallId = '123';
    const feedbacksStore = getNavigationFeedbacksStore(serviceCallId);

    afterEach(() => {
        feedbacksStore.clear();
    });

    it('renders nothing if no feedbacks', () => {
        const { container } = render(FeedbackDialogsContainer, {
            props: { serviceCallId }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders feedbacks from the store', () => {
        const { container } = render(FeedbackDialogsContainer, {
            props: { serviceCallId }
        });

        feedbacksStore.set({
            feedbacksArray: [
                { key: 'A', config: { message: 'ABC', buttons: [{ key: 'btn1', label: 'Btn1' }] } },
                { key: '1', config: { message: '123', buttons: [{ key: 'btn2', label: 'Btn2' }] } }
            ]
        });

        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('binds onDone callback to feedback "done" event', () => {
        const { container } = render(FeedbackDialogsContainer, {
            props: { serviceCallId }
        });

        const onDone = vi.fn();

        feedbacksStore.set({
            feedbacksArray: [
                { key: 'A', config: { message: 'ABC', buttons: [{ key: 'btn1', label: 'Btn1' }] }, onDone }
            ]
        });

        return tick()
            .then(() => {
                const btn1 = container.querySelector('button');
                btn1.click();
                return tick();
            })
            .then(() => {
                expect(onDone).toHaveBeenCalledTimes(1);
                expect(onDone.mock.calls[0][0].detail).toStrictEqual({ action: 'btn1' });
            });
    });
});
