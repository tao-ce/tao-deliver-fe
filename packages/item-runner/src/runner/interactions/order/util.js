// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import _ from 'lodash';

const eventTypeToDomEventTypeMap = Object.freeze({
    keySelect: 'keyup',
    update: 'drop',
    remove: 'click',
    dragStart: 'dragstart',
    dragStop: 'dragend'
});

function mapEventTypeToDomEventType(eventType) {
    return eventTypeToDomEventTypeMap[eventType] || eventType;
}

const dropAreaList = Object.freeze({
    choices: 'choices',
    answers: 'answers'
});

const getArea = (id) => {
    if (id && id.startsWith('tao-dropArea')) {
        return dropAreaList.choices;
    } else {
        return dropAreaList.answers;
    }
};

const DRAG_START_STOP_EVENTS = ['dragstart', 'dragend'];

function getEventDetails(type, event, selectedKeys, selectedSnapshot) {
    type = mapEventTypeToDomEventType(type);
    const eventDataByType = {};
    // dragstart has pending data on selected object do it seems there is a change but it is not yet
    if (!DRAG_START_STOP_EVENTS.includes(type) && !_.isEqual(selectedKeys, selectedSnapshot)) {
        eventDataByType.newResponse = selectedKeys.map(selectedKey => {
            const { key } = selectedKey || {};
            return key ? { key } : null; //do not include 'pending'
        });
    }

    if (DRAG_START_STOP_EVENTS.includes(type)) {
        eventDataByType.area = event.dropAreaKey && getArea(event.dropAreaKey);
    } else if (type === 'drop') {
        eventDataByType.areaTo = getArea(event.dropAreaKey);
        eventDataByType.areaFrom = getArea(event.initialDropAreaKey);
    }

    return eventDataByType;
}

/**
 * Trace the interaction
 * @param {Event} e
 * @param {Array} selectedKeys
 * @param {Object} selectedSnapshot
 * @returns {Object} eventData
 */
export function traceInteraction(e, selectedKeys, selectedSnapshot) {
    const target = e.target || (e.detail && e.detail.target) || null;
    const position = e.detail?.position || (e.clientX && {clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY});
    const pressedKey = e.detail?.key;

    const eventDataByType = getEventDetails(e.type, e.detail, selectedKeys, selectedSnapshot);

    const eventData = {
        detail: {
            target,
            domEventType: mapEventTypeToDomEventType(e.type),
            qtiChoiceIdentifier: e.detail.draggableKey,
            ...(position && { position }),
            ...(pressedKey && { pressedKey }),
            ...eventDataByType
        }
    };
    return eventData;
}