// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-23 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import SliderInteraction from '../SliderInteraction.svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../../itemsSessionStatusStore.js';
import { tick } from 'svelte';
import ContextWrapper from '../../../static/test/ContextWrapper.svelte';
import P from '../../../static/P.svelte';

const qtiClass = 'qti-sliderInteraction';
const itemIdentifier = 'i12345';
const responseIdentifier = 'RESPONSE_1';
const selectors = {
    getTextInput(container) {
        return container.querySelector('.input-container input');
    },
    getSliderValueLabel(container) {
        return container.querySelector('.slider-container .value-label');
    },
    getFirstBoundLabel(container) {
        return container.querySelector('.slider-container .minmax-labels *:first-child');
    },
    getSecondBoundLabel(container) {
        return container.querySelector('.slider-container .minmax-labels *:last-child');
    },
    getPlusButton(container) {
        return container.querySelector('button:last-of-type');
    },
    getMinusButton(container) {
        return container.querySelector('button:first-of-type');
    }
};

describe('SliderInteraction', () => {
    afterEach(() => {
        itemsStateStore.clear();
        itemsSessionStatusStore.clear();
    });

    describe('rendering', () => {
        it('renders with default props', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 0,
                    upperBound: 100
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('renders props correctly into markup', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'float',
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
                    prompt: [{ type: 'text', content: 'Question 1' }],

                    lowerBound: 256,
                    upperBound: 1024,
                    step: 16,
                    orientation: 'vertical',
                    reverse: true
                }
            });
            return tick()
                .then(tick)
                .then(() => {
                    expect(container).toMatchSnapshot();
                });
        });

        it('is disabled in closed session', () => {
            const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
            itemSessionStatusStore.set('closed');
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 0,
                    upperBound: 100
                }
            });
            expect(container.querySelector('.qti-sliderInteraction').getAttribute('aria-disabled')).toBe('true');
        });

        it('for float, lowerBound/upperBound are rounded to integer', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'float',
                    lowerBound: 1.1,
                    upperBound: 9.9
                }
            });
            return tick().then(() => {
                expect(selectors.getFirstBoundLabel(container).textContent).toBe('2');
                expect(selectors.getSecondBoundLabel(container).textContent).toBe('9');
            });
        });

        it('for float, lowerBound should not exceed upperBound when rounding', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType: 'float',
                    lowerBound: 1.1,
                    upperBound: 1.9
                }
            });
            return tick().then(() => {
                expect(selectors.getFirstBoundLabel(container).textContent).toBe('2');
                expect(selectors.getSecondBoundLabel(container).textContent).toBe('2');
            });
        });
    });

    describe('store', () => {
        test.each([
            ['null', 'integer', { base: null }, '', ''],
            ['number', 'integer', { base: { integer: 59 } }, '59', '59']
        ])('loads stored response if baseType=integer: %s', (descr, baseType, response, inputText, sliderLabel) => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse(response);

            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType,
                    lowerBound: 0,
                    upperBound: 100
                }
            });

            return tick().then(() => {
                expect(selectors.getTextInput(container).value).toBe(inputText);
                expect(selectors.getSliderValueLabel(container).textContent).toBe(sliderLabel);
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        test.each([
            ['null', 'float', { base: null }, '', ''],
            ['number', 'float', { base: { float: 59.4 } }, '59.4', '59']
        ])('loads stored response if baseType=float: %s', (descr, baseType, response, inputText, sliderLabel) => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse(response);

            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType,
                    lowerBound: 0.4,
                    upperBound: 100.6
                }
            });

            return tick().then(() => {
                expect(selectors.getTextInput(container).value).toBe(inputText);
                expect(selectors.getSliderValueLabel(container).textContent).toBe(sliderLabel);
                expect(interactionStateStore.getValidity()).toBe(true);
            });
        });

        it('sets initial response', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 10,
                    upperBound: 100
                }
            });
            expect(interactionStateStore.getResponse()).toEqual({ base: null });
            expect(interactionStateStore.getValidity()).toBe(true);
        });

        it('listens to store modifications', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 0,
                    upperBound: 100
                }
            });
            return tick()
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('');

                    interactionStateStore.setResponse({ base: { integer: 59 } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('59');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('59');

                    interactionStateStore.setResponse({ base: { integer: 60 } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('60');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('60');

                    interactionStateStore.setResponse({ base: null });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('');
                });
        });

        test.each([['integer'], ['float']])('saves response to store on change when baseType=%s', baseType => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    baseType,
                    lowerBound: 0,
                    upperBound: 100
                }
            });
            expect(interactionStateStore.getResponse()).toEqual({ base: null });
            expect(interactionStateStore.getValidity()).toBe(true);
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });

            return tick()
                .then(() => {
                    fireEvent.input(selectors.getTextInput(container), { target: { value: '8' } });
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({ base: { [baseType]: 8 } });
                    expect(interactionStateStore.getValidity()).toBe(true);
                    expect(interactionStateStore.get()).toMatchObject({ qtiClass });
                });
        });
    });

    describe('behavior', () => {
        it('on slider change, sets value', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 2
                }
            });

            return tick()
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('');

                    fireEvent.keyDown(selectors.getSliderValueLabel(container), { key: 'Right' });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('8');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('8');
                });
        });

        it('on plus button click, increments value within bounds', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 2
                }
            });

            return tick()
                .then(() => {
                    fireEvent.click(selectors.getPlusButton(container));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('8');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('8');

                    fireEvent.click(selectors.getPlusButton(container));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('10');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('10');

                    fireEvent.click(selectors.getPlusButton(container));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('10');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('10');
                });
        });

        it('on plus button click, sets value to closest to middle, if no value set and odd amount of steps', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 8,
                    step: 2
                }
            });

            return tick()
                .then(() => {
                    fireEvent.click(selectors.getPlusButton(container));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('6');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('6');

                    fireEvent.click(selectors.getPlusButton(container));
                    return tick();
                });
        });

        it('on minus button click, decrements value within bounds', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 2
                }
            });

            return tick()
                .then(() => {
                    fireEvent.click(selectors.getMinusButton(container));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('4');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('4');

                    fireEvent.click(selectors.getMinusButton(container));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('2');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('2');

                    fireEvent.click(selectors.getMinusButton(container));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('2');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('2');
                });
        });

        it('on minus button click, sets value to closest to middle, if no value set and odd amount of steps', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 8,
                    step: 2
                }
            });

            return tick()
                .then(() => {
                    fireEvent.click(selectors.getMinusButton(container));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('4');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('4');
                });
        });

        it('on minus button click, if decreasing from max and last step is cut off, sets value to last step', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({ base: { integer: 28 } });
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 0,
                    upperBound: 28,
                    step: 3
                }
            });

            return tick()
                .then(() => {
                    fireEvent.click(selectors.getMinusButton(container));
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('27');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('27');
                });
        });

        it('on input change, sets value rounded to step if valid number entered', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 11,
                    step: 3
                }
            });

            return tick()
                .then(() => {
                    selectors.getTextInput(container).focus();
                    fireEvent.input(selectors.getTextInput(container), { target: { value: '4' } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('4');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('5');

                    selectors.getMinusButton(container).focus(); //focus anything else
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('5');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('5');
                });
        });

        it('on input change, sets value if number less than lowerBound entered', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 1
                }
            });

            return tick()
                .then(() => {
                    selectors.getTextInput(container).focus();
                    fireEvent.input(selectors.getTextInput(container), { target: { value: '11' } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('11');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('10');

                    selectors.getMinusButton(container).focus(); //focus anything else
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('10');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('10');
                });
        });

        it('on input change, sets value if number more than upperBound entered', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 1
                }
            });

            return tick()
                .then(() => {
                    selectors.getTextInput(container).focus();
                    fireEvent.input(selectors.getTextInput(container), { target: { value: '1' } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('1');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('2');

                    selectors.getMinusButton(container).focus(); //focus anything else
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('2');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('2');
                });
        });

        it('on input change, resets value if empty string entered', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 1
                }
            });

            return tick()
                .then(() => {
                    selectors.getTextInput(container).focus();
                    fireEvent.input(selectors.getTextInput(container), { target: { value: '' } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('');

                    selectors.getMinusButton(container).focus(); //focus anything else
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('');
                });
        });

        it('on input change, resets value if invalid string entered', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 1
                }
            });

            return tick()
                .then(() => {
                    selectors.getTextInput(container).focus();
                    fireEvent.input(selectors.getTextInput(container), { target: { value: 'aa' } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('aa');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('');

                    selectors.getMinusButton(container).focus(); //focus anything else
                    return tick();
                })
                .then(() => {
                    expect(selectors.getTextInput(container).value).toBe('aa');
                    expect(selectors.getSliderValueLabel(container).textContent).toBe('');
                });
        });

        it('on change, rounds value to closest step: when smaller part of last step is cut off', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 0 + 1,
                    upperBound: 11 + 1,
                    step: 3
                }
            });

            return tick()
                .then(() => {
                    selectors.getTextInput(container).focus();
                    fireEvent.input(selectors.getTextInput(container), { target: { value: `${9 + 1}` } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSliderValueLabel(container).textContent).toBe(`${9 + 1}`);

                    fireEvent.input(selectors.getTextInput(container), { target: { value: `${10 + 1}` } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSliderValueLabel(container).textContent).toBe(`${9 + 1}`);

                    fireEvent.input(selectors.getTextInput(container), { target: { value: `${11 + 1}` } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSliderValueLabel(container).textContent).toBe(`${11 + 1}`);
                });
        });

        it('on change, rounds value to closest step: when bigger part of last step is cut off', () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 0 + 1,
                    upperBound: 10 + 1,
                    step: 3
                }
            });
            return tick()
                .then(() => {
                    selectors.getTextInput(container).focus();
                    fireEvent.input(selectors.getTextInput(container), { target: { value: `${9 + 1}` } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSliderValueLabel(container).textContent).toBe(`${9 + 1}`);

                    fireEvent.input(selectors.getTextInput(container), { target: { value: `${10 + 1}` } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSliderValueLabel(container).textContent).toBe(`${10 + 1}`);

                    fireEvent.input(selectors.getTextInput(container), { target: { value: `${11 + 1}` } });
                    return tick();
                })
                .then(() => {
                    expect(selectors.getSliderValueLabel(container).textContent).toBe(`${10 + 1}`);
                });
        });
    });

    describe('trace events', () => {
        it('fires keydown event on "Right" key press, providing domEventType, pressedKey, target and newResponse details', async () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 2
                }
            });
            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await fireEvent.keyDown(selectors.getSliderValueLabel(container), { key: 'Right' });
            expect(interactiontraceListener.mock.calls[0][0]).toMatchObject({
                detail: {
                    domEventType: 'keydown',
                    pressedKey: 'Right',
                    target: expect.any(HTMLDivElement),
                    newResponse: 8
                }
            });
        });

        it('fires keydown event on "Left" key press, providing domEventType, pressedKey, target and newResponse details', async () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 2
                }
            });
            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await fireEvent.keyDown(selectors.getSliderValueLabel(container), { key: 'Left' });
            expect(interactiontraceListener.mock.calls[0][0]).toMatchObject({
                detail: {
                    domEventType: 'keydown',
                    pressedKey: 'Left',
                    target: expect.any(HTMLDivElement),
                    newResponse: 4
                }
            });
        });

        it('fires keydown event on "Up" key press, providing domEventType, pressedKey, target and newResponse details', async () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 2
                }
            });
            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await fireEvent.keyDown(selectors.getSliderValueLabel(container), { key: 'Up' });
            expect(interactiontraceListener.mock.calls[0][0]).toMatchObject({
                detail: {
                    domEventType: 'keydown',
                    pressedKey: 'Up',
                    target: expect.any(HTMLDivElement),
                    newResponse: 8
                }
            });
        });

        it('fires keydown event on "Down" key press, providing domEventType, pressedKey, target and newResponse details', async () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 2
                }
            });
            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await fireEvent.keyDown(selectors.getSliderValueLabel(container), { key: 'Down' });
            expect(interactiontraceListener.mock.calls[0][0]).toMatchObject({
                detail: {
                    domEventType: 'keydown',
                    pressedKey: 'Down',
                    target: expect.any(HTMLDivElement),
                    newResponse: 4
                }
            });
        });

        it('fires keydown event on "PageUp" key press, providing domEventType, pressedKey, target and newResponse details', async () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 2
                }
            });
            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await fireEvent.keyDown(selectors.getSliderValueLabel(container), { key: 'PageUp' });
            expect(interactiontraceListener.mock.calls[0][0]).toMatchObject({
                detail: {
                    domEventType: 'keydown',
                    pressedKey: 'PageUp',
                    target: expect.any(HTMLDivElement),
                    newResponse: 8
                }
            });
        });

        it('fires keydown event on "PageDown" key press, providing domEventType, pressedKey, target and newResponse details', async () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 2
                }
            });
            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await fireEvent.keyDown(selectors.getSliderValueLabel(container), { key: 'PageDown' });
            expect(interactiontraceListener.mock.calls[0][0]).toMatchObject({
                detail: {
                    domEventType: 'keydown',
                    pressedKey: 'PageDown',
                    target: expect.any(HTMLDivElement),
                    newResponse: 4
                }
            });
        });

        it('fires keydown event on "Home" key press, providing domEventType, pressedKey, target and newResponse details', async () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 2
                }
            });
            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await fireEvent.keyDown(selectors.getSliderValueLabel(container), { key: 'Home' });
            expect(interactiontraceListener.mock.calls[0][0]).toMatchObject({
                detail: {
                    domEventType: 'keydown',
                    pressedKey: 'Home',
                    target: expect.any(HTMLDivElement),
                    newResponse: 2
                }
            });
        });

        it('fires keydown event on "End" key press, providing domEventType, pressedKey, target and newResponse details', async () => {
            const { container } = render(SliderInteraction, {
                props: {
                    itemIdentifier,
                    responseIdentifier,
                    lowerBound: 2,
                    upperBound: 10,
                    step: 2
                }
            });
            const interactiontraceListener = vi.fn();
            container.querySelector('.qti-interaction').addEventListener('interactiontrace', interactiontraceListener);

            await fireEvent.keyDown(selectors.getSliderValueLabel(container), { key: 'End' });
            expect(interactiontraceListener.mock.calls[0][0]).toMatchObject({
                detail: {
                    domEventType: 'keydown',
                    pressedKey: 'End',
                    target: expect.any(HTMLDivElement),
                    newResponse: 10
                }
            });
        });
    });

    describe('context', () => {
        const testBlockTree = [
            {
                type: 'container',
                component: P,
                children: [
                    {
                        type: 'text',
                        content: 'TEXT'
                    }
                ]
            },
            {
                type: 'container',
                component: P,
                children: [
                    {
                        type: 'text',
                        content: 'TEXT'
                    }
                ]
            }
        ];
        const testContext = {
            getAssetManager: () => ({
                resolve: src => src
            }),
            registerLoadingElement: vi.fn(),
            getInstructionsLang: vi.fn(() => 'en-AU')
        };

        it('renders correctly with different instructions lang', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: SliderInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        blockTree: testBlockTree
                    }
                }
            });

            expect(container).toMatchSnapshot();
        });
    });
});
