// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import _ from 'lodash';

const eventTypeToDomEventTypeMap = Object.freeze({
    keySelect: 'keyup',
    update: 'drop',
    remove: 'click',
    dragStop: 'dragend',
    dragStart: 'dragstart'
});

function mapEventTypeToDomEventType(eventType) {
    return eventTypeToDomEventTypeMap[eventType] || eventType;
}

const dropAreaList = Object.freeze({
    choices: 'choices',
    answers: 'answers'
});

const getArea = (id) => {
    if (id && id.endsWith('-gap')) {
        return dropAreaList.choices;
    }
    return dropAreaList.answers;
};

const SELECT_EVENTS = ['click', 'keyup', 'keydown'];
const DRAG_EVENTS = ['dragstart', 'dragend'];

function getEventDetails(params) {
    const {type, event, key, selectedKeys, suggestedKey} = params;
    const eventDataByType = {};

    if ([...SELECT_EVENTS, 'drop'].includes(type) && !_.isEqual(selectedKeys, suggestedKey)) {
        eventDataByType.newResponse = selectedKeys;
    }

    if (SELECT_EVENTS.includes(type)) {
        if (key) {
            eventDataByType.pressedKey = key;
        }
    } else if (DRAG_EVENTS.includes(type)) {
        eventDataByType.area = getArea(event.dropAreaKey);
    } else if (type === 'drop') {
        eventDataByType.areaTo = event.dropAreaKey === 'choices' ? 'choices' : 'answers';
        eventDataByType.areaFrom = getArea(event.initialDropAreaKey);
    }

    return eventDataByType;
}

/**
 * Trace the interaction
 * @param {Event} e
 * @param {Array} selectedKeys
 * @param {String} suggestedKey
 * @param {String} draggableKey
 * @param {Object} position
 * @returns {Object} eventData
 */
export function traceInteraction(e, selectedKeys, suggestedKey, draggableKey = null, position = null) {
    const target = e.target || (e.detail && e.detail.target) || null;
    const type = mapEventTypeToDomEventType(e.type);
    const eventDataByType = getEventDetails({type, event: e.detail, key: (e.key || e.detail.key), selectedKeys, suggestedKey});

    const eventData = {
        detail: {
            ...(target && { target }),
            domEventType: type,
            qtiChoiceIdentifier: e.detail.draggableKey || draggableKey,
            ...eventDataByType,
            ...(e.detail.position && { position: e.detail.position }),
            ...(position && { position: position })
        }
    };
    return eventData;
}