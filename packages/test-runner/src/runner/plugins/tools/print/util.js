// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Adds print style which will hide content
 * @returns {Node}
 */
export const addHideOnPrintStyle = () => {
    const printStyleTag = document.createElement('style');
    printStyleTag.innerHTML = `@media print { body, .test-runner, .qti-item-container { display: none !important } }`;
    document.head.appendChild(printStyleTag);
    return printStyleTag;
};

/**
 * Adds print style which will show content hidden by `addHideOnPrintStyle`
 * (Overrides `addHideOnPrintStyle`, if both are used simultaneously by different plugins)
 * @returns {Node}
 */
export const addShowOnPrintStyle = () => {
    const printStyleTag = document.createElement('style');
    printStyleTag.innerHTML = `@media print { html body, html .test-runner, html .qti-item-container { display: block !important } }`;
    document.head.appendChild(printStyleTag);
    return printStyleTag;
};

/**
 * Checks which interactions should be printed or hidden, according to config option,
 *  and adds special class `not-printable-interaction` to those which should be hidden.
 * @param {boolean|Array<string>} printInteractions
 * @param {boolean|Array<string>} printPCIs
 * @param {Node} containerEl
 * @param {boolean} toggleOn
 */
export const togglePrintInteractionsClass = (printInteractions, printPCIs, containerEl, toggleOn) => {
    if (printInteractions !== true) {
        const allQtiInteractions = Array.from(
            containerEl.querySelectorAll('.qti-interaction:not(.qti-customInteraction)')
        );
        const exceptQtiSelector = (printInteractions || []).map(i => `.qti-${i}`).join(', ');
        const exceptQtiInteractions = exceptQtiSelector
            ? Array.from(containerEl.querySelectorAll(exceptQtiSelector))
            : [];

        allQtiInteractions.forEach(el => {
            if (!exceptQtiInteractions.includes(el)) {
                //see textReaderInteraction PCI - it has nested 'qti-interaction'...
                if (el.parentElement?.closest('.qti-interaction')) {
                    return;
                }
                //note that `class` may be controlled by svelte reactive expression:
                //  myInteraction.svelte: <div class="qti-interaction {reactiveClassesVar}">
                //  if `reactiveClassesVar` changes, then svelte will recalculate `class` and our chnage will be lost.
                el.classList.toggle('not-printable-interaction', toggleOn);
            }
        });
    }

    if (printPCIs !== true) {
        const allPCIs = Array.from(containerEl.querySelectorAll('.qti-customInteraction'));
        const exceptPCISelector = (printPCIs || [])
            .map(i => `.qti-customInteraction[data-type-identifier="${i}"]`)
            .join(', ');
        const exceptPCIs = exceptPCISelector ? Array.from(containerEl.querySelectorAll(exceptPCISelector)) : [];

        allPCIs.forEach(el => {
            if (!exceptPCIs.includes(el)) {
                el.classList.toggle('not-printable-interaction', toggleOn);
            }
        });
    }
};
