<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2023-2025 (original work) Open Assessment Technologies SA ;
    import { Dropdown, Icon } from '@oat-sa-private/ui-elements';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    let eventName = '';
    let payloadStr = '';

    const dropdownOptions = {
        refreshTimers: 'Refresh timers',
        proctoringAcsActionPause: 'Proctor pause',
        proctoringAcsActionResume: 'Proctor resume',
        proctoringAcsActionTerminate: 'Proctor terminate',
        proctoringAcsActionReopen: 'Proctor reopen',
        proctoringAcsActionUpdate: 'Proctor update time',
        proctoringAcsActionReset: 'Proctor reset',
        proctoringAcsActionError: 'Proctoring error',
        forceLogout: 'Force logout'
    };
    const presetEventNames = {
        refreshTimers: 'refresh-timers',
        proctoringAcsActionPause: 'proctoring-acs-action',
        proctoringAcsActionResume: 'proctoring-acs-action',
        proctoringAcsActionTerminate: 'proctoring-acs-action',
        proctoringAcsActionReopen: 'proctoring-acs-action',
        proctoringAcsActionUpdate: 'proctoring-acs-action',
        proctoringAcsActionReset: 'proctoring-acs-action',
        proctoringAcsActionError: 'proctoring-acs-action-error',
        forceLogout: 'force_logout'
    };
    const presetPayloads = {
        refreshTimers: {
            extra: {
                started: true,
                maxTime: 60000,
                maxTimeRemaining: 60000
            },
            // ids should be modified in textarea before sending (check last presetproxy-emit message)
            test: {
                id: 'test',
                started: true,
                maxTime: 60000,
                maxTimeRemaining: 60000
            },
            testParts: [
                {
                    id: 'testPart-1',
                    started: true,
                    maxTime: 60000,
                    maxTimeRemaining: 60000
                }
            ],
            sections: [
                {
                    id: 'assessmentSection-1',
                    started: true,
                    maxTime: 60000,
                    maxTimeRemaining: 60000
                }
            ],
            items: [
                {
                    id: 'item1',
                    started: true,
                    maxTime: 60000,
                    maxTimeRemaining: 60000
                }
            ]
        },
        proctoringAcsActionPause: { action: 'pause' },
        proctoringAcsActionResume: { action: 'resume' },
        proctoringAcsActionTerminate: { action: 'terminate' },
        proctoringAcsActionReopen: { action: 'reopen' },
        proctoringAcsActionUpdate: { action: 'update', extra_time: 3 },
        proctoringAcsActionReset: { action: 'reset' },
        proctoringAcsActionError: 'Something went wrong'
    };

    function handleDropdownChange(e) {
        const value = e.detail.value;
        eventName = presetEventNames[value];
        if (typeof presetPayloads[value] === 'string') {
            payloadStr = presetPayloads[value];
        } else {
            payloadStr = JSON.stringify(presetPayloads[value], null, 2);
        }
    }

    function dispatchToProxy() {
        const detail = {
            eventName,
            payloadStr
        };
        // listener is defined in mswMocks/handlers.js
        window.dispatchEvent(new CustomEvent('presetsocket-send', { detail }));
    }
</script>

<style>
    .presetsocket-setup {
        padding: 1rem;
        background-color: var(--color-primaryPale);
        border: 1px solid darkgrey;
        box-shadow: 0 0 0.5rem 0 rgba(0, 0, 0, 0.3);

        & .connected-label {
            display: none;
        }
        & .closer {
            background: none;
            border: 0;
            position: absolute;
            top: 0;
            right: 0;
            cursor: pointer;
        }
        & input {
            width: 100%;
        }
        & textarea {
            width: 100%;
            font-family: var(--font-monospace);
        }
        & .presetsocket-setup-send {
            width: 100%;
        }
    }
    :global(#test-runner-sandbox[data-socket-connected='true']) {
        & .presetsocket-setup {
            & .connected-label {
                display: inline;
                text-style: italic;
            }
        }
    }
</style>

<div class="presetsocket-setup">
    <p class="ui-heading-l">Socket Proxy <span class="connected-label text-md">(connected)</span></p>
    <details class="text-sm">
        <summary class="text-md">Send messages to the test runner FE socket</summary>
        <p>This sandbox feature simulates having an open websocket connection to a backend.</p>
        <p>Backend socket messages can be submitted, to preview how the frontend app will react to them.</p>
        <p>The loaded test must be configured for timers and/or proctoring.</p>
        <p>
            - <u>Timers messages:</u> a continuously decreasing backend timer is simulated (<em>not</em> identical to
            tao-timers-be).<br />
            - <u>Proctoring messages:</u> can be used to check how the frontend view will update when a proctored delivery
            is remotely paused, resumed etc.
        </p>
    </details>
    <button class="closer" on:click={() => dispatch('close')}>
        <Icon name="remove-12" ariaHidden />
    </button>
    <div>
        <Dropdown height="small" reset={false} fullwidth options={dropdownOptions} on:change={handleDropdownChange} />
        <input placeholder="eventName" bind:value={eventName} />
        <pre><textarea placeholder="payload" rows="8" bind:value={payloadStr}></textarea></pre>
        <button class="presetsocket-setup-send" on:click={dispatchToProxy}>SEND</button>
    </div>
    <!-- <button>connect</button> -->
    <!-- <button>disconnect</button> -->
</div>
