// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * @param {Document} doc
 * @returns {HTMLIFrameElement[]}
 */
const getIframes = doc => [...doc.querySelectorAll('iframe')];

/**
 * Observes new iframes and executes the action on them.
 * @param {Window|Iframe} win
 * @param {MutationObserver} observer
 * @param {() => void} callback
 */
const observeIframes = (win, observer, callback) => {
    const contentDocument = win.contentDocument || win.document;

    // If the iframe is not loaded yet or has different domain, we can't access its contentDocument
    if (contentDocument) {
        getIframes(contentDocument).forEach(callback);
        // disconnect is not necessary, because if the iframe is removed, the observer won't listen to it anymore
        observer.observe(contentDocument, { childList: true, subtree: true });
    }
};

/**
 * Creates a new MutationObserver that observes new iframes.
 * @param {() => void} callback
 * @returns {MutationObserver}
 */
export const createNewIframeObserver = callback =>
    new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            Array.from(mutation.addedNodes)
                .filter(({ tagName }) => tagName === 'IFRAME')
                .forEach(callback);
        });
    });

/**
 * Observes new iframes and executes the action on them.
 * @param {() => void} action
 * @returns {MutationObserver}
 */
export const runActionInIframesRecursively = action => {
    let observer;

    const callback = iframe => {
        action(iframe);
        iframe.addEventListener('load', () => {
            observeIframes(iframe, observer, callback);
        });
        observeIframes(iframe, observer, callback);
    };

    // Same observer is used to avoid duplicated listeners
    observer = createNewIframeObserver(callback);

    observeIframes(window, observer, callback);

    return observer;
};

/**
 * Flat list of all iframes on the page, including nested ones
 * @param {Document|null} doc - document where to start looking for iframes
 * @returns {HTMLIFrameElement[]}
 */
export const getIframesRecursively = (doc = null) => {
    doc = doc || document;
    const iframesNested = getIframes(doc).map(iframeEl => {
        if (iframeEl.contentDocument) {
            return [iframeEl, ...getIframesRecursively(iframeEl.contentDocument)];
        } else {
            return iframeEl;
        }
    });
    return iframesNested.flat();
};
