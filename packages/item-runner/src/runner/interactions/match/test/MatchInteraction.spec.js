// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-24 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// eslint-disable-next-line

import { render } from '@testing-library/svelte';
import itemsStateStore from '../../../itemsStateStore.js';
import MatchInteraction from '../MatchInteraction.svelte';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';

const itemIdentifier = 'i12345';
const responseIdentifier = 'RESPONSE_1';

describe('MatchInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
    });

    it('renders prompt', () => {
        const { container } = render(MatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                prompt: [{ type: 'text', content: 'Question 1' }]
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders props into markup', () => {
        const { container } = render(MatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
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
                dir: 'rtl'
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders tabular component by default', () => {
        const { container } = render(MatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier
            }
        });

        expect(container.querySelector('.match-tabular')).toBeTruthy();
    });

    it('renders non-tabular component if class defines it', () => {
        const { container } = render(MatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                choices: [[], []],
                classes: 'qti-match-non-tabular'
            }
        });

        expect(container.querySelector('.match-non-tabular')).toBeTruthy();
    });

    it('renders feedback', () => {
        const { container } = render(MatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                minAssociations: 1,
                maxAssociations: 2
            }
        });

        expect(container.querySelector('.qti-instruction-container')).toMatchSnapshot();
    });

    it('renders feedback with custom message', () => {
        const { container } = render(MatchInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                minAssociations: 1,
                maxAssociations: 2,
                dataAttrs: {
                    'data-max-selections-message': 'Custom max selection message',
                    'data-min-selections-message': 'Custom min selection message'
                }
            }
        });

        expect(container.querySelector('.qti-instruction-container')).toMatchSnapshot();
    });

    it('styles table header as bold, if boldTableHeader is true', () => {
        const { container } = render(ContextWrapper, {
            props: {
                testComponent: MatchInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    minAssociations: 1,
                    maxAssociations: 2,
                    choices: [
                        [{ key: 0 }, { key: 1 }, { key: 2 }],
                        [{ key: 3 }, { key: 4 }, { key: 5 }]
                    ],
                    classes: 'bold-table-header'
                }
            }
        });

        expect(container.querySelectorAll('th.font-weight-normal')).toHaveLength(0);
    });

    it('styles table header as normal, if boldTableHeader is false ', () => {
        const { container } = render(ContextWrapper, {
            props: {
                testComponent: MatchInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    minAssociations: 1,
                    maxAssociations: 2,
                    choices: [
                        [{ key: 0 }, { key: 1 }, { key: 2 }],
                        [{ key: 3 }, { key: 4 }, { key: 5 }]
                    ],
                    classes: ''
                }
            }
        });

        expect(container.querySelectorAll('th.font-weight-normal')).toHaveLength(7);
    });

    it('renders the instruction lang on the feedback block', () => {
        const getInstructionsLang = vi.fn(() => 'ru');
        const testContext = {
            getAssetManager: () => ({
                resolve: src => src
            }),
            registerLoadingElement: vi.fn(),
            getInstructionsLang
        };

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: MatchInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    minAssociations: 1,
                    maxAssociations: 2
                }
            }
        });
        expect(container).toMatchSnapshot();
        expect(getInstructionsLang).toHaveBeenCalled();
        expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toEqual('ru');
    });
});
