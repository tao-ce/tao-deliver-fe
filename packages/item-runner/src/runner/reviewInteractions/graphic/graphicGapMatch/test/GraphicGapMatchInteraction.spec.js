// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import MockGraphicGapMatchInteraction from './MockGraphicGapMatchInteraction.svelte';
import GraphicGapMatchInteraction from '../GraphicGapMatchInteraction.svelte';
import itemsStateStore from '../../../../itemsStateStore.js';

vi.mock('../../../../interactions/graphic/graphicGapMatch/GraphicGapMatchInteraction.svelte', () => ({
    default: MockGraphicGapMatchInteraction
}));

describe('GraphicGapMatchInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
    });

    it('disabled property', async () => {
        render(GraphicGapMatchInteraction, {
            props: {
                onMount: props => {
                    expect(props).toMatchObject({
                        disabled: true
                    });
                }
            }
        });
    });

    it('sets classes correctly', async () => {
        render(GraphicGapMatchInteraction, {
            props: {
                classes: 'foo responsive qti-unselected-hidden',
                onMount: props => {
                    expect(props.classes).toBe('foo responsive qti-unselected-hidden qti-reviewInteraction');
                }
            }
        });
    });
});
