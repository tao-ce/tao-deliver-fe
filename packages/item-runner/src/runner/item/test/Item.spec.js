// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import MockStylesheetsLoader from './MockStylesheetsLoader.svelte';
import blockTypes from '../blocks/blockTypes.js';
import { getItemSettingsStore, releaseItemSettingsStore } from '../../itemsSettingsStore.js';

vi.mock('../stylesheets/StylesheetsLoader.svelte', () => ({
    default: MockStylesheetsLoader
}));
vi.mock('../../util/scroll.js');

import { generateElementId } from '@oat-sa-private/ui-core';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
import Item from '../Item.svelte';
import ContextGetter from './ContextGetter.svelte';
import itemSessionStatus from '../../itemSessionStatus.js';
import {
    getItemSequentialInteractionsStore,
    releaseItemSequentialInteractionsStore
} from '../../itemsSequentialInteractionsStore.js';
import MockSequentialInteraction from './MockSequentialInteraction.svelte';

const mockAssetManager = {
    resolve: src => src
};

describe('Item', () => {
    afterEach(() => {
        itemsSessionStatusStore.clear();
    });

    it('renders with basic props (but no blockTree)', () => {
        const itemIdentifier = 'item-1';
        const { container } = render(Item, {
            props: {
                itemIdentifier
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders with itemLang and itemDir and itemClassList props', () => {
        const itemIdentifier = 'item-1';
        const itemLang = 'it-IT';
        const itemDir = 'rtl';
        const itemClassList = 'foo separator-between-columns bar';
        const { container } = render(Item, {
            props: {
                itemIdentifier,
                itemLang,
                itemDir,
                itemClassList
            }
        });

        expect(container).toMatchSnapshot();
    });

    it.each([['it-IT'], ['ar-arb']])('renders with itemLang "%s" and infers itemDir', itemLang => {
        const itemIdentifier = 'item-1';
        const { container } = render(Item, {
            props: {
                itemIdentifier,
                itemLang
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders with sessionStatus from store', () => {
        const itemIdentifier = 'item-2';
        getItemSessionStatusStore(itemIdentifier).set('suspended');
        const { container } = render(Item, {
            props: {
                itemIdentifier
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('change sessionStatus to closed', () => {
        const itemIdentifier = 'item-3';
        const { container } = render(Item, {
            props: {
                itemIdentifier
            }
        });

        expect(container.querySelector('section')).not.toHaveClass('closed');
        expect(container).toMatchSnapshot();

        return new Promise(resolve => {
            setTimeout(() => {
                getItemSessionStatusStore(itemIdentifier).set('closed');
                return tick().then(() => {
                    expect(container.querySelector('section')).toHaveClass('closed');
                    expect(container).toMatchSnapshot();

                    resolve();
                });
            }, 10);
        });
    });

    // skipped: snapshots refuse to pass - DOM not reacting to status store changes...
    it.skip('renders style tags when the loading completes - including suspend/unsuspend', () =>
        new Promise(done => {
            const itemIdentifier = 'item-1';

            const itemSettingsStore = getItemSettingsStore(itemIdentifier);
            itemSettingsStore.set({
                a11yMenuPanel: {
                    convertPxToRem: {
                        enabled: true,
                        cssProperties: ['my-css-prop', 'abc']
                    },
                    abc: 'def'
                }
            });

            const { container } = render(Item, {
                props: {
                    itemIdentifier,
                    blockTree: [{ type: 'text', content: 'A short item' }],
                    stylesheets: {
                        1: { attributes: { href: 'style/simple.css', media: 'all', type: 'text/css' }, serial: '1' },
                        2: {
                            attributes: {
                                href: 'style/passageStyles.css',
                                media: 'all',
                                type: 'text/css',
                                scope: '.scope-me'
                            },
                            serial: '2'
                        }
                    },
                    assetManager: mockAssetManager
                }
            });

            expect(container).toMatchSnapshot();
            expect(container.querySelector('.styles-container-mock')).toBeInTheDocument();

            getItemSessionStatusStore(itemIdentifier).set('suspended');

            return vi.waitFor(async () => {
                expect(container.querySelector('.qti-item')).not.toBeInTheDocument();
                expect(container.querySelector('.styles-container-mock')).not.toBeInTheDocument();

                getItemSessionStatusStore(itemIdentifier).set('interacting');

                return vi.waitFor(() => {
                    expect(container.querySelector('.qti-item')).toBeInTheDocument();
                    expect(container.querySelector('.styles-container-mock')).toBeInTheDocument();
                    itemSettingsStore.set({});
                    releaseItemSettingsStore(itemIdentifier);
                    done();
                }, 2500);
            }, 2500);
        }));

    it('renders a style tag if options.itemRunnerConfig.itemStyles is set', () => {
        const itemIdentifier = 'item-2';
        const { container } = render(Item, {
            props: {
                itemIdentifier,
                options: {
                    itemRunnerConfig: {
                        itemStyles: 'p { color: red; }'
                    }
                }
            }
        });

        const stylesContainer = container.querySelector('.styles-container-mock');
        expect(stylesContainer).toBeInTheDocument();
        expect(container).toMatchSnapshot();
    });

    describe('Instructions', () => {
        it('are visible by default', () => {
            const itemIdentifier = 'item-1';
            const { container } = render(Item, {
                props: {
                    itemIdentifier
                }
            });

            expect(container.querySelector('section.qti-item')).not.toHaveClass('remove-instructions');
        });

        it('are hidden with the class __custom__remove-instructions', () => {
            const itemIdentifier = 'item-1';
            const { container } = render(Item, {
                props: {
                    itemIdentifier,
                    itemClassList: '__custom__remove-instructions'
                }
            });
            expect(container.querySelector('section.qti-item')).toHaveClass('remove-instructions');
        });

        it('are hidden with the class remove-instructions', () => {
            const itemIdentifier = 'item-1';
            const { container } = render(Item, {
                props: {
                    itemIdentifier,
                    itemClassList: 'remove-instructions'
                }
            });
            expect(container.querySelector('section.qti-item')).toHaveClass('remove-instructions');
        });
    });

    describe('Context', () => {
        it('returns expected API', () =>
            new Promise(done => {
                const itemIdentifier = 'item-3';
                const functionNames = [
                    'getAssetManager',
                    'registerLoadingElement',
                    'getLogger',
                    'getItemLang',
                    'getUserLang',
                    'getInstructionsLang',
                    'getWritingMode',
                    'getXIncludeHrefs',
                    'getPCI',
                    'getReviewSessionSubstate',
                    'getTestContext',
                    'getExtraData',
                    'getGetAttachmentsUploadData',
                    'on',
                    'off',
                    'trigger',
                    'triggerError',
                    'showItemNotification',
                    'removeItemNotification',
                    'clearItemNotifications',
                    'clearItemNotificationsByKeys'
                ];

                const itemContextHandler = itemContext => {
                    expect(Object.keys(itemContext)).toEqual(functionNames);
                    for (let functionName of functionNames) {
                        expect(itemContext[functionName]).toBeTypeOf('function');
                    }
                    expect(itemContext.getXIncludeHrefs()).toEqual([]);
                    done();
                };

                render(Item, {
                    props: {
                        itemIdentifier,
                        blockTree: [
                            {
                                type: 'element',
                                component: ContextGetter,
                                props: {
                                    itemIdentifier,
                                    itemContextHandler
                                }
                            }
                        ]
                    }
                });
            }));

        it('PCI definition can be requested from itemContext', () =>
            new Promise(done => {
                const itemIdentifier = 'item-3';
                const fooPCIV1 = {
                    version: '0.1.*',
                    runtime: {
                        hook: 'demoPCI/runtime/demoPCI.js'
                    },
                    xmlns: 'http://www.imsglobal.org/xsd/portableCustomInteraction'
                };

                const itemContextHandler = itemContext => {
                    const fooPCIDefinition = itemContext.getPCI('fooPCI');
                    expect(fooPCIDefinition).toMatchObject(fooPCIV1);
                    done();
                };

                render(Item, {
                    props: {
                        itemIdentifier,
                        blockTree: [
                            {
                                type: 'element',
                                component: ContextGetter,
                                props: {
                                    itemIdentifier,
                                    itemContextHandler
                                }
                            }
                        ],
                        pci: {
                            fooPCI: [fooPCIV1]
                        }
                    }
                });
            }));

        it('calls triggered event on elements', () =>
            new Promise(done => {
                expect.assertions(3);
                const itemIdentifier = 'item-3';

                const { component } = render(Item, {
                    props: {
                        itemIdentifier,
                        blockTree: [
                            {
                                type: 'element',
                                component: ContextGetter,
                                props: {
                                    itemIdentifier,
                                    itemContextHandler: itemContext => {
                                        /**
                                         * async call is necessary to allow Item to finish initialization
                                         * and component variable could have a value
                                         */
                                        setTimeout(() => {
                                            const fooHandler = parameter => {
                                                // it will be called only one time because of unsubscribe
                                                expect(parameter).toEqual({ foo: 'bar' });
                                                itemContext.off('foo', fooHandler);
                                            };
                                            itemContext.on('foo', fooHandler);
                                            itemContext.on('bar', () => {
                                                // it should not be called at all
                                                expect(true).toBe(false);
                                            });
                                        }, 0);
                                    }
                                }
                            },
                            {
                                type: 'element',
                                component: ContextGetter,
                                props: {
                                    itemIdentifier,
                                    itemContextHandler: itemContext => {
                                        /**
                                         * async call is necessary to allow Item to finish initialization
                                         * and component variable could have a value
                                         */
                                        setTimeout(() => {
                                            let callCount = 0;
                                            const fooHandler = parameter => {
                                                callCount++;
                                                switch (callCount) {
                                                    case 1:
                                                        expect(parameter).toEqual({ foo: 'bar' });
                                                        break;
                                                    case 2:
                                                        expect(parameter).toEqual({ bar: 'baz' });
                                                        break;
                                                }
                                            };
                                            itemContext.on('foo', fooHandler);
                                            component.trigger('foo', { foo: 'bar' });
                                            component.trigger('foo', { bar: 'baz' });
                                            done();
                                        }, 0);
                                    }
                                }
                            }
                        ]
                    }
                });
            }));

        it('triggers stateupdate on suspend', () =>
            new Promise(done => {
                const itemIdentifier = 'item-5';

                const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
                itemSessionStatusStore.set(itemSessionStatus.initial);

                render(Item, {
                    props: {
                        itemIdentifier,
                        blockTree: [
                            {
                                type: 'element',
                                component: ContextGetter,
                                props: {
                                    itemIdentifier,
                                    itemContextHandler: itemContext => {
                                        /**
                                         * async call is necessary to allow Item to finish initialization
                                         * and component variable could have a value
                                         */
                                        setTimeout(() => {
                                            itemContext.on('stateupdate', () => {
                                                expect(itemSessionStatusStore.get()).toBe(itemSessionStatus.suspended);
                                                done();
                                            });
                                            itemSessionStatusStore.set(itemSessionStatus.suspended);
                                        }, 0);
                                    }
                                }
                            }
                        ]
                    }
                });
            }));

        it('children can call triggerError to dispatch error', () =>
            new Promise(done => {
                const itemIdentifier = 'item-5';

                const { component } = render(Item, {
                    props: {
                        itemIdentifier,
                        blockTree: [
                            {
                                type: 'element',
                                component: ContextGetter,
                                props: {
                                    itemIdentifier,
                                    itemContextHandler: itemContext => {
                                        /**
                                         * async call is necessary to wait for Item's $on handler to exist
                                         */
                                        setTimeout(() => {
                                            itemContext.triggerError(new Error('foo bar'));
                                        }, 0);
                                    }
                                }
                            }
                        ]
                    }
                });
                component.$on('error', e => {
                    expect(e.detail).toBeInstanceOf(Error);
                    expect(e.detail.toString()).toMatch('foo bar');
                    done();
                });
            }));

        test.each([
            [void 0, void 0, void 0],
            ['', '', void 0],
            ['en-GB', '', void 0],
            ['', 'it-IT', void 0],
            [void 0, 'de', void 0],
            ['en-US', 'fr-LU', 'fr-LU'],
            ['en-US', 'en-US', void 0],
            ['es-013', 'ru-Cyrl-BY', 'ru-Cyrl-BY'],
            ['no-NB', 'de', 'de']
        ])(
            'returns the correct lang codes from the itemContext',
            (itemLang, userLang, instructionLang) =>
                new Promise(done => {
                    const itemIdentifier = 'item-3';

                    const itemContextHandler = itemContext => {
                        expect(itemContext.getItemLang()).toEqual(itemLang);
                        expect(itemContext.getUserLang()).toEqual(userLang);
                        expect(itemContext.getInstructionsLang()).toEqual(instructionLang);
                        done();
                    };

                    render(Item, {
                        props: {
                            itemIdentifier,
                            itemLang,
                            userLang,
                            blockTree: [
                                {
                                    type: 'element',
                                    component: ContextGetter,
                                    props: {
                                        itemIdentifier,
                                        itemContextHandler
                                    }
                                }
                            ]
                        }
                    });
                })
        );

        it('gets reviewSessionSubstate from itemContext', () =>
            new Promise(done => {
                const itemIdentifier = 'item-3';

                const itemContextHandler = itemContext => {
                    expect(itemContext.getReviewSessionSubstate()).toBe('answer');
                    done();
                };

                render(Item, {
                    props: {
                        itemIdentifier,
                        blockTree: [
                            {
                                type: 'element',
                                component: ContextGetter,
                                props: {
                                    itemIdentifier,
                                    itemContextHandler
                                }
                            }
                        ],
                        options: {
                            reviewSessionSubstate: 'answer'
                        }
                    }
                });
            }));

        it('gets extraData from itemContext', () =>
            new Promise(done => {
                const itemIdentifier = 'item-3';
                const extraData = {
                    foo: 'bar'
                };

                const itemContextHandler = itemContext => {
                    expect(itemContext.getExtraData()).toEqual(extraData);
                    done();
                };

                render(Item, {
                    props: {
                        itemIdentifier,
                        blockTree: [
                            {
                                type: 'element',
                                component: ContextGetter,
                                props: {
                                    itemIdentifier,
                                    itemContextHandler
                                }
                            }
                        ],
                        extraData
                    }
                });
            }));

        it('gets getAttachmentsUploadData function from itemContext', () =>
            new Promise(done => {
                const itemIdentifier = 'item-3';
                const getAttachmentsUploadData = () => {};

                const itemContextHandler = itemContext => {
                    expect(itemContext.getGetAttachmentsUploadData()).toEqual(getAttachmentsUploadData);
                    done();
                };

                render(Item, {
                    props: {
                        itemIdentifier,
                        blockTree: [
                            {
                                type: 'element',
                                component: ContextGetter,
                                props: {
                                    itemIdentifier,
                                    itemContextHandler
                                }
                            }
                        ],
                        options: {
                            getAttachmentsUploadData
                        }
                    }
                });
            }));

        it('passes config options correctly in context', () => {
            const itemIdentifier = 'item-1';
            const itemContextHandler = vi.fn();
            render(Item, {
                props: {
                    itemIdentifier,
                    options: { itemRunnerConfig: { options: { stylePromptAsHeader: true } } },
                    blockTree: [
                        {
                            type: blockTypes.element,
                            component: ContextGetter,
                            props: { itemContextHandler, itemIdentifier: 'itemRunnerConfig' }
                        }
                    ]
                }
            });

            expect(itemContextHandler).toHaveBeenCalledWith({
                options: { hideTooltips: true, stylePromptAsHeader: true },
                elements: { ExtendedTextInteraction: void 0 }
            });
        });

        test.each([
            [null, '', ''],
            ['vertical-rl', 'writing-mode-vertical-rl', 'writing-mode-vertical-rl']
        ])(
            'getWritingMode returns writing-mode based on item class',
            (writingMode, itemClassList, classesInDom) =>
                new Promise(done => {
                    const itemIdentifier = 'item-3';
                    const itemContextHandler = async itemContext => {
                        expect(itemContext.getWritingMode()).toEqual(writingMode);
                        await tick();
                        expect(document.querySelector('.qti-item').getAttribute('class')).toContain(classesInDom);
                        done();
                    };
                    render(Item, {
                        props: {
                            itemIdentifier,
                            itemClassList,
                            blockTree: [
                                {
                                    type: 'element',
                                    component: ContextGetter,
                                    props: {
                                        itemIdentifier,
                                        itemContextHandler
                                    }
                                }
                            ]
                        }
                    });
                })
        );

        describe('Sequential interactions', () => {
            it('gets sequentialInteractionsStore and starts first one', () => {
                const itemIdentifier = 'item-3';
                const responseIdentifier1 = 'RESPONSE_1';
                const responseIdentifier2 = 'RESPONSE_2';
                const responseIdentifier3 = 'RESPONSE_3';

                const seq = getItemSequentialInteractionsStore(itemIdentifier);

                expect(seq.length).toBe(0);
                expect(get(seq.currentResponseIdentifier)).toBe(null);

                render(Item, {
                    props: {
                        itemIdentifier,
                        options: {
                            renderer: 'common'
                        },
                        blockTree: [
                            {
                                type: 'element',
                                component: MockSequentialInteraction,
                                props: {
                                    itemIdentifier,
                                    responseIdentifier: responseIdentifier1,
                                    classes: ''
                                }
                            },
                            {
                                type: 'element',
                                component: MockSequentialInteraction,
                                props: {
                                    itemIdentifier,
                                    responseIdentifier: responseIdentifier2,
                                    classes: 'sequential'
                                }
                            },
                            {
                                type: 'element',
                                component: MockSequentialInteraction,
                                props: {
                                    itemIdentifier,
                                    responseIdentifier: responseIdentifier3,
                                    classes: 'sequential'
                                }
                            }
                        ]
                    }
                });

                expect(seq.length).toBe(2);
                expect(get(seq.currentResponseIdentifier)).toBe(responseIdentifier2);

                seq.clear();
                releaseItemSequentialInteractionsStore(itemIdentifier);
            });

            it('starts no sequence in review mode', () => {
                const itemIdentifier = 'item-4';
                const responseIdentifier1 = 'RESPONSE_1';

                const seq = getItemSequentialInteractionsStore(itemIdentifier);

                expect(seq.length).toBe(0);
                expect(get(seq.currentResponseIdentifier)).toBe(null);

                render(Item, {
                    props: {
                        itemIdentifier,
                        options: {
                            renderer: 'review'
                        },
                        blockTree: [
                            {
                                type: 'element',
                                component: MockSequentialInteraction,
                                props: {
                                    itemIdentifier,
                                    responseIdentifier: responseIdentifier1,
                                    classes: 'sequential',
                                    renderer: 'review'
                                }
                            }
                        ]
                    }
                });

                expect(seq.length).toBe(0);
                expect(get(seq.currentResponseIdentifier)).toBe(null);
            });

            it('pauses/resumes sequence on doNotPlayMedia setting change', async () => {
                const itemIdentifier = 'item-5';
                const responseIdentifier2 = 'RESPONSE_2';
                const responseIdentifier3 = 'RESPONSE_3';

                const stateupdateSpy = vi.fn();
                const itemSettingsStore = getItemSettingsStore(itemIdentifier);

                const seq = getItemSequentialInteractionsStore(itemIdentifier);
                expect(seq.length).toBe(0);
                expect(get(seq.currentResponseIdentifier)).toBe(null);

                const blockTree = [
                    {
                        type: 'element',
                        component: MockSequentialInteraction,
                        props: {
                            itemIdentifier,
                            responseIdentifier: responseIdentifier2,
                            classes: 'sequential'
                        }
                    },
                    {
                        type: 'element',
                        component: MockSequentialInteraction,
                        props: {
                            itemIdentifier,
                            responseIdentifier: responseIdentifier3,
                            classes: 'sequential'
                        }
                    },
                    {
                        type: 'element',
                        component: ContextGetter,
                        props: {
                            itemIdentifier,
                            itemContextHandler: itemContext => {
                                itemContext.on('stateupdate', stateupdateSpy);
                            }
                        }
                    }
                ];

                render(Item, {
                    props: {
                        itemIdentifier,
                        options: {
                            renderer: 'common'
                        },
                        blockTree
                    }
                });

                expect(seq.didStart).toBe(false);
                expect(seq.length).toBe(2);
                expect(get(seq.currentResponseIdentifier)).toBe(responseIdentifier2);

                //some interaction has finished and sequence advances
                seq.didStart = true;
                seq.currentResponseIdentifier.set(responseIdentifier3);
                seq.saveState();
                expect(stateupdateSpy).not.toHaveBeenCalled();
                itemSettingsStore.set({ doNotPlayMedia: true });
                await tick();
                expect(stateupdateSpy).toHaveBeenCalled();
                //sequential interaction is expected to unmount itself

                itemSettingsStore.set({ doNotPlayMedia: false });
                await tick();
                expect(seq.didStart).toBe(false);
                expect(seq.length).toBe(2);
                expect(get(seq.currentResponseIdentifier)).toBe(responseIdentifier3);

                releaseItemSettingsStore(itemIdentifier);
            });

            it('if initial doNotPlayMedia false, starts sequence only after it becomes true', async () => {
                const itemIdentifier = 'item-6';
                const responseIdentifier2 = 'RESPONSE_2';
                const responseIdentifier3 = 'RESPONSE_3';

                const itemSettingsStore = getItemSettingsStore(itemIdentifier);
                itemSettingsStore.set({ doNotPlayMedia: true });

                const seq = getItemSequentialInteractionsStore(itemIdentifier);
                expect(seq.length).toBe(0);
                expect(get(seq.currentResponseIdentifier)).toBe(null);

                const blockTree = [
                    {
                        type: 'element',
                        component: MockSequentialInteraction,
                        props: {
                            itemIdentifier,
                            responseIdentifier: responseIdentifier2,
                            classes: 'sequential'
                        }
                    },
                    {
                        type: 'element',
                        component: MockSequentialInteraction,
                        props: {
                            itemIdentifier,
                            responseIdentifier: responseIdentifier3,
                            classes: 'sequential'
                        }
                    }
                ];

                render(Item, {
                    props: {
                        itemIdentifier,
                        options: {
                            renderer: 'common'
                        },
                        blockTree
                    }
                });

                expect(seq.length).toBe(2);
                expect(get(seq.currentResponseIdentifier)).toBe(null); //not started yet

                itemSettingsStore.set({ doNotPlayMedia: false });
                await tick();
                expect(seq.length).toBe(2);
                expect(get(seq.currentResponseIdentifier)).toBe(responseIdentifier2);

                releaseItemSettingsStore(itemIdentifier);
            });

            it('emits navigation event when sequence ends', () =>
                new Promise(done => {
                    const itemIdentifier = 'item-7';
                    const responseIdentifier1 = 'RESPONSE_1';

                    const seq = getItemSequentialInteractionsStore(itemIdentifier);

                    expect(seq.length).toBe(0);
                    expect(get(seq.currentResponseIdentifier)).toBe(null);

                    const { component } = render(Item, {
                        props: {
                            itemIdentifier,
                            options: {
                                renderer: 'common',
                                categories: ['x-tao-sequence-ended-nav-next']
                            },
                            blockTree: [
                                {
                                    type: 'element',
                                    component: MockSequentialInteraction,
                                    props: {
                                        itemIdentifier,
                                        responseIdentifier: responseIdentifier1,
                                        classes: 'sequential',
                                        handler: () => {
                                            setTimeout(() => {
                                                seq.didStart = true;
                                                seq.finish(responseIdentifier1);
                                            }, 25);
                                        }
                                    }
                                }
                            ]
                        }
                    });
                    component.$on('sequence-ended-nav-next', () => {
                        expect(get(seq.currentResponseIdentifier)).toBe(null);
                        seq.clear();
                        releaseItemSequentialInteractionsStore(itemIdentifier);
                        done();
                    });

                    expect(seq.length).toBe(1);
                    expect(get(seq.currentResponseIdentifier)).toBe(responseIdentifier1);
                }));
        });

        describe('Notifications', () => {
            it('children can call showItemNotification, which renders at Item level', () =>
                new Promise(done => {
                    const itemIdentifier = 'item-5';

                    const itemContextHandler = itemContext => {
                        tick()
                            .then(() => {
                                expect(document.querySelectorAll('.notification-container-wrapper').length).toBe(1);
                                expect(document.querySelectorAll('.notification-wrapper').length).toBe(0);

                                itemContext.showItemNotification({
                                    message: 'I am notifying you',
                                    hierarchy: 'neutral'
                                });
                            })
                            .then(tick)
                            .then(() => {
                                expect(document.querySelectorAll('.notification-wrapper').length).toBe(1);
                                expect(document.querySelector('.qti-item')).toMatchSnapshot();
                                done();
                            });
                    };

                    render(Item, {
                        props: {
                            itemIdentifier,
                            options: {
                                hasNotificationContainer: true
                            },
                            blockTree: [
                                {
                                    type: 'element',
                                    component: ContextGetter,
                                    props: {
                                        itemIdentifier,
                                        itemContextHandler
                                    }
                                }
                            ]
                        }
                    });
                }));

            it('children can call removeItemNotification with key', () =>
                new Promise(done => {
                    // avoid key clash on our 2 Notifications
                    generateElementId.mockImplementationOnce(nodeName => `tao-${nodeName}-456`);

                    const itemIdentifier = 'item-5';

                    const itemContextHandler = itemContext => {
                        const notifKey1 = itemContext.showItemNotification({
                            message: 'I am notifying you',
                            hierarchy: 'neutral'
                        });
                        const notifKey2 = itemContext.showItemNotification({
                            message: 'I am bad news',
                            hierarchy: 'alert'
                        });
                        expect(typeof notifKey1).toBe('string');
                        expect(typeof notifKey2).toBe('string');
                        expect(notifKey1 === notifKey2).toBe(false);

                        tick()
                            .then(() => {
                                expect(document.querySelectorAll('.notification-wrapper').length).toBe(2);

                                itemContext.removeItemNotification(notifKey1);
                            })
                            .then(tick)
                            .then(() => {
                                expect(document.querySelectorAll('.notification-wrapper').length).toBe(1);

                                itemContext.removeItemNotification(notifKey2);
                            })
                            .then(tick)
                            .then(() => {
                                expect(document.querySelectorAll('.notification-wrapper').length).toBe(0);

                                done();
                            });
                    };

                    render(Item, {
                        props: {
                            itemIdentifier,
                            options: {
                                hasNotificationContainer: true
                            },
                            blockTree: [
                                {
                                    type: 'element',
                                    component: ContextGetter,
                                    props: {
                                        itemIdentifier,
                                        itemContextHandler
                                    }
                                }
                            ]
                        }
                    });
                }));

            it('children can call clearItemNotifications', () =>
                new Promise(done => {
                    // avoid key clash on our 2 Notifications
                    generateElementId.mockImplementationOnce(nodeName => `tao-${nodeName}-456`);

                    const itemIdentifier = 'item-5';

                    const itemContextHandler = itemContext => {
                        itemContext.showItemNotification({
                            message: 'I am notifying you',
                            hierarchy: 'neutral'
                        });
                        itemContext.showItemNotification({
                            message: 'I am bad news',
                            hierarchy: 'alert'
                        });

                        tick()
                            .then(() => {
                                expect(document.querySelectorAll('.notification-wrapper').length).toBe(2);

                                itemContext.clearItemNotifications();
                            })
                            .then(tick)
                            .then(() => {
                                expect(document.querySelectorAll('.notification-wrapper').length).toBe(0);
                                done();
                            });
                    };

                    render(Item, {
                        props: {
                            itemIdentifier,
                            options: {
                                hasNotificationContainer: true
                            },
                            blockTree: [
                                {
                                    type: 'element',
                                    component: ContextGetter,
                                    props: {
                                        itemIdentifier,
                                        itemContextHandler
                                    }
                                }
                            ]
                        }
                    });
                }));

            it('all item notifications are cleared on destroy', () =>
                new Promise(done => {
                    // avoid key clash on our 2 Notifications
                    generateElementId.mockImplementationOnce(nodeName => `tao-${nodeName}-456`);

                    const itemIdentifier = 'item-5';

                    let component;

                    const itemContextHandler = itemContext => {
                        itemContext.showItemNotification({
                            message: 'I am notifying you',
                            hierarchy: 'neutral'
                        });
                        itemContext.showItemNotification({
                            message: 'I am bad news',
                            hierarchy: 'alert'
                        });

                        tick()
                            .then(() => {
                                expect(document.querySelectorAll('.notification-wrapper').length).toBe(2);

                                component.$destroy();
                            })
                            .then(() => {
                                render(Item, {
                                    props: {
                                        itemIdentifier,
                                        options: {
                                            hasNotificationContainer: true
                                        }
                                    }
                                });

                                expect(document.querySelector('.qti-item')).toBeInTheDocument();
                                expect(document.querySelectorAll('.notification-container-wrapper').length).toBe(1);
                                expect(document.querySelectorAll('.notification-wrapper').length).toBe(0);
                                done();
                            });
                    };

                    // First item
                    ({ component } = render(Item, {
                        props: {
                            itemIdentifier,
                            options: {
                                hasNotificationContainer: true
                            },
                            blockTree: [
                                {
                                    type: 'element',
                                    component: ContextGetter,
                                    props: {
                                        itemIdentifier,
                                        itemContextHandler
                                    }
                                }
                            ]
                        }
                    }));
                }));
        });
    });
});
