// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import pluginFactory from 'taoTests/runner/plugin';
import { tick, mount, unmount } from 'svelte';
import { Icon } from '@oat-sa-private/ui-elements';
import { Tooltip } from '@oat-sa-private/ui-components';
import { cloneDeep, defaultsDeep } from 'lodash';
import MarkingSymbolsBar from './MarkingSymbolsBar.svelte';
import {
    buildCountsBySymbol,
    DEFAULT_MARKER_COLOR,
    getMarkerIconName,
    getSymbolById,
    normalizeSymbolsConfig,
    resolveMarkerAppearance
} from './helpers.js';
import { getTestSessionUserDataService } from '../../../session/testSessionUserDataService.js';
import { testSessionStatus } from '../../../session/sessionStates.js';
import { getTestSessionStatusStore } from '../../../testsStateStore.js';
import { commentBaseClassName } from '../inlineComments/selectors.js';
import { isMutuallyExclusiveTool } from '../../../layout/toolbarItems.js';
import './markingSymbols.css';

const defaultSymbols = {
    marks: [
        {
            items: [
                { label: 'Content mistake', color: '#d9534f', shapeId: 'diamond' },
                { label: 'Eye mistake', color: '#5bc0de', shapeId: 'circle' }
            ]
        }
    ]
};

const defaultContainersBlackList = [
    //sync these selectors with css styles for `::selection`
    '.qti-interaction',
    '.qti-gapMatchInteraction > .qti-flow-container > .answer-area .gap',
    '.qti-hottextInteraction > .qti-flow-container .qti-hottext',
    '.qti-audio-container',
    '.qti-video-container',
    'mjx-container',
    `.${commentBaseClassName}`
];

const defaultContainersWhiteList = [
    //sync these selectors with css styles for `::selection`
    '.qti-interaction > .qti-prompt',
    '.qti-gapMatchInteraction > .qti-flow-container > .answer-area',
    '.qti-hottextInteraction > .qti-flow-container'
];

const markerClassName = 'marking-symbol-marker';
const markerModeClassName = 'marking-symbols-mode';
const markerOpenClassName = 'marking-symbols-open';
const markerLayerClassName = 'marking-symbols-layer';
const markerContainerClassName = 'marking-symbols-layer-container';
const maxMarkersPerGroup = 3;
const markerSizePx = 16;
const markerSpacingPx = 16;
const groupOffsetXPx = 0;
const groupOffsetYPx = 0;
const markerVerticalOffsetPx = -10;

function ensureRectFromRange(range, containerRect) {
    const rect =
        (typeof range.getClientRects === 'function' && range.getClientRects()[0]) ||
        (typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : null);
    if (rect && (rect.width || rect.height)) {
        return rect;
    }
    const probe = document.createElement('span');
    probe.style.display = 'inline-block';
    probe.style.width = '0';
    probe.style.height = '1em';
    probe.dataset.markerProbe = 'true';
    range.insertNode(probe);
    const probeRect = probe.getBoundingClientRect();
    probe.remove();
    return probeRect && (probeRect.width || probeRect.height) ? probeRect : containerRect;
}

function getOverlayHost(container, node) {
    let el = node && node.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    let positioned = null;
    while (el && container.contains(el)) {
        if (el.classList && el.classList.contains('qti-interaction')) {
            return el;
        }
        const style = window.getComputedStyle(el);
        if (!positioned && style.position && style.position !== 'static') {
            positioned = el;
        }
        if (el === container) {
            break;
        }
        el = el.parentElement;
    }
    return positioned || container;
}

function matchesSelectorInContainer(element, selector, container) {
    if (!element || !selector) {
        return false;
    }
    const match = element.closest(selector);
    return !!(match && container.contains(match));
}

function matchesAnySelector(element, selectors, container) {
    if (!element || !selectors || selectors.length === 0) {
        return false;
    }
    return selectors.some(selector => matchesSelectorInContainer(element, selector, container));
}

function isAllowedTarget(element, container, blackList, whiteList) {
    if (!element || !container) {
        return false;
    }
    if (matchesSelectorInContainer(element, `.${markerClassName}`, container)) {
        return false;
    }
    const isBlacklisted = matchesAnySelector(element, blackList, container);
    const isWhitelisted = whiteList && whiteList.length > 0 && matchesAnySelector(element, whiteList, container);
    if (isBlacklisted) {
        return !!isWhitelisted;
    }
    return true;
}

function isAllowedTextNode(node, container, blackList, whiteList) {
    if (!node || node.nodeType !== Node.TEXT_NODE) {
        return false;
    }
    const parent = node.parentElement;
    if (!parent) {
        return false;
    }
    if (matchesSelectorInContainer(parent, `.${markerClassName}`, container)) {
        return false;
    }
    const isBlacklisted = matchesAnySelector(parent, blackList, container);
    const isWhitelisted = whiteList && whiteList.length > 0 && matchesAnySelector(parent, whiteList, container);
    if (isBlacklisted) {
        return !!isWhitelisted;
    }
    return true;
}

function createTextWalker(container, blackList, whiteList) {
    return document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode: node =>
            isAllowedTextNode(node, container, blackList, whiteList)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT
    });
}

function resolveTextNodeInElement(element, preferEnd, container, blackList, whiteList) {
    if (!element) {
        return null;
    }
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode: node =>
            isAllowedTextNode(node, container, blackList, whiteList)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT
    });
    if (!preferEnd) {
        return walker.nextNode() ? walker.currentNode : null;
    }
    let last = null;
    while (walker.nextNode()) {
        last = walker.currentNode;
    }
    return last;
}

function resolveCaretPositionFromEvent(event) {
    if (document.caretPositionFromPoint) {
        const position = document.caretPositionFromPoint(event.clientX, event.clientY);
        if (position) {
            return { node: position.offsetNode, offset: position.offset };
        }
    }
    if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(event.clientX, event.clientY);
        if (range) {
            return { node: range.startContainer, offset: range.startOffset };
        }
    }
    return null;
}

function normalizeCaretPosition(position, container, blackList, whiteList) {
    if (!position || !position.node || !container.contains(position.node)) {
        return null;
    }
    const { node, offset } = position;
    if (node.nodeType === Node.TEXT_NODE) {
        return isAllowedTextNode(node, container, blackList, whiteList) ? { node, offset } : null;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }
    const childNodes = node.childNodes || [];
    let child = null;
    if (childNodes.length) {
        if (offset < childNodes.length) {
            child = childNodes[offset];
        } else if (offset > 0) {
            child = childNodes[offset - 1];
        }
    }
    if (child) {
        if (child.nodeType === Node.TEXT_NODE && isAllowedTextNode(child, container, blackList, whiteList)) {
            return { node: child, offset: offset < childNodes.length ? 0 : child.nodeValue.length };
        }
        if (child.nodeType === Node.ELEMENT_NODE) {
            const preferEnd = offset >= childNodes.length;
            const textNode = resolveTextNodeInElement(child, preferEnd, container, blackList, whiteList);
            if (textNode) {
                return { node: textNode, offset: preferEnd ? textNode.nodeValue.length : 0 };
            }
        }
    }
    const textNode = resolveTextNodeInElement(node, false, container, blackList, whiteList);
    return textNode ? { node: textNode, offset: 0 } : null;
}

function getOffsetForTextNode(container, targetNode, targetOffset, blackList, whiteList) {
    const walker = createTextWalker(container, blackList, whiteList);
    let offset = 0;
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node === targetNode) {
            return offset + Math.min(targetOffset, node.nodeValue.length);
        }
        offset += node.nodeValue.length;
    }
    return null;
}

function getTextPositionForOffset(container, targetOffset, blackList, whiteList) {
    const normalizedOffset = Number(targetOffset);
    if (!Number.isFinite(normalizedOffset) || normalizedOffset < 0) {
        return null;
    }
    const walker = createTextWalker(container, blackList, whiteList);
    let offset = normalizedOffset;
    let lastNode = null;
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const len = node.nodeValue.length;
        if (offset <= len) {
            return { node, offset };
        }
        offset -= len;
        lastNode = node;
    }
    if (lastNode) {
        return { node: lastNode, offset: lastNode.nodeValue.length };
    }
    return null;
}

function createMarkerElement(marker, symbols, isReadOnly) {
    const { icon, color } = resolveMarkerAppearance(marker, symbols);
    const element = document.createElement('span');
    element.className = markerClassName;
    element.setAttribute('aria-hidden', 'true');
    if (marker.symbolId || marker.id) {
        element.setAttribute('data-symbol-id', marker.symbolId || marker.id);
    }
    element.style.color = color;
    element.__markerIconInstance = mount(Icon, {
        target: element,
        props: {
            name: icon,
            ariaHidden: true
        }
    });

    if (isReadOnly) {
        const symbol = getSymbolById(symbols, marker.symbolId || marker.id);
        const tooltipText = symbol?.label || symbol?.name || symbol?.id || marker.symbolId || marker.id;
        if (tooltipText) {
            element.__markerTooltipInstance = mount(Tooltip, {
                target: document.body,
                props: {
                    text: tooltipText,
                    anchorElement: element,
                    placementOverride: 'top'
                }
            });
        }
    }

    return element;
}

function getMarkerLayer(container) {
    if (!container) {
        return null;
    }
    return container.querySelector(`.${markerLayerClassName}`);
}

function resetMarkerLayer(container) {
    const layer = getMarkerLayer(container);
    if (!layer) {
        return null;
    }
    layer.querySelectorAll(`.${markerClassName}`).forEach(node => {
        if (node.__markerIconInstance) {
            unmount(node.__markerIconInstance);
        }
        if (node.__markerTooltipInstance) {
            unmount(node.__markerTooltipInstance);
        }
    });
    layer.innerHTML = '';
    return layer;
}

function ensureMarkerLayer(container) {
    if (!container) {
        return null;
    }
    container.classList.add(markerContainerClassName);
    const existingLayer = getMarkerLayer(container);
    if (existingLayer) {
        return existingLayer;
    }
    const layer = document.createElement('div');
    layer.className = markerLayerClassName;
    container.appendChild(layer);
    return layer;
}

function clearMarkers(hostsSet) {
    if (!hostsSet || hostsSet.size === 0) {
        return;
    }
    hostsSet.forEach(host => {
        resetMarkerLayer(host);
        const layer = getMarkerLayer(host);
        if (layer) {
            layer.remove();
        }
        host.classList.remove(markerContainerClassName);
    });
    hostsSet.clear();
}

function renderMarkers(container, markers, symbols, blackList, whiteList, hostsSet, isReadOnly = false) {
    if (!container) {
        return;
    }
    clearMarkers(hostsSet);
    if (!Array.isArray(markers) || markers.length === 0) {
        return;
    }
    const groupedMarkers = markers.reduce((acc, marker) => {
        const position =
            getTextPositionForOffset(container, marker.offset, blackList, whiteList) ||
            getTextPositionForOffset(container, 0, blackList, whiteList);
        if (!position) {
            return acc;
        }
        const host = getOverlayHost(container, position.node);
        const layer = ensureMarkerLayer(host);
        if (hostsSet) {
            hostsSet.add(host);
        }
        const hostRect = host.getBoundingClientRect();
        const range = document.createRange();
        range.setStart(position.node, position.offset);
        range.collapse(true);
        const clientRect = ensureRectFromRange(range, hostRect);
        const relRect = {
            top: clientRect.top - hostRect.top + host.scrollTop,
            left: clientRect.left - hostRect.left + host.scrollLeft
        };
        const group = acc.get(marker.offset) || { markers: [], rect: relRect, host, layer };
        group.markers.push(marker);
        acc.set(marker.offset, group);
        return acc;
    }, new Map());

    groupedMarkers.forEach(group => {
        const host = group.host || container;
        const layer = group.layer || ensureMarkerLayer(host);
        if (!layer) {
            return;
        }
        const count = Math.min(maxMarkersPerGroup, group.markers.length);
        const isFullGroup = group.markers.length >= maxMarkersPerGroup;
        const groupWidth = markerSizePx + (count - 1) * markerSpacingPx;

        const groupElement = document.createElement('div');
        groupElement.className = 'marking-symbols-group';
        if (group.markers.length > 1) {
            groupElement.classList.add('has-multiple');
        }
        if (isFullGroup) {
            groupElement.classList.add('is-full');
            groupElement.dataset.full = 'true';
        } else {
            groupElement.dataset.full = 'false';
        }
        groupElement.style.top = `${group.rect.top + groupOffsetYPx}px`;
        const baseLeft = group.rect.left;
        groupElement.style.left = `${baseLeft - groupWidth / 2 + groupOffsetXPx}px`;
        groupElement.style.width = `${groupWidth}px`;
        groupElement.style.color = group.markers[0]?.color || 'currentColor';
        groupElement.dataset.markerOffset = group.markers[0]?.offset;

        group.markers.slice(0, maxMarkersPerGroup).forEach((marker, index) => {
            const markerElement = createMarkerElement(marker, symbols, isReadOnly);
            markerElement.style.left = `${index * markerSpacingPx}px`;
            markerElement.style.top = `${markerVerticalOffsetPx}px`;
            markerElement.style.position = 'absolute';
            groupElement.appendChild(markerElement);
        });

        layer.appendChild(groupElement);
    });
}

const markingSymbolsPlugin = {
    name: 'markingSymbols',

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        const pluginConfig = defaultsDeep({}, testRunner.getPluginConfig(this.getName()), {});
        const areaBroker = this.getAreaBroker();
        const toolsStore = getTestSessionUserDataService(testConfig.serviceCallId).getToolsStore();
        const statusStore = getTestSessionStatusStore(testConfig.serviceCallId);

        const initialToolState = toolsStore.getTestToolState(this.getName()) || {};
        toolsStore.setTestToolState(this.getName(), {
            ...initialToolState,
            visible: initialToolState.visible !== false,
            open: initialToolState.open || false,
            markingsByKey: initialToolState.markingsByKey || {}
        });

        this.proxy = null;
        this.canPersistAnnotations = () => {
            if (!this.proxy && testRunner.getProxy) {
                try {
                    this.proxy = testRunner.getProxy();
                } catch {
                    return false;
                }
            }
            return !!(this.proxy && typeof this.proxy.saveScoringAnnotationComment === 'function');
        };
        this.annotationsByItem = {};
        this.toolbar = null;
        this.toolbarContainer = null;
        this.toolbarContainerCreated = false;
        this.activeSymbolId = null;
        this.countsBySymbol = {};
        this.symbolsConfig = pluginConfig;
        this.symbols = [];
        this.sections = null;
        this.containersBlackList = [...defaultContainersBlackList];
        this.containersWhiteList = [...defaultContainersWhiteList];
        this.containerWithListener = null;
        this.resizeObserver = null;
        this.windowResizeHandler = null;
        this.markerHosts = new Set();
        this.observedHosts = new Set();
        this.isReadOnly = Array.isArray(pluginConfig.mode) ? !pluginConfig.mode.includes('write') : true;
        this.getToolbarContainer = () => {
            if (this.toolbarContainer && this.toolbarContainer.isConnected) {
                return this.toolbarContainer;
            }

            const mainArea = areaBroker.getMainArea ? areaBroker.getMainArea() : null;
            if (!mainArea) {
                throw new Error('No main area found to render plugin into.');
            }

            const toolbarContainerSelector = `.toolbar-${this.getName()}`;
            const existingContainer = mainArea.querySelector(toolbarContainerSelector);
            if (existingContainer) {
                this.toolbarContainer = existingContainer;
                this.toolbarContainerCreated = false;
                return existingContainer;
            }

            const container = document.createElement('div');
            container.classList.add(`toolbar-${this.getName()}`);
            mainArea.appendChild(container);

            this.toolbarContainer = container;
            this.toolbarContainerCreated = true;
            return container;
        };

        this.getItemContainer = () => {
            const mainArea = areaBroker.getMainArea ? areaBroker.getMainArea() : null;
            return mainArea ? mainArea.querySelector('.qti-item') : null;
        };

        this.updateItemModeClass = () => {
            const container = this.getItemContainer();
            if (!container) {
                return;
            }
            const isOpen = this.getOpenState();
            const shouldEnable = isOpen && !!this.activeSymbolId;
            container.classList.toggle(markerModeClassName, shouldEnable);
            container.classList.toggle(markerOpenClassName, isOpen);
        };

        this.applySymbolsConfig = config => {
            const {
                marks,
                markingSymbolsPreset,
                sections: sectionsConfig,
                symbols
            } = (config && typeof config === 'object' && !Array.isArray(config) && config) || {};
            const incomingConfig =
                marks !== undefined ||
                markingSymbolsPreset !== undefined ||
                sectionsConfig !== undefined ||
                symbols !== undefined
                    ? { marks, markingSymbolsPreset, sections: sectionsConfig, symbols }
                    : config;
            const {
                symbols: normalizedSymbols,
                sections,
                configSource
            } = normalizeSymbolsConfig(incomingConfig, defaultSymbols);
            this.symbolsConfig = configSource || incomingConfig || defaultSymbols;
            this.symbols = normalizedSymbols;
            this.sections = sections;
            if (this.activeSymbolId && !getSymbolById(this.symbols, this.activeSymbolId)) {
                this.activeSymbolId = null;
            }
            this.countsBySymbol = buildCountsBySymbol(this.symbols, this.getCurrentMarkers());
            this.syncToolbarProps();
            this.updateItemModeClass();
        };

        this.messageListener = event => {
            if (!event?.data?.event) {
                return;
            }

            switch (event.data.event) {
                case 'markingSymbols-show': {
                    if (!this.getOpenState()) {
                        this.open();
                    }
                    break;
                }
                case 'markingSymbols-hide': {
                    if (this.getOpenState()) {
                        this.close();
                    }
                    break;
                }
                case 'markingSymbols-config': {
                    const payload = event.data.payload;
                    const config =
                        payload && typeof payload === 'object' && !Array.isArray(payload)
                            ? {
                                  marks: payload.marks ?? event.data.marks,
                                  markingSymbolsPreset: payload.markingSymbolsPreset ?? event.data.markingSymbolsPreset,
                                  sections: payload.sections ?? event.data.sections,
                                  symbols: payload.symbols ?? event.data.symbols
                              }
                            : (payload ?? {
                                  marks: event.data.marks,
                                  markingSymbolsPreset: event.data.markingSymbolsPreset,
                                  sections: event.data.sections,
                                  symbols: event.data.symbols
                              });
                    this.applySymbolsConfig(config);
                    break;
                }
                case 'markingSymbols-restore': {
                    const currentItemId = this.getCurrentItemId();
                    const itemId = event.data.itemId || event.data.payload?.itemId;
                    const payload = event.data.payload?.payload || event.data.payload;
                    if (currentItemId === itemId && this.isItemRenderedStatus()) {
                        const markers = Array.isArray(payload) ? payload : payload?.markers || [];
                        const annotationsPayload = payload?.annotations || { markingSymbols: markers };
                        this.setAnnotationsForItem(itemId, annotationsPayload);
                        this.setMarkersForItem(itemId, markers);
                        this.restoreItemMarkers(markers);
                    }
                    break;
                }
            }
        };

        // init plugin communication handler with external iframe like ManualScoring
        window.addEventListener('message', this.messageListener);

        /**
         * Send plugin state to iframe parent
         * @param {type} payload - description of parameter
         */
        this.syncPluginProps = payload => {
            window.parent.postMessage({ event: 'markingSymbols-deliverData', payload }, '*');
        };

        /**
         * Get the current item identifier
         * @returns {String}
         */
        this.getCurrentItemId = () => {
            const context = testRunner.getTestContext && testRunner.getTestContext();
            return context ? context.itemIdentifier : null;
        };

        /**
         * Cache annotations payload for given item
         * @param {String} itemId
         * @param {Object} annotations
         */
        this.setAnnotationsForItem = (itemId, annotations = {}) => {
            if (!itemId) {
                return;
            }
            this.annotationsByItem[itemId] = cloneDeep(annotations) || {};
        };

        /**
         * Extract markers list from annotations payload
         * @param {Object} annotations
         * @returns {Array<Object>}
         */
        this.getMarkersFromAnnotations = annotations => {
            if (!annotations) {
                return [];
            }
            if (Array.isArray(annotations.markingSymbols)) {
                return annotations.markingSymbols;
            }
            const responses = annotations.responses;
            if (responses && typeof responses === 'object') {
                return Object.values(responses).reduce((acc, responseAnnotations) => {
                    if (Array.isArray(responseAnnotations?.markingSymbols)) {
                        acc.push(...responseAnnotations.markingSymbols);
                    }
                    return acc;
                }, []);
            }
            return [];
        };

        /**
         * Build annotation payload preserving existing structure when possible
         * @param {String} itemId
         * @param {Array<Object>} markers
         * @returns {Object}
         */
        this.buildAnnotationsPayload = (itemId, markers) => {
            const existing = this.annotationsByItem[itemId] || {};
            if (Array.isArray(existing.markingSymbols)) {
                return {
                    ...existing,
                    markingSymbols: markers
                };
            }
            if (existing.responses && typeof existing.responses === 'object') {
                const responses = existing.responses;
                const targetKey =
                    Object.keys(responses).find(key => Array.isArray(responses[key]?.markingSymbols)) ||
                    Object.keys(responses)[0];
                if (targetKey) {
                    return {
                        ...existing,
                        responses: {
                            ...responses,
                            [targetKey]: {
                                ...responses[targetKey],
                                markingSymbols: markers
                            }
                        }
                    };
                }
            }
            return {
                ...existing,
                markingSymbols: markers
            };
        };

        /**
         * Persist annotations to backend if proxy is available
         * @param {String} itemId
         * @param {Array<Object>} markers
         * @returns {Promise<void>}
         */
        this.saveAnnotations = (itemId, markers) => {
            if (!this.canPersistAnnotations() || !itemId) {
                return Promise.resolve();
            }
            const annotationsPayload = this.buildAnnotationsPayload(itemId, markers);
            this.setAnnotationsForItem(itemId, annotationsPayload);
            return this.proxy.saveScoringAnnotationComment(itemId, annotationsPayload);
        };

        /**
         * Get stored markers for current item
         * @returns {Array<Object>}
         */
        this.getCurrentMarkers = () => {
            const markingsModelPerKey = this.getMarkingsModelState();
            const itemId = this.getCurrentItemId();
            if (!itemId) {
                return [];
            }
            return markingsModelPerKey[itemId] || [];
        };

        /**
         * Persist markers for a given item
         * @param {String} itemId
         * @param {Array<Object>} markers
         */
        this.setMarkersForItem = (itemId, markers) => {
            if (!itemId) {
                return;
            }
            const markingsModelPerKey = this.getMarkingsModelState();
            markingsModelPerKey[itemId] = Array.isArray(markers) ? markers : [];
            this.setMarkingsModelState(markingsModelPerKey);
        };

        /**
         * Render markers into the current item container
         * @param {Array<Object>} markers
         */
        this.renderMarkers = markers => {
            const container = this.getItemContainer();
            renderMarkers(
                container,
                markers,
                this.symbols,
                this.containersBlackList,
                this.containersWhiteList,
                this.markerHosts,
                this.isReadOnly
            );
            this.observeMarkerHosts();
            this.observeContainerResizes();
        };

        this.observeContainerResizes = () => {
            if (typeof ResizeObserver === 'undefined') {
                return;
            }
            if (!this.resizeObserver) {
                this.resizeObserver = new ResizeObserver(() => {
                    this.renderMarkers(this.getCurrentMarkers());
                });
            }
            const container = this.getItemContainer();
            if (container) {
                this.resizeObserver.observe(container);
            }
            this.observeMarkerHosts();
        };

        this.unobserveContainerResizes = () => {
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
            this.observedHosts.clear();
        };

        this.observeMarkerHosts = () => {
            if (!this.resizeObserver) {
                return;
            }
            const toRemove = [];
            this.observedHosts.forEach(host => {
                if (!this.markerHosts.has(host)) {
                    this.resizeObserver.unobserve(host);
                    toRemove.push(host);
                }
            });
            toRemove.forEach(host => {
                this.observedHosts.delete(host);
            });
            this.markerHosts.forEach(host => {
                if (!this.observedHosts.has(host)) {
                    this.resizeObserver.observe(host);
                    this.observedHosts.add(host);
                }
            });
        };

        /**
         * Clear markers from the current item container
         */
        this.clearMarkers = () => {
            clearMarkers(this.markerHosts);
            this.observeMarkerHosts();
        };

        /**
         * Persist markers, update counters, render markers, and sync toolbar
         * @param {Array<Object>} markers
         * @param {Object} [options]
         * @param {Boolean} [options.sync=true]
         * @param {Boolean} [options.persist=true]
         * @returns {Promise<void>}
         */
        this.commitMarkers = (markers, { sync = true, persist = true } = {}) => {
            if (!this.isItemRenderedStatus()) {
                return Promise.resolve();
            }
            const normalizedMarkers = Array.isArray(markers) ? markers : [];
            const itemId = this.getCurrentItemId();
            if (!itemId) {
                return Promise.resolve();
            }
            this.setMarkersForItem(itemId, normalizedMarkers);
            this.countsBySymbol = buildCountsBySymbol(this.symbols, normalizedMarkers);
            this.renderMarkers(normalizedMarkers);
            this.syncToolbarProps();
            if (sync) {
                this.syncPluginProps(normalizedMarkers);
            }
            if (persist) {
                return this.saveAnnotations(itemId, normalizedMarkers).catch(error => {
                    console.error(error);
                });
            }
            return Promise.resolve();
        };

        /**
         * Restore markers for the current item and update counters
         * @param {Array<Object>} [markersOverride]
         */
        this.restoreItemMarkers = markersOverride => {
            const itemId = this.getCurrentItemId();
            let markers = Array.isArray(markersOverride) ? markersOverride : this.getCurrentMarkers();
            if ((!markers || markers.length === 0) && itemId) {
                const annotations = this.annotationsByItem[itemId] || {};
                const restoredFromAnnotations = this.getMarkersFromAnnotations(annotations);
                if (restoredFromAnnotations.length) {
                    markers = restoredFromAnnotations;
                    this.setMarkersForItem(itemId, restoredFromAnnotations);
                }
            }
            this.countsBySymbol = buildCountsBySymbol(this.symbols, markers);
            this.renderMarkers(markers);
            this.syncToolbarProps();
        };

        /**
         * Handle click on symbol toolbar button
         * @param {String} symbolId
         */
        const handleSymbolSelect = symbolId => {
            if (this.isReadOnly) {
                return;
            }
            this.activeSymbolId = this.activeSymbolId === symbolId ? null : symbolId;
            this.syncToolbarProps();
            this.updateItemModeClass();
        };

        /**
         * Handle click on item content to create a marker
         * @param {MouseEvent} event
         */
        this.handleItemClick = event => {
            if (this.isReadOnly) {
                return;
            }
            if (!this.isItemRenderedStatus()) {
                return;
            }
            if (event.button !== 0) {
                return;
            }
            const container = this.getItemContainer();
            if (
                !container ||
                (!container.contains(event.target) &&
                    !(event.target.closest && event.target.closest('.marking-symbols-group')))
            ) {
                return;
            }
            const groupTarget = event.target.closest && event.target.closest('.marking-symbols-group');
            const markerTarget = event.target.closest && event.target.closest(`.${markerClassName}`);
            const fixedOffset =
                groupTarget && groupTarget.dataset && groupTarget.dataset.markerOffset
                    ? Number(groupTarget.dataset.markerOffset)
                    : null;

            const isPluginOpen = this.getOpenState();
            const stopEvent = () => {
                event.stopImmediatePropagation?.();
                event.stopPropagation?.();
                event.preventDefault?.();
            };

            const isAddMode = isPluginOpen && !!this.activeSymbolId;
            const wantsRemoval =
                isPluginOpen && !isAddMode && Number.isFinite(fixedOffset) && (markerTarget || groupTarget);

            if (wantsRemoval) {
                stopEvent();
                const currentMarkers = this.getCurrentMarkers();
                const targetSymbolId = markerTarget?.dataset?.symbolId;
                let removed = false;
                const updatedMarkers = currentMarkers.filter(marker => {
                    if (removed) {
                        return true;
                    }
                    const sameOffset = Number(marker.offset) === Number(fixedOffset);
                    const sameSymbol =
                        targetSymbolId &&
                        (marker.symbolId === targetSymbolId ||
                            marker.id === targetSymbolId ||
                            marker.symbolId === marker.id);
                    if (sameOffset && (!targetSymbolId || sameSymbol)) {
                        removed = true;
                        return false;
                    }
                    return true;
                });
                if (removed) {
                    this.commitMarkers(updatedMarkers);
                }
                return;
            }

            if (!isAddMode) {
                return;
            }

            if (
                !Number.isFinite(fixedOffset) &&
                !isAllowedTarget(event.target, container, this.containersBlackList, this.containersWhiteList)
            ) {
                return;
            }

            let offset = null;
            if (Number.isFinite(fixedOffset)) {
                offset = fixedOffset;
            } else {
                const caretPosition = resolveCaretPositionFromEvent(event) || { node: event.target, offset: 0 };
                const normalized = normalizeCaretPosition(
                    caretPosition,
                    container,
                    this.containersBlackList,
                    this.containersWhiteList
                );
                if (!normalized) {
                    return;
                }
                offset = getOffsetForTextNode(
                    container,
                    normalized.node,
                    normalized.offset,
                    this.containersBlackList,
                    this.containersWhiteList
                );
                if (offset === null) {
                    return;
                }
            }
            const symbol = getSymbolById(this.symbols, this.activeSymbolId);
            if (!symbol) {
                return;
            }
            const iconName = symbol.icon || getMarkerIconName(symbol.shapeId) || '';
            const currentMarkers = this.getCurrentMarkers();
            const groupCount = currentMarkers.filter(m => Number(m.offset) === Number(offset)).length;
            if (groupCount >= maxMarkersPerGroup) {
                return;
            }
            const marker = {
                symbolId: symbol.id,
                icon: iconName,
                color: symbol.color || DEFAULT_MARKER_COLOR,
                offset
            };
            const markers = [...this.getCurrentMarkers(), marker];
            this.commitMarkers(markers);
            stopEvent();
            const selection = window.getSelection();
            if (selection && selection.rangeCount) {
                selection.removeAllRanges();
            }
        };

        /**
         * Attach click listener to the current item container
         */
        this.attachListeners = () => {
            const container = this.getItemContainer();
            if (!container) {
                return;
            }
            if (!this.handleMouseDown) {
                this.handleMouseDown = event => {
                    if (!this.getOpenState()) {
                        return;
                    }
                    const targetIsMarker =
                        (event.target.closest && event.target.closest('.marking-symbols-group')) ||
                        (event.target.closest && event.target.closest(`.${markerClassName}`));
                    if (this.activeSymbolId || targetIsMarker) {
                        event.stopImmediatePropagation?.();
                        event.stopPropagation?.();
                        event.preventDefault?.();
                    }
                };
            }
            if (this.containerWithListener && this.containerWithListener !== container) {
                this.containerWithListener.removeEventListener('click', this.handleItemClick, true);
                this.containerWithListener.removeEventListener('mousedown', this.handleMouseDown, true);
            }
            if (this.containerWithListener !== container) {
                container.addEventListener('click', this.handleItemClick, true);
                container.addEventListener('mousedown', this.handleMouseDown, true);
                this.containerWithListener = container;
            }
        };

        /**
         * Detach click listener from the item container
         */
        this.detachListeners = () => {
            if (this.containerWithListener) {
                this.containerWithListener.removeEventListener('click', this.handleItemClick, true);
                this.containerWithListener.removeEventListener('mousedown', this.handleMouseDown, true);
                this.containerWithListener = null;
            }
        };

        /**
         * Show the marking symbols toolbar
         */
        this.open = () => {
            this.setOpenState(true);
            this.renderToolbar();
            this.attachListeners();
            this.observeContainerResizes();
            this.updateItemModeClass();
            this.syncOpenStateWithParent(true);
        };

        /**
         * Hide the marking symbols toolbar, but do not clear the item's visible markers.
         */
        this.close = () => {
            this.setOpenState(false);
            this.detachListeners();
            this.updateItemModeClass();
            this.destroyToolbar();
            this.activeSymbolId = null;
            this.syncToolbarProps();
            this.syncOpenStateWithParent(false);
        };

        /**
         * Inform iframe parent about plugin open/close
         * @param {Boolean} isOpen
         */
        this.syncOpenStateWithParent = isOpen => {
            window.parent.postMessage({ event: 'markingSymbols-state', payload: { open: !!isOpen } }, '*');
        };

        /**
         * Mount marking symbols toolbar and listen to its events
         */
        this.renderToolbar = () => {
            if (!this.toolbar) {
                const toolbarContainer = this.getToolbarContainer();

                this.toolbar = mount(MarkingSymbolsBar, {
                    target: toolbarContainer,
                    props: {
                        serviceCallId: testConfig.serviceCallId,
                        activeSymbolId: this.activeSymbolId,
                        countsBySymbol: this.countsBySymbol,
                        symbols: this.symbols,
                        sections: this.sections
                    }
                });
                this.toolbar.$on('select', e => {
                    handleSymbolSelect(e.detail.symbolId);
                });
                this.toolbar.$on('close', () => {
                    this.close();
                });
            }
        };

        /**
         * Unmount marking symbols toolbar
         */
        this.destroyToolbar = () => {
            if (this.toolbar) {
                unmount(this.toolbar);
            }
            this.toolbar = null;
        };

        /**
         * When toolbar state changes, propagate changes to the component
         */
        this.syncToolbarProps = () => {
            if (this.toolbar) {
                this.toolbar.$set({
                    activeSymbolId: this.activeSymbolId,
                    countsBySymbol: this.countsBySymbol,
                    symbols: this.symbols,
                    sections: this.sections
                });
            }
        };

        /**
         * Check in toolsStore if marking symbols is open
         * @returns {Boolean}
         */
        this.getOpenState = () => {
            const toolState = toolsStore.getTestToolState(this.getName());
            return toolState && toolState.open;
        };

        /**
         * Set in toolsStore if marking symbols is open
         * @param {Boolean} open
         */
        this.setOpenState = open => {
            const toolState = toolsStore.getTestToolState(this.getName()) || {};
            toolState.open = open;
            toolsStore.setTestToolState(this.getName(), toolState);
        };

        /**
         * @typedef {Array<Object>} MarkingSymbolsModel
         */
        /**
         * @typedef {Object<string, MarkingSymbolsModel>} markingsByKey
         * key is a unique string, value is `markingsModel` for that item
         */
        /**
         * Get in toolsStore list of markings (by unique key - itemIdentifier)
         * @returns {markingsByKey} markingsByKey
         */
        this.getMarkingsModelState = () => {
            const toolState = toolsStore.getTestToolState(this.getName());
            return (toolState && toolState.markingsByKey) || {};
        };

        /**
         * Set in toolsStore list of markings (by unique key - itemIdentifier)
         * This state can be used to restore markings after item is re-rendered.
         * @param {markingsByKey} markingsByKey
         */
        this.setMarkingsModelState = markingsByKey => {
            const toolState = toolsStore.getTestToolState(this.getName()) || {};
            toolState.markingsByKey = markingsByKey;
            toolsStore.setTestToolState(this.getName(), toolState);
        };

        /**
         * Check if current status is interacting or feedback (if item is rendered)
         * (Note that sometimes even with loading status, item is already rendered below it,
         *  but it doesn't concern us because renderitem/enableitem fire after loading finishes)
         * @returns {Boolean}
         */
        this.isItemRenderedStatus = () => statusStore.get() === testSessionStatus.interacting;

        this.applySymbolsConfig(this.symbolsConfig);
    },

    init() {
        const testRunner = this.getTestRunner();
        const testRunnerConfig = testRunner.getConfig();
        const isReview = !!testRunnerConfig.options?.review;

        if (isReview) {
            this.containersBlackList = [
                ...this.containersBlackList,
                '.grid-row',
                '.qti-interaction > *',
                '.qti-extendedTextInteraction .math-entry'
            ];
            this.containersWhiteList = ['.qti-extendedTextInteraction > .text-container'];
        }

        this.applySymbolsConfig(this.symbolsConfig);

        let lastRestoreToken;
        /**
         * Cache annotations and markers coming from backend when item data is loaded
         * @param {String} itemRef
         * @param {Object} itemData
         */
        const onItemLoaded = (itemRef, itemData) => {
            const annotations = cloneDeep(itemData?.extraData?.scoring?.comments?.annotations) || {};
            this.setAnnotationsForItem(itemRef, annotations);

            const markingsModelPerKey = this.getMarkingsModelState();
            if (!Object.prototype.hasOwnProperty.call(markingsModelPerKey, itemRef)) {
                const markersFromAnnotations = this.getMarkersFromAnnotations(annotations);
                this.setMarkersForItem(itemRef, markersFromAnnotations);
            }
        };
        /**
         * Wait for some time as a precaution because some elements may not be rendered immediately,
         * then restore markings.
         * In some edge cases item may be rendered twice in quick sequence,
         * so ensure old promises don't continue to run and don't restore markers twice.
         * @param {Symbol} restoreToken
         * @returns {Promise}
         */
        const restoreMarkers = restoreToken =>
            tick()
                .then(tick)
                .then(tick)
                .then(() => {
                    if (restoreToken === lastRestoreToken && this.isItemRenderedStatus()) {
                        this.restoreItemMarkers();
                    }
                    // All markers for current item have now been restored, so it's safe to show toolbar
                    if (this.getOpenState()) {
                        this.open();
                    }
                });
        /**
         * After navigation finished or overview closed, when item is mounted,
         * restore markings
         */
        const onItemMounted = () => {
            lastRestoreToken = Symbol();
            restoreMarkers(lastRestoreToken);
        };

        /**
         * When unloading item (before navigation away), reset the toolbar's inner state
         * (just counters & mode selection; opened state remains the same)
         */
        const onItemUnload = () => {
            this.detachListeners();
            this.clearMarkers();
            this.unobserveContainerResizes();
            this.activeSymbolId = null;
            this.countsBySymbol = {};
            this.syncToolbarProps();
            this.updateItemModeClass();
        };

        testRunner
            .on('proctor-reset', () => {
                this.setMarkingsModelState({});
                this.countsBySymbol = {};
                this.activeSymbolId = null;
                this.annotationsByItem = {};
                onItemUnload();
            })
            .on(`loaditem.${this.getName()}`, onItemLoaded)
            .on('toolbaraction.markingSymbols', key => {
                if (key === this.getName()) {
                    if (this.getOpenState()) {
                        this.close();
                    } else {
                        this.open();
                    }
                } else if (isMutuallyExclusiveTool(this.getName(), key)) {
                    if (this.getOpenState()) {
                        this.close();
                    }
                }
            })
            .after('renderitem.markingSymbols', itemRef => {
                onItemMounted(itemRef);
                this.observeContainerResizes();
            })
            .after('enableitem.markingSymbols', itemRef => {
                onItemMounted(itemRef);
                this.observeContainerResizes();
            })
            .on('unloaditem.markingSymbols', onItemUnload)
            .on('itemModalFeedback.markingSymbols', () => {
                onItemUnload();
                this.close();
            });
    },

    /**
     * Destroy the plugin and its components. Normally called only at the end of a test session.
     */
    destroy() {
        this.destroyToolbar();
        if (this.toolbarContainer && this.toolbarContainerCreated) {
            this.toolbarContainer.remove();
        }
        this.toolbarContainer = null;
        this.toolbarContainerCreated = false;
        this.detachListeners();
        this.unobserveContainerResizes();
        this.clearMarkers();
        window.removeEventListener('message', this.messageListener);
        this.getTestRunner().off('.markingSymbols');
    }
};

/**
 * the markingSymbols plugin allows to place marker symbols inside item text
 */
export default pluginFactory(markingSymbolsPlugin);
