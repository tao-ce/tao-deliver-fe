// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const timerModes = Object.freeze({
    /**
     * Client-controlled timers.
     * The time counting is all done on the server, but control lies with the client,
     * which can inform when to start or stop them.
     * The client will receive regular timer updates.
     * In general, the only time we want timers to run is while an item is loaded + open + visible + interactable.
     */
    client: 'client',

    /**
     * Server-controlled timers.
     * They will count down on the server continuously from the moment the delivery is launched.
     * The client will receive regular timer updates.
     * The client cannot stop or pause the timers, even in a timeout or modal situation.
     */
    server: 'server'
});

export default timerModes;
