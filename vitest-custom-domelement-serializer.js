// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { plugins } from '@vitest/pretty-format';
import { vitestSnapshotClassName } from './vitest.config.js';

/**
 * Custom snapshot serializer plugin for Vitest
 * This plugin extends the official DOMElement plugin
 * @see https://vitest.dev/guide/snapshot.html#custom-serializer
 * @see https://github.com/vitest-dev/vitest/blob/main/packages/pretty-format/src/plugins/DOMElement.ts
 */
export default {
    // predicate which determines if this serializer will be used
    test(val) {
        return plugins.DOMElement.test(val);
    },

    // function which serializes DOMElements, cleaning classes and adding body wrapper
    serialize(domElt, config, indentation, depth, refs, printer) {
        // remove unnecessary fixed className for brevity
        domElt.classList?.remove(vitestSnapshotClassName);
        if (domElt.classList?.length === 0) {
            domElt.removeAttribute('class');
        }

        const newDoc = new Document();
        const newDomElt = newDoc.importNode(domElt, true);
        // wrap with a <body> to match old Jest snapshots
        // - assertions like `expect(container).toMatchSnapshot()` will always match this because container is an empty div
        // - assertions like `expect(someOtherElement).toMatchSnapshot()` *might* match, we won't have to mind the extra <body> there
        if (depth === 0 && newDomElt.nodeName?.toLowerCase() === 'div' && newDomElt.classList?.length === 0) {
            const body = newDoc.createElement('body');
            body.appendChild(newDomElt);
            return plugins['DOMElement'].serialize(body, config, indentation, depth, refs, printer);
        }
        return plugins['DOMElement'].serialize(newDomElt, config, indentation, depth, refs, printer);
    }
};
