// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-6 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
export const testRunnerConfig = {
    options: {
        //customUiId: ['demo-banner-big-red'],
        itemRunnerConfig: {
            options: {
                hideTooltips: false
            },
            elements: {
                HottextInteraction: {
                    qtiClassesOverride: []
                },
                ExtendedTextInteraction: {
                    propertyOverride: {
                        uploadMaxSize: 1000000,
                        uploadTimeout: 300000,
                        reviewAutoSizeContent: true,
                        dataAttrs: {
                            // 'data-special-characters': 'latinAndMaths'
                        }
                    }
                }
            }
        },
        plugins: {
            navigator: {
                nonLinearRestricted: false,
                linearNavDelayBeforeEnabled: null,
                preventEarlyTestPartSubmission: false
            },
            localItemState: {
                saveState: {
                    enabled: true,
                    minWait: 2000,
                    maxWait: 5000,
                    liveSaveIndicator: {
                        enabled: true
                    }
                }
            },
            a11yMenuPanel: {
                convertPxToRem: {
                    enabled: true,
                    cssProperties: ['font-size']
                }
            },
            readAloud: {
                // providerId can be manually set to 'texthelp' or 'readweb', and the providerConfig adapted to match
                // If using 'texthelp', sandbox must be reconfigured to run on localhost:5400 as this is the supported domain/port
                providerId: 'native',
                providerConfig: {
                    ignoreSelector: '.do-not-read, #test-navigation button'
                }
            },
            inlineComments: {
                mode: ['read', 'write']
            },
            customUIStyles: {
                'paper-based': `
                    .qti-extendedTextInteraction {
                        & .positioning-wrapper,
                        & .cke-wrapper {
                            height: 15rem;
                            outline: 2px solid var(--color-border-default);
                            background: var(--color-bg-disabled-subtle);
                        }
                        & .positioning-wrapper > *,
                        & .cke-wrapper > *,
                        & label {
                            display: none;
                        }
                    }`,
                'demo-banner-big-red': `
                    .qti-item::after {
                        content: 'DEMO TEST';
                        color: rgba(255, 0, 0, 0.125);
                        font-weight: bold;
                        position: absolute;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        right: 0;
                        font-size: clamp(8rem, 4rem + 18vw, 40rem);
                        line-height: 1.2;
                        text-align: center;
                        pointer-events: none;
                    }`
            }
        },
        realTimeService: {
            enabled: true,
            socketConnectionUrl: 'wss://localhost:5500'
        },
        timersService: {
            throttleConfig: {
                minutesThreshold: 10
            },
            warningConfig: {
                levels: {
                    test: {
                        thresholdsInMs: [60_000, 120_000]
                    }
                },
                notificationTimeout: 5000
            }
        }
    },
    testTaker: {
        id: 'sandbox-taker',
        name: 'Sandbox Taker',
        firstName: null,
        lastName: null
    },
    themes: {
        testRunner: {
            showUserMenu: true
        }
    }
};
