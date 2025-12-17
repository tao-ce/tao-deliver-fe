// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const http = require('http');

const app = http.createServer((req, res) => {
    if (req.url.includes('/sw.js')) {
        res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'max-age=60, public' });
        res.end(decodeURIComponent(`{{{sw}}}`));
    } else {
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'max-age=0, private',
            'X-TestRunner-Version': '{{{package_version}}}'
        });
        res.end(`{{{index}}}`);
    }
});

app.listen(process.env.PORT || 3000);

process.on('SIGINT', app.close);
process.on('SIGTERM', app.close);

module.exports = {
    app
};
