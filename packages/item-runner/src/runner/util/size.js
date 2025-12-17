// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Ensure a given size has a unit
 * @param {string|number} size
 * @param {string} unit - the unit to append to the size
 * @returns {string} the size with a unit or it's original value if falsy
 */
export function withUnit(size, unit = 'px') {
    const isAStringWithoutUnit = typeof size === 'string' && size.length > 0 && `${parseFloat(size)}` === size;
    const isANumber = typeof size === 'number' && !isNaN(size);
    return isANumber || isAStringWithoutUnit ? `${size}${unit}` : size;
}

/**
 * Check if the given size, based on it's unit, is responsive (adapts to the container or the page)
 * @param {string|number} size - the size like '12px' or '50%'
 * @returns {boolean} true if the size uses a responsive unit
 */
export function isResponsive(size) {
    if (size) {
        const responsiveUnits = ['%', 'auto', 'vh', 'vw', 'em', 'rem', 'vmin', 'vmax'];
        const unit = `${size}`.replace(/[0-9 .-]*/, '').trim();
        if(unit){
            return responsiveUnits.includes(unit);
        }
    }
    return false;
}
