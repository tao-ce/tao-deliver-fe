// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

//TODO: fix tests

import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';

//as because we cannot test component bindings we will rely on helper component
// and its rendered content
import SimpleSortableList from './SimpleSortableList.svelte';

vi.mock('../util', function () {
    return {
        __esModule: true,
        traceInteraction: () => vi.fn()
    };
});

/**
 * Creates selected array items with keys
 * @param {Array} keys
 * @returns {Array} generated array for SortableList
 */
function createSelected(keys) {
    return keys.map(key => {
        if (key) {
            return { key };
        } else {
            return null;
        }
    });
}

function dragOver(container, slotIndex, draggableKey) {
    const sortableContainerElement = container.querySelector(`[data-drag-drop-key="${slotIndex}"]`);
    sortableContainerElement.dispatchEvent(
        new CustomEvent('over', { detail: { draggableKey, dropAreaKey: `${slotIndex}` } })
    );
}

function dragOut(container, slotIndex, draggableKey) {
    const sortableContainerElement = container.querySelector(`[data-drag-drop-key="${slotIndex}"]`);
    sortableContainerElement.dispatchEvent(
        new CustomEvent('out', { detail: { draggableKey, dropAreaKey: `${slotIndex}` } })
    );
}

function dragStart(container, slotIndex, draggableKey) {
    const sortableContainerElement = container.querySelector(`[data-drag-drop-key="${draggableKey}"]`);
    sortableContainerElement.dispatchEvent(
        new CustomEvent('dragStart', { detail: { draggableKey, dropAreaKey: `${slotIndex}` } })
    );
}

function dragStop(container, draggableKey) {
    const sortableContainerElement = container.querySelector(`[data-drag-drop-key="${draggableKey}"]`);
    sortableContainerElement.dispatchEvent(new CustomEvent('dragStop', { detail: { draggableKey }, bubbles: true }));
}

function dragUpdate(container, slotIndex, draggableKey) {
    const sortableContainerElement = container.querySelector(`[data-drag-drop-key="${slotIndex}"]`);
    sortableContainerElement.dispatchEvent(
        new CustomEvent('update', { detail: { dropAreaKey: slotIndex, draggableKey } })
    );
}

function extractSelected(container) {
    const selected = [];

    for (let el of container.querySelectorAll('.answer-placeholder')) {
        const itemEl = el.querySelector('.item');
        if (itemEl) {
            selected.push(itemEl.textContent);
        } else {
            selected.push(null);
        }
    }
    return selected;
}

describe('SortableList', () => {
    describe('rendering', () => {
        it('should render with max null - filled slots if selected is empty', () => {
            const max = 3;
            const { container } = render(SimpleSortableList, { props: { max } });
            expect(container.querySelectorAll('.answer-placeholder').length).toEqual(max);
            expect(container).toMatchSnapshot();
        });

        it('should render with max null - filled slots if selected length is less than max', () => {
            const max = 3;
            const selected = createSelected(['item0']);
            const selectedKeysLength = 1;
            const { container } = render(SimpleSortableList, { props: { max, selected, selectedKeysLength } });
            expect(container.querySelectorAll('.answer-placeholder').length).toEqual(max);
            expect(container).toMatchSnapshot();
        });

        it('should render with given selected slots', () => {
            const max = 3;
            const selected = createSelected(['item0', null, 'item2']);
            const selectedKeysLength = 2;
            const { container } = render(SimpleSortableList, { props: { max, selected, selectedKeysLength } });
            expect(container.querySelectorAll('.answer-placeholder').length).toEqual(max);
            expect(container).toMatchSnapshot();
        });
    });

    describe('drag operations', () => {
        it('changes style of the placeholder on dragStart and dragStop', () => {
            const selected = createSelected(['item0', null, 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });

            dragStart(container, 2, 'item2');
            return tick().then(() => {
                expect(
                    container
                        .querySelector('[data-drag-drop-key="1"] .answer-placeholder')
                        .classList.contains('empty-targetable')
                ).toEqual(true);
                expect(
                    container
                        .querySelector('[data-drag-drop-key="2"] .answer-placeholder')
                        .classList.contains('empty-targetable')
                ).toEqual(true);

                dragStop(container, 'item2');

                return tick().then(() => {
                    expect(
                        container
                            .querySelector('[data-drag-drop-key="1"] .answer-placeholder')
                            .classList.contains('empty-targetable')
                    ).toEqual(false);
                    expect(
                        container
                            .querySelector('[data-drag-drop-key="2"] .answer-placeholder')
                            .classList.contains('empty-targetable')
                    ).toEqual(false);
                });
            });
        });

        it("doesn't change list of selected if dragged item dragged over empty dropArea", () => {
            const selected = createSelected(['item0', null, 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });
            dragStart(container, 2, 'item2');
            dragOut(container, 2, 'item2');
            dragOver(container, 1, 'item2');
            return tick().then(() => {
                expect(extractSelected(container)).toEqual(['item0', null, 'item2']);
            });
        });

        it('there is targetable class on currently dragged-over dropArea', () => {
            const selected = createSelected(['item0', null, 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });
            dragStart(container, 2, 'item2');
            dragOut(container, 2, 'item2');
            dragOver(container, 1, 'item2');
            return tick().then(() => {
                expect(
                    container
                        .querySelector('[data-drag-drop-key="1"] .answer-placeholder')
                        .classList.contains('empty-targetable')
                ).toEqual(true);
                expect(
                    container
                        .querySelector('[data-drag-drop-key="1"] .answer-placeholder')
                        .classList.contains('empty-targetable')
                ).toEqual(true);
            });
        });

        it('changes list of selected if dragged item dragged over occupied dropArea', () => {
            const selected = createSelected(['item0', null, 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });
            dragStart(container, 2, 'item2');
            dragOut(container, 2, 'item2');
            dragOver(container, 0, 'item2');
            return tick().then(() => {
                expect(extractSelected(container)).toEqual([null, 'item0', 'item2']);
            });
        });

        it('updates the list if new item is dropped in empty slot', () => {
            const selected = createSelected(['item0', null, 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });
            dragOver(container, 1, 'item1');
            dragUpdate(container, 1, 'item1');
            return tick().then(() => {
                expect(extractSelected(container)).toEqual(['item0', 'item1', 'item2']);
            });
        });

        it('updates list if new item is dragged over occupied slot', () => {
            const selected = createSelected(['item0', 'item1', null]);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });
            dragOver(container, 1, 'item2');
            return tick().then(() => {
                expect(extractSelected(container)).toEqual(['item0', null, 'item1']);
            });
        });

        it('undoes the ordering on dragOut', () => {
            const selected = createSelected(['item0', 'item1', null]);
            const { container } = render(SimpleSortableList, {
                props: { selected, max: 3, selectedSnapshot: [{ key: 'item0' }, { key: 'item1' }, null] }
            });
            dragOver(container, 1, 'item2');
            return tick().then(() => {
                expect(extractSelected(container)).toEqual(['item0', null, 'item1']);
                dragOut(container, 1, 'item2');
                return tick().then(() => {
                    expect(extractSelected(container)).toEqual(['item0', 'item1', null]);
                });
            });
        });
    });

    describe('mouse management', () => {
        it('removes item', () => {
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });

            expect(extractSelected(container)).toEqual(['item0', 'item1', 'item2']);

            fireEvent.click(container.querySelector('.remover'));

            return tick().then(() => expect(extractSelected(container)).toEqual([null, 'item1', 'item2']));
        });

        it('puts item button to selected state', () => {
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });
            const firstItemCnt = container.querySelector('.item-btn-container');
            const firstItemBtn = container.querySelector('.item-btn');
            expect(firstItemCnt.classList).not.toContain('selected');

            fireEvent.click(firstItemBtn);

            return tick().then(() => expect(firstItemCnt.classList).toContain('selected'));
        });

        it('removes selected state from item button', () => {
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container } = render(SimpleSortableList, {
                props: {
                    selected,
                    max: 3,
                    suggestedKey: 'item0',
                    selectedSnapshot: createSelected(['item0', 'item1', 'item2'])
                }
            });
            const firstItemCnt = container.querySelector('.item-btn-container');
            const firstItemBtn = container.querySelector('.item-btn');
            expect(firstItemCnt.classList).toContain('selected');

            fireEvent.click(firstItemBtn);

            return tick().then(() => expect(firstItemCnt.classList).not.toContain('selected'));
        });

        it('move item', () => {
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });

            expect(extractSelected(container)).toEqual(['item0', 'item1', 'item2']);

            const [firstItemBtn, secondItemBtn] = container.querySelectorAll('.item-btn');

            fireEvent.click(firstItemBtn);
            return tick()
                .then(() => {
                    fireEvent.click(secondItemBtn);
                })
                .then(() => expect(extractSelected(container)).toEqual(['item1', 'item0', 'item2']));
        });

        test.each([
            ['down, no gaps, once', ['A', 'B', 'C'], ['B', 'A', 'C'], 0, 1],
            ['up, no gaps, once', ['A', 'B', 'C'], ['B', 'A', 'C'], 1, 0],
            ['down, no gaps, twice', ['A', 'B', 'C'], ['B', 'C', 'A'], 0, 2],
            ['up, no gaps, twice', ['A', 'B', 'C'], ['C', 'A', 'B'], 2, 0],
            ['down, gaps after', ['A', 'B', 'C', null, null], ['B', 'C', 'A', null, null], 0, 2],
            ['up, gaps after', ['A', 'B', 'C', null, null], ['C', 'A', 'B', null, null], 2, 0],
            ['down, gaps before', [null, null, 'A', 'B', 'C'], [null, null, 'B', 'C', 'A'], 2, 4],
            ['up, gaps before', [null, null, 'A', 'B', 'C'], [null, null, 'C', 'A', 'B'], 4, 2],
            ['down, gaps between', ['A', null, 'B', null, 'C'], [null, null, 'B', 'C', 'A'], 0, 4],
            ['up, gaps between', ['A', null, 'B', null, 'C'], ['C', 'A', 'B', null, null], 4, 0]
        ])('move item: %s', (descr, sourceSelected, targetSelected, sourceBtnIndex, targetBtnIndex) => {
            const selected = createSelected(sourceSelected);
            const { container } = render(SimpleSortableList, { props: { selected, max: sourceSelected.length } });

            expect(extractSelected(container)).toEqual(sourceSelected);

            const items = Array.from(container.querySelectorAll('.answer-placeholder'));
            const sourceBtn = items[sourceBtnIndex].querySelector('.item-btn');
            const targetBtn = items[targetBtnIndex].querySelector('.item-btn');

            fireEvent.click(sourceBtn);
            return tick()
                .then(() => {
                    fireEvent.click(targetBtn);
                })
                .then(() => expect(extractSelected(container)).toEqual(targetSelected));
        });
    });

    describe('keyboard management', () => {
        it('moves item up: case with empty slots', () => {
            const selected = createSelected([null, 'item0', 'item1', 'item2', null, null]);
            const { container } = render(SimpleSortableList, { props: { selected, max: selected.length } });
            const getBtn2 = () => container.querySelector('[data-drag-drop-key="item2"] .item-btn');
            getBtn2().focus();
            fireEvent.keyUp(getBtn2(), { key: 'Enter' });
            return tick()
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item0', 'item1', 'item2', null, null]);
                    return fireEvent.keyDown(getBtn2(), { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item0', 'item2', 'item1', null, null]);
                    return fireEvent.keyDown(getBtn2(), { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item2', 'item0', 'item1', null, null]);
                    return fireEvent.keyDown(getBtn2(), { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item2', 'item0', 'item1', null, null, null]);
                    return fireEvent.keyDown(getBtn2(), { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item0', 'item1', null, null, 'item2']);
                    return fireEvent.keyDown(getBtn2(), { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item0', 'item1', null, 'item2', null]);
                    return fireEvent.keyDown(getBtn2(), { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item0', 'item1', 'item2', null, null]);
                });
        });

        it('moves item up: case without empty slots', () => {
            const selected = createSelected(['item0', 'item1', 'item2', 'item3']);
            const { container } = render(SimpleSortableList, { props: { selected, max: selected.length } });
            const btn0 = container.querySelectorAll('.item-btn')[0];
            btn0.focus();
            fireEvent.keyUp(btn0, { key: 'Enter' });
            return tick()
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item0', 'item1', 'item2', 'item3']);
                    return fireEvent.keyDown(btn0, { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item1', 'item2', 'item3', 'item0']);
                    return fireEvent.keyDown(btn0, { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item1', 'item2', 'item0', 'item3']);
                    return fireEvent.keyDown(btn0, { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item1', 'item0', 'item2', 'item3']);
                    return fireEvent.keyDown(btn0, { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item0', 'item1', 'item2', 'item3']);
                });
        });

        it('moves item down: case with empty slots', () => {
            const selected = createSelected([null, null, 'item0', 'item1', 'item2', null]);
            const { container } = render(SimpleSortableList, { props: { selected, max: selected.length } });
            const getBtn0 = () => container.querySelector('[data-drag-drop-key="item0"] .item-btn');
            getBtn0().focus();
            fireEvent.keyUp(getBtn0(), { key: 'Enter' });
            return tick()
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, null, 'item0', 'item1', 'item2', null]);
                    return fireEvent.keyDown(getBtn0(), { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, null, 'item1', 'item0', 'item2', null]);
                    return fireEvent.keyDown(getBtn0(), { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, null, 'item1', 'item2', 'item0', null]);
                    return fireEvent.keyDown(getBtn0(), { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, null, null, 'item1', 'item2', 'item0']);
                    return fireEvent.keyDown(getBtn0(), { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item0', null, null, 'item1', 'item2', null]);
                    return fireEvent.keyDown(getBtn0(), { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item0', null, 'item1', 'item2', null]);
                    return fireEvent.keyDown(getBtn0(), { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, null, 'item0', 'item1', 'item2', null]);
                });
        });

        it('moves item down: case without empty slots', () => {
            const selected = createSelected(['item0', 'item1', 'item2', 'item3']);
            const { container } = render(SimpleSortableList, { props: { selected, max: selected.length } });
            const btn3 = container.querySelectorAll('.item-btn')[3];
            btn3.focus();
            fireEvent.keyUp(btn3, { key: 'Enter' });
            return tick()
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item0', 'item1', 'item2', 'item3']);
                    return fireEvent.keyDown(btn3, { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item3', 'item0', 'item1', 'item2']);
                    return fireEvent.keyDown(btn3, { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item0', 'item3', 'item1', 'item2']);
                    return fireEvent.keyDown(btn3, { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item0', 'item1', 'item3', 'item2']);
                    return fireEvent.keyDown(btn3, { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item0', 'item1', 'item2', 'item3']);
                });
        });

        it('moves item down then up', () => {
            const selected = createSelected(['item0', 'item1', 'item2', 'item3', null]);
            const { container } = render(SimpleSortableList, { props: { selected, max: selected.length } });
            const btn0 = container.querySelectorAll('.item-btn')[0];
            btn0.focus();
            fireEvent.keyUp(btn0, { key: 'Enter' });
            return tick()
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item0', 'item1', 'item2', 'item3', null]);
                    return fireEvent.keyDown(btn0, { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item1', 'item0', 'item2', 'item3', null]);
                    return fireEvent.keyDown(btn0, { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item1', 'item2', 'item0', 'item3', null]);
                    return fireEvent.keyDown(btn0, { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item1', 'item0', 'item2', 'item3', null]);
                    return fireEvent.keyDown(btn0, { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual(['item0', 'item1', 'item2', 'item3', null]);
                });
        });

        it('moves item up then down', () => {
            const selected = createSelected([null, 'item0', 'item1', 'item2', 'item3']);
            const { container } = render(SimpleSortableList, { props: { selected, max: selected.length } });
            const btn3 = container.querySelectorAll('.item-btn')[3];
            btn3.focus();
            fireEvent.keyUp(btn3, { key: 'Enter' });
            return tick()
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item0', 'item1', 'item2', 'item3']);
                    return fireEvent.keyDown(btn3, { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item0', 'item1', 'item3', 'item2']);
                    return fireEvent.keyDown(btn3, { key: 'Up' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item0', 'item3', 'item1', 'item2']);
                    return fireEvent.keyDown(btn3, { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item0', 'item1', 'item3', 'item2']);
                    return fireEvent.keyDown(btn3, { key: 'Down' });
                })
                .then(() => {
                    expect(extractSelected(container)).toEqual([null, 'item0', 'item1', 'item2', 'item3']);
                });
        });

        it('puts item button to selected state', () => {
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });
            const firstItemCnt = container.querySelector('.item-btn-container');
            const firstItemBtn = container.querySelector('.item-btn');
            expect(firstItemCnt.classList).not.toContain('selected');
            firstItemBtn.focus();
            fireEvent.keyUp(firstItemBtn, { which: 32 });
            return tick().then(() => expect(firstItemCnt.classList).toContain('selected'));
        });

        it('removes selected state from item button', () => {
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3, suggestedKey: 'item0' } });
            const firstItemCnt = container.querySelector('.item-btn-container');
            const firstItemBtn = container.querySelector('.item-btn');
            expect(firstItemCnt.classList).toContain('selected');
            firstItemBtn.focus();
            fireEvent.keyUp(firstItemBtn, { which: 32 });
            return tick().then(() => expect(firstItemCnt.classList).not.toContain('selected'));
        });

        it('moves focus to remove button of same item on down keypress', () => {
            expect.assertions(1);
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });
            const firstItemBtn = container.querySelector('.item-btn');
            firstItemBtn.focus();
            fireEvent.keyDown(firstItemBtn, { which: 40 });
            return tick().then(() => expect(container.querySelector('.remover')).toHaveFocus());
        });

        it('moves focus to remove button of previous item on up keypress', () => {
            expect.assertions(1);
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });
            const firstItemBtn = container.querySelector('.item-btn');
            firstItemBtn.focus();
            fireEvent.keyDown(firstItemBtn, { which: 38 });
            const secondRemoveBtn = container.querySelectorAll('.remover')[2];
            return tick().then(() => expect(secondRemoveBtn).toHaveFocus());
        });

        it('moves focus to the next item on down keypress for single order', () => {
            expect.assertions(1);
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3, itemRemovable: false } });
            const firstItemBtn = container.querySelector('.item-btn');
            firstItemBtn.focus();
            fireEvent.keyDown(firstItemBtn, { which: 40 });
            const nextBtn = container.querySelectorAll('.item-btn')[1]; // last

            return tick().then(() => expect(nextBtn).toHaveFocus());
        });

        it('moves focus to the previous item on up keypress for single order', () => {
            expect.assertions(1);
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3, itemRemovable: false } });
            const firstItemBtn = container.querySelector('.item-btn');
            firstItemBtn.focus();
            fireEvent.keyDown(firstItemBtn, { which: 38 });
            const lastBtn = container.querySelectorAll('.item-btn')[2]; // last

            return tick().then(() => expect(lastBtn).toHaveFocus());
        });

        it('is a single tabstop', () => {
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container } = render(SimpleSortableList, { props: { selected, max: 3 } });
            const button = document.createElement('button');
            const btnElements = Array.from(container.querySelectorAll(`.item-btn`));
            expect(btnElements[0].getAttribute('tabindex')).toBe('0');
            expect(btnElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(
                btnElements.length - 1
            );
            btnElements[0].focus();

            return tick()
                .then(() => {
                    expect(btnElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(
                        btnElements.length
                    );

                    document.body.appendChild(button);
                    button.focus();

                    return tick();
                })
                .then(() => {
                    button.remove();
                    expect(btnElements[0].getAttribute('tabindex')).toBe('0');
                    expect(btnElements.filter(elem => elem.getAttribute('tabindex') === '-1').length).toBe(
                        btnElements.length - 1
                    );
                });
        });
    });

    describe('events', () => {
        it('fires update event on drag update', () => {
            const selected = createSelected(['item0', null, null]);
            const { container, component } = render(SimpleSortableList, { props: { selected, max: 3 } });
            const updateHandler = vi.fn();
            component.$on('update', updateHandler);
            dragOver(container, 2, 'item1');
            dragUpdate(container, 2, 'item1');
            expect(updateHandler).toHaveBeenCalled();
            expect(updateHandler.mock.calls[0][0].detail).toEqual({ controlFocus: true, focusKey: null });
        });

        it('fires an update event on item remove with controlFocus=true, if removed is triggered by keyboard', async () => {
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container, component } = render(SimpleSortableList, { props: { selected, max: 3 } });
            const updateHandler = vi.fn();
            component.$on('update', updateHandler);
            fireEvent.click(container.querySelector('.remover'));

            await tick();
            expect(updateHandler).toHaveBeenCalled();
            expect(updateHandler.mock.calls[0][0].detail).toEqual({ controlFocus: false, focusKey: 'item0' });
        });

        it('fires an update event on item remove with controlFocus=false, if removed is triggered by mouse click', async () => {
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container, component } = render(SimpleSortableList, { props: { selected, max: 3 } });
            const updateHandler = vi.fn();
            component.$on('update', updateHandler);
            fireEvent.keyUp(container.querySelector('.remover'), { key: 'Enter' });

            await tick();
            expect(updateHandler).toHaveBeenCalled();
            expect(updateHandler.mock.calls[0][0].detail).toEqual({ controlFocus: true, focusKey: 'item0' });
        });

        it('fires update event on click reorder', () => {
            const selected = createSelected(['item0', 'item1', 'item2']);
            const { container, component } = render(SimpleSortableList, { props: { selected, max: 3 } });
            const updateHandler = vi.fn();
            component.$on('update', updateHandler);
            const [firstItemBtn, secondItemBtn] = container.querySelectorAll('.item-btn');
            fireEvent.click(firstItemBtn);
            return tick().then(() => {
                fireEvent.click(secondItemBtn);
                expect(updateHandler).toHaveBeenCalled();
                expect(updateHandler.mock.calls[0][0].detail).toEqual({
                    controlFocus: true,
                    focusKey: null
                });
            });
        });

        it('fires move event on keyboard reorder', () => {
            const selected = createSelected(['item0', null, null]);
            const { container, component } = render(SimpleSortableList, { props: { selected, max: 3 } });
            const moveHandler = vi.fn();
            component.$on('move', moveHandler);
            const [firstItemBtn] = container.querySelectorAll('.item-btn');
            firstItemBtn.focus();
            fireEvent.keyUp(firstItemBtn, { key: 'Enter' });
            return tick()
                .then(() => {
                    fireEvent.keyDown(firstItemBtn, { key: 'Up' });
                    return tick();
                })
                .then(() => {
                    expect(moveHandler).toHaveBeenCalled();
                    expect(moveHandler.mock.calls[0][0].detail).toEqual({
                        key: 'item0',
                        index: 2
                    });
                });
        });
    });
});
