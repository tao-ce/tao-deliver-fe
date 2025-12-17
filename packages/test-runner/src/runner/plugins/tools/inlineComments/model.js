// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { cloneDeep } from 'lodash';

/**
 * Helper to work with inlineComments model - data received from proxy, and data sent to proxy.
 * Model format:
 *
 * itemId: {
 *     responses: {
 *         response1: {
 *             highlights: [{node-path-1, comment-id-1}, {node-path-2, comment-id-2}],
 *             comments: {comment-id-1: text-1, comment-id-2: text-2}
 *         },
 *         response2: {...}
 *     }
 * }
 * @returns {Object}
 */
export function modelHelperFactory() {
    //local cache
    const itemDataModelPerItemRef = {};

    const getModel = itemRef => itemDataModelPerItemRef[itemRef];
    const getModelCopy = itemRef => cloneDeep(itemDataModelPerItemRef[itemRef]);

    /**
     * Create model copy and add new comment to it.
     * Do not persist in local cache yet.
     * @param {Object} args
     * @param {String} args.itemRef
     * @param {String} args.responseId
     * @param {String} args.colorKey
     * @param {String} args.commentValue
     * @param {Object} args.highlighterModel
     * @returns {Object}
     */
    const addComment = ({ itemRef, responseId, colorKey, commentValue, highlighterModel }) => {
        const model = getModelCopy(itemRef);
        if (!model.responses) {
            model.responses = {};
        }
        if (!model.responses[responseId]) {
            model.responses[responseId] = {};
        }
        const pickedModel = model.responses[responseId];
        pickedModel.highlights = highlighterModel;
        if (!pickedModel.comments) {
            pickedModel.comments = {};
        }
        pickedModel.comments[colorKey] = commentValue;
        return model;
    };

    /**
     * Create model copy and update existing comment in it.
     * Do not persist in local cache yet.
     * @param {Object} args
     * @param {String} args.itemRef
     * @param {String} args.responseId
     * @param {String} args.colorKey
     * @param {String} args.commentValue
     * @returns {Object}
     */
    const updateComment = ({ itemRef, responseId, colorKey, commentValue }) => {
        const model = getModelCopy(itemRef);
        model.responses[responseId].comments[colorKey] = commentValue;
        return model;
    };

    /**
     * Create model copy and delete existing comment from it.
     * Do not persist in local cache yet.
     * @param {Object} args
     * @param {String} args.itemRef
     * @param {String} args.responseId
     * @param {String} args.colorKey
     * @param {String} args.highlighterModel
     * @returns {Object}
     */
    const deleteComment = ({ itemRef, responseId, colorKey, highlighterModel }) => {
        const model = getModelCopy(itemRef);
        if (model.responses && model.responses[responseId]) {
            model.responses[responseId].highlights = highlighterModel;
            if (model.responses[responseId].comments) {
                delete model.responses[responseId].comments[colorKey];
                if (Object.keys(model.responses[responseId].comments).length === 0) {
                    delete model.responses[responseId];
                }
                if (Object.keys(model.responses).length === 0) {
                    delete model.responses;
                }
            }
        }
        return model;
    };

    /**
     * Get text of specified comment.
     * @param {Object} args
     * @param {String} args.itemRef
     * @param {String} args.responseId
     * @param {String} args.colorKey
     * @returns {String?}
     */
    const getCommentValue = ({ itemRef, responseId, colorKey }) => {
        const model = getModel(itemRef);
        if (model.responses && model.responses[responseId] && model.responses[responseId].comments) {
            return model.responses[responseId].comments[colorKey];
        }
        return null;
    };

    /**
     * Get highlighterModel of comments of specified interaction.
     * @param {Object} args
     * @param {String} args.itemRef
     * @param {String} args.responseId
     * @returns {String?}
     */
    const getHighlights = ({ itemRef, responseId }) => {
        const model = getModel(itemRef);
        if (model.responses && model.responses[responseId] && model.responses[responseId].highlights) {
            return model.responses[responseId].highlights;
        }
        return null;
    };

    /**
     * Persist model in local cache.
     * Only after proxy call succeeded.
     * @param {Object} args
     * @param {String} args.itemRef
     * @param {String} args.model
     */
    const persistChanges = ({ itemRef, model }) => {
        itemDataModelPerItemRef[itemRef] = model;
    };

    /**
     * Get comments from itemData, and update local cache.
     * local cache has priority, because proxy call won't update comments in local itemData cache
     * @param {Object} args
     * @param {String} args.itemRef
     * @param {String} args.itemData
     */
    const setLocalCopyFromItemData = ({ itemRef, itemData }) => {
        if (!itemDataModelPerItemRef[itemRef]) {
            let data = cloneDeep(itemData?.extraData?.scoring?.comments?.inline) || {};
            //BE may pass empty array instead of empty object
            if (Array.isArray(data) && data.length === 0) {
                data = {};
            }
            itemDataModelPerItemRef[itemRef] = data;
        }
    };

    return {
        addComment,
        updateComment,
        deleteComment,
        getCommentValue,
        getHighlights,
        persistChanges,
        setLocalCopyFromItemData
    };
}
