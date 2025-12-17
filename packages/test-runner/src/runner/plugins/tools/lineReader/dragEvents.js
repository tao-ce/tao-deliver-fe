// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// works best
const DEFAULT_MOVE_THRESHOLD = 200;

/**
 * Gets clientY value from MouseEvent or TouchEvent instance
 * @param {MouseEvent|TouchEvent} evt - event instance
 * @returns {Number}
 */
function getEventClientYPosition(evt) {
    return evt.type.includes('touch') ? evt.touches[0].clientY : evt.clientY;
}

/**
 * Creates custom dragup or dragdown event with delta in details
 * @param {String} event - event name
 * @param {Number} delta - amount of pixels moved
 * @returns {CustomEvent}
 */
function createDragEvent(event, delta) {
    return new CustomEvent(event, {
        detail: {
            delta
        }
    });
}

export default function useDragEvents(node, moveThreshold = DEFAULT_MOVE_THRESHOLD) {
    let previousDragPosition = null;
    let dispatchPressOnRelease = true;
    let shouldRemoveWindowListenersOnDestroy = false;
    let moveListenersTimeout = null;

    function disableDragStart() {
        return false;
    }

    function dragStartListener(evt) {
        evt.preventDefault();
        previousDragPosition = getEventClientYPosition(evt);

        window.addEventListener('mousemove', dragListener);
        moveListenersTimeout = setTimeout(() => {
            window.addEventListener('touchmove', dragListener);
        }, moveThreshold);

        window.addEventListener('mouseup', dragEndListener);
        window.addEventListener('touchend', dragEndListener);
        shouldRemoveWindowListenersOnDestroy = true;
    }

    function dragListener(evt) {
        dispatchPressOnRelease = false;
        const currentDragPosition = getEventClientYPosition(evt);
        const delta = currentDragPosition - previousDragPosition;
        if (delta > 0) {
            node.dispatchEvent(createDragEvent('dragdown', Math.abs(delta)));
        } else if (delta < 0) {
            node.dispatchEvent(createDragEvent('dragup', Math.abs(delta)));
        }
        previousDragPosition = currentDragPosition;
    }

    function dragEndListener() {
        clearTimeout(moveListenersTimeout);
        window.removeEventListener('mousemove', dragListener);
        window.removeEventListener('touchmove', dragListener);
        window.removeEventListener('mouseup', dragEndListener);
        window.removeEventListener('touchend', dragEndListener);

        shouldRemoveWindowListenersOnDestroy = false;

        if (dispatchPressOnRelease) {
            node.dispatchEvent(new CustomEvent('dragpress'));
        }
        dispatchPressOnRelease = true;
    }

    node.addEventListener('mousedown', dragStartListener);
    node.addEventListener('touchstart', dragStartListener);
    node.addEventListener('dragstart', disableDragStart);

    return {
        destroy() {
            clearTimeout(moveListenersTimeout);
            node.removeEventListener('mousedown', dragStartListener);
            node.removeEventListener('touchstart', dragStartListener);
            node.removeEventListener('dragstart', disableDragStart);

            if (shouldRemoveWindowListenersOnDestroy) {
                window.removeEventListener('mousemove', dragListener);
                window.removeEventListener('touchmove', dragListener);
                window.removeEventListener('mouseup', dragEndListener);
                window.removeEventListener('touchend', dragEndListener);
            }
        }
    };
}
