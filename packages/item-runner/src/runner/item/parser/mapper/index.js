// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Expose all mappers
 * TODO: harmonise naming
 */
// components
export { default as mathMapper } from './math.js';
export { default as tableMapper } from './table.js';
export { default as objectMapper } from './object.js';
export { default as figureMapper } from './figure.js';
export { default as modalFeedbackMapper } from './modalFeedback.js';
export { default as _tooltipMapper } from './tooltip.js';
// interactions
export { default as choiceInteractionMapper } from './choice.js';
export { default as orderInteractionMapper } from './choice.js';
export { default as inlineChoiceInteractionMapper } from './inlineChoice.js';
export { default as matchInteractionMapper } from './match.js';
export { default as mediaInteractionMapper } from './media.js';
export { default as gapMatchInteractionMapper } from './gapMatchInteraction.js';
// interactions - graphic
export { default as hotspotInteractionMapper } from './hotspot.js';
export { default as graphicGapMatchInteractionMapper } from './graphicGapMatch.js';
export { default as graphicOrderInteractionMapper } from './graphicOrder.js';
export { default as graphicAssociateInteractionMapper } from './graphicAssociate.js';
export { default as selectPointInteractionMapper } from './selectPoint.js';
// interactions - custom
export { default as customInteractionMapper } from './custom.js';
