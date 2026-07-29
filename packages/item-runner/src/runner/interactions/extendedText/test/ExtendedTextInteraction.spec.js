// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

//jsdom-worker has problems, so mock without web worker
vi.mock('@oat-sa-private/ui-core/pattern/match.js', () => ({
    __esModule: true,
    default: ({ pattern, text }, callback) => {
        // Call the callback synchronously to match test expectations
        callback(null, text.match(pattern));

        // Return a destroy function like the real implementation
        return () => {
            // Mock destroy function - no-op since we're not using a real worker
        };
    }
}));

vi.mock('@oat-sa-private/ui-elements/input/writingModeSupport.js', () => ({
    supportsVerticalFormElement: vi.fn().mockReturnValue(true)
}));

vi.mock('lodash', async importOriginal => {
    const originalModule = await importOriginal();
    return Object.assign({ __esModule: true }, originalModule, {
        // mock debounce with zero delay because async validation uses it with too much
        debounce: fn => originalModule.debounce(fn, 0)
    });
});

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { wait } from '../../../../runner/util/async.js';
import ExtendedTextInteraction from '../ExtendedTextInteraction.svelte';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';

const qtiClass = 'qti-extendedTextInteraction';
const itemIdentifier = 'iabcd';
const responseIdentifier = 'RESPONSE_123';
const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

// Mocked item context methods
const registerLoadingElement = vi.fn();
const triggerError = vi.fn();
const logger = {
    error: vi.fn()
};
const getLogger = () => logger;
const removeItemNotification = vi.fn();
const getWritingMode = vi.fn();

const testContext = {
    registerLoadingElement,
    getInstructionsLang: () => 'nb-NO',
    getUserLang: () => 'nb-NO',
    getItemLang: () => 'fr-FR',
    triggerError,
    getLogger,
    removeItemNotification,
    getWritingMode
};

const fireSelectionChange = textarea =>
    fireEvent(textarea, new Event('selectionchange', { bubbles: false, cancelable: false }));

describe('ExtendedTextInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
        registerLoadingElement.mockClear();
        triggerError.mockClear();
    });

    it('renders prompt', () => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    prompt: [{ type: 'text', content: 'Fill out the input' }]
                }
            }
        });

        expect(container).toMatchSnapshot();
    });

    test.each([['plain'], ['preformatted'], ['xhtml']])('renders interaction with props and format %s', format => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    disabled: true,
                    required: true,
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
                    placeholderText: 'some placeholder',
                    format
                }
            }
        });

        expect(container).toMatchSnapshot();
    });

    test.each([['plain'], ['preformatted'], ['xhtml']])('listens store modifications for format %s', format => {
        const string = 'foo';
        interactionStateStore.setResponse({ base: { string } });

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'string',
                    format
                }
            }
        });

        expect(container.querySelector('textarea').value).toBe(string);

        interactionStateStore.setResponse({
            base: {
                string: null
            }
        });
    });

    test.each([
        [true, void 0, false],
        [false, void 0, true],
        [void 0, void 0, true],
        [true, 'abc', false],
        [true, '.*', false],
        [false, 'abc', false],
        [false, '.*', true],
        [void 0, 'abc', false],
        [void 0, '.*', true]
    ])('saves correct initial response', (required, patternMask, expected) => {
        render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    format: 'plain',
                    required,
                    patternMask
                }
            }
        });

        // mocked debounce must run first
        return wait(5).then(() => {
            expect(interactionStateStore.getResponse()).toMatchObject({ base: null });
            expect(interactionStateStore.getValidity()).toBe(expected);
        });
    });

    test.each([
        ['string', 'foo', 'foo'],
        ['float', '123.2', 123.2],
        ['integer', '321', 321]
    ])('sets correct value into store when baseType is %s', (baseType, value, expectedValue) => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType,
                    format: 'plain'
                }
            }
        });

        fireEvent.input(container.querySelector('textarea'), { target: { value } });

        return tick().then(() => {
            const interactionResponse = interactionStateStore.getResponse();
            expect(interactionResponse).toMatchObject({
                base: {
                    [baseType]: expectedValue
                }
            });
            expect(interactionStateStore.getValidity()).toBe(true);
        });
    });

    test.each([
        [void 0, '123', 123],
        [2, '101', 5],
        [16, '1a', 26]
    ])('sets correct value into store when base is %d', (base, value, expectedValue) => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'integer',
                    base
                }
            }
        });

        fireEvent.input(container.querySelector('textarea'), { target: { value } });

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
        [void 0, void 0, '(?:(?:[^\\s\\:\\!\\?\\;\\…\\€]+)[\\s\\:\\!\\?\\;\\…\\€]*){0,100}', '8', false],
        [void 0, void 0, '[\\s\\S]{0,500}', '7', false],
        [void 0, void 0, '.*', null, true],
        [152, void 0, void 0, '3', false],
        [void 0, 3, void 0, '3', false]
    ])(
        'sets correct rows value when expectedLength is %s, expectedLines is %s, patternMask is %s',
        (expectedLength, expectedLines, patternMask, expectedValue, expectedAutoHeight) => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        expectedLength,
                        expectedLines,
                        patternMask
                    }
                }
            });

            const textarea = container.querySelector('textarea');
            const rowsValue = textarea.getAttribute('rows');

            expect(rowsValue).toBe(expectedValue);
            expect(Boolean(container.querySelector('.auto-height'))).toBe(expectedAutoHeight);
        }
    );

    test.each([
        ['float', '12.2a'],
        ['integer', '321abc'],
        ['integer', '123', 2]
    ])(
        'sets invalid value into store when baseType is %s, value is %s and base is %s',
        (baseType, value, base = 10) => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        base,
                        baseType
                    }
                }
            });

            fireEvent.input(container.querySelector('textarea'), { target: { value } });

            return tick().then(() => {
                const interactionResponse = interactionStateStore.getResponse();
                expect(interactionResponse).toMatchObject({
                    base: null
                });
                expect(interactionStateStore.getValidity()).toBe(false);
            });
        }
    );

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

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType,
                    base
                }
            }
        });

        expect(container.querySelector('textarea').value).toBe(expectedValue);
    });

    it('qtiClass is saved in itemState', () => {
        const uniqueItemIdentifier = `${itemIdentifier}kjh`;
        const stateStore = getInteractionStateStore(uniqueItemIdentifier, responseIdentifier);
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: uniqueItemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier: uniqueItemIdentifier,
                    responseIdentifier
                }
            }
        });
        expect(stateStore.get()).toMatchObject({ qtiClass });

        fireEvent.input(container.querySelector('textarea'), { target: { value: 'hello' } });

        return tick().then(() => {
            expect(stateStore.get()).toMatchObject({ qtiClass });
            expect(stateStore.getResponse()).toEqual({ base: { string: 'hello' } });
        });
    });

    test.each([
        [{}, '123', true],
        [{ expectedLength: 1 }, '1', true],
        [{ expectedLines: 2 }, 'abc', true],
        [{ expectedLength: 8, expectedLines: 10 }, '', true],
        [{ expectedLines: 10, classes: 'qti-counter-down' }, 'abc', true],
        [{ expectedLength: 3, classes: 'qti-counter-down' }, 'abcdef', true],
        [{ expectedLength: 5, classes: 'qti-counter-up' }, 'a', true],
        [{ required: true }, '', false],
        [{ required: true }, 'cd', true],
        [{ patternMask: '.*' }, '', true],
        [{ patternMask: '[0-9]*', dataAttrs: { 'data-patternmask-message': 'Only numbers allowed' } }, '', true],
        [
            { patternMask: '(?:(?:[^\\s\\:\\!\\?\\;\\…\\€]+)[\\s\\:\\!\\?\\;\\…\\€]*){0,3}' }, //maxwords
            "one'two three four",
            true
        ],
        [
            { patternMask: '(?:(?:[^\\s\\:\\!\\?\\;\\…\\€]+)[\\s\\:\\!\\?\\;\\…\\€]*){0,3}' }, //maxwords
            'one:two three four',
            false
        ],
        [{ patternMask: '[0-9]*' }, 'ab', false],
        [{ patternMask: '[0-9]*', dataAttrs: { 'data-patternmask-message': 'Only numbers allowed' } }, 'ab', false],
        [{ base: 2, baseType: 'integer' }, '10', true],
        [{ base: 2, baseType: 'integer' }, '12', false],
        [{ baseType: 'float' }, '10.2', true],
        [{ baseType: 'float' }, '10.2a', false],
        [
            {
                expectedLength: 5,
                base: 2,
                baseType: 'integer',
                patternMask: '[0-1]*',
                dataAttrs: { 'data-patternmask-message': 'Only binary number is allowed' },
                required: true
            },
            '1002',
            false
        ],
        [
            { patternMask: '^[\\s\\S]{0,5}$' }, //maxlength
            'ab cd',
            true
        ],
        [
            { patternMask: '^[\\s\\S]{0,5}$' }, //maxlength
            '',
            true
        ],
        [
            { dataAttrs: { 'data-character-count': true } },
            '12345',
            true
        ],
        [
            { expectedLength: 5, dataAttrs: { 'data-character-count-expected': true } },
            '12345',
            true
        ],
        [
            { expectedLength: 5, dataAttrs: { 'data-character-count-expected': false } },
            'any',
            true
        ],
        [
            { patternMask: '^[\\s\\S]{0,5}$', dataAttrs: { 'data-character-count-max': true } },
            '12345',
            true
        ],
        [
            { patternMask: '^[\\s\\S]{0,5}$', dataAttrs: { 'data-character-count-max': false } },
            'any',
            true
        ]
    ])('has correct feedbacks %j, %s', (props, value, expectedValidity) => {
        let uniqueItemIdentifier = JSON.stringify(props);
        const stateStore = getInteractionStateStore(uniqueItemIdentifier, responseIdentifier);
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: uniqueItemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: Object.assign(
                    {
                        itemIdentifier: uniqueItemIdentifier,
                        responseIdentifier: responseIdentifier
                    },
                    props
                )
            }
        });

        const textarea = container.querySelector('textarea');

        return tick()
            .then(() => {
                fireEvent.input(textarea, { target: { value } });
                return tick();
            })
            .then(() => {
                // check before blur
                expect(container.querySelector('.feedbacks')).toMatchSnapshot();

                fireEvent.blur(textarea);
                return tick();
            })
            .then(() => {
                if (props.patternMask) {
                    //for debounce minWait in @oat-sa-private/ui-core/input/validate.js
                    return wait(5);
                }
            })
            .then(async () => {
                // check after blur
                expect(container.querySelector('.feedbacks')).toMatchSnapshot();
                const validity = await stateStore.getValidity();
                // Account for undefined validity being equivalent to true by default
                const actualValidity = typeof validity !== 'undefined' ? validity : true;
                expect(actualValidity).toBe(expectedValidity);
            });
    });

    test.each([
        ['', 'resize-vertical'],
        ['true', 'resize-vertical'],
        ['false', 'resize-none']
    ])('renders resizable textarea based on data-resizable: %s', (resizableValue, expectedClass) => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    dataAttrs: { 'data-resizable': resizableValue }
                }
            }
        });

        const textarea = container.querySelector('textarea');

        expect(textarea.classList).toContain(expectedClass);
    });

    test.each([
        ['', null],
        ['qti-height-lines-3', '3'],
        ['qti-height-lines-6', '6'],
        ['qti-height-lines-15', '15'],
        ['qti-height-lines-4', null]
    ])('sets textarea rows based on class %s to %d', (classes, expectedRows) => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    classes
                }
            }
        });

        const textarea = container.querySelector('textarea');

        expect(textarea.getAttribute('rows')).toBe(expectedRows);
    });

    test.each([
        ['', 'resize-vertical'],
        ['true', 'resize-vertical'],
        ['false', 'resize-none']
    ])('renders resizable rich-text-editor based on data-resizable: %s', (resizableValue, expectedClass) => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    format: 'xhtml',
                    classes: 'qti-height-lines-6',
                    dataAttrs: { 'data-resizable': resizableValue }
                }
            }
        });
        expect(container.querySelector('.cke-wrapper').classList).toContain(expectedClass);
    });

    it('registers a loading promise with item and resolves it when ready', async () => {
        render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: ExtendedTextInteraction,
                testComponentProps: {
                    itemIdentifier
                }
            }
        });

        expect(registerLoadingElement).toHaveBeenCalled();
        expect(registerLoadingElement.mock.calls[0][0]).toEqual(expect.any(Promise));
        await expect(registerLoadingElement.mock.calls[0][0]).resolves.toBeUndefined();
        expect(triggerError).not.toHaveBeenCalled();
    });

    describe('word & character count', () => {
        test.each([
            [
                'TextArea (plain)',
                { format: 'plain', firstValue: '1 2 3', secondValue: '1 2 3 4', firstCount: 3, secondCount: 4 }
            ],
            [
                'TextArea (preformatted)',
                { format: 'preformatted', firstValue: '1 2 3', secondValue: '1 2 3 4', firstCount: 3, secondCount: 4 }
            ]
        ])('renders wordcount feedbacks from %s subcomponent', (componentName, data) => {
            // test 'ready' event
            interactionStateStore.setResponse({
                base: {
                    string: data.firstValue
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: data.format,
                        dataAttrs: { 'data-word-count': 'true' }
                    }
                }
            });

            const feedback1 = container.querySelector('.feedbacks li:first-child');
            return tick()
                .then(() => {
                    expect(feedback1).toHaveTextContent(`${data.firstCount} word(s) typed`);

                    // test 'change' event
                    interactionStateStore.setResponse({
                        base: {
                            string: data.secondValue
                        }
                    });
                    return tick();
                })
                .then(() => {
                    expect(feedback1).toHaveTextContent(`${data.secondCount} word(s) typed`);
                });
        });

        test.each([
            [
                'TextArea (plain)',
                { format: 'plain', firstValue: '1 2 3', secondValue: '1 2 3 4', firstCount: 5, secondCount: 7 }
            ],
            [
                'TextArea (preformatted)',
                { format: 'preformatted', firstValue: '1 2 3', secondValue: '1 2 3 4', firstCount: 5, secondCount: 7 }
            ]
        ])('renders character-count feedbacks from %s subcomponent', (componentName, data) => {
            // test 'ready' event
            interactionStateStore.setResponse({
                base: {
                    string: data.firstValue
                }
            });

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: data.format,
                        dataAttrs: { 'data-character-count': 'true' }
                    }
                }
            });

            const feedback1 = container.querySelector('.feedbacks li:first-child');
            return tick()
                .then(() => {
                    expect(feedback1).toHaveTextContent(`${data.firstCount} character(s) typed`);

                    // test 'change' event
                    interactionStateStore.setResponse({
                        base: {
                            string: data.secondValue
                        }
                    });
                    return tick();
                })
                .then(() => {
                    expect(feedback1).toHaveTextContent(`${data.secondCount} character(s) typed`);
                });
        });

        it('sets count of words & characters & maxCharLimitExceeded into the store (plain text)', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: 'plain',
                        dataAttrs: { 'data-max-chars': 23 }
                    }
                }
            });
            const shortString = 'one.two three four five'; // 23 chars
            const longString = 'one.two three four five!'; // 24 chars
            const superLongString = 'one.two three four five!?'.repeat(1000); // 25,000 chars

            fireEvent.input(container.querySelector('textarea'), { target: { value: shortString } });

            return tick()
                .then(() => {
                    expect(interactionStateStore.get()).toMatchObject({
                        response: {
                            base: {
                                string: shortString
                            }
                        },
                        count: {
                            words: 5,
                            chars: 23,
                            maxCharLimitExceeded: false
                        }
                    });

                    fireEvent.input(container.querySelector('textarea'), { target: { value: longString } });
                    return tick();
                })
                .then(() => {
                    expect(interactionStateStore.get()).toMatchObject({
                        response: {
                            base: {
                                string: longString
                            }
                        },
                        count: {
                            words: 5,
                            chars: 24,
                            maxCharLimitExceeded: true
                        }
                    });

                    fireEvent.input(container.querySelector('textarea'), { target: { value: superLongString } });
                    return tick();
                })
                .then(() => {
                    expect(interactionStateStore.get()).toMatchObject({
                        response: {
                            base: {
                                string: superLongString
                            }
                        },
                        count: {
                            words: 5000,
                            chars: 25000,
                            maxCharLimitExceeded: true
                        },
                        validity: false
                    });

                    fireEvent.input(container.querySelector('textarea'), { target: { value: shortString } });
                    return tick();
                })
                .then(() => {
                    expect(interactionStateStore.getValidity()).toBe(true);
                    fireEvent.input(container.querySelector('textarea'), { target: { value: longString } });
                    return tick();
                })
                .then(() => {
                    expect(interactionStateStore.getValidity()).toBe(false);
                    fireEvent.input(container.querySelector('textarea'), { target: { value: shortString } });
                    return tick();
                })
                .then(() => {
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });

        it('wordcount with maxWords patternMask (plain text)', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: 'plain',
                        patternMask: '(?:(?:[^\\s\\:\\!\\?\\;\\…\\€]+)[\\s\\:\\!\\?\\;\\…\\€]*){0,4}',
                        dataAttrs: { 'data-word-count': 'true' }
                    }
                }
            });
            const textarea = container.querySelector('textarea');
            fireEvent.input(textarea, { target: { value: 'one-two three four five' } });

            return tick()
                .then(() => {
                    expect(container.querySelector('.feedbacks').textContent).toMatchSnapshot();
                    expect(interactionStateStore.get()).toMatchObject({
                        response: {
                            base: {
                                string: 'one-two three four five'
                            }
                        },
                        count: {
                            words: 4,
                            chars: 23,
                            maxCharLimitExceeded: false
                        },
                        validity: true
                    });
                    fireEvent.input(textarea, { target: { value: 'one,two three four five' } });
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.feedbacks').textContent).toMatchSnapshot();
                    expect(interactionStateStore.get()).toMatchObject({
                        response: {
                            base: {
                                string: 'one,two three four five'
                            }
                        },
                        count: {
                            words: 5,
                            chars: 23,
                            maxCharLimitExceeded: false
                        },
                        validity: false
                    });
                });
        });
    });

    describe('maxWords patternMask (plain text) with constraint class', () => {
        it('cannot type anything that would exceed maxWords, stays valid', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: 'plain',
                        patternMask: '(?:(?:[^\\s\\:\\!\\?\\;\\…\\€]+)[\\s\\:\\!\\?\\;\\…\\€]*){0,4}',
                        classes: 'tao-constrain-maxWords'
                    }
                }
            });

            const textarea = container.querySelector('textarea');
            fireEvent.input(textarea, { target: { value: 'a b c d ' } });
            fireSelectionChange(textarea);

            return tick()
                .then(() => {
                    expect(container.querySelector('.feedbacks').textContent).toMatchSnapshot();
                    expect(textarea.selectionEnd).toBe(8);

                    fireEvent.keyPress(textarea, { key: 'z' });
                    fireEvent.input(textarea, { target: { value: 'a b c d z' }, inputType: 'insertText' });
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.feedbacks').textContent).toMatchSnapshot();
                    expect(interactionStateStore.get()).toMatchObject({
                        response: {
                            base: {
                                string: 'a b c d '
                            }
                        },
                        count: {
                            words: 4,
                            chars: 8,
                            maxCharLimitExceeded: false
                        },
                        validity: true
                    });
                    expect(textarea.selectionEnd).toBe(8);
                });
        });

        it('cannot paste anything that would exceed maxWords, stays valid', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: 'plain',
                        patternMask: '(?:(?:[^\\s\\:\\!\\?\\;\\…\\€]+)[\\s\\:\\!\\?\\;\\…\\€]*){0,4}',
                        classes: 'tao-constrain-maxWords'
                    }
                }
            });

            const textarea = container.querySelector('textarea');
            fireEvent.input(textarea, { target: { value: 'a b c d ' } });
            fireSelectionChange(textarea);

            return tick()
                .then(() => {
                    expect(container.querySelector('.feedbacks').textContent).toMatchSnapshot();
                    expect(textarea.selectionEnd).toBe(8);

                    fireEvent.keyDown(textarea, { key: 'v', ctrlKey: true });
                    fireEvent.paste(textarea, { clipboardData: { getData: () => 'z' } });
                    fireEvent.input(textarea, { target: { value: 'a b c d z' }, inputType: 'insertFromPaste' });

                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.feedbacks').textContent).toMatchSnapshot();
                    expect(interactionStateStore.get()).toMatchObject({
                        response: {
                            base: {
                                string: 'a b c d '
                            }
                        },
                        count: {
                            words: 4,
                            chars: 8,
                            maxCharLimitExceeded: false
                        },
                        validity: true
                    });
                    expect(textarea.selectionEnd).toBe(8);
                });
        });

        it("can paste text if it won't exceed maxWords, stays valid", () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: 'plain',
                        patternMask: '(?:(?:[^\\s\\:\\!\\?\\;\\…\\€]+)[\\s\\:\\!\\?\\;\\…\\€]*){0,4}',
                        classes: 'tao-constrain-maxWords'
                    }
                }
            });

            const textarea = container.querySelector('textarea');
            fireEvent.input(textarea, { target: { value: 'a b ' } });
            fireSelectionChange(textarea);

            return tick()
                .then(() => {
                    expect(container.querySelector('.feedbacks').textContent).toMatchSnapshot();
                    expect(textarea.selectionEnd).toBe(4);

                    fireEvent.keyDown(textarea, { key: 'v', ctrlKey: true });
                    fireEvent.paste(textarea, { clipboardData: { getData: () => 'c d ' } });
                    fireEvent.input(textarea, { target: { value: 'a b c d ' }, inputType: 'insertFromPaste' });

                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.feedbacks').textContent).toMatchSnapshot();
                    expect(interactionStateStore.get()).toMatchObject({
                        response: {
                            base: {
                                string: 'a b c d '
                            }
                        },
                        count: {
                            words: 4,
                            chars: 8,
                            maxCharLimitExceeded: false
                        },
                        validity: true
                    });
                    expect(textarea.selectionEnd).toBe(8);
                });
        });

        it('can paste text if empty, but words truncated to maxWords, stays valid', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format: 'plain',
                        patternMask: '(?:(?:[^\\s\\:\\!\\?\\;\\…\\€]+)[\\s\\:\\!\\?\\;\\…\\€]*){0,4}',
                        classes: 'tao-constrain-maxWords'
                    }
                }
            });

            const textarea = container.querySelector('textarea');
            fireSelectionChange(textarea);

            return tick()
                .then(() => {
                    expect(container.querySelector('.feedbacks').textContent).toMatchSnapshot();

                    fireEvent.keyDown(textarea, { key: 'v', ctrlKey: true });
                    fireEvent.paste(textarea, { clipboardData: { getData: () => 'one two three four five' } });
                    fireEvent.input(textarea, {
                        target: { value: 'one two three four five' },
                        inputType: 'insertFromPaste'
                    });

                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.feedbacks').textContent).toMatchSnapshot();
                    expect(interactionStateStore.get()).toMatchObject({
                        response: {
                            base: {
                                string: 'one two three four '
                            }
                        },
                        count: {
                            words: 4,
                            chars: 19,
                            maxCharLimitExceeded: false
                        },
                        validity: true
                    });
                });
        });
    });

    describe('trace events', () => {
        let container;
        let textarea;
        let onTrace;
        const format = 'plain';
        const selection = 'test selection';
        const selectionStart = 3;

        beforeEach(() => {
            ({ container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: ExtendedTextInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        format
                    }
                }
            }));
            textarea = container.querySelector('textarea');
            Object.defineProperty(textarea, 'selectionStart', {
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
                    fireEvent(textarea, new Event(domEventType));

                    setTimeout(() => {
                        expect(onTrace).toHaveBeenCalledTimes(1);
                        expect(onTrace.mock.calls[0][0].detail).toMatchObject({
                            domEventType,
                            content: selection,
                            position: selectionStart,
                            target: textarea,
                            format
                        });
                        resolve();
                    }, 0);
                })
        );

        it('fires paste trace event', () =>
            new Promise(resolve => {
                const content = 'test content';
                const newResponse = 'some new response';

                fireEvent.keyDown(textarea, { key: 'v', ctrlKey: true });
                fireEvent.paste(textarea, { clipboardData: { getData: () => content } });

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
                        pressedKey: 'v',
                        target: textarea,
                        format
                    });
                    resolve();
                }, 0);
            }));

        it('fires drop trace event', () =>
            new Promise(resolve => {
                const content = 'test content';
                const newResponse = 'some new response';

                fireEvent.drop(textarea, { dataTransfer: { getData: () => content } });

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
                        newResponse,
                        target: textarea,
                        format
                    });
                    resolve();
                }, 0);
            }));

        it('fires focus trace event', () =>
            new Promise(resolve => {
                fireEvent.focus(textarea);

                setTimeout(() => {
                    expect(onTrace).toHaveBeenCalledTimes(1);
                    expect(onTrace.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'focus',
                        target: textarea,
                        format
                    });
                    resolve();
                }, 0);
            }));

        it('fires blur trace event', () =>
            new Promise(resolve => {
                const response = 'some response';

                interactionStateStore.setResponse({
                    base: {
                        string: response
                    }
                });

                fireEvent.blur(textarea);

                setTimeout(() => {
                    expect(onTrace).toHaveBeenCalledTimes(1);
                    expect(onTrace.mock.calls[0][0].detail).toMatchObject({
                        domEventType: 'blur',
                        target: textarea,
                        format,
                        newResponse: response
                    });
                    resolve();
                }, 0);
            }));
    });
});
