// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-23 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { debounce, noop } from 'lodash';
import { get } from '../../util/object.js';

/**
 * @param {string} eventType
 * @param {Object} eventTypeToDomEventTypeMap
 * @returns {string}
 */
export function mapEventTypeToDomEventType(eventType, eventTypeToDomEventTypeMap) {
    return eventTypeToDomEventTypeMap[eventType] || eventType;
}

/**
 * Dispatch 'interactiontrace' event
 *
 * @param {{}} args
 * @param {HTMLElement} args.interactionElement
 * @param {Event} args.event
 * @param {Object} args.metadata
 * @param {Object} [args.eventTypeToDomEventTypeMap]
 * @param {number} [args.timeStamp] - timestamp in ms
 */
export function dispatchInteractiontraceEvent({
    interactionElement,
    event,
    metadata,
    eventTypeToDomEventTypeMap = {},
    timeStamp = Date.now()
}) {
    const target = event.target || (event.detail && event.detail.target) || null;
    const originalEventType = event.detail?.domEventType || event.type;
    const domEventType = mapEventTypeToDomEventType(originalEventType, eventTypeToDomEventTypeMap);

    const interactionTraceEvent = new CustomEvent('interactiontrace', {
        bubbles: true,
        detail: {
            domEventType,
            target,
            timeStamp,
            ...metadata
        }
    });
    interactionElement.dispatchEvent(interactionTraceEvent);
}

const noopInteractionStateStore = {
    snapshotResponse: noop,
    getResponseIfChanged: noop
};

/**
 * @typedef {{ wait: number, [trailing]: boolean, [leading]: boolean, [maxWait]: number }} DebounceOptions
 */

/**
 * Executes handler and makes a logging right after that
 *
 * @param {{}} props
 * @param {(function(void): HTMLElement )} props.getInteractionElement
 * @param {(function(*): void)} props.[handler]
 * @param {{ snapshotResponse: Function, getResponseIfChanged: Function }} [props.interactionStateStore]
 * @param {Object} [props.eventTypeToDomEventTypeMap]
 * @param {(function(Event): Object)} [props.getDetails] - extracts and formats details from event
 * @param {DebounceOptions} [props.logDebounceOptions] - for debouncing events logging (relevant for frequently repeating events)
 * @returns {(function(Event): void)}
 */
export function wrapWithLogger({
    // use a getter instead of direct interactionElement,
    // as passing interactionElement as null
    // seals null value forever for a resulted function
    getInteractionElement,
    handler = noop,
    interactionStateStore = noopInteractionStateStore,
    eventTypeToDomEventTypeMap = {},
    getDetails = () => ({}),
    logDebounceOptions = { wait: 0 }
}) {
    /**
     * @param {CustomEvent} event
     * @param {HTMLElement} interactionElement
     * @param {*} newResponse
     * @param {number} timeStamp - it should be passed for debounced logger case (when logged time != event happened time)
     */
    let logEvent = (event, interactionElement, newResponse, timeStamp) => {
        const { pressedKey } = event.detail || {};
        dispatchInteractiontraceEvent({
            interactionElement,
            event,
            eventTypeToDomEventTypeMap,
            metadata: {
                ...(pressedKey && { pressedKey }),
                ...(newResponse && { newResponse }),
                ...getDetails(event)
            },
            timeStamp
        });
    };
    if (logDebounceOptions.wait > 0) {
        logEvent = debounce(logEvent, logDebounceOptions.wait, logDebounceOptions);
    }

    return async event => {
        const interactionElement = getInteractionElement();
        // snapshot the current response before handler mutates it!
        const previousResponse = interactionStateStore.snapshotResponse();
        // run mutations
        await handler(event);

        // get a new response, if it changed
        const newResponse = interactionStateStore.getResponseIfChanged(previousResponse);

        // provide previous response snapshot for catching change
        logEvent(event, interactionElement, newResponse, Date.now());
    };
}

/**
 * Creates a listener that saves last pressed key and optionally clears it after some time
 * @param {number} [clearTime]
 * @returns {{lastPressedKey: string|void, saveLastPressedKey: function(Event): void}}
 */
export function createLastPressedKeyListener(clearTime = 200) {
    let lastPressedKey;
    let timeout;
    return {
        get lastPressedKey() {
            return lastPressedKey;
        },
        saveLastPressedKey(event) {
            lastPressedKey = event.key || get(event, 'detail.pressedKey');

            if (clearTime) {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    lastPressedKey = void 0;
                }, clearTime);
            }
        }
    };
}
