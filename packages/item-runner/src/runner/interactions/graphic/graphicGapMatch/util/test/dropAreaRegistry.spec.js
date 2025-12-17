// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import dropAreaRegistryFactory from '../dropAreaRegistry.js';

describe('dropAreaRegistryFactory', () => {
    function createAndRegisterDroparea(registry, key, areaKey) {
        const node = document.createElement('div');
        node.setAttribute('data-droparea-key', key);
        node.setAttribute('data-droparea-area', areaKey);
        const dragOverSpyA = vi.fn();
        const dragOutSpyA = vi.fn();
        const dropSpyA = vi.fn();
        node.addEventListener('dragOver', dragOverSpyA);
        node.addEventListener('dragOut', dragOutSpyA);
        node.addEventListener('drop', dropSpyA);
        registry.add(key, areaKey, node);
        return [node, dragOverSpyA, dragOutSpyA, dropSpyA];
    }

    function setPointerOnElement(node) {
        window.document.elementFromPoint = () => node;
    }

    afterEach(() => {
        window.document.elementFromPoint = null;
    });

    it('adds and removes dropareas to itself', () => {
        const registry = dropAreaRegistryFactory();
        const nodeA = document.createElement('div');
        const nodeB = document.createElement('div');
        const nodeC = document.createElement('div');

        registry.add('a', 'area', nodeA);
        registry.add('a', 'area', nodeB);
        registry.add('c', 'area', nodeC);

        expect(registry.getDropareas()).toEqual([
            { key: 'a', areaKey: 'area', node: nodeB },
            { key: 'c', areaKey: 'area', node: nodeC }
        ]);

        registry.remove(nodeC);

        expect(registry.getDropareas()).toEqual([{ key: 'a', areaKey: 'area', node: nodeB }]);
    });

    it('detects only registered dropareas with data attributes', () => {
        const registry = dropAreaRegistryFactory();
        const nodeA = document.createElement('div');
        const dragOverSpyA = vi.fn();
        const dragOutSpyA = vi.fn();
        const dropSpyA = vi.fn();
        nodeA.addEventListener('dragOver', dragOverSpyA);
        nodeA.addEventListener('dragOut', dragOutSpyA);
        nodeA.addEventListener('drop', dropSpyA);

        const drag = () => {
            setPointerOnElement(nodeA);
            registry.handleDragStart();
            registry.handleDragMove('w', 'drag', 10, 10);
            setPointerOnElement(document.body);
            registry.handleDragMove('w', 'drag', 20, 20);
            setPointerOnElement(nodeA);
            registry.handleDragMove('w', 'drag', 10, 10);
            registry.handleDragStop('w', 'drag');
        };

        drag();
        expect(dragOverSpyA).not.toHaveBeenCalled();
        expect(dragOutSpyA).not.toHaveBeenCalled();
        expect(dropSpyA).not.toHaveBeenCalled();
        dragOverSpyA.mockClear();
        dragOutSpyA.mockClear();
        dropSpyA.mockClear();

        registry.add('a', 'area', nodeA);
        nodeA.setAttribute('data-droparea-key', 'a');
        nodeA.setAttribute('data-droparea-area', 'area');

        drag();
        expect(dragOverSpyA).toHaveBeenCalled();
        expect(dragOutSpyA).toHaveBeenCalled();
        expect(dropSpyA).toHaveBeenCalled();
        dragOverSpyA.mockClear();
        dragOutSpyA.mockClear();
        dropSpyA.mockClear();

        nodeA.removeAttribute('data-droparea-key', 'a');
        nodeA.removeAttribute('data-droparea-area', 'area');

        drag();
        expect(dragOverSpyA).not.toHaveBeenCalled();
        expect(dragOutSpyA).not.toHaveBeenCalled();
        expect(dropSpyA).not.toHaveBeenCalled();
        dragOverSpyA.mockClear();
        dragOutSpyA.mockClear();
        dropSpyA.mockClear();
    });

    it('detects droparea if pointer is on element inside it', () => {
        const registry = dropAreaRegistryFactory();
        const fixture = document.createElement('div');
        fixture.innerHTML = `<div class='droparea' data-droparea-key="a" data-droparea-area="area">
            <div>
                <div class="child" />
            </div>
        </div>`;
        const dropareaNode = fixture.querySelector('.droparea');
        const childNode = fixture.querySelector('.child');

        const dragOverSpyA = vi.fn();
        const dragOutSpyA = vi.fn();
        const dropSpyA = vi.fn();
        dropareaNode.addEventListener('dragOver', dragOverSpyA);
        dropareaNode.addEventListener('dragOut', dragOutSpyA);
        dropareaNode.addEventListener('drop', dropSpyA);

        registry.add('a', 'area', dropareaNode);

        const drag = () => {
            setPointerOnElement(childNode);
            registry.handleDragStart();
            registry.handleDragMove('w', 'drag', 10, 10);
            setPointerOnElement(document.body);
            registry.handleDragMove('w', 'drag', 20, 20);
            setPointerOnElement(childNode);
            registry.handleDragMove('w', 'drag', 10, 10);
            registry.handleDragStop('w', 'drag');
        };

        drag();
        expect(dragOverSpyA).toHaveBeenCalled();
        expect(dragOutSpyA).toHaveBeenCalled();
        expect(dropSpyA).toHaveBeenCalled();
    });

    it('fires dragOver & dragOut events', () => {
        const registry = dropAreaRegistryFactory();
        const [nodeA, dragOverSpyA, dragOutSpyA] = createAndRegisterDroparea(registry, 'a', 'area');
        const [nodeB, dragOverSpyB, dragOutSpyB] = createAndRegisterDroparea(registry, 'b', 'areaB');

        registry.handleDragStart();
        setPointerOnElement(nodeA);
        registry.handleDragMove('w', 'drag', 10, 10);

        expect(dragOverSpyA).toHaveBeenCalled();
        expect(dragOverSpyA.mock.calls[0][0].detail).toEqual({
            key: 'w',
            areaKey: 'drag',
            dropareaKey: 'a',
            dropareaAreaKey: 'area'
        });
        expect(dragOutSpyA).not.toHaveBeenCalled();
        dragOverSpyA.mockClear();

        setPointerOnElement(nodeB);
        registry.handleDragMove('w', 'drag', 20, 20);

        expect(dragOutSpyA).toHaveBeenCalled();
        expect(dragOutSpyA.mock.calls[0][0].detail).toEqual({
            key: 'w',
            areaKey: 'drag',
            dropareaKey: 'a',
            dropareaAreaKey: 'area'
        });
        expect(dragOverSpyB).toHaveBeenCalled();
        expect(dragOverSpyB.mock.calls[0][0].detail).toEqual({
            key: 'w',
            areaKey: 'drag',
            dropareaKey: 'b',
            dropareaAreaKey: 'areaB'
        });
        expect(dragOverSpyA).not.toHaveBeenCalled();
        dragOverSpyB.mockClear();

        setPointerOnElement(document.body);
        registry.handleDragMove('w', 'drag', 30, 30);

        expect(dragOutSpyA).toHaveBeenCalled();
        expect(dragOutSpyA.mock.calls[0][0].detail).toEqual({
            key: 'w',
            areaKey: 'drag',
            dropareaKey: 'a',
            dropareaAreaKey: 'area'
        });
        expect(dragOutSpyB).toHaveBeenCalled();
        expect(dragOutSpyB.mock.calls[0][0].detail).toEqual({
            key: 'w',
            areaKey: 'drag',
            dropareaKey: 'b',
            dropareaAreaKey: 'areaB'
        });
        expect(dragOverSpyB).not.toHaveBeenCalled();
    });

    it('does not fire dragOver & dragOut if pointer moves across same element', () => {
        const registry = dropAreaRegistryFactory();
        const [nodeA, dragOverSpyA, dragOutSpyA] = createAndRegisterDroparea(registry, 'a', 'area');

        registry.handleDragStart();
        setPointerOnElement(nodeA);
        registry.handleDragMove('w', 'drag', 10, 10);
        registry.handleDragMove('w', 'drag', 20, 20);
        registry.handleDragMove('w', 'drag', 30, 30);

        expect(dragOverSpyA).toHaveBeenCalledTimes(1);
        expect(dragOutSpyA).not.toHaveBeenCalled();
    });

    it('fires drop event', () => {
        const registry = dropAreaRegistryFactory();
        const [nodeA, , , dropSpyA] = createAndRegisterDroparea(registry, 'a', 'area');

        setPointerOnElement(nodeA);
        registry.handleDragStart();
        registry.handleDragMove('w', 'drag', 10, 10);
        registry.handleDragStop('w', 'drag');

        expect(dropSpyA).toHaveBeenCalled();
        expect(dropSpyA.mock.calls[0][0].detail).toEqual({
            key: 'w',
            areaKey: 'drag',
            dropareaKey: 'a',
            dropareaAreaKey: 'area'
        });
    });

    it('does not fire drop event if not over droparea', () => {
        const registry = dropAreaRegistryFactory();
        const [, , , dropSpyA] = createAndRegisterDroparea(registry, 'a', 'area');

        setPointerOnElement(document.body);
        registry.handleDragStart();
        registry.handleDragMove('w', 'drag', 10, 10);
        registry.handleDragStop('w', 'drag');

        expect(dropSpyA).not.toHaveBeenCalled();
    });
});
