// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import MockCustomInteraction from './MockCustomInteraction.svelte';
import { render } from '@testing-library/svelte';
import CustomInteraction from '../CustomInteraction.svelte';

vi.mock('../../../interactions/custom/CustomInteraction.svelte', () => ({
    default: MockCustomInteraction
}));

describe('CustomInteraction', () => {
    it('sets and augments original props', async () => {
        render(CustomInteraction, {
            props: {
                foo: 'bar',
                onMount: props => {
                    expect(props).toMatchObject({
                        foo: 'bar',
                        disabled: true
                    });
                }
            }
        });
    });

    it('sets and augments original props.properties', async () => {
        render(CustomInteraction, {
            props: {
                properties: {
                    baz: 'qux'
                },
                onMount: props => {
                    expect(props.properties).toMatchObject({
                        baz: 'qux',
                        isReviewMode: true
                    });
                }
            }
        });
    });

    it('sets classes correctly', async () => {
        render(CustomInteraction, {
            props: {
                classes: 'qti-customInteraction foo',
                onMount: props => {
                    expect(props.classes).toBe('qti-customInteraction foo qti-reviewInteraction');
                }
            }
        });
    });
});
