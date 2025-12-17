// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import dropAreaRegistryFactory from '../../dropAreaRegistry.js';
import setupDroparea from '../setupDroparea.js';

describe('setupDroparea', () => {
    it('adds node to dropareaRegistry', () => {
        const node = document.createElement('div');
        let dropareaRegistry = dropAreaRegistryFactory();
        expect(dropareaRegistry.getDropareas().length).toBe(0);

        setupDroparea(node, { dropareaRegistry, key: 'a', areaKey: 'area' });
        expect(dropareaRegistry.getDropareas()).toEqual([{ key: 'a', areaKey: 'area', node }]);

        dropareaRegistry = dropAreaRegistryFactory();
        setupDroparea(node, { dropareaRegistry, key: 'a', areaKey: null });
        expect(dropareaRegistry.getDropareas()).toEqual([{ key: 'a', areaKey: '', node }]);
    });

    it('does not add node to dropareaRegistry if key is missing', () => {
        const node = document.createElement('div');
        const dropareaRegistry = dropAreaRegistryFactory();
        expect(dropareaRegistry.getDropareas().length).toBe(0);

        setupDroparea(node, { dropareaRegistry: null, key: 'a', areaKey: 'area' });
        expect(dropareaRegistry.getDropareas().length).toBe(0);

        setupDroparea(node, { dropareaRegistry, key: null, areaKey: 'area' });
        expect(dropareaRegistry.getDropareas().length).toBe(0);
    });

    it('removes from dropareaRegistry on destroy', () => {
        const node = document.createElement('div');
        const dropareaRegistry = dropAreaRegistryFactory();
        expect(dropareaRegistry.getDropareas().length).toBe(0);

        const action = setupDroparea(node, { dropareaRegistry, key: 'a', areaKey: 'area' });
        expect(dropareaRegistry.getDropareas()).toEqual([{ key: 'a', areaKey: 'area', node }]);

        action.destroy();
        expect(dropareaRegistry.getDropareas().length).toBe(0);

        const actionNoAdd = setupDroparea(node, { dropareaRegistry, key: null, areaKey: 'areaC' });
        expect(dropareaRegistry.getDropareas().length).toBe(0);

        actionNoAdd.destroy();
        expect(dropareaRegistry.getDropareas().length).toBe(0);
    });

    it('updates with new params', () => {
        const node = document.createElement('div');
        const dropareaRegistry = dropAreaRegistryFactory();
        const action = setupDroparea(node, { dropareaRegistry, key: 'a', areaKey: 'area' });
        expect(dropareaRegistry.getDropareas()).toEqual([{ key: 'a', areaKey: 'area', node }]);

        action.update({ dropareaRegistry, key: 'b', areaKey: 'areaB' });
        expect(dropareaRegistry.getDropareas()).toEqual([{ key: 'b', areaKey: 'areaB', node }]);

        action.update({ dropareaRegistry, key: null, areaKey: 'areaC' });
        expect(dropareaRegistry.getDropareas().length).toBe(0);
    });
});
