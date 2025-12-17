// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
export const defaultPin =
    '<svg width="36" height="58" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
    '<path class="outer-line" d="M18 0C8.06 0 0 8.058 0 18c0 2.784.633 5.425 1.763 7.777C1.826 25.91 18 57.6 18 57.6l16.042-31.43A17.912 17.912 0 0036 18c0-9.942-8.058-18-18-18" fill="var(--color-brand-hover)"/>' +
    '<path d="M18 4C10.269 4 4 10.267 4 18c0 2.166.492 4.22 1.371 6.048C5.421 24.152 18 48.8 18 48.8l12.477-24.445A13.932 13.932 0 0032 18c0-7.733-6.267-14-14-14" fill="var(--color-gs-light)"/>' +
    '<circle class="small-circle" fill="var(--color-brand)" cx="18" cy="18" r="3"/>' +
    '<circle class="large-circle" fill="var(--color-brand-hover-invert)" cx="18" cy="18" r="5"/>' +
    '</svg>';
export const selectedPin =
    '<svg width="40" height="64" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M20 0C8.955 0 0 8.953 0 20c0 3.094.703 6.027 1.959 8.64C2.029 28.79 20 64 20 64l17.824-34.922A19.903 19.903 0 0040 20C40 8.953 31.047 0 20 0" fill="var(--color-brand-hover-invert)"/>' +
    '<path d="M20 4C11.164 4 4 11.162 4 20c0 2.475.563 4.822 1.567 6.913C5.623 27.03 20 55.2 20 55.2l14.26-27.938A15.922 15.922 0 0036 20c0-8.838-7.163-16-16-16" fill="var(--color-gs-light)"/>' +
    '<circle fill="var(--color-brand-hover-invert)" cx="20" cy="20" r="5"/>' +
    '</svg>';

export const hitbox = {
    // hitbox dimensions match those of embedded SVG
    width: 40,
    height: 64
};
