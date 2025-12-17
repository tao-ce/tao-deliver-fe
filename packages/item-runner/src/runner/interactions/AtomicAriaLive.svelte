<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;

    /**
     * Component allows to reference complex html content in aria-live
     * That html content is rendered outside of aria-live, and is referenced here with the help of '<span aria-labelledby="contentElementId">'
     * (Rendering content svelte components inside atomic aria-live may cause multiple/partial announcements)
     * @property {string} [id] - the element id
     * @property {string} [lang] - the element lang code
     * @property {boolean} assertive - aria-live=assertive or aria-live=polite
     * @property {Object} announcement - the content to announce
     * @property {string} announcement.text - the text content (placeholder %lb), for example '%lb has replaced %lb'
     * @property {string[]} announcement.labelledByParams - the list of replacement for the text
     */
    export let id;
    export let lang;
    export let assertive = true; //aria-live=assertive or aria-live=polite
    //to trigger props change, be sure to change object even if text doesn't change
    export let announcement;

    let container;
    let content = '';
    let counter = 0;
    let timeoutId;

    $: announcement && liveAnnounce(announcement.text, ...(announcement.labelledByParams || []));

    /**
     * Sets the announcement
     * @param {String} text - format string with '%lb' modifier in places where aria-labelledby should be inserted
     * @param {...*} [labelledByParams] - strings containing aria-labelledby id to use in place of %lb modifiers
     */
    function liveAnnounce(text, ...labelledByParams) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        text ||= '';
        const parts = getAnnouncementParts(counter, text, ...labelledByParams);
        content = getAnnouncementHtml(parts);
        ++counter;

        //fix VoiceOver not re-announcing same aria-labelledby span
        //(VoiceOver could be fixed by adding toggle symbol inside span, but that breaks Jaws+FF which won't announce aria-labelledby of that span)
        timeoutId = setTimeout(() => {
            content = '';
        }, 1000);
    }

    /**
     * Prepares announcement by converting it to convenient format,
     * and ensures it's possible to announce same text several times
     * @param {Number} usageCounter - increment for each announcement in this aria-live element (used to allow to repeat same text)
     * @param {String} text - announcement text: format string with '%lb' modifier in places where aria-labelledby should be inserted
     * @param {...*} [labelledByParams] - strings containing aria-labelledby id to use in place of %lb modifiers
     * @returns {String} announcement text splitted into text strings and aria-labelledby link objects
     */
    function getAnnouncementParts(usageCounter, text, ...labelledByParams) {
        const toggle = usageCounter % 2 === 0 ? '' : '\u00A0'; //not needed if setTimeout solution is used to trigger re-announcing

        text = ` ${toggle}${text}`;
        const parts = [];
        text.split('%lb').forEach((str, index) => {
            if (index === 0) {
                str = str.slice(1); //remove ' ' added above
            }
            if (str.length) {
                parts.push(str);
            }
            const labelledBy = labelledByParams[index];
            if (labelledBy) {
                parts.push({
                    labelledBy
                });
                parts.push('\u00A0'); //otherwise NVDA 'chews' announcement of text after aria-labelledBy span
            }
        });
        return parts;
    }

    /**
     * Prepares announcement html that can be rendered
     * (note 1: svelte template rendering with {#each} sometimes results in multiple announcements
     * (note 2: looks like using {#key} instead also works)
     * @param {[String|Object]} parts - announcement text splitted into text strings and aria-labelledby link objects
     * @returns {String} html of announcement, to be inserted in the target aria-live element
     */
    function getAnnouncementHtml(parts) {
        const rootElem = document.createElement('div');
        parts.forEach(part => {
            if (part.labelledBy) {
                const spanElem = document.createElement('span');
                spanElem.setAttribute('aria-labelledby', part.labelledBy);
                spanElem.setAttribute('role', 'text'); //set invalid role to force VoiceOver to announce aria-labelledby on non-interactive element
                rootElem.append(spanElem);
            } else {
                const textElem = document.createTextNode(part);
                rootElem.append(textElem);
            }
        });
        return rootElem.innerHTML;
    }
</script>

<div
    aria-live={assertive ? 'assertive' : 'polite'}
    aria-atomic="true"
    {id}
    {lang}
    class="visually-hidden"
    bind:this={container}>
    {@html content}
</div>
