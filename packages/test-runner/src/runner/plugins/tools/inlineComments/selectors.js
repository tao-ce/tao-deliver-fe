// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export const commentBaseClassName = 'tao-comment-txt';
export const commentModeClassName = 'tao-comment-mode';
export const commentsContainerSelector = '.qti-item .qti-extendedTextInteraction .text-container';

/**
 * @returns {HTMLElement[]}
 */
export const getExtendedTextInteractionElements = () =>
    Array.from(document.querySelectorAll('.qti-item .qti-extendedTextInteraction'));

/**
 * @param {String} responseId
 * @returns {String}
 */
export const getExtendedTextInteractionSelector = responseId =>
    `.qti-item .qti-extendedTextInteraction[data-response-id="${responseId}"]`;

/**
 * @param {String} responseId
 * @returns {String}
 */
export const getCommentsContainerSelector = responseId =>
    `${getExtendedTextInteractionSelector(responseId)} .text-container`;

/**
 * @param {String} responseId
 * @param {String?} colorKey
 * @returns {String}
 */
export const getCommentSelector = (responseId, colorKey) => {
    const allCommentsSelector = `${getExtendedTextInteractionSelector(responseId)} .${commentBaseClassName}`;
    return colorKey ? `${allCommentsSelector}[data-color="${colorKey}"]` : allCommentsSelector;
};

/**
 * @param {String} responseId
 * @param {String?} colorKey
 * @returns {HTMLElement[]}
 */
export const getCommentElements = (responseId, colorKey) =>
    Array.from(document.querySelectorAll(getCommentSelector(responseId, colorKey)));

/**
 * @param {HTMLElement} el
 * @returns {String}
 */
export const getResponseIdForElement = el => {
    const interaction = el.closest('.qti-extendedTextInteraction');
    return interaction?.getAttribute('data-response-id');
};
