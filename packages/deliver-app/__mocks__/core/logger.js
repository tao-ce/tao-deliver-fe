// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const loggerFactory = () => ({
    child: loggerFactory,
    debug: function () {},
    warn: function () {},
    log: function () {},
    trace: function () {},
    error: function () {}
});

export default loggerFactory;
