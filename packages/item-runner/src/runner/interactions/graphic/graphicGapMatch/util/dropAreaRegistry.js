// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Helper object shared among dragables and dropareas in the same drag group
 * For draggable, call registry's dragStart/dragMove/dragStop to notify dropareas about drag events
 * For droparea, add/remove droparea to registry to allow draggables be dropped to it
 * @returns {Object}
 */
export default function dropAreaRegistryFactory() {
    let overDroparea = null;
    const dropareas = [];

    const findDroparea = (key, areaKey) => {
        const droparea = dropareas.find(da => da.key === key && da.areaKey === areaKey);
        return droparea;
    };
    const dispatch = (droparea, eventName, detail) => {
        droparea.node.dispatchEvent(
            new CustomEvent(eventName, {
                detail
            })
        );
    };

    return {
        /**
         * Register droparea
         * @param {String} key - droparea identifier part 1
         * @param {String} areaKey - droparea identifier part 2
         * @param {HTMLElement} node - dispatch events on it
         */
        add(key, areaKey, node) {
            const droparea = findDroparea(key, areaKey);
            if (droparea) {
                droparea.node = node;
            } else {
                dropareas.push({ key, areaKey, node });
            }
        },
        /**
         * Unregister droparea
         * @param {HTMLElement} node - the same that was passed in 'add' method
         */
        remove(node) {
            const idx = dropareas.findIndex(da => da.node === node);
            if (idx !== -1) {
                dropareas.splice(idx, 1);
            }
        },
        /**
         * Draggable notifies about its dragStart event
         */
        handleDragStart() {
            overDroparea = null;
        },
        /**
         * Draggable notifies about its dragMove event
         * @param {String} key - draggable identifier part 1
         * @param {String} areaKey - draggable identifier part 2
         * @param {Number} pointerX - mouse/touch x coordinate
         * @param {Number} pointerY - mouse/touch y coordinate
         * @fires {CustomEvent} dragOver - if draggable moves over some droparea
         * @fires {CustomEvent} dragOut - if draggable exits some droparea
         */
        handleDragMove(key, areaKey, pointerX, pointerY) {
            const overElement = document.elementFromPoint(pointerX, pointerY);
            const dropareaElement = overElement && overElement.closest('[data-droparea-key]');
            if (dropareaElement) {
                const dropareaAreaKey = dropareaElement.getAttribute('data-droparea-area');
                const dropareaKey = dropareaElement.getAttribute('data-droparea-key');
                const droparea = findDroparea(dropareaKey, dropareaAreaKey);
                if (droparea) {
                    const isSameDroparea =
                        overDroparea && overDroparea.key === dropareaKey && overDroparea.areaKey === dropareaAreaKey;
                    if (!isSameDroparea) {
                        if (overDroparea != null) {
                            dispatch(overDroparea, 'dragOut', {
                                key,
                                areaKey,
                                dropareaKey: overDroparea.key,
                                dropareaAreaKey: overDroparea.areaKey
                            });
                        }
                        overDroparea = droparea;
                        dispatch(overDroparea, 'dragOver', { key, areaKey, dropareaKey, dropareaAreaKey });
                    }
                }
            } else {
                if (overDroparea != null) {
                    dispatch(overDroparea, 'dragOut', {
                        key,
                        areaKey,
                        dropareaKey: overDroparea.key,
                        dropareaAreaKey: overDroparea.areaKey
                    });
                    overDroparea = null;
                }
            }
        },
        /**
         * Draggable notifies about its dragStop event
         * @param {String} key - draggable identifier part 1
         * @param {String} areaKey - draggable identifier part 2
         * @fires {CustomEvent} drop - if draggable was over some droparea
         */
        handleDragStop(key, areaKey) {
            if (overDroparea) {
                dispatch(overDroparea, 'drop', {
                    key,
                    areaKey,
                    dropareaKey: overDroparea.key,
                    dropareaAreaKey: overDroparea.areaKey
                });
                overDroparea = null;
            }
        },
        /**
         * Get registered dropareas (needed mostly for unit testing)
         * @returns {[Object]}
         */
        getDropareas() {
            return dropareas;
        }
    };
}
