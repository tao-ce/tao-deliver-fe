// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const fs = require('fs');
const path = require('path');

const bootstrapDir = path.join(__dirname, '..', 'bootstrap');
const srcDir = path.join(__dirname, '..', 'src');
const packageName = process.env.npm_package_name;
const packageVersion = process.env.npm_package_version;

Promise.all([
    fs.promises.readFile(path.join(bootstrapDir, 'server.tpl.js'), 'utf8'),
    fs.promises.readFile(path.join(srcDir, 'index.html'), 'utf8'),
    fs.promises.readFile(path.join(srcDir, 'sw.js'), 'utf8')
])
    .then(([bootstrap, index, sw]) => {
        const packageNameRegex = /\{\{\{package_name\}\}\}/g;
        const packageVersionRegex = /\{\{\{package_version\}\}\}/g;

        const resolvedSw = sw.replace(packageVersionRegex, packageVersion);

        const resolvedTemplate = bootstrap
            .replace('{{{index}}}', index)
            .replace('{{{sw}}}', encodeURIComponent(resolvedSw))
            .replace(packageNameRegex, packageName)
            .replace(packageVersionRegex, packageVersion);

        fs.writeFile('server.js', resolvedTemplate, err => {
            if (err) {
                console.error(err); /* eslint-disable-line */
                process.exit(-1);
            }
        });
    })
    .catch(e => console.error(e)); /* eslint-disable-line */
