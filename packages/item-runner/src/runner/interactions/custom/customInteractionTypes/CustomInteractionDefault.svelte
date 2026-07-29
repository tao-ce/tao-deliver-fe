<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2025 (original work) Open Assessment Technologies SA ;
    import { getContext, onMount, onDestroy } from 'svelte';
    import { getInteractionStateStore } from '../../../itemsStateStore.js';
    import Prompt from '../../Prompt.svelte';
    import pciLoader from '../pciLoader.js';

    const qtiClass = 'qti-customInteraction';

    // keys for state store and context
    export let itemIdentifier;
    export let responseIdentifier;

    // interaction-level QTI attributes:
    export let markup = '';
    export let typeIdentifier;
    export let properties;

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let classes = '';
    export let dir;

    // data attributes
    export let dataAttrs = {};

    export let prompt;

    export let container;
    export let pciInstance;
    export let isInitialMount = true;

    /**
     * Do something custom after PCI instantiated and called 'onready'
     * @type {Function} `(instance, initialState) => Promise<void>|void`
     */
    export let afterPciInstantiated;

    // interaction destroy is called
    let isDestroyed = false;

    const destroyedInteractionErrorType = 'destroyedInteractionErrorType';

    let interactionElement;

    // context
    const itemContext = getContext(itemIdentifier);

    // store
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    // do initial response definition
    if (!interactionStateStore.hasResponse()) {
        interactionStateStore.setResponse({ base: null });
    }

    // functions used in stateUpdate process which can be overridden
    export let handleState = state => {
        interactionStateStore.merge({ state });
    };

    export let handleResponse = response => {
        interactionStateStore.setResponse(response);
    };

    // used methods of interactionStateStore API, which can be overridden
    export let getInitialResponse = interactionStateStore.getResponse;
    export let getInitialState = () => interactionStateStore.get().state;
    export let doInitialStateUpdate = state => {
        interactionStateStore.merge({
            qtiClass,
            typeIdentifier,
            state
        });
    };

    /**
     * Creates a new instance from a PCI with calling getInstance
     * @param {Object} qtiCustomInteractionContext
     * @returns {Promise<instance>} New instance of PCI
     */
    function instantiatePCI(qtiCustomInteractionContext) {
        return new Promise((resolve, reject) => {
            const initialResponse = getInitialResponse();
            try {
                qtiCustomInteractionContext.getInstance(
                    typeIdentifier,
                    container,
                    {
                        properties: structuredClone(properties || {}),
                        boundTo: { [responseIdentifier]: initialResponse },
                        onready: (instance, initialState) => {
                            resolve([instance, initialState]);
                        }
                    },
                    getInitialState()
                );
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Loads a PCI
     * @returns {Promise<qtiCustomInteractionContext>}
     */
    function loadPCI() {
        const { getPCI, getAssetManager } = itemContext;
        const assetManager = getAssetManager();
        const pci = getPCI(typeIdentifier);
        const pciModulePath = assetManager.resolve(pci.runtime.hook);

        return pciLoader(pciModulePath);
    }

    /**
     * Extracts state and response from PCI, sets them to store
     * @param {Object} parameters
     * @param {boolean} [parameters.state=true] - should extract state
     * @param {boolean} [parameters.response=true] - should extract response
     */
    function stateUpdate(parameters) {
        // both state and response are extracted by default
        const { state: shouldExtractState, response: shouldExtractResponse } = Object.assign(
            { state: true, response: true },
            parameters
        );

        if (shouldExtractState) {
            handleState(pciInstance.getState());
        }

        if (shouldExtractResponse) {
            handleResponse(pciInstance.getResponse());
        }
    }

    function loadAndInstantiatePCI() {
        return loadPCI()
            .then(qtiCustomInteractionContext => {
                // if interaction is destroyed during PCI source load
                if (isDestroyed) {
                    const error = new Error('Interaction is destroyed');
                    error.type = destroyedInteractionErrorType;
                    throw error;
                }
                return qtiCustomInteractionContext;
            })
            .then(instantiatePCI)
            .then(async ([newPCIInstance, initialState]) => {
                if (afterPciInstantiated) {
                    await afterPciInstantiated(newPCIInstance, initialState);
                }

                if (isDestroyed) {
                    newPCIInstance.oncompleted();
                } else {
                    pciInstance = newPCIInstance;
                    if (!properties?.isReviewMode) {
                        doInitialStateUpdate(initialState);
                        itemContext.on('stateupdate', stateUpdate);
                    }
                }
            })
            .catch(e => {
                if (!e || e.type !== destroyedInteractionErrorType) {
                    throw e;
                }
            }); // catch will be handled by Item#registerLoadingElement
    }

    onMount(() => {
        if (itemContext) {
            if (isInitialMount) {
                itemContext.registerLoadingElement(loadAndInstantiatePCI);
            } else {
                loadAndInstantiatePCI();
            }
        }
    });

    onDestroy(() => {
        if (pciInstance) {
            if (!properties?.isReviewMode) {
                stateUpdate();
            }
            pciInstance.oncompleted();
            itemContext.off('stateupdate', stateUpdate);
        }
        isDestroyed = true;
    });

    function dispatchInteractiontrace({ detail = {} }) {
        const interactionTraceEvent = new CustomEvent('interactiontrace', {
            detail: {
                domEventType: 'custom',
                ...detail
            }
        });

        interactionElement.dispatchEvent(interactionTraceEvent);
    }
</script>

<div
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    data-type-identifier={typeIdentifier}
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}
    bind:this={interactionElement}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}
    <div bind:this={container} on:interactiontrace|stopPropagation={dispatchInteractiontrace}>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html markup}
    </div>
</div>
