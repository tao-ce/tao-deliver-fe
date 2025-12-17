// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Implemented in reviewInteractions
 */
export { default as UploadInteraction } from './upload/UploadInteraction.svelte';
export { default as MediaInteraction } from './media/MediaInteraction.svelte';
export { default as GraphicGapMatchInteraction } from './graphic/graphicGapMatch/GraphicGapMatchInteraction.svelte';
export { default as ExtendedTextInteraction } from './extendedText/ExtendedTextInteraction.svelte';
export { default as CustomInteraction } from './custom/CustomInteraction.svelte';
export { default as TextEntryInteraction } from './textEntry/TextEntryInteraction.svelte';
export { default as InlineChoiceInteraction } from './inlineChoice/InlineChoiceInteraction.svelte';

/**
 * Not implemented in reviewInteractions - resolve to common interactions
 */
export { default as ChoiceInteraction } from '../interactions/choice/ChoiceInteraction.svelte';
export { default as OrderInteraction } from '../interactions/order/OrderInteraction.svelte';
export { default as AssociateInteraction } from '../interactions/associate/AssociateInteraction.svelte';
export { default as HottextInteraction } from '../interactions/hotText/HotTextInteraction.svelte';
export { default as Hottext } from '../interactions/hotText/HotTextToken.svelte';
export { default as GapMatchInteraction } from '../interactions/gapMatch/GapMatchInteraction.svelte';
export { default as MatchInteraction } from '../interactions/match/MatchInteraction.svelte';
export { default as HotspotInteraction } from '../interactions/graphic/hotspot/HotspotInteraction.svelte';
export { default as SelectPointInteraction } from '../interactions/graphic/selectPoint/SelectPointInteraction.svelte';
export { default as GraphicOrderInteraction } from '../interactions/graphic/graphicOrder/GraphicOrderInteraction.svelte';
export { default as SliderInteraction } from '../interactions/slider/SliderInteraction.svelte';
export { default as GraphicAssociateInteraction } from '../interactions/graphic/graphicAssociate/GraphicAssociateInteraction.svelte';
