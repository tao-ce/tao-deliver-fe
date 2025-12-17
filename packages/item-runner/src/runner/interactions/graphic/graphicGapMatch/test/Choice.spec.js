// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Choice from '../Choice.svelte';
import dropAreaRegistryFactory from '../util/dropAreaRegistry.js';

beforeEach(() => {
    window.document.elementFromPoint = () => document.body;
});
afterEach(() => {
    window.document.elementFromPoint = null;
});

describe('GraphicGapMatch Choice', () => {
    describe('rendering', () => {
        it('renders empty container without coords', () => {
            const { container } = render(Choice, {
                props: {
                    itemIdentifier: 'item1',
                    key: 'choice1',
                    draggableGroupKey: 'xyz'
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('reacts to basic props', () => {
            const { container, component } = render(Choice, {
                props: {
                    itemIdentifier: 'item1',
                    key: 'choice1',
                    gapKey: 'gap1',
                    draggableGroupKey: 'xyz',
                    dropareaRegistry: dropAreaRegistryFactory(),
                    x: 0,
                    y: 2,
                    width: 10,
                    height: 40,
                    imgSrc: 'hello.png'
                }
            });
            expect(container).toMatchSnapshot();
            component.$set({ x: 5, y: 8, selected: true });
            return tick().then(() => {
                expect(container).toMatchSnapshot();
            });
        });

        it('renders with detailed props', () => {
            const { container } = render(Choice, {
                props: {
                    itemIdentifier: 'item1',
                    key: 'choice1',
                    gapKey: 'gap1',
                    draggableGroupKey: 'xyz',
                    dropareaRegistry: dropAreaRegistryFactory(),
                    x: 10,
                    y: 20,
                    width: 100,
                    height: 200,
                    imgSrc: 'hello.png',
                    ariaLabel: 'this choice',
                    ariaDescribedBy: 'press enter to select',
                    removerAriaLabel: 'remove this',
                    droparea: false,
                    placed: false,
                    amount: 0,
                    selected: false,
                    targetable: true,
                    targeted: true,
                    disabled: true
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('renders with placed props', () => {
            const { container } = render(Choice, {
                props: {
                    itemIdentifier: 'item1',
                    key: 'choice1',
                    gapKey: 'gap1',
                    draggableGroupKey: 'xyz',
                    dropareaRegistry: dropAreaRegistryFactory(),
                    x: 0,
                    y: 0,
                    width: 10,
                    height: 10,
                    imgSrc: 'hello.png',
                    placed: true
                }
            });
            expect(container).toMatchSnapshot();
            expect(container.querySelector('.remover')).not.toBeNull();
        });
    });

    describe('events', () => {
        const choiceProps = {
            itemIdentifier: 'item1',
            key: 'choice1',
            gapKey: 'gap1',
            draggableGroupKey: 'xyz',
            dropareaRegistry: dropAreaRegistryFactory(),
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            imgSrc: 'hello.png',
            placed: true
        };

        function fireDragStart(element) {
            const draggable = element.closest('.drag-anchor[data-drag-drop-key]');
            const initialDropArea = draggable.parentElement.closest('.choice[data-drag-drop-key]');
            const draggableKey = draggable.getAttribute('data-drag-drop-key');
            const initialDropAreaKey = initialDropArea.getAttribute('data-drag-drop-key');
            draggable.dispatchEvent(
                new CustomEvent('dragStart', {
                    detail: { draggableKey, dropAreaKey: initialDropAreaKey }
                })
            );
        }

        function fireDragStop(element) {
            const draggable = element.closest('.drag-anchor[data-drag-drop-key]');
            const draggableKey = draggable.getAttribute('data-drag-drop-key');
            draggable.dispatchEvent(new CustomEvent('dragStop', { detail: { draggableKey } }));
        }

        function fireDragMove(element, x, y) {
            const draggable = element.closest('.drag-anchor[data-drag-drop-key]');
            const draggableKey = draggable.getAttribute('data-drag-drop-key');
            draggable.dispatchEvent(
                new CustomEvent('dragMove', { detail: { draggableKey, originalEvent: { clientX: x, clientY: y } } })
            );
        }

        it('forwards img load event', () => {
            const { container, component } = render(Choice, { props: choiceProps });
            const handlerMock = vi.fn();
            const imgElement = container.querySelector('img');
            component.$on('load', handlerMock);
            fireEvent.load(imgElement);
            expect(handlerMock).toHaveBeenCalled();
        });

        it('forwards img error event', () => {
            const { container, component } = render(Choice, { props: choiceProps });
            const handlerMock = vi.fn();
            const imgElement = container.querySelector('img');
            component.$on('error', handlerMock);
            fireEvent.error(imgElement);
            expect(handlerMock).toHaveBeenCalled();
        });

        it('fires click with mouse', () => {
            const { container, component } = render(Choice, { props: choiceProps });
            const clickSpy = vi.fn();
            const clickRemoveSpy = vi.fn();
            const dragStartSpy = vi.fn();
            const dragStopSpy = vi.fn();
            component.$on('click', clickSpy);
            component.$on('clickRemove', clickRemoveSpy);
            component.$on('dragStart', dragStartSpy);
            component.$on('dragStop', dragStopSpy);

            fireEvent.click(container.querySelector('.image'));

            expect(clickSpy).toHaveBeenCalled();
            expect(clickSpy.mock.calls[0][0].detail).toEqual({
                key: choiceProps.key,
                gapKey: choiceProps.gapKey
            });
            expect(clickRemoveSpy).not.toHaveBeenCalled();
            expect(dragStartSpy).not.toHaveBeenCalled();
            expect(dragStopSpy).not.toHaveBeenCalled();
        });

        it('fires keySelect with keyboard', () => {
            const { container, component } = render(Choice, { props: choiceProps });
            const keySelectSpy = vi.fn();
            component.$on('keySelect', keySelectSpy);

            fireEvent.keyUp(container.querySelector('.image'), { key: 'Space' });

            expect(keySelectSpy).toHaveBeenCalled();
            expect(keySelectSpy.mock.calls[0][0].detail).toEqual({
                key: choiceProps.key,
                gapKey: choiceProps.gapKey
            });
            keySelectSpy.mockClear();

            fireEvent.keyUp(container.querySelector('.image'), { key: 'Enter' });

            expect(keySelectSpy).toHaveBeenCalled();
        });

        it('fires clickRemove with mouse', () => {
            const { container, component } = render(Choice, { props: choiceProps });
            const clickclickRemoveSpy = vi.fn();
            const clickSpy = vi.fn();
            const dragStartSpy = vi.fn();
            const dragStopSpy = vi.fn();
            component.$on('clickRemove', clickclickRemoveSpy);
            component.$on('click', clickSpy);
            component.$on('dragStart', dragStartSpy);
            component.$on('dragStop', dragStopSpy);

            fireEvent.click(container.querySelector('.remover'));

            return tick().then(() => {
                expect(clickclickRemoveSpy).toHaveBeenCalled();
                expect(clickclickRemoveSpy.mock.calls[0][0].detail).toEqual({
                    key: choiceProps.key,
                    gapKey: choiceProps.gapKey
                });
                expect(clickSpy).not.toHaveBeenCalled();
                expect(dragStartSpy).not.toHaveBeenCalled();
                expect(dragStopSpy).not.toHaveBeenCalled();
            });
        });

        it('fires keyRemove with keyboard', () => {
            const { container, component } = render(Choice, { props: choiceProps });
            const keyclickRemoveSpy = vi.fn();
            component.$on('keyRemove', keyclickRemoveSpy);

            fireEvent.keyUp(container.querySelector('.remover'), { key: 'Space' });

            expect(keyclickRemoveSpy).toHaveBeenCalled();
            expect(keyclickRemoveSpy.mock.calls[0][0].detail).toEqual({
                key: choiceProps.key,
                gapKey: choiceProps.gapKey
            });
            keyclickRemoveSpy.mockClear();

            fireEvent.keyUp(container.querySelector('.remover'), { key: 'Enter' });

            expect(keyclickRemoveSpy).toHaveBeenCalled();
        });

        it('fires hoverOver & hoverOut', () => {
            const { container, component } = render(Choice, { props: choiceProps });
            const hoverOverSpy = vi.fn();
            const hoverOutSpy = vi.fn();
            component.$on('hoverOver', hoverOverSpy);
            component.$on('hoverOut', hoverOutSpy);

            fireEvent.mouseEnter(container.querySelector('.choice'), {});

            expect(hoverOverSpy).toHaveBeenCalled();
            expect(hoverOverSpy.mock.calls[0][0].detail).toEqual({
                key: choiceProps.key,
                gapKey: choiceProps.gapKey
            });
            expect(hoverOutSpy).not.toHaveBeenCalled();

            fireEvent.mouseLeave(container.querySelector('.choice'), {});

            expect(hoverOutSpy).toHaveBeenCalled();
            expect(hoverOutSpy.mock.calls[0][0].detail).toEqual({
                key: choiceProps.key,
                gapKey: choiceProps.gapKey
            });
        });

        it('fires dragStart & dragStop', () => {
            const { container, component } = render(Choice, { props: choiceProps });
            const dragStartSpy = vi.fn();
            const dragStopSpy = vi.fn();
            const clickRemoveSpy = vi.fn();
            const clickSpy = vi.fn();
            component.$on('dragStart', dragStartSpy);
            component.$on('dragStop', dragStopSpy);
            component.$on('clickRemove', clickRemoveSpy);
            component.$on('click', clickSpy);

            fireDragStart(container.querySelector('.image'));

            expect(dragStartSpy).toHaveBeenCalled();
            expect(dragStartSpy.mock.calls[0][0].detail).toEqual({
                key: choiceProps.key,
                gapKey: choiceProps.gapKey
            });
            expect(dragStopSpy).not.toHaveBeenCalled();
            expect(clickSpy).not.toHaveBeenCalled();
            expect(clickRemoveSpy).not.toHaveBeenCalled();

            fireDragStop(container.querySelector('.image'));

            expect(dragStopSpy).toHaveBeenCalled();
            expect(dragStopSpy.mock.calls[0][0].detail).toEqual({
                key: choiceProps.key,
                gapKey: choiceProps.gapKey
            });
            expect(clickSpy).not.toHaveBeenCalled();
            expect(clickRemoveSpy).not.toHaveBeenCalled();
        });

        it('fires dragOver & dragOut & drop', () => {
            const { container, component } = render(Choice, { props: choiceProps });
            const dragOverSpy = vi.fn();
            const dragOutSpy = vi.fn();
            const dropSpy = vi.fn();
            component.$on('dragOver', dragOverSpy);
            component.$on('dragOut', dragOutSpy);
            component.$on('drop', dropSpy);

            const dropareaRegistry = choiceProps.dropareaRegistry;
            const fireOtherDragStart = () => {
                dropareaRegistry.handleDragStart();
            };
            const fireOtherDragMove = node => {
                window.document.elementFromPoint = () => node;
                dropareaRegistry.handleDragMove('draggable1', 'draggableArea1', 0, 0);
            };
            const fireOtherDragStop = () => {
                dropareaRegistry.handleDragStop('draggable1', 'draggableArea1');
            };

            fireOtherDragStart();

            expect(dragOverSpy).not.toHaveBeenCalled();
            expect(dragOutSpy).not.toHaveBeenCalled();
            expect(dropSpy).not.toHaveBeenCalled();

            fireOtherDragMove(container.querySelector('.image'));

            expect(dragOverSpy).toHaveBeenCalled();
            expect(dragOverSpy.mock.calls[0][0].detail).toEqual({
                key: 'draggable1',
                gapKey: 'draggableArea1',
                dropareaKey: choiceProps.key,
                dropareaGapKey: choiceProps.gapKey
            });
            expect(dragOutSpy).not.toHaveBeenCalled();
            expect(dropSpy).not.toHaveBeenCalled();

            fireOtherDragMove(document.body);

            expect(dragOutSpy).toHaveBeenCalled();
            expect(dragOutSpy.mock.calls[0][0].detail).toEqual({
                key: 'draggable1',
                gapKey: 'draggableArea1',
                dropareaKey: choiceProps.key,
                dropareaGapKey: choiceProps.gapKey
            });
            expect(dropSpy).not.toHaveBeenCalled();

            fireOtherDragMove(container.querySelector('.image'));
            fireOtherDragStop();

            expect(dropSpy).toHaveBeenCalled();
            expect(dropSpy.mock.calls[0][0].detail).toEqual({
                key: 'draggable1',
                gapKey: 'draggableArea1',
                dropareaKey: choiceProps.key,
                dropareaGapKey: choiceProps.gapKey
            });
        });

        it('notifes other dropareas on its dragMove', () => {
            const dropareaRegistry = dropAreaRegistryFactory();
            const registryDragMoveSpy = vi.fn();
            dropareaRegistry.handleDragMove = registryDragMoveSpy;

            const { container } = render(Choice, { props: Object.assign({}, choiceProps, { dropareaRegistry }) });

            const element = container.querySelector('.image');
            fireDragStart(element);
            fireDragMove(element, 55, 88);

            expect(registryDragMoveSpy).toHaveBeenCalled();
            expect(registryDragMoveSpy.mock.calls[0]).toEqual([choiceProps.key, choiceProps.gapKey, 55, 88]);
        });

        it('does not fire events if disabled', () => {
            const { container, component } = render(Choice, {
                props: Object.assign({}, choiceProps, { disabled: true })
            });
            const clickSpy = vi.fn();
            const clickRemoveSpy = vi.fn();
            const dragStartSpy = vi.fn();
            component.$on('click', clickSpy);
            component.$on('clickRemove', clickRemoveSpy);
            component.$on('dragStart', dragStartSpy);

            const element = container.querySelector('.image');
            fireEvent.click(element);
            expect(clickSpy).not.toHaveBeenCalled();

            fireEvent.click(container.querySelector('.remover'));
            expect(clickRemoveSpy).not.toHaveBeenCalled();

            fireDragStart(element);
            expect(dragStartSpy).not.toHaveBeenCalled();
        });
    });
});
