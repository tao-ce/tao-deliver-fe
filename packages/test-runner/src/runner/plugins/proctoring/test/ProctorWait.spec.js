// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import ProctorWait from '../ProctorWait.svelte';
import testsStateStore, { getTestStateStore } from '../../../testsStateStore.js';
import { deliveryExecutionStatuses } from '../../../session/sessionStates.js';

describe('TestTitle', () => {
    const serviceCallId = 'test-session-123afdhj';
    const stateStore = getTestStateStore(serviceCallId);

    afterEach(() => {
        testsStateStore.clear();
    });

    it('fails without a serviceCallId', () => {
        stateStore.setTestContext({ status: deliveryExecutionStatuses.suspended });
        expect(() => render(ProctorWait, { props: {} })).toThrow(TypeError);
    });

    it('renders empty, then paused state, then resumed state and fires `resume` on button click', () => {
        stateStore.setTestContext({ status: deliveryExecutionStatuses.suspended });
        const { component, container } = render(ProctorWait, {
            props: {
                serviceCallId,
                hideContent: true //render below modal feedback
            }
        });
        const resumeBtnClickSpy = vi.fn();
        component.$on('resume', resumeBtnClickSpy);

        expect(container).toMatchSnapshot();
        component.$set({ hideContent: false }); //modal feedback closes, paused state
        return tick()
            .then(() => {
                expect(container).toMatchSnapshot();
                expect(document.activeElement && document.activeElement.textContent).toBe('Your test is paused');

                stateStore.setTestContext({ status: deliveryExecutionStatuses.interacting }); //to resumed state
                return tick();
            })
            .then(() => {
                expect(container).toMatchSnapshot();
                expect(document.activeElement && document.activeElement.textContent).toBe('Your test is ready');

                //resume button handler
                expect(resumeBtnClickSpy).not.toHaveBeenCalled();
                const resumeBtn = container.querySelector('button[name="proctor-resume"]');
                expect(resumeBtn).toBeTruthy();
                resumeBtn.click();
                expect(resumeBtnClickSpy).toHaveBeenCalled();
            });
    });

    it('renders inline extra-time notification if resumed state', () => {
        stateStore.setTestContext({ status: deliveryExecutionStatuses.interacting });
        const { container } = render(ProctorWait, {
            props: {
                serviceCallId,
                extraTimeStr: 'Some extra!',
                hideContent: false
            }
        });
        expect(container).toMatchSnapshot();
        stateStore.setTestContext({ status: deliveryExecutionStatuses.suspended });

        return tick().then(() => {
            expect(container).toMatchSnapshot(); //extra-time not shown anymore
        });
    });
});
