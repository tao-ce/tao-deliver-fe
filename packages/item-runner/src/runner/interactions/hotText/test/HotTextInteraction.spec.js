// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import HotTextInteraction from '../HotTextInteraction.svelte';
import HotTextToken from '../HotTextToken.svelte';
import P from '../../../static/P.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../../itemsSessionStatusStore.js';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';

describe('HotTextInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
        itemsSessionStatusStore.clear();
    });

    const qtiClass = 'qti-hottextInteraction';
    const testBlockTree = [
        {
            type: 'container',
            component: P,
            children: [
                {
                    type: 'element',
                    component: HotTextToken,
                    children: [],
                    props: {
                        identifier: 'hottext_moo',
                        content: 'moo'
                    }
                },
                {
                    type: 'text',
                    content: ' TEXT '
                },
                {
                    type: 'element',
                    component: HotTextToken,
                    children: [],
                    props: {
                        identifier: 'hottext_oink',
                        content: 'oink'
                    }
                },
                {
                    type: 'text',
                    content: ' TEXT '
                },
                {
                    type: 'element',
                    component: HotTextToken,
                    children: [],
                    props: {
                        identifier: 'hottext_roar',
                        content: 'roar'
                    }
                }
            ]
        }
    ];

    // RENDERING

    it('renders a blockTree with checkboxes if maxChoices=0', () => {
        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier: 'foo',
                blockTree: testBlockTree,
                maxChoices: 0
            }
        });
        expect(container).toMatchSnapshot();
        expect(container.querySelectorAll('input[type="checkbox"]').length).toBe(3);
    });

    it('renders a blockTree with checkboxes if maxChoices>1', () => {
        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier: 'foo',
                blockTree: testBlockTree,
                maxChoices: 2
            }
        });
        expect(container.querySelectorAll('input[type="checkbox"]').length).toBe(3);
    });

    it('renders a blockTree with radios if maxChoices=1', () => {
        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier: 'foo',
                blockTree: testBlockTree,
                maxChoices: 1
            }
        });
        expect(container).toMatchSnapshot();
        expect(container.querySelectorAll('input[type="radio"]').length).toBe(3);
    });

    it('renders prompt', () => {
        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier: 'foo',
                prompt: [
                    {
                        type: 'text',
                        content: 'Select hottexts'
                    }
                ]
            }
        });

        expect(container.querySelector('.qti-prompt')).toBeInTheDocument();
        expect(container.querySelector('.qti-prompt')).toHaveTextContent('Select hottexts');
    });

    it('renders props into markup', () => {
        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier: 'foo',
                responseIdentifier: 'RESPONSE',
                disabled: true,
                language: 'hu',
                id: 'interactionId',
                dir: 'rtl',
                role: 'someUniqueRole',
                dataAttrs: {
                    'data-foo': 'bar',
                    'data-baz': 24
                },
                ariaAttrs: {
                    ariaFoo: 12,
                    ariaBar: 'baz'
                },
                classes: 'foo bar baz'
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders with tao-control-styling-hidden class', () => {
        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier: 'foo',
                classes: 'blue tao-control-styling-hidden'
            }
        });

        expect(container.querySelector('.qti-hottextInteraction')).toHaveClass('tao-control-styling-hidden');
    });

    it('renders with qti-control-input-hidden class', () => {
        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier: 'foo',
                classes: 'green qti-control-input-hidden'
            }
        });

        expect(container.querySelector('.qti-hottextInteraction')).toHaveClass('qti-control-input-hidden');
    });

    it('renders with default class if omitted', () => {
        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier: 'foo',
                classes: 'red'
            }
        });

        expect(container.querySelector('.qti-hottextInteraction')).toHaveClass('tao-control-input-default');
    });

    it('renders with concatenated array of classes', () => {
        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier: 'foo',
                classes: ['red', 'qti-control-input-hidden', 'blue']
            }
        });

        expect(container.querySelector('.qti-hottextInteraction')).toHaveClass('red');
        expect(container.querySelector('.qti-hottextInteraction')).toHaveClass('qti-control-input-hidden');
        expect(container.querySelector('.qti-hottextInteraction')).toHaveClass('blue');
    });

    it('renders correct feedbacks', () => {
        const itemIdentifier = 'iabcd1';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        interactionStateStore.setResponse({
            list: {
                identifier: ['hottext_moo', 'hottext_roar']
            }
        });

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                minChoices: 1,
                maxChoices: 3
            }
        });

        expect(container.querySelector('.qti-instruction-container')).toMatchSnapshot();
    });

    it('is disabled in closed session', () => {
        const itemIdentifier = 'iabcd2';
        const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);

        itemSessionStatusStore.set('closed');

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                blockTree: testBlockTree
            }
        });

        expect(container.querySelector('.qti-hottextInteraction').getAttribute('aria-disabled')).toBe('true');
        expect(container.querySelector('input')).toBeDisabled();
    });

    // BEHVAIOUR

    it('can select and deselect tokens by a click: maxChoices<>1', () => {
        const itemIdentifier = 'iabcd';
        const responseIdentifier = 'RESPONSE_123';

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                maxChoices: 0
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(0);

        const token1 = container.querySelector('input[value="hottext_moo"]');
        const token2 = container.querySelector('input[value="hottext_roar"]');
        token1.click();

        return tick()
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(1);
                expect(token1).toBeChecked();
                token1.click();
                return tick();
            })
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(0);

                token1.click();
                token2.click();
            })
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(2);
                expect(token1).toBeChecked();
                expect(token2).toBeChecked();
            });
    });

    it('can select only one token by a click: maxChoices=1', () => {
        const itemIdentifier = 'iabcd';
        const responseIdentifier = 'RESPONSE_123';

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                maxChoices: 1
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(0);

        const token1 = container.querySelector('input[value="hottext_moo"]');
        const token2 = container.querySelector('input[value="hottext_roar"]');
        token1.click();

        return tick()
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(1);
                expect(token1).toBeChecked();
                token2.click();
                return tick();
            })
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(1);
                expect(token2).toBeChecked();
                token2.click();
            })
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(0);
            });
    });

    test.each(['Enter', 'Space'])('can select and deselect a token by %s keypress: maxChoices<>1', key => {
        const itemIdentifier = 'iabcd';
        const responseIdentifier = 'RESPONSE_123';

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                maxChoices: 0
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(0);

        const token1 = container.querySelector('input[value="hottext_moo"]');
        const token2 = container.querySelector('input[value="hottext_roar"]');
        token1.focus();
        fireEvent.keyUp(token1, { key });

        return tick()
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(1);
                expect(token1).toBeChecked();
                fireEvent.keyUp(token1, { key });
                return tick();
            })
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(0);
                fireEvent.keyUp(token1, { key });
                fireEvent.keyUp(token2, { key });
            })
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(2);
                expect(token1).toBeChecked();
                expect(token2).toBeChecked();
            });
    });

    test.each(['Enter', 'Space'])('can select and deselect a token by %s keypress: maxChoices=1', key => {
        const itemIdentifier = 'iabcd';
        const responseIdentifier = 'RESPONSE_123';

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                maxChoices: 1
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(0);

        const token1 = container.querySelector('input[value="hottext_moo"]');
        const token2 = container.querySelector('input[value="hottext_roar"]');
        token1.focus();
        fireEvent.keyUp(token1, { key });

        return tick()
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(1);
                expect(token1).toBeChecked();
                fireEvent.keyUp(token2, { key });
                return tick();
            })
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(1);
                fireEvent.keyUp(token2, { key });
            })
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(0);
            });
    });

    // STORE

    it('loads stored response - single cardinality', () => {
        expect.assertions(3);

        const itemIdentifier = 'iabcd3';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        interactionStateStore.setResponse({
            base: {
                identifier: 'hottext_moo'
            }
        });

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(1);
        expect(container.querySelector('input:checked').value).toBe('hottext_moo');
    });

    it('loads stored response - multiple cardinality', () => {
        expect.assertions(2);

        const itemIdentifier = 'iabcd3';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        interactionStateStore.setResponse({
            list: {
                identifier: ['hottext_moo', 'hottext_roar']
            }
        });

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                maxChoices: 2
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);

        const checkedInputs = Array.from(container.querySelectorAll('input:checked'));
        expect(checkedInputs.map(el => el.value)).toEqual(['hottext_moo', 'hottext_roar']);
    });

    it('listens store modifications', () => {
        expect.assertions(4);

        const itemIdentifier = 'iabcd3';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        interactionStateStore.setResponse({
            base: {
                identifier: 'hottext_moo'
            }
        });

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(1);
        expect(container.querySelector('input:checked').value).toBe('hottext_moo');

        interactionStateStore.setResponse({
            base: {
                identifier: ''
            }
        });

        return tick().then(() => {
            expect(container.querySelector('input:checked')).toBe(null);
        });
    });

    it('saves valid response to store on change with default constraints', () => {
        expect.assertions(7);

        const itemIdentifier = 'iabcd4';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                minChoices: 0,
                maxChoices: 2
            }
        });
        expect(interactionStateStore.get()).toMatchObject({ qtiClass });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(0);

        const token1 = container.querySelector('input[value="hottext_roar"]');
        token1.click();

        return tick().then(() => {
            expect(container.querySelectorAll('input:checked').length).toBe(1);
            expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hottext_roar'] } });
            expect(interactionStateStore.getValidity()).toBe(true);
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });
        });
    });

    it('saves valid response when max/min constraints turned off', () => {
        expect.assertions(5);

        const itemIdentifier = 'iabcd4';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                minChoices: -1,
                maxChoices: -1
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(0);

        const token1 = container.querySelector('input[value="hottext_roar"]');
        token1.click();

        return tick().then(() => {
            expect(container.querySelectorAll('input:checked').length).toBe(1);
            expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hottext_roar'] } });
            expect(interactionStateStore.getValidity()).toBe(true);
        });
    });

    it('saves invalid response (too many tokens) to store on change', () => {
        expect.assertions(5);

        const itemIdentifier = 'iabcd5';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                minChoices: 0,
                maxChoices: 2
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(0);

        const token1 = container.querySelector('input[value="hottext_roar"]');
        token1.click();
        const token2 = container.querySelector('input[value="hottext_oink"]');
        token2.click();
        const token3 = container.querySelector('input[value="hottext_moo"]');
        token3.click();

        return tick().then(() => {
            expect(container.querySelectorAll('input:checked').length).toBe(3);
            expect(interactionStateStore.getResponse()).toEqual({
                list: { identifier: ['hottext_roar', 'hottext_oink', 'hottext_moo'] }
            });
            expect(interactionStateStore.getValidity()).toBe(false);
        });
    });

    it('saves invalid response (too few tokens) to store on change', () => {
        expect.assertions(5);

        const itemIdentifier = 'iabcd6';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                minChoices: 2,
                maxChoices: 2
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(0);

        const token1 = container.querySelector('input[value="hottext_roar"]');
        token1.click();

        return tick().then(() => {
            expect(container.querySelectorAll('input:checked').length).toBe(1);
            expect(interactionStateStore.getResponse()).toEqual({ list: { identifier: ['hottext_roar'] } });
            expect(interactionStateStore.getValidity()).toBe(false);
        });
    });

    it('saves single value response when maxChoices === 1', () => {
        expect.assertions(5);

        const itemIdentifier = 'iabcd4';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                minChoices: -1,
                maxChoices: 1
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(0);

        const token1 = container.querySelector('input[value="hottext_roar"]');
        token1.click();

        return tick().then(() => {
            expect(container.querySelectorAll('input:checked').length).toBe(1);
            expect(interactionStateStore.getResponse()).toEqual({ base: { identifier: 'hottext_roar' } });
            expect(interactionStateStore.getValidity()).toBe(true);
        });
    });

    it('renders the instruction lang on the feedback block', () => {
        const itemIdentifier = 'liabcde';
        const responseIdentifier = 'RESPONSE_0';
        const getInstructionsLang = vi.fn(() => 'de_LU');
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
                testComponent: HotTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    blockTree: testBlockTree,
                    maxChoices: 2
                }
            }
        });
        expect(container).toMatchSnapshot();
        expect(getInstructionsLang).toHaveBeenCalled();
        expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toEqual('de_LU');
    });

    it('prevents selecting over maxChoices when tao-constrain-maxChoices data-prop is set', () => {
        expect.assertions(7);

        const itemIdentifier = 'iabcd4';
        const responseIdentifier = 'RESPONSE_123';

        const { container } = render(HotTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                blockTree: testBlockTree,
                minChoices: -1,
                maxChoices: 2,
                classes: ['tao-constrain-maxChoices']
            }
        });

        expect(container.querySelectorAll('input').length).toBe(3);
        expect(container.querySelectorAll('input:checked').length).toBe(0);

        const token1 = container.querySelector('input[value="hottext_moo"]');
        const token2 = container.querySelector('input[value="hottext_roar"]');
        const token3 = container.querySelector('input[value="hottext_oink"]');
        token1.click();

        return tick()
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(1);
                expect(token1).toBeChecked();
                token2.click();
                return tick();
            })
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(2);
                expect(token2).toBeChecked();
                token3.click();
                return tick();
            })
            .then(() => {
                expect(container.querySelectorAll('input:checked').length).toBe(2);
            });
    });
});
