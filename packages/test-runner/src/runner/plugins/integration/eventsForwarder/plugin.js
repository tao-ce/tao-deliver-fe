// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
/* eslint-disable jsdoc/valid-types */

import pluginFactory from 'taoTests/runner/plugin';
import { defaultsDeep } from 'lodash';
import { getXPath } from 'xpath-dom';
import queueFactory from './queue.js';

/**
 * This plugin gathers DOM events fired from:
 * - PCI containers
 * - QTI interaction containers (in the future)
 * The gathered events are batched and forwarded to a backend endpoint.
 * During the item, if enough events are received to fill the buffer, it will be sent.
 * On item unload, anything remaining in the buffer will be sent.
 * The outgoing event schema is an object with some core properties for TAO, and a 'metadata' property with a free structure.
 */

const defaultConfig = {
    qtiItemContainerSelector: '.qti-item',
    pciContainerSelector: '.qti-customInteraction .unit-container',
    interactionContainerSelector: '.qti-interaction',
    pciEvents: [
        {
            type: 'feedtrace', // name of a DOM event to listen to on the configured container
            property: 'trace' // property of the event detail which we want to forward
        }
    ],
    qtiEvents: [
        {
            type: 'interactiontrace' // name of a DOM event to listen to on the configured container
        }
    ],
    output: {
        // The number of events gathered in a batch for current item, until sending occurs:
        // (note that some PCIs may do their own batching)
        bufferSize: 500,
        // Metadata keys to be discarded:
        ignoreMetadataKeys: ['time', 'eventCounter', 'lang']
    },
    forwardOnItemReady: true // forward on item ready
};

/**
 * @typedef {TAOTraceEvent}
 * @property {String} domEventType - name of the DOM event
 * @property {String} itemId - (QTI) itemIdentifier (from testContext)
 * @property {String} responseIdentifier - (QTI) responseIdentifier of the interaction
 * @property {Object} metadata - contains any extra key-value pairs
 */

export default pluginFactory({
    name: 'eventsForwarder',

    install() {
        const testRunner = this.getTestRunner();
        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        this.pluginConfig = defaultsDeep({}, providedConfig, defaultConfig);

        const selectEvents = ['change', 'keydown'];

        queueFactory({
            id: `${this.getName()}.${testRunner.getConfig().serviceCallId}`,
            bufferSize: this.pluginConfig.output.bufferSize,
            flush(events) {
                return testRunner.getProxy().callTestAction('ui-log', { events });
            }
        }).then(eventsQueue => {
            this.eventsQueue = eventsQueue;
        });

        /**
         * Handles the conversion from an interaction trace event to the TAOTraceEvent format
         * @param {Object} traceEvent
         * @returns {TAOTraceEvent}
         */
        const transformTraceEvent = traceEvent => {
            /** @type {TAOTraceEvent} */
            const taoTraceEvent = {
                metadata: {}
            };

            // Since the event is from a 3rd party component,
            // we store its properties just as metadata (except for ignored ones)
            for (const traceKey of Object.keys(traceEvent)) {
                if (!this.pluginConfig.output.ignoreMetadataKeys.includes(traceKey)) {
                    taoTraceEvent.metadata[traceKey] = traceEvent[traceKey];
                }
            }
            return taoTraceEvent;
        };

        /**
         * Handles the DOM event triggered from inside a PCI on its container.
         * Transforms the event format and enriches the data.
         * Queues the trace events, and sends if queue got big.
         * @param {CustomEvent} event
         * @param {Object} event.detail
         * @param {Object[]} [event.detail.*] - some property containing a list of trace events
         */
        const handlePciEvent = event => {
            const matchedPciEventSchema = this.pluginConfig.pciEvents.find(e => e.type === event.type);
            if (!matchedPciEventSchema) {
                return;
            }
            const traceData = event.detail[matchedPciEventSchema.property];
            if (!traceData || !traceData.length) {
                return;
            }

            const { itemIdentifier } = testRunner.getTestContext();
            const interaction = event.target.closest('.qti-interaction[data-response-id]');
            const responseIdentifier = (interaction && interaction.dataset.responseId) || null;

            this.eventsQueue.enqueue(
                traceData.map(transformTraceEvent).map(traceEvent => ({
                    ...traceEvent,
                    // enriching the trace event with the mandatory properties
                    domEventType: event.type,
                    itemIdentifier,
                    responseIdentifier
                }))
            );
        };

        /**
         * Returns the component type from the qtiClass
         * @param {String} [qtiClass]
         * @returns {Object|void} - { componentType: '...' }
         */
        const getComponentType = qtiClass => {
            if (qtiClass) {
                return { componentType: `${qtiClass.charAt(0).toUpperCase()}${qtiClass.slice(1)}` };
            }
        };

        const getTypeIdentifier = typeIdentifier => {
            if (typeIdentifier) {
                return { typeIdentifier: `${typeIdentifier.charAt(0).toUpperCase()}${typeIdentifier.slice(1)}` };
            }
        };

        /**
         * Handles the DOM event triggered from inside an interaction on its container.
         * Transforms the event format and enriches the data.
         * Queues the trace events, and sends if queue got big.
         * @param {CustomEvent<TraceEventDetails>} event
         */
        const handleInteractionEvent = event => {
            const { target, domEventType, touched, ...metadata } = event.detail;
            let xPath, equivalentUserEventType;
            if (target) {
                xPath = getXPath(target, event.currentTarget);
            }
            equivalentUserEventType = domEventType;
            if (selectEvents.includes(domEventType)) {
                equivalentUserEventType = 'keyup';
            } else if (domEventType === 'mouseup') {
                equivalentUserEventType = 'click';
            }
            const { itemIdentifier } = testRunner.getTestContext();
            const responseIdentifier = event.currentTarget.dataset.responseId || null;
            const qtiClass = event.currentTarget.dataset.qtiClass || null;
            const typeIdentifier = event.target.dataset.typeIdentifier || null;

            this.eventsQueue.enqueue({
                domEventType,
                itemIdentifier,
                responseIdentifier,
                metadata: {
                    timeStamp: Date.now(),
                    equivalentUserEventType,
                    ...getComponentType(qtiClass),
                    ...getTypeIdentifier(typeIdentifier),
                    ...metadata,
                    ...(xPath && { targetId: xPath })
                }
            });

            if (touched !== false) {
                // only if not explicitly signed as 'touched: false'
                testRunner.setItemState(itemIdentifier, 'touched', true);
            }
        };

        /**
         * Add configured listener(s) to pci received element(s)
         * @param {NodeList} elts
         */
        this.addPciEventListeners = elts => {
            for (const elt of elts) {
                for (const { type } of this.pluginConfig.pciEvents) {
                    elt.addEventListener(type, handlePciEvent);
                }
            }
        };

        /**
         * Remove configured listener(s) from pci received element(s)
         * @param {NodeList} elts
         */
        this.removePciEventListeners = elts => {
            for (const elt of elts) {
                for (const { type } of this.pluginConfig.pciEvents) {
                    elt.removeEventListener(type, handlePciEvent);
                }
            }
        };

        /**
         * Add configured listener(s) to interaction received element(s)
         * @param {NodeList} elts
         */
        this.addInteractionEventListeners = elts => {
            for (const elt of elts) {
                for (const { type } of this.pluginConfig.qtiEvents) {
                    elt.addEventListener(type, handleInteractionEvent);
                }
            }
        };

        /**
         * Remove configured listener(s) from interaction received element(s)
         * @param {NodeList} elts
         */
        this.removeInteractionEventListeners = elts => {
            for (const elt of elts) {
                for (const { type } of this.pluginConfig.qtiEvents) {
                    elt.removeEventListener(type, handleInteractionEvent);
                }
            }
        };

        this.shouldImmediatelySendEvents = (type, scope) =>
            // forward on item ready to have info in case of crash
            (this.pluginConfig.forwardOnItemReady && type === 'ready' && scope === 'item') ||
            // sometimes finish of this plugin happens earlier than finish in lifecycleEventPlugin
            (type === 'finish' && scope === 'test');
    },

    init() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();

        testRunner
            .on('renderitem', () => {
                const itemContainer = areaBroker
                    .getContentArea()
                    .querySelector(this.pluginConfig.qtiItemContainerSelector);
                this.pciContainers = itemContainer.querySelectorAll(this.pluginConfig.pciContainerSelector);
                if (this.pciContainers) {
                    this.addPciEventListeners(this.pciContainers);
                }
                this.interactionContainers = itemContainer.querySelectorAll(
                    this.pluginConfig.interactionContainerSelector
                );
                this.interactionContainers =
                    this.interactionContainers.length > 0 ? this.interactionContainers : [itemContainer];
                this.addInteractionEventListeners(this.interactionContainers);
            })
            .on('unloaditem itemModalFeedback', () => {
                this.eventsQueue.flush();

                if (this.pciContainers) {
                    this.removePciEventListeners(this.pciContainers);
                    this.pciContainers = null;
                }
                if (this.interactionContainers) {
                    this.removeInteractionEventListeners(this.interactionContainers);
                    this.interactionContainers = null;
                }
            })
            .on('finish', () => {
                // fallback in case a previous send failed
                this.eventsQueue.flush();
            })
            .on('proctor-reset', async () => {
                if (this.eventsQueue) {
                    await this.eventsQueue.clear();
                }
            })
            .on('lifecycleEvent', (type, scope, detail) => {
                let itemIdentifier = null;
                if (scope === 'item') {
                    itemIdentifier = testRunner.getTestContext().itemIdentifier;
                }

                const newEvent = {
                    domEventType: 'custom',
                    itemIdentifier,
                    responseIdentifier: null,
                    metadata: {
                        type,
                        scope,
                        timeStamp: Date.now(),
                        ...detail
                    }
                };

                this.eventsQueue.enqueue(newEvent);

                if (this.shouldImmediatelySendEvents(type, scope)) {
                    this.eventsQueue.flush();
                }
            });
    },

    destroy() {
        if (this.pciContainers) {
            this.removePciEventListeners(this.pciContainers);
            this.pciContainers = null;
        }
        if (this.interactionContainers) {
            this.removeInteractionEventListeners(this.interactionContainers);
            this.interactionContainers = null;
        }
    }
});
