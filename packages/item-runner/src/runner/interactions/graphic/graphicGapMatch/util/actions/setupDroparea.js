// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Svelte Action to make element a droparea (add drop/dragOver/dragOut events)
 * @example
 * <g
 *   use:setupDroparea={{ dropareaRegistry, areaKey, key: dropareaEnabled ? key : void 0 }}
 *   on:dragOver
     on:dragOut
     on:drop />
 * @param {HTMLElement} node - container node which acts as droparea
 * @param {Object} options
 * @param {Object} options.dropareaRegistry - dropAreaRegistryFactory object, shared among dragables and dropareas in the same drag group
 * @param {String} options.key - droparea identifier part 1 (if it's empty, droparea is disabled)
 * @param {String} options.areaKey - droparea identifier part 2 (optional)
 * @returns {Object} - node's lifecycle hooks
 */
export default function setupDroparea(node, { dropareaRegistry, key, areaKey }) {
    let actualKey = key;
    let actualAreaKey = areaKey || '';

    function register() {
        if (dropareaRegistry && actualKey) {
            dropareaRegistry.add(actualKey, actualAreaKey, node);
            node.setAttribute('data-droparea-key', actualKey);
            node.setAttribute('data-droparea-area', actualAreaKey);
        }
    }
    function unregister() {
        if (dropareaRegistry && actualKey) {
            node.removeAttribute('data-droparea-key');
            node.removeAttribute('data-droparea-area');
            dropareaRegistry.remove(node);
        }
    }

    register();

    return {
        update({ key: newKey, areaKey: newAreaKey }) {
            unregister();
            actualKey = newKey;
            actualAreaKey = newAreaKey;
            register();
        },
        destroy() {
            unregister();
        }
    };
}
