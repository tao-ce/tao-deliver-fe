// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Item session status definition based on QTI item lifecycle
 * https://www.imsglobal.org/question/qtiv2p1/imsqti_infov2p1.html#section10055s
 */
export default Object.freeze({
    initial: 'initial',
    interacting: 'interacting',
    suspended: 'suspended',
    closed: 'closed',
    modalFeedback: 'modalFeedback',
    review: 'review',
    solution: 'solution'
});
