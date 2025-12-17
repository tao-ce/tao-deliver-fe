<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;

    import { getLocale } from '../util/locale.js';

    /**
     * Component allows to solve multi-language screenreader announcement problem:
     *   text translated using dictionary should use the user (test-taker) language, while item content created by authors should use content language.
     * It is assumed that component is used inside container which has `lang=contentLang` attribute set,
     *   so component adds `lang` to parts that should have the user language
     */

    /**
     * @typedef TextWithParams
     * @example `{ text: '%s associated with %s', params: ['le chat', 'la souris'] }`
     * @property {string} text - format string in user language. Use any of these modifiers: '%s', '%d'
     * @property {Array<string>} params - array of format params in content language
     */
    /**
     * @property {string|TextWithParams} value - string in user language, or format string in user language with params in content language
     * @property {string} [lang] - language code, will be calculated based on browser locale or document lang prop if not set
     */
    export let value;
    export let lang = getLocale();

    const splitByParamsRegexp = /(%s|%d)/g;

    $: partsByLang = getParts(value);

    /**
     * Prepares value for rendering and applies format params to text
     * @returns {Array<String|Object>} parts split by language
     */
    function getParts() {
        if (!value) {
            return [];
        }
        if (typeof value !== 'object') {
            return [value];
        }

        const text = value.text || '';
        const params = value.params || [];
        const parts = [];
        let characterCounter = 0;
        let matchCounter = 0;
        let match;

        while ((match = splitByParamsRegexp.exec(text)) !== null) {
            const textPart = text.substring(characterCounter, match.index);
            if (textPart) {
                parts.push(textPart);
            }

            if (params[matchCounter]) {
                if (match[0] === '%d') {
                    parts.push({ text: Number(params[matchCounter]), noLang: true });
                } else {
                    parts.push({ text: params[matchCounter], noLang: true });
                }
            } else {
                parts.push({ text: match[0], noLang: true });
            }

            characterCounter = match.index + match[0].length;
            matchCounter++;
        }
        const lastTextPart = text.substring(characterCounter);
        if (lastTextPart) {
            parts.push(lastTextPart);
        }

        return parts;
    }
</script>

{#each partsByLang as part}
    {#if part.noLang}
        <slot content={part.text} />
    {:else}
        <span {lang}>
            <slot content={part} />
        </span>
    {/if}
{/each}
