// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import TextEntryInteraction from '../TextEntryInteraction.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';

const qtiClass = 'qti-textEntryInteraction';
const itemIdentifier = 'iabcd';
const responseIdentifier = 'RESPONSE_123';
const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

describe('TextEntryInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
    });
    describe('rendering', () => {
        it('renders with basic props', () => {
            const { container } = render(TextEntryInteraction, {
                props: {
                    itemIdentifier,
                    placeholderText: 'input placeholder',
                    expectedLength: 17
                }
            });

            expect(container).toMatchSnapshot();
        });

        test.each([['string'], ['float'], ['integer']])('renders with baseType is %s', baseType => {
            const { container } = render(TextEntryInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType
                }
            });

            expect(container).toMatchSnapshot();
        });

        it('renders with full props', () => {
            const { container } = render(TextEntryInteraction, {
                props: {
                    itemIdentifier,
                    disabled: true,
                    role: 'someUniqueRole',
                    ariaAttrs: {
                        'aria-hidden': false,
                        'aria-labelledby': 'someid'
                    },
                    dataAttrs: {
                        'data-foo': 'bar',
                        'data-baz': 24
                    },
                    language: 'lb',
                    id: 'interactionId',
                    dir: 'ltr',
                    placeholderText: 'input placeholder'
                }
            });

            expect(container).toMatchSnapshot();
        });

        test.each([
            ['text', 'string'],
            ['text', 'float'],
            ['numeric', 'integer']
        ])('renders inputmode attribute as %s when baseType is %s', (expectedInputmode, baseType) => {
            expect.assertions(1);
            const { container } = render(TextEntryInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType
                }
            });

            expect(container.querySelector('input').getAttribute('inputmode')).toBe(expectedInputmode);
        });

        it('extracts and applies qti classes', () => {
            const { container } = render(TextEntryInteraction, {
                props: {
                    itemIdentifier,
                    expectedLength: 13,
                    classes: 'qti-input-width-20'
                }
            });

            expect(container).toMatchSnapshot();
        });

        it('extracts and applies qti data attrs', () => {
            const { container } = render(TextEntryInteraction, {
                props: {
                    itemIdentifier,
                    dataAttrs: {
                        'qti-patternmask-message': 'Use alphanumeric characters and spaces'
                    }
                }
            });

            expect(container).toMatchSnapshot();
        });
    });

    describe('store value', () => {
        test.each([
            [void 0, true],
            ['abc', false],
            ['.*', true]
        ])('saves correct initial response', (patternMask, expectedValidity) => {
            render(TextEntryInteraction, {
                props: { itemIdentifier, responseIdentifier, patternMask }
            });

            expect(interactionStateStore.getResponse()).toMatchObject({ base: null });
            expect(interactionStateStore.getValidity()).toBe(expectedValidity);
        });

        test.each([
            ['string', '0', { base: { string: '0' } }, '0'],
            ['integer', '0', { base: { integer: 0 } }, '0'],
            ['float', '0', { base: { float: 0 } }, '0'],
            ['string', 'null', { base: null }, ''],
            ['integer', 'null', { base: null }, ''],
            ['float', 'null', { base: null }, '']
        ])(
            'loads stored response when baseType is %s, value is %s',
            (baseType, valueDescr, storedResponse, inputValue) => {
                interactionStateStore.setResponse(storedResponse);

                const { container } = render(TextEntryInteraction, {
                    props: { itemIdentifier, responseIdentifier, baseType }
                });

                expect(container.querySelector('input').value).toEqual(inputValue);
            }
        );

        test.each([
            ['string', 'foo', 'foo'],
            ['float', '123.2', 123.2],
            ['integer', '321', 321]
        ])('sets correct value into store when baseType is %s', (baseType, value, expectedValue) => {
            expect.assertions(4);

            const { container } = render(TextEntryInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType
                }
            });
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });

            fireEvent.input(container.querySelector('input'), { target: { value } });

            return tick().then(() => {
                const interactionResponse = interactionStateStore.getResponse();
                expect(interactionResponse).toMatchObject({
                    base: {
                        [baseType]: expectedValue
                    }
                });
                expect(interactionStateStore.getValidity()).toBe(true);
                expect(interactionStateStore.get()).toMatchObject({ qtiClass });
            });
        });

        test.each([
            [void 0, '123', 123],
            [2, '101', 5],
            [16, '1a', 26]
        ])('sets correct value into store when base is %d', (base, value, expectedValue) => {
            expect.assertions(2);

            const { container } = render(TextEntryInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'integer',
                    base
                }
            });
            fireEvent.input(container.querySelector('input'), { target: { value } });

            return tick().then(() => {
                const interactionResponse = interactionStateStore.getResponse();
                expect(interactionResponse).toMatchObject({
                    base: {
                        integer: expectedValue
                    }
                });
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        test.each([
            ['float', '12.2a'],
            ['integer', '321abc'],
            ['integer', '123', 2],
            ['integer', '2147483648', 10]
        ])(
            'sets invalid value into store when baseType is %s, value is %s and base is %s',
            (baseType, value, base = 10) => {
                expect.assertions(2);

                const { container } = render(TextEntryInteraction, {
                    props: {
                        itemIdentifier,
                        responseIdentifier,
                        base,
                        baseType
                    }
                });
                fireEvent.input(container.querySelector('input'), { target: { value } });

                return tick().then(() => {
                    const interactionResponse = interactionStateStore.getResponse();
                    expect(interactionResponse).toMatchObject({
                        base: null
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);
                });
            }
        );

        it('sets validity to false and the response when the pattern does not match', () => {
            expect.assertions(2);
            const { container } = render(TextEntryInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'string',
                    dataAttrs: {
                        'data-patternmask-message': 'Only 2 lower case letters'
                    },
                    patternMask: '^[a-z]{2}$'
                }
            });

            const input = container.querySelector('input');
            fireEvent.focus(input);
            fireEvent.input(input, { target: { value: 'AZE' } });
            fireEvent.blur(input);

            return tick()
                .then(() => tick())
                .then(() => tick())
                .then(() => {
                    const interactionResponse = interactionStateStore.getResponse();
                    expect(interactionResponse).toMatchObject({
                        base: {
                            string: 'AZE'
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);
                });
        });
    });

    describe('behavior', () => {
        function selectorVisibleValidFeedback(subSelector = '') {
            return `.feedback-inline .valid:not(.hide-valid)${subSelector}`;
        }
        function selectorVisibleInvalidFeedback(subSelector = '') {
            return `.feedback-inline .invalid:not(.hide-invalid)${subSelector}`;
        }
        function selectorVisibleFeedback(subSelector = '') {
            return `.feedback-inline .valid:not(.hide-valid)${subSelector}, .feedback-inline .invalid:not(.hide-invalid)${subSelector}`;
        }
        function feedbackHasText(container, message) {
            expect(container.querySelector(selectorVisibleFeedback('>span'))).toBeInTheDocument();
            expect(container.querySelector(selectorVisibleFeedback('>span')).textContent).toEqual(message);
        }
        function feedbackIsAbsent(container) {
            expect(container.querySelector(selectorVisibleFeedback())).not.toBeInTheDocument();
        }
        function feedbackHasLang(container, lang) {
            expect(container.querySelector('.feedback-inline')).toHaveAttribute('lang', lang);
        }
        function feedbackIsPresent(container) {
            expect(container.querySelector(selectorVisibleFeedback())).toBeInTheDocument();
        }
        function feedbackStateIsValid(container) {
            expect(container.querySelector(selectorVisibleValidFeedback())).toBeInTheDocument();
            expect(container.querySelector(selectorVisibleInvalidFeedback())).not.toBeInTheDocument();
        }
        function feedbackStateIsInvalid(container) {
            expect(container.querySelector(selectorVisibleInvalidFeedback())).toBeInTheDocument();
            expect(container.querySelector(selectorVisibleValidFeedback())).not.toBeInTheDocument();
        }
        function valueIsInvalid(container) {
            //no checkmark icon in the feedback
            expect(container.querySelector(selectorVisibleFeedback(' svg>title'))).not.toBeInTheDocument();
        }
        function inputStateIsValid(container) {
            expect(container.querySelector('input.valid')).toBeInTheDocument();
        }
        function inputStateIsInvalid(container) {
            expect(container.querySelector('input')).toBeInTheDocument();
            expect(container.querySelector('input.valid')).not.toBeInTheDocument();
            expect(container.querySelector('input+span svg>title').textContent).toEqual('Warning icon');
        }

        describe('string', () => {
            it('does not allow to enter text longer than 1000 symbols limit', () => {
                const { container } = render(TextEntryInteraction, {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'string'
                });

                fireEvent.focus(container.querySelector('input'));
                return tick()
                    .then(() => {
                        expect(container.querySelector('input').getAttribute('maxlength')).toBe('1000');

                        feedbackIsAbsent(container);

                        const longText = '1'.repeat(1010);
                        fireEvent.input(container.querySelector('input'), { target: { value: longText } });
                    })
                    .then(() => {
                        expect(container.querySelector('input').value.length).toBe(1000);

                        feedbackIsPresent(container);
                        feedbackStateIsValid(container);
                        feedbackHasText(container, 'Max length has been reached');
                        inputStateIsValid(container);
                        valueIsInvalid(container);

                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        feedbackIsAbsent(container);
                        inputStateIsInvalid(container);

                        fireEvent.focus(container.querySelector('input'));
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackStateIsInvalid(container);
                        feedbackHasText(container, 'Max length has been reached');
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);

                        const shortText = '1'.repeat(990);
                        fireEvent.input(container.querySelector('input'), { target: { value: shortText } });
                    })
                    .then(() => {
                        expect(container.querySelector('input').value.length).toBe(990);

                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                    });
            });
        });

        describe('string with pattern', () => {
            const patternMessage = 'Regexp test';
            const props = {
                itemIdentifier,
                responseIdentifier,
                baseType: 'string',
                dataAttrs: {
                    'data-patternmask-message': patternMessage
                },
                patternMask: '^[0-9]{3}$'
            };

            it('shows feedback on first try only if invalid', () => {
                const lang = 'nb-NO';
                const { container } = render(ContextWrapper, {
                    props: {
                        testContextKey: itemIdentifier,
                        testContext: {
                            getInstructionsLang: () => lang,
                            getWritingMode: () => void 0
                        },
                        testComponent: TextEntryInteraction,
                        testComponentProps: props
                    }
                });

                //const { container } = render(TextEntryInteraction, props);
                fireEvent.focus(container.querySelector('input'));

                return tick()
                    .then(() => {
                        // valid state without pattern message on initial focusing
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                        //fire next step
                        fireEvent.input(container.querySelector('input'), { target: { value: '12' } });
                    })
                    .then(() => {
                        // valid state withpattern message and partially correct value
                        feedbackIsPresent(container);
                        feedbackHasText(container, patternMessage);
                        feedbackStateIsValid(container);
                        valueIsInvalid(container);
                        inputStateIsValid(container);
                        //fire next step
                        fireEvent.input(container.querySelector('input'), { target: { value: '123' } });
                    })
                    .then(() => {
                        // valid state without pattern message and completely correct value
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                        //fire next step
                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        // valid state without pattern message and completely correct value
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                        //fire next step
                        fireEvent.focus(container.querySelector('input'));
                    })
                    .then(() => {
                        // valid state without pattern message and completely correct value
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                        fireEvent.input(container.querySelector('input'), { target: { value: '12' } });
                    })
                    .then(() => {
                        // invalid state with pattern message and partially correct value
                        feedbackIsPresent(container);
                        feedbackHasText(container, patternMessage);
                        feedbackStateIsInvalid(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);
                        feedbackHasLang(container, lang);
                        expect(container.querySelector('.feedback-inline')).toMatchSnapshot();
                        //fire next step
                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        // invalid state without pattern message and partially correct value
                        feedbackIsAbsent(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);
                    });
            });

            it('shows invalid input if first typed value out of pattern', () => {
                const { container } = render(TextEntryInteraction, props);
                fireEvent.focus(container.querySelector('input'));

                return tick()
                    .then(() => {
                        // valid state without pattern message on initial focusing
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                        //fire next step
                        fireEvent.input(container.querySelector('input'), { target: { value: 'as' } });
                    })
                    .then(() => {
                        // valid state with pattern message and incorrect value
                        feedbackIsPresent(container);
                        feedbackHasText(container, patternMessage);
                        feedbackStateIsValid(container);
                        valueIsInvalid(container);
                        inputStateIsValid(container);
                        //fire next step
                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        // invalid state without pattern message and incorrect value
                        feedbackIsAbsent(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);
                    });
            });

            it('resolve wrong value', () => {
                const { container } = render(TextEntryInteraction, props);
                fireEvent.focus(container.querySelector('input'));

                return tick()
                    .then(() => {
                        // valid state without pattern message on initial focusing
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                        //fire next step
                        fireEvent.input(container.querySelector('input'), { target: { value: '1' } });
                    })
                    .then(() => {
                        // valid state with pattern message and partially correct value
                        feedbackIsPresent(container);
                        feedbackHasText(container, patternMessage);
                        feedbackStateIsValid(container);
                        valueIsInvalid(container);
                        inputStateIsValid(container);
                        //fire next step
                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        // invalid state without pattern message and partially correct value
                        feedbackIsAbsent(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);
                        //fire next step
                        fireEvent.focus(container.querySelector('input'));
                    })
                    .then(() => {
                        // invalid state with pattern message and partially correct value
                        feedbackIsPresent(container);
                        feedbackHasText(container, patternMessage);
                        feedbackStateIsInvalid(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);
                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        // invalid state without pattern message and partially correct value
                        feedbackIsAbsent(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);
                        //fire next step
                        fireEvent.focus(container.querySelector('input'));
                    })
                    .then(() => {
                        // invalid state with pattern message and partially correct value
                        feedbackIsPresent(container);
                        feedbackHasText(container, patternMessage);
                        feedbackStateIsInvalid(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);
                        //fire next step
                        fireEvent.input(container.querySelector('input'), { target: { value: '12' } });
                    })
                    .then(() => {
                        // invalid state with pattern message and partially resolved value
                        feedbackIsPresent(container);
                        feedbackHasText(container, patternMessage);
                        feedbackStateIsInvalid(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);
                        //fire next step
                        fireEvent.input(container.querySelector('input'), { target: { value: '123' } });
                    })
                    .then(() => {
                        // valid state without pattern message and fully resolved value
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                    });
            });
        });

        describe('maxlength pattern', () => {
            test.each([['string'], ['float'], ['integer']])(
                'recognizes maxlength pattern (baseType=%s), and shows default message if no custom',
                baseType => {
                    const { container } = render(TextEntryInteraction, {
                        itemIdentifier,
                        responseIdentifier,
                        baseType,
                        patternMask: '^[\\s\\S]{0,3}$'
                    });
                    const inputElem = container.querySelector('input');
                    expect(inputElem.getAttribute('maxlength')).toBe('3');

                    fireEvent.focus(inputElem);
                    return tick().then(() => {
                        expect(container.querySelector('.feedback-inline')).toMatchSnapshot();
                    });
                }
            );

            it('recognizes maxlength pattern, and shows custom message', () => {
                const { container } = render(TextEntryInteraction, {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'string',
                    dataAttrs: {
                        'data-patternmask-message': 'You wont be able to type more symbols than needed'
                    },
                    patternMask: '^[\\s\\S]{0,3}$'
                });
                const inputElem = container.querySelector('input');
                expect(inputElem.getAttribute('maxlength')).toBe('3');

                fireEvent.focus(inputElem);
                return tick().then(() => {
                    expect(container.querySelector('.feedback-inline')).toMatchSnapshot();
                });
            });
        });

        describe('integer', () => {
            it('allows to enter integer values', () => {
                const { container } = render(TextEntryInteraction, {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'integer'
                });
                const inputElem = container.querySelector('input');
                fireEvent.focus(inputElem);
                return tick()
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(inputElem, { target: { value: '-2147483647' } });
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.blur(inputElem);
                        fireEvent.focus(inputElem);
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(inputElem, { target: { value: '2147483647' } });
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(inputElem, { target: { value: '1' } });
                    })
                    .then(() => {
                        inputStateIsValid(container);
                    });
            });

            it('becomes invalid if value is not integer', () => {
                const { container } = render(TextEntryInteraction, {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'integer'
                });
                const inputElem = container.querySelector('input');
                fireEvent.focus(inputElem);
                return tick()
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(inputElem, { target: { value: '1.2' } });
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackHasText(container, 'Invalid value, please refer to the instructions');
                        fireEvent.blur(inputElem);
                        fireEvent.focus(inputElem);
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackHasText(container, 'Invalid value, please refer to the instructions');
                        feedbackStateIsInvalid(container);
                        inputStateIsInvalid(container);
                    });
            });

            it('becomes invalid if value have wrong separator', () => {
                const { container } = render(TextEntryInteraction, {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'float'
                });
                const inputElem = container.querySelector('input');
                fireEvent.focus(inputElem);
                return tick()
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(inputElem, { target: { value: '1,2' } });
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackHasText(container, 'Invalid value, use "." (dot) for decimal point separator');
                        fireEvent.blur(inputElem);
                        fireEvent.focus(inputElem);
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackHasText(container, 'Invalid value, use "." (dot) for decimal point separator');
                        feedbackStateIsInvalid(container);
                        inputStateIsInvalid(container);
                    });
            });

            it('becomes invalid if value is out of range', () => {
                const { container } = render(TextEntryInteraction, {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'integer'
                });
                const inputElem = container.querySelector('input');
                fireEvent.focus(inputElem);
                return tick()
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(inputElem, { target: { value: '-2147483649' } });
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackHasText(container, 'Number is out of range');
                        fireEvent.blur(inputElem);
                        fireEvent.focus(inputElem);
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackHasText(container, 'Number is out of range');
                        feedbackStateIsInvalid(container);
                        inputStateIsInvalid(container);
                        fireEvent.input(inputElem, { target: { value: '-1' } });
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(inputElem, { target: { value: '2147483648' } });
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackHasText(container, 'Number is out of range');
                        feedbackStateIsInvalid(container);
                        inputStateIsInvalid(container);
                    });
            });

            it('does not allow to enter text longer than 1000 symbols limit', () => {
                const { container } = render(TextEntryInteraction, {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'integer'
                });

                fireEvent.focus(container.querySelector('input'));
                return tick()
                    .then(() => {
                        expect(container.querySelector('input').getAttribute('maxlength')).toBe('1000');

                        const longText = '1'.repeat(1010);
                        fireEvent.input(container.querySelector('input'), { target: { value: longText } });
                    })
                    .then(() => {
                        expect(container.querySelector('input').value.length).toBe(1000);
                    });
            });
        });

        describe('float', () => {
            const props = {
                itemIdentifier,
                responseIdentifier,
                baseType: 'float'
            };

            it('allows to enter float values', () => {
                const { container } = render(TextEntryInteraction, props);
                fireEvent.focus(container.querySelector('input'));

                return tick()
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(container.querySelector('input'), { target: { value: '' } });
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(container.querySelector('input'), { target: { value: -123 } });
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                        fireEvent.focus(container.querySelector('input'));
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(container.querySelector('input'), { target: { value: -0.75 } });
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                    });
            });

            it('becomes invalid when entering another value', () => {
                const { container } = render(TextEntryInteraction, props);
                fireEvent.focus(container.querySelector('input'));

                return tick()
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(container.querySelector('input'), { target: { value: 'aaa' } });
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackHasText(container, 'Invalid value, use "." (dot) for decimal point separator');
                        feedbackStateIsValid(container);
                        inputStateIsValid(container);
                        valueIsInvalid(container);

                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);

                        fireEvent.focus(container.querySelector('input'));
                        fireEvent.input(container.querySelector('input'), { target: { value: -0.75 } });
                    })
                    .then(() => {
                        inputStateIsValid(container);

                        fireEvent.input(container.querySelector('input'), { target: { value: 'a!xv' } });
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackHasText(container, 'Invalid value, use "." (dot) for decimal point separator');
                        feedbackStateIsInvalid(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);

                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        feedbackIsAbsent(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);
                    });
            });

            it('does not allow to enter text longer than 1000 symbols limit', () => {
                const { container } = render(TextEntryInteraction, {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'float'
                });

                fireEvent.focus(container.querySelector('input'));
                return tick()
                    .then(() => {
                        expect(container.querySelector('input').getAttribute('maxlength')).toBe('1000');

                        const longText = '1'.repeat(1010);
                        fireEvent.input(container.querySelector('input'), { target: { value: longText } });
                    })
                    .then(() => {
                        expect(container.querySelector('input').value.length).toBe(1000);
                    });
            });
        });

        describe('float with a pattern', () => {
            const props = {
                itemIdentifier,
                responseIdentifier,
                baseType: 'float',
                patternMask: '^[0-9]{1}\\.[0-9]{2}$'
            };

            it('allows to enter float values', () => {
                const { container } = render(TextEntryInteraction, props);
                fireEvent.focus(container.querySelector('input'));

                return tick()
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(container.querySelector('input'), { target: { value: 9.75 } });
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(container.querySelector('input'), { target: { value: 1.23 } });
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                        fireEvent.focus(container.querySelector('input'));
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(container.querySelector('input'), { target: { value: 0.75 } });
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                    });
            });

            it('becomes invalid with an value not matching the pattern', () => {
                const { container } = render(TextEntryInteraction, props);
                fireEvent.focus(container.querySelector('input'));

                return tick()
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(container.querySelector('input'), { target: { value: 1.34 } });
                    })
                    .then(() => {
                        inputStateIsValid(container);
                        fireEvent.input(container.querySelector('input'), { target: { value: -1.34 } });
                    })
                    .then(() => {
                        //no feedback on the first try
                        feedbackIsAbsent(container);
                        inputStateIsValid(container);
                        valueIsInvalid(container);

                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);

                        fireEvent.focus(container.querySelector('input'));
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackHasText(container, 'The format must match the pattern.');
                        feedbackStateIsInvalid(container);

                        fireEvent.input(container.querySelector('input'), { target: { value: 9.75 } });
                    })
                    .then(() => {
                        inputStateIsValid(container);

                        fireEvent.input(container.querySelector('input'), { target: { value: '3,43' } });
                    })
                    .then(() => {
                        feedbackIsPresent(container);
                        feedbackHasText(container, 'The format must match the pattern.');
                        feedbackStateIsInvalid(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);

                        fireEvent.blur(container.querySelector('input'));
                    })
                    .then(() => {
                        feedbackIsAbsent(container);
                        inputStateIsInvalid(container);
                        valueIsInvalid(container);
                    });
            });
        });
    }); // Properly closing the 'behavior' describe block

    describe('trace events', () => {
        let container;
        let input;
        let onTrace;
        const selection = 'test selection';
        const selectionStart = 3;

        beforeEach(() => {
            ({ container } = render(TextEntryInteraction, { itemIdentifier, responseIdentifier }));
            input = container.querySelector('input');
            Object.defineProperty(input, 'selectionStart', {
                get() {
                    return selectionStart;
                }
            });
            vi.spyOn(document, 'getSelection').mockReturnValue(selection);

            onTrace = vi.fn();
            const interaction = container.querySelector('.qti-interaction');
            interaction.addEventListener('interactiontrace', onTrace);
        });

        afterEach(() => {
            document.getSelection.mockRestore();
        });

        it.each([['copy'], ['cut'], ['dragstart'], ['dragend']])(
            'fires %s trace event',
            domEventType =>
                new Promise(resolve => {
                    fireEvent(input, new Event(domEventType));

                    setTimeout(() => {
                        expect(onTrace).toHaveBeenCalledTimes(1);
                        expect(onTrace.mock.calls[0][0].detail).toMatchObject({
                            domEventType,
                            content: selection,
                            position: selectionStart
                        });
                        expect(onTrace.mock.calls[0][0].detail.target).toBe(input);
                        resolve();
                    }, 0);
                })
        );

        it('fires paste trace event', () =>
            new Promise(resolve => {
                const content = 'test content';
                const newResponse = 'some new response';

                fireEvent.keyDown(input, { key: 'v', ctrlKey: true });
                fireEvent.paste(input, { clipboardData: { getData: () => content } });

                interactionStateStore.setResponse({
                    base: {
                        string: newResponse
                    }
                });

                setTimeout(() => {
                    expect(onTrace).toHaveBeenCalledTimes(1);
                    expect(onTrace.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'paste',
                        content,
                        newResponse,
                        replacedContent: selection,
                        position: selectionStart,
                        pressedKey: 'v'
                    });
                    expect(onTrace.mock.calls[0][0].detail.target).toBe(input);
                    resolve();
                }, 0);
            }));

        it('fires drop trace event', () =>
            new Promise(resolve => {
                const content = 'test content';
                const newResponse = 'some new response';

                fireEvent.drop(input, { dataTransfer: { getData: () => content } });

                interactionStateStore.setResponse({
                    base: {
                        string: newResponse
                    }
                });

                setTimeout(() => {
                    expect(onTrace).toHaveBeenCalledTimes(1);
                    expect(onTrace.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'drop',
                        content,
                        newResponse
                    });
                    expect(onTrace.mock.calls[0][0].detail.target).toBe(input);
                    resolve();
                }, 0);
            }));

        it('fires focus trace event', () =>
            new Promise(resolve => {
                fireEvent.focus(input);

                setTimeout(() => {
                    expect(onTrace).toHaveBeenCalledTimes(1);
                    expect(onTrace.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'focus'
                    });
                    expect(onTrace.mock.calls[0][0].detail.target).toBe(input);
                    resolve();
                }, 0);
            }));

        it('fires blur trace event', () =>
            new Promise(resolve => {
                const newResponse = 'some response';

                interactionStateStore.setResponse({
                    base: {
                        string: newResponse
                    }
                });

                fireEvent.blur(input);

                setTimeout(() => {
                    expect(onTrace).toHaveBeenCalledTimes(1);
                    expect(onTrace.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'blur',
                        newResponse
                    });
                    expect(onTrace.mock.calls[0][0].detail.target).toBe(input);
                    resolve();
                }, 0);
            }));
    });
});
