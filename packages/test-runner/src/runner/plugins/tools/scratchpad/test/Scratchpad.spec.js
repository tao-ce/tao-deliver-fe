// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import Scratchpad from '../Scratchpad.svelte';
import toolDefinitions from '../toolDefinitions.js';

describe('Scratchpad', () => {
    //mock getBBox
    const originalGetBBox = SVGElement.prototype.getBBox;
    beforeEach(() => {
        SVGElement.prototype.getBBox = () => ({ x: 1, y: 1, width: 1, height: 1 });
    });
    afterEach(() => {
        SVGElement.prototype.getBBox = originalGetBBox;
    });

    describe('rendering', () => {
        it('should render correctly with no props', () => {
            const { container } = render(Scratchpad, { props: {} });
            expect(container).toBeTruthy();
        });

        it('should render correctly with props', () => {
            const { container } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 1600,
                    height: 1600,
                    tools: Object.keys(toolDefinitions).map(key => toolDefinitions[key]),
                    enableStateActions: true
                }
            });
            expect(container).toMatchSnapshot();
        });

        it('should render correctly w/o state actions', () => {
            const { container } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 1600,
                    height: 1600,
                    tools: Object.keys(toolDefinitions).map(key => toolDefinitions[key]),
                    enableStateActions: false
                }
            });
            expect(container).toMatchSnapshot();
        });
    });

    describe('events', () => {
        it('fires close event when containing modal is closed', () => {
            const { container, component } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 100,
                    height: 100
                }
            });

            const closeButton = container.querySelector('.action-container-start button');
            const onClose = vi.fn();
            component.$on('close', onClose);

            fireEvent.click(closeButton);

            expect(onClose).toHaveBeenCalled();
        });

        it('fires undo/redo events when heder action buttons are clicked', () => {
            const { container, component } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 100,
                    height: 100,
                    enableStateActions: true,
                    canvasStateStackLength: 3,
                    canvasStateIndex: 2
                }
            });

            const endButtons = container.querySelectorAll('.action-container-end button');
            const undoButton = endButtons[0];
            const redoButton = endButtons[1];

            const onUndo = vi.fn();
            component.$on('undo', onUndo);
            const onRedo = vi.fn();
            component.$on('redo', onRedo);

            fireEvent.click(undoButton);
            expect(onUndo).toHaveBeenCalled();
            fireEvent.click(redoButton);
            expect(onRedo).toHaveBeenCalled();
        });

        it('fires move event when containing modal is moved', () => {
            const { container, component } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 100,
                    height: 100
                }
            });

            const onMove = vi.fn();
            component.$on('move', onMove);

            const header = container.querySelector('header');
            fireEvent.mouseDown(header, { clientX: 20, clientY: 20, buttons: 1 });
            fireEvent.mouseMove(window, { clientX: 0, clientY: 0, buttons: 1 });
            fireEvent.mouseUp(window);

            expect(onMove).toHaveBeenCalled();
            const detail = onMove.mock.calls[0][0].detail;
            expect(detail).toHaveProperty('top');
            expect(detail).toHaveProperty('left');
        });

        it('fires resize event when containing modal is resized', () => {
            const { container, component } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 100,
                    height: 100
                }
            });

            const onResize = vi.fn();
            component.$on('resize', onResize);

            const resizeHitbox = container.querySelector('div[data-direction="nw"]');
            fireEvent.mouseDown(resizeHitbox, { clientX: 11, clientY: 11, buttons: 1 });
            fireEvent.mouseMove(window, { clientX: 1, clientY: 1, buttons: 1 });
            fireEvent.mouseUp(window);

            expect(onResize).toHaveBeenCalled();
            const detail = onResize.mock.calls[0][0].detail;
            expect(detail).toHaveProperty('width');
            expect(detail).toHaveProperty('height');
            expect(detail).toHaveProperty('top');
            expect(detail).toHaveProperty('left');
        });

        it('fires toolSelect event when tool is selected', () => {
            const { container, component } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 100,
                    height: 100,
                    tools: Object.keys(toolDefinitions).map(key => toolDefinitions[key])
                }
            });

            const onToolSelect = vi.fn();
            component.$on('toolSelect', onToolSelect);

            const rectangleButton = container.querySelector('[data-test-id="scratchpadTool-rectangle"]');
            fireEvent.mouseDown(rectangleButton, { buttons: 1 });
            fireEvent.mouseUp(rectangleButton);

            expect(onToolSelect).toHaveBeenCalled();
            const selectedTool = onToolSelect.mock.calls[0][0].detail.tools.find(tool => tool.selected);
            expect(selectedTool.key).toEqual('rectangle');
        });

        it('starts drawing shape and deselects all selected shapes on mousedown', () => {
            const { container } = render(Scratchpad, {
                props: {
                    tools: [
                        {
                            key: 'rectangle',
                            type: 'rectangle',
                            label: 'Rectangle',
                            icon: 'rectangle-16',
                            selected: true
                        }
                    ],
                    shapes: [{ type: 'rectangle', geometry: { x: 10, y: 10, width: 100, height: 100, selected: true } }]
                }
            });

            const svg = container.querySelector('.scratchpad-container>svg');
            fireEvent.mouseDown(svg, { clientX: 200, clientY: 200, buttons: 1 });

            return tick().then(() => {
                expect(container.querySelector('rect.selected')).toBeFalsy();
                expect(container.querySelectorAll('rect.shape').length).toBe(2);
            });
        });

        it('starts drawing text and deselects all selected shapes on click', () => {
            const { container } = render(Scratchpad, {
                props: {
                    tools: [
                        {
                            key: 'text',
                            type: 'text',
                            label: 'Text',
                            icon: 'type-16',
                            selected: true
                        }
                    ],
                    shapes: [{ type: 'rectangle', geometry: { x: 10, y: 10, width: 100, height: 100, selected: true } }]
                }
            });

            const svg = container.querySelector('.scratchpad-container>svg');
            fireEvent.click(svg, { clientX: 200, clientY: 200 });

            return tick().then(() => {
                expect(container.querySelector('rect.selected')).toBeFalsy();
                expect(container.querySelectorAll('rect.shape').length).toBe(1);
                expect(container.querySelectorAll('.foreign').length).toBe(1);
            });
        });

        it('fires the change event when drawing a shape', () => {
            const { container, component } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 62,
                    height: 62,
                    tools: [
                        {
                            key: 'rectangle',
                            type: 'rectangle',
                            label: 'Rectangle',
                            icon: 'rectangle-16',
                            selected: false
                        }
                    ],
                    shapes: []
                }
            });

            const changeHandler = vi.fn();
            component.$on('change', changeHandler);

            const rectangleButton = container.querySelector('[data-test-id="scratchpadTool-rectangle"]');
            fireEvent.mouseDown(rectangleButton, { buttons: 1 });

            //add a little time gap to get wrapperElement bound
            return tick().then(() => {
                fireEvent.mouseUp(rectangleButton);

                const svg = container.querySelector('.scratchpad-container>svg');
                fireEvent.mouseDown(svg, { clientX: 50, clientY: 50, buttons: 1 });
                fireEvent.mouseMove(window, { clientX: 100, clientY: 100, buttons: 1 });
                fireEvent.mouseUp(window, { clientX: 100, clientY: 100 });

                return tick().then(() => {
                    expect(container.querySelectorAll('rect.shape').length).toBe(1);

                    expect(changeHandler).toHaveBeenCalled();
                    expect(changeHandler.mock.calls[0][0].detail.shapes.length).toBe(1);
                    expect(changeHandler.mock.calls[0][0].detail.shapes[0].type).toBe('rectangle');
                });
            });
        });

        it('fires the updateState event at the end of drawing a shape', () => {
            const { container, component } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 62,
                    height: 62,
                    tools: [
                        {
                            key: 'rectangle',
                            type: 'rectangle',
                            label: 'Rectangle',
                            icon: 'rectangle-16',
                            selected: false
                        }
                    ],
                    shapes: []
                }
            });

            const updateStateHandler = vi.fn();
            component.$on('updateState', updateStateHandler);

            const rectangleButton = container.querySelector('[data-test-id="scratchpadTool-rectangle"]');
            fireEvent.mouseDown(rectangleButton, { buttons: 1 });

            //add a little time gap to get wrapperElement bound
            return tick().then(() => {
                fireEvent.mouseUp(rectangleButton);

                const svg = container.querySelector('.scratchpad-container>svg');
                fireEvent.mouseDown(svg, { clientX: 50, clientY: 50, buttons: 1 });
                fireEvent.mouseMove(window, { clientX: 100, clientY: 100, buttons: 1 });
                fireEvent.mouseUp(window, { clientX: 100, clientY: 100 });

                return tick().then(() => {
                    expect(container.querySelectorAll('rect.shape').length).toBe(1);

                    expect(updateStateHandler).toHaveBeenCalled();
                    expect(updateStateHandler.mock.calls[0][0].detail.shapes.length).toBe(1);
                    expect(updateStateHandler.mock.calls[0][0].detail.shapes[0].type).toBe('rectangle');
                });
            });
        });

        it('fires the change event when writing text', () => {
            const { container, component } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 62,
                    height: 62,
                    tools: [
                        {
                            key: 'text',
                            type: 'text',
                            label: 'Text',
                            icon: 'type-16',
                            selected: false
                        }
                    ],
                    shapes: []
                }
            });

            const changeHandler = vi.fn();
            component.$on('change', changeHandler);

            const textButton = container.querySelector('[data-test-id="scratchpadTool-text"]');
            fireEvent.mouseDown(textButton, { buttons: 1 });

            //add a little time gap to get wrapperElement bound
            return tick().then(() => {
                fireEvent.mouseUp(textButton);

                const svg = container.querySelector('.scratchpad-container>svg');
                fireEvent.click(svg, { clientX: 50, clientY: 50, buttons: 1 });

                return tick()
                    .then(() => {
                        const editable = container.querySelector('.editable');
                        const foreignObject = container.querySelector('.foreign');
                        editable.innerText = 'abc';
                        fireEvent.input(editable);
                        fireEvent.mouseUp(foreignObject);

                        return tick();
                    })
                    .then(() => {
                        expect(changeHandler).toHaveBeenCalled();
                        expect(changeHandler.mock.calls[0][0].detail.shapes.length).toBe(1);
                        expect(changeHandler.mock.calls[0][0].detail.shapes[0]).toMatchObject({
                            type: 'text',
                            content: 'abc',
                            selected: false
                        });
                    });
            });
        });

        it('fires the updateState event at the end of writing text', () => {
            const { container, component } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 62,
                    height: 62,
                    tools: [
                        {
                            key: 'text',
                            type: 'text',
                            label: 'Text',
                            icon: 'type-16',
                            selected: false
                        }
                    ],
                    shapes: []
                }
            });

            const updateStateHandler = vi.fn();
            component.$on('updateState', updateStateHandler);

            const textButton = container.querySelector('[data-test-id="scratchpadTool-text"]');
            fireEvent.mouseDown(textButton, { buttons: 1 });

            //add a little time gap to get wrapperElement bound
            return tick().then(() => {
                fireEvent.mouseUp(textButton);

                const svg = container.querySelector('.scratchpad-container>svg');
                fireEvent.click(svg, { clientX: 50, clientY: 50, buttons: 1 });

                return tick()
                    .then(() => {
                        const editable = container.querySelector('.editable');
                        const foreignObject = container.querySelector('.foreign');
                        editable.innerText = 'abc';
                        fireEvent.input(editable);
                        fireEvent.mouseUp(foreignObject);

                        return tick();
                    })
                    .then(() => {
                        expect(updateStateHandler).toHaveBeenCalled();
                        expect(updateStateHandler.mock.calls[0][0].detail.shapes.length).toBe(1);
                        expect(updateStateHandler.mock.calls[0][0].detail.shapes[0]).toMatchObject({
                            type: 'text',
                            content: 'abc'
                        });
                    });
            });
        });

        it('deletes drawings by eraser', () => {
            const { container } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 62,
                    height: 62,
                    tools: [
                        {
                            key: 'eraser',
                            type: 'eraser',
                            label: 'Eraser',
                            icon: 'eraser-16',
                            selected: true
                        }
                    ],
                    shapes: [
                        {
                            type: 'rectangle',
                            key: 'rect1',
                            hoverable: true,
                            geometry: { x: 10, y: 10, width: 100, height: 100 }
                        },
                        {
                            type: 'text',
                            key: 'text1',
                            hoverable: true,
                            content: 'abc',
                            geometry: { x: 10, y: 10, width: 100, height: 100 }
                        }
                    ]
                }
            });

            expect(container.querySelectorAll('.shape-container[data-shape-type="rectangle"]').length).toBe(1);
            expect(container.querySelectorAll('.shape.foreign').length).toBe(1);

            const text = container.querySelector('.editable-wrapper span');

            return tick().then(() => {
                fireEvent.click(text);

                return tick().then(() => {
                    expect(container.querySelectorAll('.shape.foreign').length).toBe(0);

                    const rect = container.querySelector('.shape-container[data-shape-type="rectangle"]');
                    fireEvent.click(rect);
                    return tick().then(() => {
                        expect(container.querySelectorAll('.shape-container[data-shape-type="rectangle"]').length).toBe(
                            0
                        );
                    });
                });
            });
        });

        it('selects shapes', () => {
            const { container } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 62,
                    height: 62,
                    tools: [
                        {
                            key: 'select',
                            type: 'select',
                            label: 'Select',
                            icon: 'select-16',
                            selected: true
                        }
                    ],
                    shapes: [
                        {
                            type: 'rectangle',
                            key: 'rect1',
                            hoverable: true,
                            geometry: { x: 10, y: 10, width: 10, height: 10 }
                        },
                        {
                            type: 'oval',
                            key: 'ov1',
                            hoverable: true,
                            geometry: { cx: 50, y: 50, rx: 10, ry: 20, width: 10, height: 10 }
                        },
                        {
                            type: 'text',
                            key: 'text1',
                            hoverable: true,
                            content: 'abc',
                            geometry: { x: 100, y: 10, width: 50, height: 30 }
                        }
                    ]
                }
            });
            const canvas = container.querySelector('.scratchpad-container > svg');

            expect(canvas.querySelectorAll('[data-shape-type="rectangle"]').length).toBe(1);
            expect(canvas.querySelectorAll('[data-shape-type="oval"]').length).toBe(1);
            expect(canvas.querySelectorAll('.shape.foreign').length).toBe(1);
            expect(canvas.querySelectorAll('.selected').length).toBe(0);

            return tick()
                .then(() => {
                    const rect = canvas.querySelector('[data-shape-type="rectangle"]');
                    fireEvent.mouseDown(rect);
                    fireEvent.mouseUp(rect);

                    return tick();
                })
                .then(() => {
                    expect(canvas.querySelectorAll('.selected').length).toBe(1);
                    expect(canvas.querySelectorAll('.selected[data-shape-type="rectangle"]').length).toBe(1);

                    const oval = canvas.querySelector('[data-shape-type="oval"]');
                    fireEvent.mouseDown(oval);
                    fireEvent.mouseUp(oval);

                    return tick();
                })
                .then(() => {
                    expect(canvas.querySelectorAll('.selected').length).toBe(1);
                    expect(canvas.querySelectorAll('.selected[data-shape-type="oval"]').length).toBe(1);

                    const text = canvas.querySelector('.shape.foreign .editable-wrapper');
                    fireEvent.mouseDown(text);
                    fireEvent.mouseUp(text);

                    return tick();
                })
                .then(() => {
                    expect(canvas.querySelectorAll('.selected').length).toBe(1);
                    expect(canvas.querySelectorAll('.selected.shape.foreign').length).toBe(1);
                });
        });

        it('moves a rectangle', () => {
            const { container } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 100,
                    height: 100,
                    tools: [
                        {
                            key: 'select',
                            type: 'select',
                            label: 'Select',
                            icon: 'select-16',
                            selected: true
                        }
                    ],
                    shapes: [
                        {
                            type: 'rectangle',
                            key: 'rect1',
                            hoverable: true,
                            geometry: { x: 10, y: 10, width: 25, height: 25 }
                        }
                    ]
                }
            });
            const canvas = container.querySelector('.scratchpad-container > svg');

            expect(canvas.querySelectorAll('[data-shape-type="rectangle"]').length).toBe(1);

            return tick()
                .then(() => {
                    const rect = canvas.querySelector('[data-shape-type="rectangle"]');
                    const shape = rect.querySelector('rect.shape');

                    expect(shape.getAttribute('x')).toBe('10');
                    expect(shape.getAttribute('y')).toBe('10');

                    fireEvent.mouseDown(rect, { clientX: 10, clientY: 10, buttons: 1 });
                    return tick();
                })
                .then(() => {
                    fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20, buttons: 1 });

                    return tick();
                })
                .then(() => {
                    const rect = canvas.querySelector('[data-shape-type="rectangle"]');

                    const shape = rect.querySelector('rect.shape');
                    expect(shape.getAttribute('x')).toBe('20');
                    expect(shape.getAttribute('y')).toBe('20');

                    fireEvent.mouseUp(rect);

                    return tick();
                })
                .then(() => {
                    const rect = canvas.querySelector('[data-shape-type="rectangle"]');
                    const shape = rect.querySelector('rect.shape');

                    expect(shape.getAttribute('x')).toBe('20');
                    expect(shape.getAttribute('y')).toBe('20');

                    expect(rect.classList.contains('selected')).toBe(true);
                });
        });

        it('moves a line with constraints', () => {
            const { container } = render(Scratchpad, {
                props: {
                    top: 10,
                    left: 10,
                    width: 100,
                    height: 100,
                    tools: [
                        {
                            key: 'select',
                            type: 'select',
                            label: 'Select',
                            icon: 'select-16',
                            selected: true
                        }
                    ],
                    shapes: [
                        {
                            type: 'line',
                            key: 'line1',
                            hoverable: true,
                            geometry: { x1: 10, y1: 10, x2: 30, y2: 30 }
                        }
                    ]
                }
            });
            const canvas = container.querySelector('.scratchpad-container > svg');

            expect(canvas.querySelectorAll('[data-shape-type="line"]').length).toBe(1);

            return tick()
                .then(() => {
                    const line = canvas.querySelector('[data-shape-type="line"]');
                    const shape = line.querySelector('line.shape');
                    expect(shape.getAttribute('x1')).toBe('10');
                    expect(shape.getAttribute('y1')).toBe('10');
                    expect(shape.getAttribute('x2')).toBe('30');
                    expect(shape.getAttribute('y2')).toBe('30');

                    fireEvent.mouseDown(line, { clientX: 10, clientY: 10, buttons: 1 });
                    return tick();
                })
                .then(() => {
                    fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20, buttons: 1 });

                    return tick();
                })
                .then(() => {
                    const line = canvas.querySelector('[data-shape-type="line"]');
                    const shape = line.querySelector('line.shape');

                    expect(shape.getAttribute('x1')).toBe('20');
                    expect(shape.getAttribute('y1')).toBe('20');
                    expect(shape.getAttribute('x2')).toBe('40');
                    expect(shape.getAttribute('y2')).toBe('40');

                    //move fast outisde
                    fireEvent.mouseMove(canvas, { clientX: 15, clientY: 50, buttons: 1 });
                    fireEvent.mouseMove(canvas, { clientX: 12, clientY: 50, buttons: 1 });
                    fireEvent.mouseMove(canvas, { clientX: -10, clientY: 50, buttons: 1 });
                    fireEvent.mouseMove(canvas, { clientX: -100, clientY: 50, buttons: 1 });

                    return tick();
                })
                .then(() => {
                    const line = canvas.querySelector('[data-shape-type="line"]');
                    const shape = line.querySelector('line.shape');

                    expect(shape.getAttribute('x1')).toBe('12');
                    expect(shape.getAttribute('y1')).toBe('50');
                    expect(shape.getAttribute('x2')).toBe('32');
                    expect(shape.getAttribute('y2')).toBe('70');

                    fireEvent.mouseUp(line);
                });
        });
    });
});
