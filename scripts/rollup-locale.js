// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Converts messages.po to messages.json files in the specified locale folder.
 * Also writes messages.json files into each monorepo package, containing only
 * the translations of that package and its dependencies.
 */

const path = require('path');
const glob = require('glob');
const fs = require('fs');
const gettextParser = require('gettext-parser');

const packagesDir = path.join(__dirname, '../packages');
const input = path.join(__dirname, '../packages/deliver-app/locale/**/messages.po');

// path matchers for PO reference comments
const deliverAppPathRegex = /^\.\.\/[a-zA-Z]/;
const testRunnerSrcPathRegex = /\/test-runner\/src\//;

glob(input, (globError, files) => {
    if (globError) {
        throw globError;
    }
    files.forEach(file => {
        const localeMatch = file.match(/locale\/(.+)\/messages/);
        const locale = localeMatch && localeMatch[1];
        if (!locale) {
            //eslint-disable-next-line no-console
            console.warn(`Cannot parse locale for ${file}`);
            return;
        }

        const translationSubsets = {
            'deliver-app': {
                messages: {}, //translations dictionary for this package
                dir: 'locale' //path where generated translations should be stored, relative to this package
            },
            'test-runner': {
                messages: {},
                dir: 'locale'
            },
            'item-runner': {
                messages: {},
                dir: 'locale'
            }
        };

        const messagesPoFile = fs.readFileSync(file);
        const { translations } = gettextParser.po.parse(messagesPoFile);

        Object.values(translations['']).forEach(({ msgid, msgstr, comments }) => {
            /**
             * Use PO reference comments (refPaths) to assign the PO's translations into multiple subsets:
             * - [deliver-app]: excludes nothing
             * - [test-runner]: excludes deliver-app; contains test-runner, item-runner, oat-sa-* libs
             * - [item-runner]: excludes deliver-app & test-runner; contains item-runner, oat-sa-* libs
             */
            if (comments && comments.reference) {
                const refPaths = comments.reference.split('\n');

                translationSubsets['deliver-app'].messages[msgid] = msgstr[0];

                if (refPaths.some(ref => !deliverAppPathRegex.test(ref))) {
                    translationSubsets['test-runner'].messages[msgid] = msgstr[0];

                    if (refPaths.some(ref => !testRunnerSrcPathRegex.test(ref))) {
                        translationSubsets['item-runner'].messages[msgid] = msgstr[0];
                    }
                }
            }
        });

        // write gathered translations to separate files
        Object.keys(translationSubsets).forEach(packageName => {
            const localeDir = `${packagesDir}/${packageName}/${translationSubsets[packageName].dir}/${locale}`;

            fs.mkdir(localeDir, { recursive: true }, (mkdirError) => {
                if (mkdirError) {
                    throw mkdirError;
                }
                fs.writeFile(
                    `${localeDir}/messages.json`,
                    JSON.stringify(translationSubsets[packageName].messages, null, '\t'),
                    writeError => {
                        if (writeError) {
                            throw writeError;
                        }
                    }
                );
            });
        });
    });
});
