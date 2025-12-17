// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import UploadInteraction from '../UploadInteraction.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';
import { tick } from 'svelte';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';

describe('UploadInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
    });

    it('renders props into markup', () => {
        const { container } = render(UploadInteraction, {
            props: {
                role: 'someUniqueRole',
                ariaAttrs: {
                    'aria-foo': 12,
                    'aria-bar': 'baz'
                },
                dataAttrs: {
                    'data-foo': 'bar',
                    'data-baz': 24
                },
                language: 'hu',
                id: 'interactionId',
                classes: 'foo bar baz',
                dir: 'rtl',
                prompt: 'Fill out the input'
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('shows download link of uploaded file', () => {
        const itemIdentifier = 'iabcd';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponse({
            base: { fileHash: { name: 'foo.png', link: 'http://example.com/download-asset?id=oaeuaoeu' } }
        });

        const { container } = render(UploadInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('updates link if store changes', () => {
        const itemIdentifier = 'iabcd';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        interactionStateStore.setResponse({
            base: { fileHash: { name: 'bar.png', link: 'http://example.com/download-asset?id=12312aa' } }
        });

        const { container } = render(UploadInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier
            }
        });

        expect(container.querySelector('.selected-file-container')).toMatchSnapshot();

        interactionStateStore.setResponse({ base: null });

        return tick().then(() => {
            expect(container.querySelector('.selected-file-container')).toMatchSnapshot();
        });
    });

    it('renders a plagiarism report', () => {
        const itemIdentifier = 'item-7';
        const responseIdentifier = 'RESPONSE_1';

        const testContext = {
            getReviewSessionSubstate: () => 'answer',
            getExtraData: () => ({
                plagiarismReports: [
                    {
                        responses: {
                            [responseIdentifier]: {
                                status: 'suspicious',
                                href: 'http://example.com'
                            }
                        }
                    }
                ]
            })
        };

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: UploadInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier
                }
            }
        });
        expect(container).toMatchSnapshot();
    });
});
