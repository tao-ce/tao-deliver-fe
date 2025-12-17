// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Keys for settings.
 * Used not only by settings plugin, but in others as well.
 * Should remain a flat list, even if certain entries (e.g. readAloud*, a11y tools)
 * may occur in nested objects elsewhere.
 */
export default {
    choiceElimination: 'choiceElimination',
    choiceAnswerMasking: 'choiceAnswerMasking',
    readAloud: 'readAloud',
    readAloudVoice: 'voice',
    readAloudSpeed: 'speed',
    readAloudPitch: 'pitch',
    pageZoom: 'pageZoom',
    contrastTheme: 'contrastTheme',
    mousePointer: 'mousePointer',
    fontFamily: 'fontFamily',
    fontSize: 'fontSize',
    lineHeight: 'lineHeight',
    letterSpacing: 'letterSpacing',
    wordSpacing: 'wordSpacing',
    letterAndWordSpacing: 'letterAndWordSpacing',
    a11yMenuPanel: 'a11yMenuPanel'
};
