// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import ExtendedTextInteraction from '../ExtendedTextInteraction.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';
import { decommentify } from '@/test-utils/helpers.js';

vi.mock('@oat-sa-private/ui-elements/richTextEditor/plugins/mathbox/mathlive.js', () => ({
    __esModule: true,
    default: {
        renderMathInElement(element) {
            element.innerHTML = element.innerHTML.replace(
                /\$\$(.*)\$\$/,
                '[I am the rendered form of $1 math expression]'
            );
        }
    }
}));

const itemIdentifier = 'iabcd';
const responseIdentifier = 'RESPONSE_123';
const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

describe('ExtendedTextInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
    });

    it('renders props correctly into markup', () => {
        const { container } = render(ExtendedTextInteraction, {
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
                prompt: [{ type: 'text', content: 'Question 1' }]
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('listens store modifications - only until response set', () => {
        const string = 'foo';

        const { container } = render(ExtendedTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                baseType: 'string'
            }
        });
        interactionStateStore.setResponse({ base: { string } });

        return tick().then(() => {
            expect(decommentify(container.querySelector('.text-container').innerHTML)).toBe(string);
        });
    });

    test.each([
        ['string', 'foo', 'foo'],
        ['float', 123.2, '123.2'],
        ['integer', 321, '321'],
        ['integer', 12, '1100', 2],
        ['integer', 452, '1c4', 16]
    ])('loads correct value from store when baseType is %s', (baseType, value, expectedValue, base = 10) => {
        interactionStateStore.setResponse({
            base: {
                [baseType]: value
            }
        });

        const { container } = render(ExtendedTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                baseType,
                base
            }
        });

        expect(decommentify(container.querySelector('.text-container').innerHTML)).toBe(expectedValue);
    });

    test.each([
        ['', true],
        ['true', true],
        ['false', false]
    ])('renders resizable textarea based on data-resizable: %s', (resizableValue, expected) => {
        const { container } = render(ExtendedTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                dataAttrs: { 'data-resizable': resizableValue }
            }
        });

        const textContainer = container.querySelector('.text-container');

        if (expected) {
            expect(textContainer.classList).toContain('resizable');
        } else {
            expect(textContainer.classList).not.toContain('resizable');
        }
    });

    it('math is rendered', () => {
        const string = '<div class="math-entry">\\frac{1337}{412}</div>';
        interactionStateStore.setResponse({ base: { string } });

        const { container } = render(ExtendedTextInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                baseType: 'string',
                format: 'xhtml',
                dataAttrs: { 'data-math-entry': true }
            }
        });

        return tick() // html update
            .then(tick) // render math
            .then(tick)
            .then(tick)
            .then(() => {
                expect(container.querySelector('.text-container')).toMatchSnapshot();
            });
    });

    it('renders a plagiarism report', () => {
        const testContext = {
            getWritingMode: () => void 0,
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
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    describe('word & character count', () => {
        it('Show word counter with maxWords patternMask (plain text)', () => {
            const string = 'three little words';
            interactionStateStore.setResponse({ base: { string } });

            const { container } = render(ExtendedTextInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'string',
                    patternMask: '(?:(?:[^\\s\\:\\!\\?\\;\\…\\€]+)[\\s\\:\\!\\?\\;\\…\\€]*){0,4}'
                }
            });

            expect(container.querySelector('.feedbacks')).toMatchSnapshot();
        });

        it('Show word counter when data-word-count enabled', () => {
            const string = 'three little words';
            interactionStateStore.setResponse({ base: { string } });

            const { container } = render(ExtendedTextInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'string',
                    dataAttrs: {
                        'data-word-count': true
                    }
                }
            });

            expect(container.querySelector('.feedbacks')).toMatchSnapshot();
        });

        it('Show 0 as complete fallback when data-word-count enabled', () => {
            const { container } = render(ExtendedTextInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'string',
                    dataAttrs: {
                        'data-word-count': true
                    }
                }
            });

            expect(container.querySelector('.text-container').textContent).toBe('');
            expect(container.querySelector('.feedback strong').textContent).toBe('0');
        });

        it('Hidden word counter when data-word-count disabled', () => {
            const { container } = render(ExtendedTextInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'string',
                    dataAttrs: {
                        'data-word-count': false
                    }
                }
            });

            expect(container.querySelector('.feedbacks')).toMatchSnapshot();
        });

        test.each([
            [{ countState: { words: 10, chars: 20 }, inputFormat: 'xhtml', text: 'text.text' }, '10'], //load state, xhtml editor
            [{ countState: { words: 11, chars: 21 }, inputFormat: 'plain', text: 'text.text' }, '11'], //load state, plain editor
            [{ countState: { chars: 21 }, inputFormat: 'xhtml', text: 'text.text' }, '1'], // fallback xhtml editor
            [{ countState: { chars: 21 }, inputFormat: 'plain', text: 'text.text' }, '2'], // fallback plain editor
            [{ countState: null, inputFormat: 'xhtml', text: 'text.text' }, '1'], // fallback xhtml editor
            [{ countState: null, inputFormat: 'plain', text: 'text.text' }, '2'] // fallback plain editor
        ])('Word counter with %s', (interactionProps, expectedWords) => {
            interactionStateStore.set({
                count: interactionProps.countState
            });
            interactionStateStore.setResponse({
                base: {
                    string: interactionProps.text
                }
            });

            const { container } = render(ExtendedTextInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'string',
                    format: interactionProps.inputFormat,
                    dataAttrs: {
                        'data-word-count': true
                    }
                }
            });

            expect(container.querySelector('.text-container').textContent).toBe(interactionProps.text);
            expect(container.querySelector('.feedbacks')).toMatchSnapshot();
            expect(container.querySelector('.feedback strong').textContent).toBe(expectedWords);
        });

        test.each([
            [
                'load state, xhtml, data-character-count',
                {
                    countState: { words: 10, chars: 20 },
                    props: {
                        format: 'xhtml',
                        dataAttrs: {
                            'data-character-count': true
                        }
                    }
                }
            ],
            [
                'load state, plain, data-character-count',
                {
                    countState: { words: 11, chars: 21 },
                    props: {
                        format: 'plain',
                        dataAttrs: {
                            'data-character-count': true
                        }
                    }
                }
            ],
            [
                'fallback, xhtml, expectedLength',
                {
                    countState: null,
                    props: {
                        format: 'xhtml',
                        expectedLength: 5
                    }
                }
            ],
            [
                'fallback, plain, maxLength',
                {
                    countState: null,
                    props: {
                        format: 'plain',
                        patternMask: '^[\\s\\S]{0,5}$'
                    }
                }
            ]
        ])('Character counter: %s', (title, interactionProps) => {
            interactionStateStore.set({
                count: interactionProps.countState
            });
            interactionStateStore.setResponse({
                base: {
                    string: 'text.text'
                }
            });

            const { container } = render(ExtendedTextInteraction, {
                props: Object.assign(
                    {
                        itemIdentifier,
                        responseIdentifier,
                        baseType: 'string'
                    },
                    interactionProps.props
                )
            });
            expect(container.querySelector('.feedbacks')).toMatchSnapshot();
        });
    });
});
