// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import MockMediaInteraction from './MockMediaInteraction.svelte';
import { render } from '@testing-library/svelte';
import MediaInteraction from '../MediaInteraction.svelte';
import itemsStateStore from '../../../itemsStateStore.js';

vi.mock('../../../interactions/media/MediaInteraction.svelte', () => ({
    default: MockMediaInteraction
}));

describe('MediaInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
    });

    it('disables restriction properties', async () => {
        render(MediaInteraction, {
            props: {
                autostart: true,
                loop: true,
                minPlays: 1,
                maxPlays: 2,
                onMount: props => {
                    expect(props).toMatchObject({
                        autostart: false,
                        loop: false,
                        minPlays: 0,
                        maxPlays: 0
                    });
                }
            }
        });
    });

    it('sets classes correctly', async () => {
        render(MediaInteraction, {
            props: {
                classes: 'foo tao-media-mode-linear hide-player',
                onMount: props => {
                    expect(props.classes).toBe('foo qti-reviewInteraction pause');
                }
            }
        });
    });

    it('is reactive to props', async () => {
        const { component } = render(MediaInteraction, {
            props: {
                classes: 'foo',
                onMount: props => {
                    expect(props.classes).toBe('foo qti-reviewInteraction pause');
                }
            }
        });

        component.$set({
            classes: 'bar',
            onMount: props => {
                expect(props.classes).toBe('bar qti-reviewInteraction pause');
            }
        });
    });
});
