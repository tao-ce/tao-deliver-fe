// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import MicroValidity from '../MicroValidity.svelte';

describe('MicroValidity', () => {
    function expectDomSnapshotOk(container) {
        expect(container.querySelector('.constraints')).toMatchSnapshot();
    }

    function expectDomSnapshotEmpty(container) {
        expect(container.querySelector('.constraints').children.length).toBe(0);
    }

    it('renders max and min constraints', () => {
        const { container } = render(MicroValidity, {
            props: {
                matchMin: 2,
                matchMax: 3,
                usageCount: 2,
                lang: 'nb-NO'
            }
        });
        expectDomSnapshotOk(container);
    });

    it('renders without max and min if not specified', () => {
        const { container } = render(MicroValidity, {
            props: {
                usageCount: 2
            }
        });
        expectDomSnapshotEmpty(container);
    });

    it('renders with max and min constraints set but hidden', () => {
        const { container } = render(MicroValidity, {
            props: {
                matchMin: 2,
                matchMax: 3,
                showMin: false,
                showMax: false
            }
        });
        expectDomSnapshotEmpty(container);
    });

    it('renders with invalid class if usage above max', () => {
        const { container } = render(MicroValidity, {
            props: {
                matchMax: 3,
                usageCount: 4
            }
        });
        expectDomSnapshotOk(container);
    });

    it('renders with invalid class if usage below min', () => {
        const { container } = render(MicroValidity, {
            props: {
                matchMin: 2,
                usageCount: 1
            }
        });
        expectDomSnapshotOk(container);
    });

    it('responds to usageCount prop change', () => {
        const { container, component } = render(MicroValidity, {
            props: {
                matchMax: 1,
                usageCount: 0
            }
        });
        expectDomSnapshotOk(container);

        component.$set({ usageCount: 2 });

        return tick().then(() => {
            expectDomSnapshotOk(container);
        });
    });
});
