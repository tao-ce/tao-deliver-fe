// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getPointerEventCoords } from '@oat-sa-private/ui-core';

/**
 * Constrain draggable to bounds of container element
 * Draggable must be a nested svg (calculations are different for svg), and must have x, y, width, height attributes.
 * @param {SVG.Dom} dragAnchor
 * @param {HtmlElement} coordinateParent - container over which element can't go (parent svg element)
 * @param {Object} moveEventBox - e.detail.box of 'dragMove' event, in shape of {x, y}
 * @returns {Object} constrained moveEventBox: {x, y}
 */
export function constrainSvgDragMoveBox(dragAnchor, coordinateParent, moveEventBox) {
    //.bbox() - not enough because dragAnchor is a nested() svg
    //.rbox() - not enough because there can be negative offset in bbox (-3, -6), and it gets included
    const rwidth = parseFloat(dragAnchor.attr('width'));
    const rheight = parseFloat(dragAnchor.attr('height'));
    const rx = parseFloat(dragAnchor.attr('x'));
    const ry = parseFloat(dragAnchor.attr('y'));
    const rx2 = rx + rwidth;
    const ry2 = ry + rheight;

    const constraints = coordinateParent.getBoundingClientRect();
    const cx = 0;
    const cy = 0;
    const cx2 = constraints.width;
    const cy2 = constraints.height;

    const bbox = dragAnchor.bbox();
    const dx = moveEventBox.x - bbox.x;
    const dy = moveEventBox.y - bbox.y;

    let newDx = dx;
    let newDy = dy;

    if (rx + dx < cx) {
        newDx = cx - rx;
    }
    if (ry + dy < cy) {
        newDy = cy - ry;
    }
    if (rx2 + dx > cx2) {
        newDx = cx2 - rx2;
    }
    if (ry2 + dy > cy2) {
        newDy = cy2 - ry2;
    }

    return { x: bbox.x + newDx, y: bbox.y + newDy };
}

/**
 * Wrapper over 'draggable' to detect both drag and click events.
 * By default, 'svg.draggable.js' library can detect only drag and loses click events. So we need to override its events.
 * @param {SVG.Dom} target - make it draggable and clickable
 * @param {SVG.Dom} nestedClickTarget - another clickable element inside 'target' (e.g. remove button)
 * @param {Object} handlers
 * @param {Function} handlers.handleBeforeAction - event callback where can cancel following drag/click
 * @param {Function} handlers.handleDragStart - dragStart event callback
 * @param {Function} handlers.handleDragMove - dragMove event callback; event is passed as argument
 * @param {Function} handlers.handleDragStop - dragStop event callback
 * @param {Function} handlers.handleClick - click event callback
 * @param {Function} handlers.handleNestedClick - click event callback for nestedClickTarget
 */
export function setupDraggableClickable(
    target,
    nestedClickTarget,
    { handleBeforeAction, handleDragStart, handleDragMove, handleDragStop, handleClick, handleNestedClick }
) {
    const dragStartThresholdMs = 150; //user may move mouse a bit during click, and that should count as click, not drag
    const dragStartThresholdPx = 30;
    let dragStartX;
    let dragStartY;
    let dragTimeout;
    let dragTimeoutPassed = false;
    let dragStarted = false;
    let pointerdownDetected = false;
    let nestedClickTargetDetected = null; //for 'touchstart', 'click' event is not fired because library uses e.preventDefault()

    if (nestedClickTarget) {
        nestedClickTarget
            .on('mousedown', () => {
                nestedClickTargetDetected = nestedClickTarget;
            })
            .on('touchstart', () => {
                nestedClickTargetDetected = nestedClickTarget;
            });
    }

    target
        .draggable()
        .on('beforedrag', e => {
            handleBeforeAction(e);
            if (e.defaultPrevented) {
                nestedClickTargetDetected = null;
            }
        })
        .on('dragstart', e => {
            const pointerCoords = getPointerEventCoords(e.detail.event);
            pointerdownDetected = true;
            dragStarted = false;
            dragStartX = pointerCoords.x;
            dragStartY = pointerCoords.y;
            dragTimeoutPassed = false;
            if (dragTimeout) {
                clearTimeout(dragTimeout);
            }
            dragTimeout = setTimeout(() => {
                dragTimeoutPassed = true;
            }, dragStartThresholdMs);
        })
        .on('dragmove', e => {
            const pointerCoords = getPointerEventCoords(e.detail.event);
            const dx = pointerCoords.x - dragStartX;
            const dy = pointerCoords.y - dragStartY;
            if (!dragStarted) {
                if (
                    ((dx !== 0 || dy !== 0) && dragTimeoutPassed) ||
                    Math.abs(dx) > dragStartThresholdPx ||
                    Math.abs(dy) > dragStartThresholdPx
                ) {
                    dragStarted = true;
                    handleDragStart();
                } else {
                    e.preventDefault(); //otherwise library will move element itself
                }
            }
            if (dragStarted) {
                handleDragMove(e);
            }
        })
        .on('dragend', () => {
            if (dragStarted) {
                dragStarted = false;
                handleDragStop();
            } else {
                if (nestedClickTargetDetected && pointerdownDetected) {
                    handleNestedClick();
                    nestedClickTargetDetected = null;
                    pointerdownDetected = false;
                } else {
                    handleClick();
                }
            }
        });
}
