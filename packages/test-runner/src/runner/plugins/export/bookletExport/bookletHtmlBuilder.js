// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { DeferredPromise } from '@oat-sa-private/tao-item-runner-qtinui/src/runner/interactions/util/promise.js';

const printablePageWidth = 624;
const printablePageHeight = 864;

/**
 * Api to generate booklet html. This html is ready to be converted to *.docx
 * Pass every item that needs to be exported to this api, one-by-one. Item should be currently rendered in item-runner.
 * Then get final booklet html with contents of all items that were passed.
 * @returns {Object} api
 */
export function bookletHtmlBuilderFactory() {
    const bodyContentHtmlArr = [];
    let stimulusesHtmlFromPreviousItem = [];

    const api = {
        /**
         * Add node contents to the booklet.
         * Node is expected to be a currently rendered item from the test.
         * @param {Node} node
         */
        async appendItem(node) {
            const { bodyHtml, stimulusesHtml } = await processBookletFragment(
                document,
                node,
                stimulusesHtmlFromPreviousItem
            );
            if (bodyHtml) {
                bodyContentHtmlArr.push(bodyHtml);
            }
            stimulusesHtmlFromPreviousItem = stimulusesHtml;
        },
        /**
         * Returns full booklet document html
         * @returns {String}
         */
        getResult() {
            return (
                '<html>' +
                '<head>' +
                '  <meta charset="UTF-8">' +
                '  <style>' +
                '    body {font-family: Arial; font-size:11pt;}' +
                '    td,th {border: 1px solid black; border-collapse: collapse;}' +
                '  </style>' +
                '</head>' +
                `<body>${bodyContentHtmlArr.join('<p>&nbsp;</p>')}</body>` +
                '</html>'
            );
        }
    };
    return api;
}

/**
 * Generate a piece of booklet: return 'booklet-ready' html representation of specified node in the document.
 * 'Booklet-ready' means it is ready to be passed to *.docx conversion tool.
 * @param {Document} originalDocument - may be iframe contentDocument, so not necessary main page document
 * @param {Node?} inlineNode - node inside `originalDocument` which should be processed. If null, `body` is processed.
 * @param {Array<String>?} stimulusesHtmlFromPreviousItem - stimuluses from previous item, which were saved from when previous item was processed
 * @param {Boolean} isNestedCall - for internal recursion calls when processing iframes
 * @returns {Object} - `{ bodyHtml: String, stimulusesHtml: Array<string> }`
 */
async function processBookletFragment(
    originalDocument,
    inlineNode,
    stimulusesHtmlFromPreviousItem,
    isNestedCall = false
) {
    const rootNodeToInline = inlineNode || originalDocument.body;
    const newFragment = new DocumentFragment();

    //create a copy that will be transformed, and a map with references to original nodes
    let fragmentByOriginal = new Map();
    const originalByFragment = new Map();
    fragmentByOriginal.set(rootNodeToInline, newFragment);
    originalByFragment.set(newFragment, rootNodeToInline);

    const creatorWalker = originalDocument.createTreeWalker(
        rootNodeToInline,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
    );
    while (creatorWalker.nextNode()) {
        const node = creatorWalker.currentNode;
        if (
            node.nodeName === 'STYLE' ||
            node.nodeName === 'LINK' ||
            node.nodeName === 'SCRIPT' ||
            node.nodeName === 'META' ||
            node.nodeName === 'TITLE'
        ) {
            continue;
        }
        const fragmentNode = node.cloneNode(false);
        if (node.nodeType === Node.ELEMENT_NODE) {
            fragmentByOriginal.set(node, fragmentNode);
            originalByFragment.set(fragmentNode, node);
        }
        const fragmentParentNode = fragmentByOriginal.get(node.parentNode);
        if (fragmentParentNode) {
            fragmentParentNode.append(fragmentNode);
        }
    }

    //we have built a copy synchroniously, now can take time to make various modifications.
    fragmentByOriginal.clear();
    fragmentByOriginal = null;
    const removeReplaceList = [];

    const modifierWalker = originalDocument.createTreeWalker(newFragment, NodeFilter.SHOW_ELEMENT);
    while (modifierWalker.nextNode()) {
        const fragmentNode = modifierWalker.currentNode;
        const originalNode = originalByFragment.get(fragmentNode);

        removeHiddenElementFromQtiInteractions(fragmentNode, originalNode, document, removeReplaceList);
        preserveSupportedStyles(fragmentNode, originalNode);
        await appendBackgroundImage(fragmentNode, originalNode, document);

        await inlineImage(fragmentNode, originalNode, document);
        await mathjaxToPng(fragmentNode, originalNode, document, removeReplaceList);
        await removeSvgAppendItsImages(fragmentNode, originalNode, document, removeReplaceList);
        await inlineIframe(fragmentNode, originalNode, document, removeReplaceList);
    }
    //outside because can't modify tree while it's being walked
    //for nodes that were removed/replaced, we didn't actually need to walk their children, but should be no harm in walking either
    removeReplaceList.forEach(([fragmentNode, replacementNode]) => {
        if (replacementNode) {
            fragmentNode.replaceWith(replacementNode);
        } else {
            fragmentNode.remove();
        }
    });
    //more transformations, now outside of walker
    transformRadiosAndCheckboxes(newFragment, document);
    transformMultilineTextEditors(newFragment, document);
    transformTextInputs(newFragment, document, originalByFragment);
    transformDropdowns(newFragment, document, originalByFragment);
    removeMediaElements(newFragment);
    cleanLinkHrefs(newFragment);

    //stimulus transformation and final cleanup is for root level only (for item, not nested PCI iframes)
    let stimulusesHtml;
    if (!isNestedCall) {
        stimulusesHtml = reorderStimuluses(newFragment, originalDocument, stimulusesHtmlFromPreviousItem);
        cleanAttributesInContent(newFragment, originalDocument);
    }

    //get result
    const tempEl = document.createElement('div');
    tempEl.append(newFragment);
    return { bodyHtml: tempEl.outerHTML, stimulusesHtml };
}

/**
 * Remove node attributes which are no longer needed
 * (Not required, just nice to have for PCI shared-stimulus comparison. Even repeated `id`s don't cause any problems.)
 * @param {Node} node
 * @param {Document} doc
 */
function cleanAttributesInContent(node, doc) {
    const cleanerWalker = doc.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
    while (cleanerWalker.nextNode()) {
        const currentNode = cleanerWalker.currentNode;
        let toRemove;
        for (const attr of currentNode.attributes) {
            if (
                attr.name === 'id' ||
                attr.name === 'class' ||
                attr.name === 'tabindex' ||
                attr.name.startsWith('aria-') ||
                attr.name.startsWith('on') ||
                attr.name.startsWith('data-')
            ) {
                if (!toRemove) {
                    toRemove = [];
                }
                toRemove.push(attr.name);
            }
        }
        if (toRemove) {
            for (const attrName of toRemove) {
                currentNode.attributes.removeNamedItem(attrName);
            }
        }
    }
}

/**
 * Get QTI Interaction parent. Returns `null` if inside PCI.
 * @param {Node} originalNode
 * @returns {Node?}
 */
function findQtiInteractionIfInside(originalNode) {
    const interactionElem = originalNode.closest('.qti-interaction');
    return interactionElem && !interactionElem.classList.contains('qti-customInteraction') ? interactionElem : null;
}

/**
 * Get node children except blank-character-only text nodes
 * Note: can't just remove blank text nodes, because then spacing between adjacent `<span>` elements will dissappear and exported text will be corrupted.
 * @param {Node} node
 * @returns {Node[]}
 */
function getChildNodesWithoutEmptyTextNodes(node) {
    return Array.from(node.childNodes).filter(nd => nd.nodeType !== Node.TEXT_NODE || !isTextNodeEmpty(nd));
}

/**
 * If text node consists only of blank characters (space/tab/line-break)
 * @param {*} textNode
 * @returns {Boolean}
 */
function isTextNodeEmpty(textNode) {
    return !/\S/.test(textNode.nodeValue);
}

/**
 * Get node parents as array
 * @param {Node} node
 * @param {Node?} stopAtNode - until this parent node; it's included in the result
 * @returns {Node[]}
 */
function getParentsUntil(node, stopAtNode = null) {
    const parents = [];
    let currentNode = node;
    while (currentNode && stopAtNode !== currentNode) {
        currentNode = currentNode.parentElement;
        parents.push(currentNode);
    }
    return parents;
}

/**
 * Load url and convert its content to base64 data url
 * @param {String} url
 * @returns {Promise<String>}
 */
async function assetToDataURL(url) {
    return fetch(url)
        .then(response => response.blob())
        .then(
            blob =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                })
        );
}

/**
 * Ensure image is loaded, to be able to measure its naturalWidth/naturalHeight
 * @param {Node} imageNode
 */
async function awaitNaturalSizeOfImage(imageNode) {
    let imageLoadDeferred = new DeferredPromise();
    imageNode.onload = () => {
        imageLoadDeferred.resolve();
    };
    imageNode.onerror = err => {
        imageLoadDeferred.reject(err);
    };
    if (imageNode.complete) {
        if (imageNode.naturalWidth && imageNode.naturalHeight) {
            imageLoadDeferred.resolve();
        } else {
            imageLoadDeferred.reject(new Error('svg image asset without size, maybe loading error'));
        }
    }
    await imageLoadDeferred.promise;
    imageNode.onload = null;
    imageNode.onerror = null;
}

/**
 * Convert *.svg image asset to *.png, because Word doesn't render svgs
 * (*.svg is already transformed to base64 data url)
 * @param {Node} imageNode
 * @param {Document} doc
 */
async function convertSvgImageAssetToPng(imageNode, doc) {
    const isSvgImageSrc = imageNode && (imageNode.getAttribute('src') || '').startsWith('data:image/svg');
    if (isSvgImageSrc) {
        await awaitNaturalSizeOfImage(imageNode);
        imageNode.setAttribute('width', imageNode.naturalWidth);
        imageNode.setAttribute('height', imageNode.naturalHeight);

        const canvas = doc.createElement('canvas');
        //*2 is an attempt to increase quality. Svg is vector graphics, so quality becomes noticeably worse after export
        canvas.width = imageNode.naturalWidth * 2;
        canvas.height = imageNode.naturalHeight * 2;
        const canvasCtx = canvas.getContext('2d');
        canvasCtx.imageSmoothingQuality = 'high'; //seems useless
        canvasCtx.drawImage(imageNode, 0, 0, canvas.width, canvas.height);

        const pngDataUrl = canvas.toDataURL('image/png');
        imageNode.setAttribute('src', pngDataUrl);
    }
}

/**
 * Convert `<img>` source to the base64 data url, to inline asset inside document.
 * Restrict its size to no go over width/height of printable page.
 * Keep wrap-left/wrap-right style.
 * @param {Node} imageNode
 * @param {String} originalSrc
 * @param {Node?} originalImageNode - if it existed
 * @param {Document} doc
 */
async function inlineImageUsingSrc(imageNode, originalSrc, originalImageNode, doc) {
    if (originalSrc) {
        if (!originalSrc.startsWith('data:')) {
            const fragmentSrc = await assetToDataURL(originalSrc);
            imageNode.setAttribute('src', fragmentSrc);
        } else {
            imageNode.setAttribute('src', originalSrc);
        }
        await convertSvgImageAssetToPng(imageNode, doc);

        let isWrapped = false;
        const figureNode = originalImageNode?.closest('figure');
        const styleContainerNode = figureNode || originalImageNode;
        if (styleContainerNode?.classList.contains('wrap-left')) {
            imageNode.setAttribute('align', 'left');
            imageNode.setAttribute('hspace', '16');
            isWrapped = true;
        } else if (styleContainerNode?.classList.contains('wrap-right')) {
            imageNode.setAttribute('align', 'right');
            imageNode.setAttribute('hspace', '16');
            isWrapped = true;
        }

        let imageWidth, imageHeight;
        if (originalImageNode) {
            await awaitNaturalSizeOfImage(originalImageNode);
            const computedStyle = getComputedStyle(originalImageNode);
            imageWidth = parseInt(computedStyle.getPropertyValue('width'));
            imageHeight = parseInt(computedStyle.getPropertyValue('height'));
        }
        if (!imageWidth) {
            if (!imageNode.getAttribute('width')) {
                await awaitNaturalSizeOfImage(imageNode);
                imageWidth = imageNode.naturalWidth;
                imageHeight = imageNode.naturalHeight;
            } else {
                //`convertSvgImageAssetToPng` did already set `width` attribute, and its natural size is 2x of original
                imageWidth = parseInt(imageNode.getAttribute('width'));
                imageHeight = parseInt(imageNode.getAttribute('height'));
            }
        }

        const ratio = Math.max(
            1,
            Math.max(
                imageWidth / (printablePageWidth * (isWrapped ? 0.75 : 1)),
                imageHeight / (printablePageHeight * (isWrapped ? 0.75 : 1))
            )
        );
        imageNode.setAttribute('width', Math.trunc(imageWidth / ratio));
        imageNode.setAttribute('height', Math.trunc(imageHeight / ratio));
    }
}

/**
 * Convert `<img>` source to the base64 data url, to inline asset inside document
 * @param {Node} fragmentNode
 * @param {Node} originalNode
 * @param {Document} doc
 */
async function inlineImage(fragmentNode, originalNode, doc) {
    if (originalNode && originalNode.nodeName === 'IMG') {
        const originalSrc = originalNode.getAttribute('src');
        await inlineImageUsingSrc(fragmentNode, originalSrc, originalNode, doc);
    }
}

/**
 * Extract background image to the standard `<img>`
 * @param {Node} fragmentNode
 * @param {Node} originalNode
 * @param {Document} doc
 */
async function appendBackgroundImage(fragmentNode, originalNode, doc) {
    if (originalNode && originalNode.nodeType === Node.ELEMENT_NODE) {
        const nodeComputedStyle = getComputedStyle(originalNode);
        const backgroundImageStyle = nodeComputedStyle.getPropertyValue('background-image');
        if (backgroundImageStyle && !originalNode.closest('select')) {
            const additionalNode = doc.createElement('div');
            const backgroundImageSrcRegex = /url\(\s*["'](.+?)["']\s*\)/g;
            for (const [, originalSrc] of Array.from(backgroundImageStyle.matchAll(backgroundImageSrcRegex))) {
                const newImgWrapperNode = doc.createElement('div');
                const newImgNode = doc.createElement('img');
                newImgWrapperNode.append(newImgNode);
                additionalNode.append(newImgWrapperNode);
                await inlineImageUsingSrc(newImgNode, originalSrc, null, doc);
            }
            if (additionalNode.childNodes.length) {
                //ok to not include it in `removeReplaceList` - doesn't matter if these childNodes will be walked or not (but in fact they will be walked)
                fragmentNode.after(additionalNode);
            }
        }
    }
}

/**
 * Convert MathJax to an image.
 * Assuming that MathJax is rendered as `<svg>` element (`MathJax.mathml2svg`)
 * @param {Node} fragmentNode
 * @param {Node} originalNode
 * @param {Document} doc
 * @param {Array<[Node, Node?]>} removeReplaceList
 */
async function mathjaxToPng(fragmentNode, originalNode, doc, removeReplaceList) {
    if (originalNode && originalNode.nodeName === 'mjx-container'.toUpperCase()) {
        const svgHtml = originalNode.children[0].outerHTML;
        const svgImageBlobUrl = URL.createObjectURL(new Blob([svgHtml], { type: 'image/svg+xml' }));
        const svgImageDataUrl = await assetToDataURL(svgImageBlobUrl);

        const imageNode = doc.createElement('img');
        imageNode.src = svgImageDataUrl;

        await convertSvgImageAssetToPng(imageNode, doc);
        removeReplaceList.push([fragmentNode, imageNode]);
    }
}

/**
 * Remove `<svg>` because it can't be read by Word anyway
 * But if it had image assets, extract them to the standard `<img>`
 * @param {Node} fragmentNode
 * @param {Node} originalNode
 * @param {Document} doc
 * @param {Array<[Node, Node?]>} removeReplaceList
 */
async function removeSvgAppendItsImages(fragmentNode, originalNode, doc, removeReplaceList) {
    if (originalNode && originalNode.nodeName === 'svg') {
        const replacementNode = doc.createElement('div');
        for (const imageSvgNode of originalNode.querySelectorAll('image')) {
            const originalSrc = imageSvgNode.getAttribute('href');
            if (originalSrc) {
                const newImgWrapperNode = doc.createElement('div');
                const newImgNode = doc.createElement('img');
                newImgWrapperNode.append(newImgNode);
                replacementNode.append(newImgWrapperNode);
                await inlineImageUsingSrc(newImgNode, originalSrc, null, doc);
            }
        }
        if (replacementNode.childNodes.length) {
            removeReplaceList.push([fragmentNode, replacementNode]);
        } else {
            removeReplaceList.push([fragmentNode, null]);
        }
    }
}

/**
 * From `<a>`, remove `href` which will be meanigless after booklet transformations
 * (Not required, just nice to have for PCI shared-stimulus comparison)
 * @param {DocumentFragment} newFragment
 */
function cleanLinkHrefs(newFragment) {
    for (const fragmentNode of newFragment.querySelectorAll('a')) {
        const href = fragmentNode.getAttribute('href');
        if (href && (href.startsWith('blob:') || href.startsWith('#'))) {
            fragmentNode.removeAttribute('href');
        }
    }
}

/**
 * Extract content of `<iframe>`, so they can be appended to the usual `<div>` in the root document
 * @param {Node} fragmentNode
 * @param {Node} originalNode
 * @param {Document} doc
 * @param {Array<[Node, Node?]>} removeReplaceList
 */
async function inlineIframe(fragmentNode, originalNode, doc, removeReplaceList) {
    if (originalNode && originalNode.nodeName === 'IFRAME') {
        const { bodyHtml: replacementBodyHtml } = await processBookletFragment(
            originalNode.contentDocument,
            null,
            null,
            true
        );
        const replacementNode = doc.createElement('div');
        if (originalNode.id) {
            //will be used to detect PCI stimulus later
            replacementNode.setAttribute('data-original-iframe-id', originalNode.id);
        }
        replacementNode.innerHTML = replacementBodyHtml;
        removeReplaceList.push([fragmentNode, replacementNode]);
    }
}

/**
 * Hidden elements from QTI interactions will be removed
 * PCI hidden elements are not removed because they may contain meaningful content
 * But QTI hidden elements only contain accessibility texts (at the moment)
 * @param {Node} fragmentNode
 * @param {Node} originalNode
 * @param {Document} doc
 * @param {Array<[Node, Node?]>} removeReplaceList
 */
function removeHiddenElementFromQtiInteractions(fragmentNode, originalNode, doc, removeReplaceList) {
    if (originalNode && originalNode.nodeType === Node.ELEMENT_NODE) {
        const nodeComputedStyle = getComputedStyle(originalNode);
        let isHidden = nodeComputedStyle.getPropertyValue('display') === 'none';
        if (!isHidden) {
            isHidden = originalNode.classList.contains('visually-hidden');
        }
        if (isHidden) {
            const qtiInteractionIfInside = findQtiInteractionIfInside(originalNode);
            if (qtiInteractionIfInside && !qtiInteractionIfInside.classList.contains('qti-inlineChoiceInteraction')) {
                removeReplaceList.push([fragmentNode, null]);
            }
        }
    }
}

/**
 * QTI MediaInteraction and `<audio/video/object>` elements will be removed
 * @param {DocumentFragment} newFragment
 */
function removeMediaElements(newFragment) {
    const mediaEls = newFragment.querySelectorAll('audio, video, object, .qti-mediaInteraction > .player');
    for (const mediaEl of mediaEls) {
        mediaEl.remove();
    }
}

/**
 * Remove existing inline styles. Existing css blocks should be removed elsewhere.
 * But keep several styles that were requested, and inline them if declaration is in css block:
 * - italic/bold/underline
 * - text-align
 * - font-family
 * @param {Node} fragmentNode
 * @param {Node} originalNode
 */
function preserveSupportedStyles(fragmentNode, originalNode) {
    if (originalNode && originalNode.nodeType === Node.ELEMENT_NODE) {
        //remove existing styles so they don't get in the way
        fragmentNode.removeAttribute('style');
        fragmentNode.removeAttribute('width');
        fragmentNode.removeAttribute('height');

        const nodeComputedStyle = getComputedStyle(originalNode);
        const parentComputedStyle = getComputedStyle(originalNode.parentElement);

        const preserveStyle = (stylePropKey, matchingValueCallback, inherited = true, applyCallback = null) => {
            const nodeStylePropValue = nodeComputedStyle.getPropertyValue(stylePropKey);
            const parentStylePropValue = parentComputedStyle.getPropertyValue(stylePropKey);
            const nodeMatchingValue = matchingValueCallback(nodeStylePropValue);
            const parentMatchingValue = matchingValueCallback(parentStylePropValue);
            const needToApply = nodeMatchingValue && (!inherited || nodeMatchingValue !== parentMatchingValue);
            if (needToApply) {
                if (!applyCallback) {
                    fragmentNode.style[stylePropKey] = nodeMatchingValue;
                } else {
                    applyCallback(nodeMatchingValue);
                }
            }
        };

        //italic
        preserveStyle('font-style', v => {
            if (v === 'italic' || v === 'oblique') {
                return 'italic';
            }
            return 'normal';
        });
        //bold
        preserveStyle('font-weight', v => {
            if (v === 'bold' || v === 'bolder' || v === '700' || v === '800' || v === '900') {
                return 'bold';
            }
            return 'normal';
        });
        //underline & line-through
        //  other(-line, -style, wavy, dotted overline, ...) are not supported
        preserveStyle(
            'text-decoration-line',
            v => {
                if (v === 'underline' || v === 'line-through') {
                    return v;
                }
                return null;
            },
            false,
            matchingV => {
                fragmentNode.style['text-decoration'] = matchingV;
            }
        );
        //text-align
        //  start/end is not supported
        preserveStyle('text-align', v => {
            if (v === 'left' || v === 'start') {
                return 'left';
            } else if (v === 'right' || v === 'end') {
                return 'right';
            } else if (v === 'center' || v === 'justify') {
                return v;
            }
            return 'left';
        });
        //font-family:
        //  if several are isted("Nunito Sans", Arial), uses backup font so should be ok.But Word downloads 'Nunito Sans' when opened second time ?
        //  also, instead of "Times New Roman", Calibri is applied. It recognizes only "TimesNewRoman". But 'Trebuchet MS' is ok.
        preserveStyle('font-family', v => v);
    }
}

/**
 * QTI ChoiceInteraction, radio and checkbox groups with the same `name`, will be transformed to A/B/C/D table
 * Single radios & checkboxes will be repalced with unicode icons, because native elements are difficult to edit in Word
 * @param {DocumentFragment} newFragment
 * @param {Document} doc
 */
function transformRadiosAndCheckboxes(newFragment, doc) {
    const allRadiosSortedByName = Array.from(newFragment.querySelectorAll('input[type="radio"]'))
        .filter(a => a.name)
        .sort((a, b) => a.name.localeCompare(b.name));
    const allCheckboxesSortedByName = Array.from(newFragment.querySelectorAll('input[type="checkbox"]'))
        .filter(a => a.name)
        .sort((a, b) => a.name.localeCompare(b.name));
    const allRadiosThenCheckboxesSortedByName = allRadiosSortedByName.concat(allCheckboxesSortedByName);
    const radioGroups = [];
    for (const radio of allRadiosThenCheckboxesSortedByName) {
        const name = radio.name;
        if (!radioGroups.length || name !== radioGroups[radioGroups.length - 1][0].name) {
            radioGroups.push([]);
        }
        radioGroups[radioGroups.length - 1].push(radio);
    }

    for (const radioGroup of radioGroups) {
        const qtiInteractionIfInside = findQtiInteractionIfInside(radioGroup[0]);
        const isQtiChoiceInteraction =
            qtiInteractionIfInside && qtiInteractionIfInside.classList.contains('qti-choiceInteraction');
        let unrecognizedStructure = false;
        let optionsContentNodes = [];

        //do not tranform single radios/checkboxes - because not sure how they should look
        if (radioGroup.length > 1) {
            for (let idx = 0; idx < radioGroup.length; idx++) {
                const radio = radioGroup[idx];
                let radioLabel;
                if (isQtiChoiceInteraction) {
                    const radioListItem = radio.closest('li');
                    radioLabel =
                        radioListItem &&
                        (radioListItem.querySelector('.choice-content') ||
                            radioListItem.querySelector('.image-container'));
                    unrecognizedStructure = !radioLabel;
                } else {
                    const radioId = radio.getAttribute('id');
                    radioLabel = radioId ? newFragment.querySelector(`label[for="${radioId}"`) : null;
                    //only 'known' case is supported at the moment.
                    //   because what if radio and its label are already in different cells of already existing table?
                    //   or if parent is a <span> - can we insert a table inisde it then?
                    //   or if there is some unrelated text in-between?
                    unrecognizedStructure = !(radioId && radioLabel && radio.parentElement.nodeName === 'DIV');
                    if (!unrecognizedStructure) {
                        //OK: <div><input><label></div> <div><input><label></div>
                        //OK: <div><div><input><label></div></div> <div><div><input><label></div></div>
                        //OK: <div><div><div><input><label></div></div></div> <div><div><div><input><label></div></div></div>
                        let parentEl = radio.parentElement;
                        let prevParentEl = idx > 0 ? radioGroup[idx - 1].parentElement : null;
                        while (parentEl) {
                            //check that this parent has no other content beisides radio & label
                            const parentChildNodes = getChildNodesWithoutEmptyTextNodes(parentEl);
                            if (
                                (parentEl !== radio.parentElement && parentChildNodes.length > 1) ||
                                (parentEl === radio.parentElement &&
                                    (parentChildNodes.length > 2 || !parentChildNodes.includes(radioLabel)))
                            ) {
                                unrecognizedStructure = true;
                                break;
                            }
                            //check that between adjacent parents there's no other content
                            const parentParentChildNodes = getChildNodesWithoutEmptyTextNodes(parentEl.parentElement);
                            if (
                                !prevParentEl ||
                                (parentParentChildNodes.indexOf(prevParentEl) >= 0 &&
                                    parentParentChildNodes.indexOf(parentEl) ===
                                        parentParentChildNodes.indexOf(prevParentEl) + 1)
                            ) {
                                break; //supported format
                            }
                            parentEl = parentEl.parentElement;
                            prevParentEl = prevParentEl ? prevParentEl.parentElement : null;
                        }
                    }
                }

                if (unrecognizedStructure) {
                    break;
                } else {
                    optionsContentNodes.push(radioLabel.childNodes);
                }
            }
        }

        if (!unrecognizedStructure) {
            const table = createAlphabeticOptionsTable(optionsContentNodes, doc);
            if (table) {
                if (isQtiChoiceInteraction) {
                    const toReplace = radioGroup[radioGroup.length - 1].closest('ol, ul');
                    if (toReplace) {
                        toReplace.replaceWith(table);
                    }
                } else {
                    radioGroup[radioGroup.length - 1].parentElement.after(table);
                    for (const radio of radioGroup) {
                        radio.parentElement.remove();
                    }
                }
            }
        }
    }

    //replace all remaining radios with unicode symbols (because it's difficult to edit/remove native input, especially if inside table cell)
    const remainingRadios = Array.from(newFragment.querySelectorAll('input[type="radio"]'));
    for (const radio of remainingRadios) {
        const replacementNode = doc.createElement('span');
        replacementNode.innerHTML = '&nbsp;◯&nbsp;';
        radio.replaceWith(replacementNode);
    }
    const remainingCheckboxes = Array.from(newFragment.querySelectorAll('input[type="checkbox"]'));
    for (const checkbox of remainingCheckboxes) {
        const replacementNode = doc.createElement('span');
        replacementNode.innerHTML = '&nbsp;▢&nbsp;';
        checkbox.replaceWith(replacementNode);
    }
}

/**
 * Create a table with A/B/C/D index in one column, and content in another column
 * Useful for transforming elements with options, like radio/checkbox groups or dropdowns
 * @param {Array<Node>} optionsContentNodes
 * @param {Document} doc
 * @returns {Node?} table, or null if no options to add
 */
function createAlphabeticOptionsTable(optionsContentNodes, doc) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const table = doc.createElement('table');
    const tbody = doc.createElement('tbody');
    table.append(tbody);

    for (let idx = 0; idx < optionsContentNodes.length; idx++) {
        const tr = doc.createElement('tr');
        const tdIndex = doc.createElement('td');
        const tdContent = doc.createElement('td');
        tr.append(tdIndex);
        tr.append(tdContent);
        tbody.append(tr);
        tdIndex.style.border = 'none';
        tdContent.style.border = 'none';

        tdIndex.textContent = alphabet[idx % alphabet.length].repeat(Math.trunc(idx / alphabet.length) + 1); //A,B,..Z,AA,BB,...
        if (idx === 0) {
            tdIndex.style.width = '40px';
        }

        const optionContentNodes = Array.from(optionsContentNodes[idx]);
        for (const contentNode of optionContentNodes) {
            //QTI ChoiceInteraction *sometimes* adds unnecessary <p> wrapper because of some editing issue in Authoring
            let contentToAppend = contentNode;
            if (contentNode.nodeName === 'P' && !contentNode.style.length) {
                const contentChildNodes = getChildNodesWithoutEmptyTextNodes(contentNode);
                if (contentChildNodes.length === 1 && contentChildNodes[0].nodeType === Node.TEXT_NODE) {
                    contentToAppend = contentChildNodes[0];
                }
            }
            tdContent.append(contentToAppend);
        }
    }

    return tbody.childNodes.length ? table : null;
}

/**
 * QTI ExtendedTextInteraction and `<textarea>` elements
 * will be transformed to `....` string with some empty paragrahs below,
 * @param {DocumentFragment} newFragment
 * @param {Document} doc
 */
function transformMultilineTextEditors(newFragment, doc) {
    const multilineTextEditors = newFragment.querySelectorAll(
        'textarea, .ck-editor, div[contenteditable="true"], .mathEntryInteraction .math-entry'
    );
    for (const editorEl of multilineTextEditors) {
        const replacement = doc.createElement('div');
        let replacementHtml = `<p>${'.'.repeat(70)}</p>`;
        const rowsLength = 5;
        for (let idx = 0; idx < rowsLength; idx++) {
            replacementHtml += '<p>&nbsp;</p>';
        }
        replacement.innerHTML = replacementHtml;
        editorEl.replaceWith(replacement);
    }
}

/**
 * QTI TextEntryInteraction and `<input[type="text"]>` elements
 *  will be transformed to `....` string, respecting the width of original input
 * @param {DocumentFragment} newFragment
 * @param {Document} doc
 * @param {Map<Node,Node>} originalByFragment
 */
function transformTextInputs(newFragment, doc, originalByFragment) {
    const textInputs = newFragment.querySelectorAll('input[type="text"]');
    for (const inputEl of textInputs) {
        const originalInputEl = originalByFragment.get(inputEl);

        const paragraphParent = inputEl.closest('p');
        if (paragraphParent) {
            paragraphParent.style.lineHeight = '150%';
        }

        const replacement = createDotsElement(originalInputEl, doc);
        inputEl.replaceWith(replacement);
    }
}

/**
 * QTI SelectChoiceInteraction and `<select>` elements
 * will be transformed to `....` string, same as to text-input.
 * Dropdown options will simply disappear.
 * But even if we left native `select`, it's text from its options can't be copied in Word either
 * @param {DocumentFragment} newFragment
 * @param {Document} doc
 */
function transformDropdowns(newFragment, doc) {
    const dropdowns = newFragment.querySelectorAll('select, .qti-inlineChoiceInteraction');

    for (const dropdown of dropdowns) {
        let optionsContentNodes;
        if (dropdown.nodeName === 'SELECT') {
            optionsContentNodes = Array.from(dropdown.querySelectorAll('option')).map(optionEl => optionEl.childNodes);
        } else {
            //qti-inlineChoiceInteraction
            optionsContentNodes = Array.from(dropdown.querySelectorAll('[role="option"]:not(.blank)')).map(
                optionEl => optionEl.childNodes
            );
        }
        const table = createAlphabeticOptionsTable(optionsContentNodes, doc);

        if (table) {
            dropdown.replaceWith(table); //seems fine even if parent is 'phrasing content' (`<span> or <p>`)
        } else {
            dropdown.remove(); //should be safe because means it had no options, or single 'leave blank' option.
        }
    }
}

/**
 * Creates a `<span>` node with '....' text
 * @param {Node?} originalElWithWidth - as many dots as will match the width of this element
 * @param {Document} doc
 * @returns {Node}
 */
function createDotsElement(originalElWithWidth, doc) {
    let dotsLength = 20;
    if (originalElWithWidth && originalElWithWidth.offsetWidth) {
        dotsLength = Math.max(5, Math.trunc(originalElWithWidth.offsetWidth / 4)); //one dot is ~4px.
    }
    const replacement = doc.createElement('span');
    replacement.innerHTML = '.'.repeat(dotsLength);
    return replacement;
}

/**
 * Transformations for shared stimulus
 * @param {DocumentFragment} newFragment
 * @param {Document} doc
 * @param {Array<String>?} stimulusesHtmlFromPreviousItem
 * @returns {Array<String>} html of found stimuluses
 */
function reorderStimuluses(newFragment, doc, stimulusesHtmlFromPreviousItem) {
    const qtiStimulusesHtml = reorderQtiStimuluses(newFragment, doc, stimulusesHtmlFromPreviousItem);
    const pciStimulusesHtml = reorderPciStimuluses(newFragment, doc, stimulusesHtmlFromPreviousItem);
    return qtiStimulusesHtml.concat(pciStimulusesHtml);
}

/**
 * For QTI shared stimulus:
 * - remove duplicates in the following items
 * - for dual-column layout, if stimulus in second column, move it to the top
 * @param {DocumentFragment} newFragment
 * @param {Document} doc
 * @param {Array<String>?} stimulusesHtmlFromPreviousItem
 * @returns {Array<String>} html of found qti stimuluses
 */
function reorderQtiStimuluses(newFragment, doc, stimulusesHtmlFromPreviousItem) {
    //only known case: grid-row with 2 columns, where second column has stimulus and no other content, and first column does not have stimulus
    const stimuluses = Array.from(newFragment.querySelectorAll('.qti-include[data-href]'));
    const stimulusesHtml = [];
    for (let idx = 0; idx < stimuluses.length; idx++) {
        const stimulus = stimuluses[idx];

        cleanAttributesInContent(stimulus, doc);
        stimulusesHtml.push(stimulus.innerHTML);

        if (!stimulus.parentElement.closest('.qti-include[data-href]')) {
            stimulusesHtml.push(stimulus.innerHTML);
            if (stimulusesHtmlFromPreviousItem && stimulusesHtml[idx] === stimulusesHtmlFromPreviousItem[idx]) {
                //remove duplicates between items
                stimulus.remove();
            } else {
                //place stimulus before question
                const row = stimulus.closest('.grid-row');
                const cols = row && row.querySelectorAll(':scope > [class^="col-"]');
                if (
                    cols &&
                    cols.length === 2 &&
                    cols[1].contains(stimulus) &&
                    !stimuluses.some(st => cols[0].contains(st))
                ) {
                    const stimulusParentsUntilCol = getParentsUntil(stimulus, cols[1]);
                    const colHasOtherContent = stimulusParentsUntilCol.some(
                        parentEl => getChildNodesWithoutEmptyTextNodes(parentEl).length > 1
                    );
                    if (!colHasOtherContent) {
                        cols[0].before(cols[1]);
                    }
                }
            }
        }
    }
    return stimulusesHtml;
}

/**
 * For PCI shared stimulus:
 * - remove duplicates in the following items
 * - if stimulus in second column, move it to the top
 * PCI stimulus is detected like this:
 * - inside `.unit-container` element there should be `<iframe id="question">` and `<iframe id="stimulus">`
 * @param {DocumentFragment} newFragment
 * @param {Document} doc
 * @param {Array<String>?} stimulusesHtmlFromPreviousItem
 * @returns {Array<String>} html of found pci stimuluses
 */
function reorderPciStimuluses(newFragment, doc, stimulusesHtmlFromPreviousItem) {
    //only known case: <.unit-container><iframe id="question"/><iframe id="stimulus"/></.unit-container>
    const stimuluses = newFragment.querySelectorAll('.unit-container [data-original-iframe-id="stimulus"]');
    const stimulusesHtml = [];
    for (let idx = 0; idx < stimuluses.length; idx++) {
        const stimulus = stimuluses[idx];

        cleanAttributesInContent(stimulus, doc);
        stimulusesHtml.push(stimulus.innerHTML);

        if (stimulusesHtmlFromPreviousItem && stimulusesHtml[idx] === stimulusesHtmlFromPreviousItem[idx]) {
            //remove duplicates between items
            stimulus.remove();
        } else {
            //place stimulus before question
            const stimulusParentChildNodes = getChildNodesWithoutEmptyTextNodes(stimulus.parentElement);
            const question = stimulusParentChildNodes[stimulusParentChildNodes.indexOf(stimulus) - 1];
            if (
                question &&
                question.nodeType === Node.ELEMENT_NODE &&
                question.getAttribute('data-original-iframe-id') === 'question'
            ) {
                question.before(stimulus);
            }
        }
    }
    return stimulusesHtml;
}
