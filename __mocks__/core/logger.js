// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const loggerFactory = () => ({
    child: loggerFactory,
    debug: () => {},
    warn: () => {},
    log: () => {},
    trace: () => {},
    error: err => {
        throw err;
    } // ensure failing tests print errors
});

export default loggerFactory;
