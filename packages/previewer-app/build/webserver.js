// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const http = require('http');
const path = require('path');

const connect = require('connect');
const serveStatic = require('serve-static');
const cors = require('cors');

const app = connect();

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use((req, res, next) => {
    // rewrite
    serveStatic(path.join(__dirname, '..', 'dist'))(req, res, next);
});

const port = process.env.PORT || 8011;
new http.createServer(app).listen(port, err => {
    if (err) {
        throw err;
    }
    console.log(`Server is listening on port ${port}`); /* eslint-disable-line */
});
