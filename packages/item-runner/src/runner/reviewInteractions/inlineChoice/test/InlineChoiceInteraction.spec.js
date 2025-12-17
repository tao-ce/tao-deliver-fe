// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import InlineChoiceInteraction from '../InlineChoiceInteraction.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';

const itemIdentifier = 'iabcd';
const responseIdentifier = 'RESPONSE_123';
const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
const choices = {
    c1: 'Choice 1',
    c2: 'Choice 2',
    c3: 'Choice 3'
};

describe('InlineChoiceInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
    });

    it('renders props correctly into markup', () => {
        const { container } = render(InlineChoiceInteraction, {
            props: {
                itemIdentifier,
                role: 'someUniqueRole',
                ariaAttrs: {
                    ariaFoo: 12,
                    ariaBar: 'baz'
                },
                dataAttrs: {
                    'data-foo': 'bar',
                    'data-baz': 24
                },
                language: 'hu',
                id: 'interactionId',
                classes: 'foo bar baz',
                dir: 'rtl',
                choices
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('listens store modifications - only until response set', async () => {
        const { container } = render(InlineChoiceInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices
            }
        });
        interactionStateStore.setResponse({ base: { identifier: 'c2' } });

        await tick();
        expect(container.querySelector('.select .option.selected').innerHTML).toBe(choices.c2);

        interactionStateStore.setResponse({ base: null });

        await tick();
        expect(container.querySelector('.select .option.selected').innerHTML).toBe(choices.c2);
    });
});
