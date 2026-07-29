// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent, render } from '@testing-library/svelte';
import GraphicAssociateInteraction from '../GraphicAssociateInteraction.svelte';
import { tick } from 'svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../../itemsStateStore.js';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../../../itemsSessionStatusStore.js';
import ContextWrapper from '../../../../static/test/ContextWrapper.svelte';

const originalGetBBox = SVGElement.prototype.getBBox;
const originalRequestAnimationFrame = window.requestAnimationFrame;

afterEach(() => {
    SVGElement.prototype.getBBox = originalGetBBox;
    window.requestAnimationFrame = originalRequestAnimationFrame;
});
beforeEach(() => {
    window.requestAnimationFrame = callback => {
        tick().then(() => {
            callback();
        });
    };
    SVGElement.prototype.getBBox = () => ({ x: 1, y: 1, width: 1, height: 1 });
});

vi.mock('@oat-sa-private/ui-core', async importOriginal => {
    const originalModule = await importOriginal();
    return {
        ...originalModule,
        generateElementId: nodeName => `tao-${nodeName}-123`,
        ResizeObserver: function (callback) {
            //used by resizeObserve.js
            return {
                observe() {
                    callback([
                        {
                            target: {
                                getBoundingClientRect: () => ({
                                    width: 1000,
                                    height: 500,
                                    top: 0,
                                    left: 0,
                                    bottom: 500,
                                    right: 1000
                                })
                            }
                        }
                    ]);
                },
                unobserve() {},
                disconnect() {}
            };
        }
    };
});

vi.mock('@oat-sa-private/ui-core/dom/dom.js', () => ({
    getPointerEventCoords: () => ({ x: 50, y: 50 })
}));

vi.mock('../../util/polygon.js', async () => {
    const originalModule = await vi.importActual('../../util/polygon.js');
    return Object.assign({ __esModule: true }, originalModule, {
        getIsThin: () => false
    });
});

const qtiClass = 'qti-graphicAssociateInteraction';
const itemIdentifier = 'i12345';
const responseIdentifier = 'RESPONSE_1';

const imgObject = {
    data: 'background.jpg',
    width: 800,
    height: 600
};
const getChoices = () => [
    {
        key: 'a',
        shape: 'rect',
        coords: '0,0,100,50',
        hotspotLabel: 'a spot',
        matchMax: 0,
        matchMin: 0
    },
    {
        key: 'b',
        shape: 'circle',
        coords: '100,400,100',
        matchMax: 0,
        matchMin: 0
    },
    {
        key: 'c',
        shape: 'ellipse',
        coords: '400,400,100,50',
        hotspotLabel: 'a spot',
        matchMax: 0,
        matchMin: 0
    },
    {
        key: 'd',
        shape: 'poly',
        coords: '400,0,600,0,400,200',
        matchMax: 0,
        matchMin: 0
    }
];
const getArrowChoices = () => [
    {
        key: 'a',
        shape: 'rect',
        coords: '0,0,100,50',
        hotspotLabel: 'a spot',
        matchMax: 0,
        matchMin: 0,
        'data-start': 'true'
    },
    {
        key: 'b',
        shape: 'circle',
        coords: '100,400,100',
        matchMax: 0,
        matchMin: 0,
        'data-end': 'true'
    },
    {
        key: 'c',
        shape: 'ellipse',
        coords: '400,400,100,50',
        hotspotLabel: 'a spot',
        matchMax: 0,
        matchMin: 0,
        'data-start': 'true'
    },
    {
        key: 'd',
        shape: 'poly',
        coords: '400,0,600,0,400,200',
        matchMax: 0,
        matchMin: 0,
        'data-end': 'true'
    }
];

const predefinedAssociations = {
    list: {
        pair: [
            ['a', 'b'],
            ['c', 'd']
        ]
    }
};

describe('Graphic associate interaction', () => {
    const getAssetManager = () => ({
        resolve: src => src
    });
    const registerLoadingElement = vi.fn();
    const getInstructionsLang = vi.fn();
    const testContext = {
        getAssetManager,
        registerLoadingElement,
        getInstructionsLang
    };

    afterEach(() => {
        itemsStateStore.clear();
        itemsSessionStatusStore.clear();
        registerLoadingElement.mockClear();
        getInstructionsLang.mockClear();
    });

    function associationsCount(container) {
        return container.querySelectorAll('.association-line').length;
    }
    function getSnapshotContainer(container) {
        const normalizedContainer = container.cloneNode(true);
        const replacementById = new Map();
        const xmlNamespace = 'http://www.w3.org/2000/xmlns/';
        let clipPathCounter = 1;
        normalizedContainer.querySelectorAll('[id]').forEach(element => {
            const id = element.getAttribute('id');
            if (!id || !/^SvgjsClipPath\d+$/.test(id)) {
                return;
            }
            const normalizedId = `SvgjsClipPath${clipPathCounter++}`;
            replacementById.set(id, normalizedId);
            element.setAttribute('id', normalizedId);
        });
        normalizedContainer.querySelectorAll('*').forEach(element => {
            ['version', 'xmlns', 'xmlns:svgjs', 'xmlns:xlink'].forEach(attributeName => {
                element.removeAttribute(attributeName);
            });
            element.removeAttributeNS(xmlNamespace, 'svgjs');
            element.removeAttributeNS(xmlNamespace, 'xlink');
            for (const attribute of element.getAttributeNames()) {
                const value = element.getAttribute(attribute);
                if (!value) {
                    continue;
                }
                let normalizedValue = value;
                replacementById.forEach((normalizedId, originalId) => {
                    normalizedValue = normalizedValue.replaceAll(originalId, normalizedId);
                });
                normalizedValue = normalizedValue.replace(/url\("#(SvgjsClipPath\d+)"\)/g, 'url(#$1)');
                element.setAttribute(attribute, normalizedValue);
            }
        });
        return normalizedContainer;
    }
    function drawAssociation(container, key1, key2) {
        fireEvent.click(container.querySelector(`.hotspot-choice[data-choice-key="${key1}"] > g`));
        return tick().then(() => {
            fireEvent.click(container.querySelector(`.hotspot-choice[data-choice-key="${key2}"] > g`));
            return tick();
        });
    }
    function removeAssociation(container, key = false) {
        fireEvent.click(container.querySelector(`.association-line`));
        return tick().then(() => {
            const element = container.querySelector(`.association-line.selected .remove-button-hitbox`);
            if (key) {
                fireEvent.keyDown(element);
            } else {
                fireEvent.click(element);
            }
            return tick();
        });
    }
    describe('render', () => {
        it('renders with default props', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject
                    }
                }
            });
            // 2 ticks to wait for scaling calculations connected to <svelte:window bind:innerHeight> to complete
            return tick().then(tick).then(() => {
                expect(getSnapshotContainer(container)).toMatchSnapshot();
            });
        });

        it('registers image for loading', () => {
            render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject
                    }
                }
            });
            expect(registerLoadingElement).toHaveBeenCalled();
        });

        it('renders props correctly into markup', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        role: 'someUniqueRole',
                        ariaAttrs: {
                            ariaFoo: 12,
                            ariaBar: 'baz'
                        },
                        dataAttrs: {
                            'data-foo': 'bar',
                            'data-baz': 24
                        },
                        language: 'hu',
                        id: 'interactionId',
                        classes: 'foo bar baz',
                        dir: 'rtl',
                        prompt: [{ type: 'text', content: 'Question 1' }],
                        choices: getChoices(),
                        imgObject
                    }
                }
            });
            return tick().then(tick).then(() => {
                expect(getSnapshotContainer(container)).toMatchSnapshot();
            });
        });

        it('renders with associations', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse(predefinedAssociations);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        choices: getChoices(),
                        imgObject,
                        maxAssociations: 2
                    }
                }
            });
            expect(container.querySelectorAll('.hotspot-choice').length).toBe(4);
            expect(associationsCount(container)).toBe(2);
        });

        it('renders feedbacks', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse(predefinedAssociations);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        minAssociations: 1,
                        maxAssociations: 3
                    }
                }
            });
            expect(container.querySelector('.feedback')).toHaveClass('info');
        });

        it('is disabled in closed session', () => {
            const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
            itemSessionStatusStore.set('closed');
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices()
                    }
                }
            });
            expect(container.querySelector('.qti-graphicAssociateInteraction').getAttribute('aria-disabled')).toBe(
                'true'
            );
        });

        it('renders the instruction lang', () => {
            getInstructionsLang.mockReturnValueOnce('it-IT');

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices(),
                        minAssociations: 1,
                        maxAssociations: 3
                    }
                }
            });

            expect(getInstructionsLang).toHaveBeenCalled();
            expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toEqual('it-IT');
            expect(container.querySelector('.hotspot-choice text').getAttribute('lang')).toEqual('it-IT');

            return tick().then(tick).then(() => {
                expect(getSnapshotContainer(container)).toMatchSnapshot();
            });
        });
    });

    describe('association flow by keyboard', () => {
        it('draw line between two hotspots', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices()
                    }
                }
            });
            fireEvent.keyUp(container.querySelector(`.hotspot-choice[data-choice-key="a"] > g`), { key: 'Space' });
            return tick()
                .then(() => {
                    fireEvent.keyUp(container.querySelector(`.hotspot-choice[data-choice-key="c"] > g`), {
                        key: 'Space'
                    });
                    return tick();
                })
                .then(() => {
                    expect(associationsCount(container)).toBe(1);
                });
        });

        it('draw line between two nearest hotspots', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices()
                    }
                }
            });
            container.querySelector('.qti-block').focus();
            return tick()
                .then(() => {
                    const focusedElement = document.activeElement;
                    fireEvent.keyUp(focusedElement, { key: 'Space' });
                    return tick();
                })
                .then(() => {
                    fireEvent.keyDown(container.querySelector('g.image > g'), { key: 'Left' });
                    return tick();
                })
                .then(() => {
                    const focusedElement = document.activeElement;
                    fireEvent.keyUp(focusedElement, { key: 'Space' });
                    return tick();
                })
                .then(() => {
                    expect(associationsCount(container)).toBe(1);
                    expect(getSnapshotContainer(container)).toMatchSnapshot();
                });
        });

        it('activate/deactivate line', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices()
                    }
                }
            });
            return drawAssociation(container, 'a', 'b')
                .then(() => {
                    expect(associationsCount(container)).toBe(1);
                    container.querySelector('.qti-block').focus();
                    return tick();
                })
                .then(() => {
                    fireEvent.keyDown(container.querySelector('g.image > g'), { key: 'Left' });
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.association-line.selected')).toBeInTheDocument();
                    //all lines have remove button in visible or invisible state
                    expect(container.querySelectorAll('.association-line.selected').length).toBe(1);
                    expect(container.querySelector('.glass-layer')).toBeInTheDocument();
                    fireEvent.keyDown(container.querySelector('g.image > g'), { key: 'Left' });
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.association-line.selected')).not.toBeInTheDocument();
                    expect(container.querySelector('.glass-layer')).not.toBeInTheDocument();
                });
        });

        it('remove line', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 0,
                        choices: getChoices()
                    }
                }
            });
            return drawAssociation(container, 'a', 'b')
                .then(() => {
                    expect(associationsCount(container)).toBe(1);
                    container.querySelector('.qti-block').focus();
                    return tick();
                })
                .then(() => {
                    fireEvent.keyDown(container.querySelector('g.image > g'), { key: 'Left' });
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.association-line.selected .remove-button')).toBeInTheDocument();
                    expect(container.querySelectorAll('.association-line.selected .remove-button').length).toBe(1);
                    expect(container.querySelector('.glass-layer')).toBeInTheDocument();
                    const focusedElement = document.activeElement;
                    expect(getSnapshotContainer(container)).toMatchSnapshot();
                    return fireEvent.keyUp(focusedElement, { key: 'Space' });
                })
                .then(() => {
                    expect(associationsCount(container)).toBe(0);
                    expect(container.querySelector('.glass-layer')).not.toBeInTheDocument();
                });
        });
    });

    describe('arrow subtype', () => {
        it('renders arrow mode', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getArrowChoices(),
                        dataAttrs: { 'data-interaction-subtype': 'arrow' }
                    }
                }
            });

            return tick().then(tick).then(() => {
                expect(getSnapshotContainer(container)).toMatchSnapshot();
            });
        });

        it('stores associations in selection order', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 0,
                        choices: getArrowChoices(),
                        dataAttrs: { 'data-interaction-subtype': 'arrow' }
                    }
                }
            });

            return drawAssociation(container, 'a', 'b').then(() => {
                expect(interactionStateStore.getResponse()).toEqual({
                    list: {
                        directedPair: [['a', 'b']]
                    }
                });
            });
        });
    });

    describe('association flow by mouse', () => {
        it('draw line', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices()
                    }
                }
            });
            fireEvent.mouseDown(container.querySelector(`.hotspot-choice[data-choice-key="a"] > g`));
            return tick()
                .then(() => {
                    fireEvent.mouseMove(container.querySelector(`.hotspot-choice[data-choice-key="b"] > g`));
                    return tick();
                })
                .then(() => {
                    fireEvent.mouseUp(container.querySelector(`.hotspot-choice[data-choice-key="b"] > g`));
                    return tick();
                })
                .then(() => {
                    expect(associationsCount(container)).toBe(1);
                });
        });

        it('draw line by touch', () => {
            const originalElementFromPoint = window.document.elementFromPoint;
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices()
                    }
                }
            });
            const secondHotspot = container.querySelector(`.hotspot-choice[data-choice-key="b"] > g`);

            fireEvent.touchStart(container.querySelector(`.hotspot-choice[data-choice-key="a"] > g`));
            return tick()
                .then(() => {
                    fireEvent.touchMove(secondHotspot);
                    return tick();
                })
                .then(() => {
                    window.document.elementFromPoint = vi.fn(() => secondHotspot);
                    fireEvent.touchEnd(container.querySelector(`.hotspot-choice[data-choice-key="b"] > g`));
                    return tick();
                })
                .then(() => {
                    expect(associationsCount(container)).toBe(1);
                    window.document.elementFromPoint = originalElementFromPoint;
                });
        });

        it('activate/deactivate line', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices()
                    }
                }
            });
            return drawAssociation(container, 'a', 'b')
                .then(() => {
                    fireEvent.click(container.querySelector('.association-line'));
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.association-line.selected')).toBeInTheDocument();
                    //all lines have remove button in visible or invisible state
                    expect(container.querySelectorAll('.association-line.selected').length).toBe(1);
                    expect(container.querySelector('.glass-layer')).toBeInTheDocument();
                    fireEvent.click(container.querySelector('.association-line.selected'));
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.association-line.selected')).not.toBeInTheDocument();
                    expect(container.querySelector('.glass-layer')).not.toBeInTheDocument();
                });
        });

        it('remove line', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 0,
                        choices: getChoices()
                    }
                }
            });
            return drawAssociation(container, 'a', 'b')
                .then(() => {
                    expect(associationsCount(container)).toBe(1);
                    fireEvent.click(container.querySelector('.association-line'));
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.association-line.selected .remove-button')).toBeInTheDocument();
                    expect(container.querySelectorAll('.association-line.selected .remove-button').length).toBe(1);
                    expect(container.querySelector('.glass-layer')).toBeInTheDocument();
                    expect(getSnapshotContainer(container)).toMatchSnapshot();
                    return fireEvent.click(container.querySelector(`.association-line.selected .remove-button-hitbox`));
                })
                .then(() => {
                    expect(associationsCount(container)).toBe(0);
                    expect(container.querySelector('.glass-layer')).not.toBeInTheDocument();
                });
        });

        it('can not draw line over the matchMax limitations', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    pair: [['c', 'a']]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 0,
                        choices: getChoices().map(c =>
                            Object.assign(c, { matchMin: 0, matchMax: c.key === 'c' ? 2 : 0 })
                        )
                    }
                }
            });
            expect(associationsCount(container)).toBe(1);
            fireEvent.click(container.querySelector(`.hotspot-choice[data-choice-key="c"] > g`));
            return tick()
                .then(() => fireEvent.click(container.querySelector(`.hotspot-choice[data-choice-key="b"] > g`)))
                .then(() => {
                    expect(associationsCount(container)).toBe(2);
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            pair: [
                                ['c', 'a'],
                                ['b', 'c']
                            ]
                        }
                    });
                    return fireEvent.click(container.querySelector(`.hotspot-choice[data-choice-key="c"] > g`));
                })
                .then(() => fireEvent.click(container.querySelector(`.hotspot-choice[data-choice-key="d"] > g`)))
                .then(() => {
                    expect(associationsCount(container)).toBe(2);
                });
        });
    });

    describe('states', () => {
        it('active/deactivate hotspot by touch', () => {
            const originalElementFromPoint = window.document.elementFromPoint;
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices()
                    }
                }
            });
            const hotspot = container.querySelector(`.hotspot-choice[data-choice-key="a"] > g`);
            fireEvent.touchStart(hotspot);
            return tick()
                .then(() => {
                    window.document.elementFromPoint = vi.fn(() => hotspot);
                    fireEvent.touchEnd(hotspot);
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.hotspot-choice.activated')).toBeInTheDocument();
                    expect(container.querySelectorAll('.hotspot-choice.activated').length).toBe(1);
                    fireEvent.touchStart(hotspot);
                    return tick();
                })
                .then(() => {
                    window.document.elementFromPoint = vi.fn(() => hotspot);
                    fireEvent.touchEnd(hotspot);
                    return tick();
                })
                .then(() => {
                    expect(container.querySelector('.hotspot-choice.activated')).not.toBeInTheDocument();
                    window.document.elementFromPoint = originalElementFromPoint;
                });
        });

        it('resized', () => {
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        choices: getChoices()
                    }
                }
            });
            // Change the viewport
            // eslint-disable-next-line
            window = Object.assign(window, { innerWidth: 1500, innerHeight: 2000 });

            // Trigger the window resize event.
            global.dispatchEvent(new Event('resize'));
            return tick().then(tick).then(() => {
                expect(container.querySelector('.image>image').getAttribute('width')).toBe('1000');
                expect(container.querySelector('.image>image').getAttribute('height')).toBe('750');
            });
        });
    });

    describe('store', () => {
        it('loads stored response', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse(predefinedAssociations);

            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 0,
                        choices: getChoices()
                    }
                }
            });

            return tick().then(() => {
                expect(associationsCount(container)).toBe(2);
            });
        });

        it('listens to store modifications', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 0,
                        choices: getChoices()
                    }
                }
            });

            return tick()
                .then(() => {
                    expect(associationsCount(container)).toBe(0);
                    interactionStateStore.setResponse(predefinedAssociations);
                    return tick();
                })
                .then(() => {
                    expect(associationsCount(container)).toBe(2);

                    interactionStateStore.setResponse({
                        list: {
                            pair: []
                        }
                    });
                    return tick();
                })
                .then(() => {
                    expect(associationsCount(container)).toBe(0);
                });
        });

        it('saves response to store on change', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 3,
                        choices: getChoices()
                    }
                }
            });

            expect(interactionStateStore.getResponse()).toEqual({
                list: {
                    pair: []
                }
            });
            expect(interactionStateStore.getValidity()).toBe(true);
            expect(interactionStateStore.get()).toMatchObject({ qtiClass });
            expect(associationsCount(container)).toBe(0);

            return tick()
                .then(() => drawAssociation(container, 'a', 'b'))
                .then(() => drawAssociation(container, 'c', 'd'))
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            pair: [
                                ['b', 'a'],
                                ['d', 'c']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                    expect(interactionStateStore.get()).toMatchObject({ qtiClass });
                    expect(associationsCount(container)).toBe(2);

                    return removeAssociation(container);
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            pair: [['d', 'c']]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                    expect(associationsCount(container)).toBe(1);
                });
        });

        it('validity depends on minAssociations', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 0,
                        minAssociations: 2,
                        choices: getChoices().map(c => Object.assign(c, { matchMin: 0, matchMax: 0 }))
                    }
                }
            });
            expect(interactionStateStore.getValidity()).toBe(false);

            return tick()
                .then(() => drawAssociation(container, 'a', 'b'))
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            pair: [['b', 'a']]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);
                    expect(associationsCount(container)).toBe(1);
                    return drawAssociation(container, 'c', 'd');
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            pair: [
                                ['b', 'a'],
                                ['d', 'c']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                    expect(associationsCount(container)).toBe(2);
                });
        });

        it('validity depends on maxAssociations', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 2,
                        minAssociations: 0,
                        choices: getChoices().map(c => Object.assign(c, { matchMin: 0, matchMax: 0 }))
                    }
                }
            });
            expect(interactionStateStore.getValidity()).toBe(true);

            return tick()
                .then(tick)
                .then(() => drawAssociation(container, 'a', 'b'))
                .then(() => drawAssociation(container, 'c', 'd'))
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            pair: [
                                ['b', 'a'],
                                ['d', 'c']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                    expect(associationsCount(container)).toBe(2);
                    return drawAssociation(container, 'a', 'c');
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            pair: [
                                ['b', 'a'],
                                ['d', 'c'],
                                ['c', 'a']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);
                    expect(associationsCount(container)).toBe(3);
                });
        });

        it('validity depends on matchMin of choice', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 0,
                        choices: getChoices().map(c =>
                            Object.assign(c, { matchMin: c.key === 'a' ? 2 : 0, matchMax: 0 })
                        )
                    }
                }
            });
            expect(interactionStateStore.getValidity()).toBe(false);

            return tick()
                .then(tick)
                .then(() => drawAssociation(container, 'a', 'b'))
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            pair: [['b', 'a']]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);
                    expect(associationsCount(container)).toBe(1);
                    return drawAssociation(container, 'a', 'c');
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            pair: [
                                ['b', 'a'],
                                ['c', 'a']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                    expect(associationsCount(container)).toBe(2);
                });
        });

        it('validity depends on matchMax of choice', () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
            interactionStateStore.setResponse({
                list: {
                    pair: [
                        ['c', 'a'],
                        ['c', 'b']
                    ]
                }
            });
            const { container } = render(ContextWrapper, {
                props: {
                    testContextKey: itemIdentifier,
                    testContext,
                    testComponent: GraphicAssociateInteraction,
                    testComponentProps: {
                        itemIdentifier,
                        responseIdentifier,
                        imgObject,
                        maxAssociations: 0,
                        choices: getChoices().map(c =>
                            Object.assign(c, { matchMin: 0, matchMax: c.key === 'c' ? 1 : 0 })
                        )
                    }
                }
            });

            return tick()
                .then(() => drawAssociation(container, 'a', 'b'))
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            pair: [
                                ['c', 'a'],
                                ['c', 'b'],
                                ['b', 'a']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(false);

                    return removeAssociation(container);
                })
                .then(() => {
                    expect(interactionStateStore.getResponse()).toEqual({
                        list: {
                            pair: [
                                ['c', 'b'],
                                ['b', 'a']
                            ]
                        }
                    });
                    expect(interactionStateStore.getValidity()).toBe(true);
                });
        });

        it('check cardinality', async () => {
            const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

            const props = {
                testContextKey: itemIdentifier,
                testContext,
                testComponent: GraphicAssociateInteraction,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    imgObject,
                    maxAssociations: 1,
                    choices: getChoices()
                }
            };

            // first render - single cardinality
            const { container, unmount } = render(ContextWrapper, {
                props
            });
            expect(interactionStateStore.getResponse()).toEqual({
                base: null
            });
            await drawAssociation(container, 'a', 'b');

            expect(interactionStateStore.getResponse()).toEqual({
                base: {
                    pair: ['b', 'a']
                }
            });
            unmount();

            itemsStateStore.clear();

            // second render - multiple cardinality
            props.testComponentProps.maxAssociations = 2;
            const { container: container2 } = render(ContextWrapper, {
                props
            });

            expect(interactionStateStore.getResponse()).toEqual({
                list: {
                    pair: []
                }
            });
            await drawAssociation(container2, 'a', 'b');

            expect(interactionStateStore.getResponse()).toEqual({
                list: {
                    pair: [['b', 'a']]
                }
            });
        });
    });
});
