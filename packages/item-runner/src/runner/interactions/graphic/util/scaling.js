// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Get scaling factor to fit container while keeping aspect ratio
 * (By default, doesn't scale more than up to x2)
 * @param {Number} width
 * @param {Number} height
 * @param {Number} containerWidth
 * @param {Number} containerHeight
 * @param {Number} [maximumUpscaling] - default 2; prevent image degradation due to excessive upscaling
 * @returns {Number} scaling factor
 */
export function calculateScalingFactor(width, height, containerWidth, containerHeight, maximumUpscaling = 2) {
    const widthScalingFactor = containerWidth / width;
    const heightScalingFactor = containerHeight / height;

    return maximumUpscaling
        ? Math.min(widthScalingFactor, heightScalingFactor, maximumUpscaling)
        : Math.min(widthScalingFactor, heightScalingFactor);
}

/**
 * Ensure that width & height isn't less than min -
 * scale smallest side up to min and keep aspect ratio for other side
 * @param {Number} width
 * @param {Number} height
 * @param {Number} minSize
 * @returns {Object} size - { width: Number, height: Number }
 */
export function ensureMinSize(width, height, minSize) {
    const aspectRatio = width / height;
    if (aspectRatio < 1) {
        width = Math.max(width, minSize);
        height = width / aspectRatio;
    } else {
        height = Math.max(height, minSize);
        width = height * aspectRatio;
    }
    return { width, height };
}

/**
 * Parses raw coords string and applies given scaling factor to them
 *
 * @param {String} coords
 * @param {Number} [scalingFactor=1]
 * @returns {Number[]}
 */
export function getScaledCoords(coords, scalingFactor = 1) {
    if (typeof coords === 'string') {
        return coords.split(',').map(coord => parseInt(coord, 10) * scalingFactor);
    }
    return [];
}

/**
 * Get the height available to graphic interaction, based on window height
 * (Graphic interaction should fit on screen)
 * @param {Number} windowHeight
 * @returns {Number}
 */
export function getUsableHeight(windowHeight) {
    // TODO: receive external header & footer heights
    return windowHeight * 0.8; // 0.8 is a rough estimate of 'available' height
}
