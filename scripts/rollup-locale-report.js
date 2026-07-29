// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * CLI script which prints translation completeness status for all locales.
 */

const path = require('path');
const glob = require('glob');
const fs = require('fs');
const gettextParser = require('gettext-parser');
const chalk = require('chalk');

// Get the messages count from the default locale (en-US)
function getDefaultMessagesCount() {
    const messagesPotFile = fs.readFileSync(path.join(__dirname, `../packages/deliver-app/locale/messages.pot`));
    const { translations } = gettextParser.po.parse(messagesPotFile);
    return Object.values(translations['']).length - 1; // subtract header
}
const defaultMessagesCount = getDefaultMessagesCount();
console.log(`Messages count for POT: ${defaultMessagesCount}`);

const input = path.join(__dirname, '../packages/deliver-app/locale/**/messages.po');

// Process all the input locales
glob(input, (globError, files) => {
    if (globError) {
        throw globError;
    }
    files.forEach(file => {
        const localeMatch = file.match(/locale\/(.+)\/messages/);
        const locale = localeMatch && localeMatch[1];
        if (!locale) {
            console.warn(`Cannot parse locale for ${file}`);
            return;
        }

        const statsExclusions = ['en-US', 'en-GB', 'en-CA'];
        const isStatsExcluded = statsExclusions.includes(locale);

        const messagesPoFile = fs.readFileSync(file);
        const { translations } = gettextParser.po.parse(messagesPoFile);

        let translated = 0;
        let untranslated = 0;
        Object.values(translations['']).forEach(({ msgid, msgstr }) => {
            if (!msgid.length) {
                return; // omit header
            }
            if (msgstr[0].length) {
                translated++;
            } else {
                untranslated++;
            }
        });
        const missing = defaultMessagesCount - translated - untranslated;
        const percentTranslated = Math.round((100 * translated) / defaultMessagesCount);

        const color = isStatsExcluded || percentTranslated > 90 ? 'green' : percentTranslated > 70 ? 'yellow' : 'red';
        console.log(
            chalk[color](
                `* ${locale}/messages.po: ${translated} translated, ${untranslated} untranslated, ${missing} missing. Completion: ${percentTranslated}%`
            )
        );
    });

    console.log('Untranslated messages? PO files should be merged from CrowdIn or other translators.');
    console.log('Missing translations? Generate latest messages.POT and update individual PO files with it.');
});
