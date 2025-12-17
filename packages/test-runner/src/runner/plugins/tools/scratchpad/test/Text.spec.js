// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent, render } from '@testing-library/svelte';
import Text from '../Text.svelte';

describe('Text', () => {
    describe('rendering', () => {
        it('should render the foreignObject with the given geometry', () => {
            const { container } = render(Text, {
                props: {
                    geometry: {
                        x: 10,
                        y: 10,
                        width: 100,
                        height: 28
                    },
                    content: 'abc'
                }
            });
            expect(container.querySelector('foreignObject')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('should render component in selected state', () => {
            const { container } = render(Text, {
                props: {
                    geometry: {
                        x: 10,
                        y: 10,
                        width: 100,
                        height: 28
                    },
                    content: 'abc',
                    selected: true
                }
            });
            expect(container.querySelector('foreignObject')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('should render component in non-editable state', () => {
            const { container } = render(Text, {
                props: {
                    geometry: {
                        x: 10,
                        y: 10,
                        width: 100,
                        height: 28
                    },
                    content: 'abc',
                    editable: false
                }
            });
            const foreignObject = container.querySelector('foreignObject');
            expect(foreignObject).not.toBeNull();
            expect(foreignObject.querySelector('.editable-wrapper > span').getAttribute('contenteditable')).toBe(
                'false'
            );
            expect(container).toMatchSnapshot();
        });

        it('should render the foreignObject with the given drawingGeometry', () => {
            const { container } = render(Text, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 10,
                        drawAreaStartY: 10,
                        initialPointerX: 100,
                        initialPointerY: 100
                    }
                }
            });
            expect(container.querySelector('foreignObject')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });
    });

    describe('events', () => {
        it('should fire finishEditing event when mousedown outside wrapper with false detail if no content', () => {
            const { component, container } = render(Text, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    },
                    selected: true
                }
            });
            const finishEditingHandler = vi.fn();
            component.$on('finishEditing', finishEditingHandler);

            const foreignObject = container.querySelector('.foreign');

            //add a little time gap to get wrapperElement bound
            return new Promise(res => {
                setTimeout(res, 100);
            }).then(() => {
                fireEvent.mouseUp(foreignObject);

                expect(finishEditingHandler).toHaveBeenCalled();
                expect(finishEditingHandler.mock.calls[0][0].detail).toEqual(false);
            });
        });

        it('should not fire finishEditing event when mousedown inside wrapper', () => {
            const { component, container } = render(Text, {
                props: {
                    type: 'rectangle',
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    },
                    selected: true
                }
            });
            const finishEditingHandler = vi.fn();
            component.$on('finishEditing', finishEditingHandler);

            const editable = container.querySelector('.editable');

            fireEvent.mouseDown(editable);

            expect(finishEditingHandler).not.toHaveBeenCalled();
        });

        it('should update own state on keyup', () => {
            const { component, container } = render(Text, {
                props: {
                    type: 'rectangle',
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    },
                    content: 'abc',
                    selected: true
                }
            });
            const finishEditingHandler = vi.fn();
            component.$on('finishEditing', finishEditingHandler);

            const foreignObject = container.querySelector('.foreign');
            const editable = container.querySelector('.editable');

            editable.innerText = 'abcd';
            fireEvent.input(editable);

            //add a little time gap to get wrapperElement bound
            return new Promise(res => {
                setTimeout(res, 100);
            }).then(() => {
                fireEvent.mouseUp(foreignObject);

                expect(finishEditingHandler).toHaveBeenCalled();
                expect(finishEditingHandler.mock.calls[0][0].detail.content).toEqual('abcd');
            });
        });

        it('should fire the editing event', () => {
            const { component, container } = render(Text, {
                props: {
                    type: 'rectangle',
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    },
                    content: '',
                    selected: true
                }
            });
            const editingHandler = vi.fn();
            component.$on('editing', editingHandler);

            const editable = container.querySelector('.editable');

            editable.innerText = 'a';
            fireEvent.input(editable);

            expect(editingHandler).toHaveBeenCalledTimes(1);
            expect(editingHandler.mock.calls[0][0].detail.content).toEqual('a');

            editable.innerText = 'ab';
            fireEvent.input(editable);

            expect(editingHandler).toHaveBeenCalledTimes(2);
            expect(editingHandler.mock.calls[1][0].detail.content).toEqual('ab');
        });
    });
});
