// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export const disableNavReasons = {
    securityOverlay: 'securityOverlay', // when a security overlay shows
    pciControlsNav: 'pciControlsNav', // when EntryCode or other PCI says so
    proctorWait: 'proctorWait', // when waiting for the proctor
    pendingOps: 'pendingOps', // when there are pending operations (typically at item-runner level, e.g. file uploads)
    guidedNav: 'guidedNav', // when item min timer == item max timer
    overlay: 'overlay', // when another type of overlay shows
    moving: 'moving' // when item is unloaded for navigation
};
