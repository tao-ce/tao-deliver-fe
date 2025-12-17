// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import commonRenderer from './common.js';
import reviewRenderer from './review.js';

/**
 * @typedef Renderer
 * @type {Object}
 * @property {string} name - name of the renderer
 * @property {() => Object<string, SvelteComponent>} getInteractions
 */

/**
 * @type {Object<string, Renderer>}
 */
const renderers = {
    [commonRenderer.name]: commonRenderer,
    [reviewRenderer.name]: reviewRenderer
};

const defaultRenderer = commonRenderer.name;

/**
 * Alias mapping for particular names.
 * Gives the appropriate renderer based on the IMS view property.
 * Read more about IMS view here:
 * https://www.imsglobal.org/question/qtiv2p2p2/QTIv2p2p2-ASI-InformationModelv1p0/imsqtiv2p2p2_asi_v1p0_InfoModelv1p0.html#FigEnumeratedListClass_DataModel_View
 *
 * @type {Object}
 */
const alias = {
    author: commonRenderer.name,
    candidate: commonRenderer.name,
    proctor: reviewRenderer.name,
    scorer: reviewRenderer.name,
    testConstructor: commonRenderer.name,
    tutor: reviewRenderer.name
};

/**
 * Gets the name of an existing renderer.
 * If the wanted renderer does not exist, it will fallback to the default one.
 * @param {String} name
 * @returns {String}
 */
function getRendererName(name) {
    if (renderers[name]) {
        return name;
    }

    if (alias[name]) {
        return alias[name];
    }

    return defaultRenderer;
}

/**
 * Returns with requested renderer
 * @param {string} rendererName
 * @returns {Renderer}
 */
export const getRenderer = rendererName => {
    const name = getRendererName(rendererName);

    return renderers[name];
};
