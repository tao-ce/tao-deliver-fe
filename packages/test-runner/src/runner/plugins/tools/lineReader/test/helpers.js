// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Creates MouseEvent instance
 * @param {String} event - event name
 * @param {{ clientX: number, clientY: number }} mouseEventInit
 * @returns {MouseEvent}
 */
export const createMouseEvent = (event, { clientX, clientY }) =>
    new MouseEvent(event, {
        clientX,
        clientY
    });

/**
 * Creates TouchEvent instance
 * @param {String} event - event name
 * @param {{ clientX: number, clientY: number }} touchEventInit
 * @returns {TouchEvent}
 */
export const createTouchEvent = (event, { clientX, clientY }) =>
    new TouchEvent(event, {
        touches: [
            {
                clientX,
                clientY
            }
        ]
    });

/**
 *
 * @param {Element} node - node on which drag behaviour is being simulated
 * @param {(event: string, eventInit: { clientX: number, clientY: number }) => MouseEvent|TouchEvent} createEventHandlerFn - function,
 * returning MouseEvent or TouchEvent
 * @param {Number} delta - if positive - simulates dragging element up, if negative - simulates dragging element down
 * @return {Promise}
 */
export const simulateVerticalDrag = (node, createEventHandlerFn, delta) => {
    const [startEvt, moveEvt, endEvt] =
        createEventHandlerFn === createMouseEvent
            ? ['mousedown', 'mousemove', 'mouseup']
            : ['touchstart', 'touchmove', 'touchend'];
    const { top, left } = node.getBoundingClientRect();

    node.dispatchEvent(
        createEventHandlerFn(startEvt, {
            clientX: left,
            clientY: top
        })
    );

    return new Promise(resolve => {
        setTimeout(() => {
            window.dispatchEvent(
                createEventHandlerFn(moveEvt, {
                    clientX: left,
                    clientY: top + delta
                })
            );
            window.dispatchEvent(
                createEventHandlerFn(endEvt, {
                    clientX: left,
                    clientY: top + delta
                })
            );
            resolve();
        }, 200);
    });
};
