// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import PreviewerTestLayout from '../PreviewerTestLayout.svelte';
import testsStateStore, {
    getTestSessionStatusStore
} from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';

describe('PreviewerTestLayout', () => {
    const serviceCallId = 'test-session-123654';
    const statusStore = getTestSessionStatusStore(serviceCallId);

    beforeEach(() => {
        statusStore.set('initial');
    });

    afterEach(() => {
        testsStateStore.clear();
    });

    it('fails without a serviceCallId', () => {
        expect(() => render(PreviewerTestLayout, { props: {} })).toThrow(TypeError);
    });

    it('dispatches "mount" with the areas', () =>
        new Promise(done => {
            const { component } = render(PreviewerTestLayout, {
                props: {
                    serviceCallId
                }
            });
            component.$on('mount', e => {
                expect(e.detail.areas).toMatchSnapshot();
                done();
            });
        }));

    it('updates based on the test runner status', () => {
        const { container } = render(PreviewerTestLayout, {
            props: {
                serviceCallId
            }
        });
        return tick()
            .then(() => {
                expect(statusStore.get()).toBe('initial');
                expect(container).toMatchSnapshot();

                statusStore.set('loading');
                return tick();
            })
            .then(() => {
                expect(statusStore.get()).toBe('loading');
                expect(container).toMatchSnapshot();

                statusStore.set('interacting');
                return tick();
            })
            .then(() => {
                expect(statusStore.get()).toBe('interacting');
                expect(container).toMatchSnapshot();

                statusStore.set('loading');
                return tick();
            })
            .then(() => {
                expect(statusStore.get()).toBe('loading');
                expect(container).toMatchSnapshot();
            });
    });
});
