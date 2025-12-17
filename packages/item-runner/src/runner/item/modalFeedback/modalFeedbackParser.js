// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { isEmpty } from 'lodash';

/**
 * From list of all modalFeedbacks existing for this item, get the list of modalFeedbacks that would actually need to be shown.
 * What needs to be shown is calculated on server according to user responses and response proessing rules, and is returned in `itemSession` object.
 * Feedback is defined for interaction, plus interaction can have several feedbacks.
 * @param {Object} feedbacks - key-value dictionary of feedbacks, value includes feeback content & title
 * @param {Object} itemSession - includes info about which of those feedbacks need to be shown
 * @returns {Array<Object>} array of actual feedbacks. Empty if none.
 */
export function getModalFeedbackQueueData(feedbacks, itemSession) {
    const modalQueue = [];
    const modals = Object.values(feedbacks).filter(obj => obj.qtiClass === 'modalFeedback');
    for (const modal of modals) {
        const outcomeId = modal.attributes.outcomeIdentifier;
        const modalId =
            itemSession[outcomeId] && itemSession[outcomeId].base ? itemSession[outcomeId].base.identifier : null;
        //`null` if this feedback didn't match user's response (e.g. feedback should be shown for incorrect response only, and response was correct)
        if (modalId && modalId === modal.attributes.identifier && isNotEmptyModal(modal)) {
            modalQueue.push(modal);
        }
    }
    return modalQueue;
}

/**
 * Convert modalFeedback data to the format which can be then passed to the usual item data parser and then rendered.
 * @param {Object} modal - includes feeback content & title; content can be complex (images, tables, media)
 * @param {Object} compiledItemData - main itemData for the item; feedback will inherit some things from it.
 * @returns {Object} crafted itemData for feedback
 */
export function getModalFeedbackItemData(modal, compiledItemData) {
    //modal is the usual QTI element:
    //  { "qtiClass": "modalFeedback", "attributes": { "title": "hello", ... }, body: "hello {{elem1}}", elements: { "elem1": {... } } }
    //lang & dir are inherited from compiledItemData
    //assets are included in compiledItemData
    //stylesheets for passages are included in compiledItemData, stylesheets for item are inerited from compiledItemData
    const itemDataModal = Object.assign({}, compiledItemData, {
        itemData: Object.assign({}, compiledItemData.itemData, {
            data: Object.assign({}, compiledItemData.itemData.data, {
                body: { body: `{{${modal.serial}}}`, elements: { [modal.serial]: modal } }
            })
        })
    });
    return itemDataModal;
}

/**
 * Check that modal contains any content for display
 * E.g. Modal structure:
 *
 * "i65128b7407ebc": {
 *     "identifier": "feedbackModal_1",
 *     "serial": "i65128b7407ebc",
 *     "qtiClass": "modalFeedback",
 *     "attributes": {
 *         "identifier": "feedbackModal_1",
 *         "outcomeIdentifier": "FEEDBACK_1",
 *         "showHide": "show",
 *         "title": "Great job!"
 *     },
 *     "body": {
 *         "serial": "i65128b7408081",
 *         "body": "\n    <div class=\"x-tao-wrapper x-tao-modalFeedback-positive x-tao-relatedOutcome-RESPONSE\">correct</div>\n  ",
 *         "elements": []
 *     }
 * }
 *
 * @param {{ attributes: { title: string }, body: { body: string, elements: Array }}} modal
 * @returns {Boolean}
 */
export function isNotEmptyModal(modal) {
    const hasTitle = Boolean(modal.attributes.title?.trim());
    const hasBody = isNotEmptyBody(modal.body?.body || '') || !isEmpty(modal.body.elements);
    return hasTitle || hasBody;
}

/**
 * Check if body contains empty html
 *
 * @param {string} body
 * @returns {boolean}
 */
export function isNotEmptyBody(body) {
    const wrappedBody = document.createElement('div');
    wrappedBody.innerHTML = body;
    return Boolean(wrappedBody.textContent.trim());
}
