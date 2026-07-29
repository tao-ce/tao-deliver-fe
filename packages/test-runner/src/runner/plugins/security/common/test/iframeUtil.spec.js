// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { createNewIframeObserver, runActionInIframesRecursively, getIframesRecursively } from '../iframeUtil.js';

describe('Security iframeUtil', () => {
    let callbackMock;

    beforeAll(() => {
        // Create a mock callback function
        callbackMock = vi.fn();
    });

    afterEach(() => {
        // Clear the callback mock and disconnect the observer after each test
        callbackMock.mockClear();
        document.body.innerHTML = '';
    });

    it('should call the callback when a new iframe is added', () => {
        // Create a new MutationObserver using createNewIframeObserver
        const observer = createNewIframeObserver(callbackMock);

        // Create a test iframe element
        const iframe = document.createElement('iframe');
        const div = document.createElement('div');

        // MutualObserver is mocked, so we need to call the callback manually
        observer.callback([
            { addedNodes: [iframe, div], removedNodes: [iframe] },
            { addedNodes: [], removedNodes: [div, iframe] }
        ]);

        expect(callbackMock).toHaveBeenCalledTimes(1);
        expect(callbackMock.mock.calls[0][0]).toBe(iframe);
    });

    it('should call action on iframes recursively', () => {
        // Create a test iframe element
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);

        const observer = runActionInIframesRecursively(callbackMock);

        const newIframe = document.createElement('iframe');
        observer.callback([{ addedNodes: [newIframe] }]);

        // it finds the iframe in the body
        expect(callbackMock.mock.calls[0][0]).toBe(iframe);

        // it finds the iframe if is detected by the observer
        expect(callbackMock.mock.calls[1][0]).toBe(newIframe);
    });

    it('getIframesRecursively returns array of all iframes', () => {
        expect(getIframesRecursively()).toEqual([]);

        const iframeA = document.createElement('iframe');
        document.body.appendChild(iframeA);

        const iframeB = document.createElement('iframe');
        document.body.appendChild(iframeB);

        const iframeAA = document.createElement('iframe');
        iframeA.contentDocument.body.appendChild(iframeAA);

        const iframeAB = document.createElement('iframe');
        iframeA.contentDocument.body.appendChild(iframeAB);

        const iframeAAA = document.createElement('iframe');
        iframeAA.contentDocument.body.appendChild(iframeAAA);

        expect(getIframesRecursively()).toEqual([iframeA, iframeAA, iframeAAA, iframeAB, iframeB]);
    });
});
