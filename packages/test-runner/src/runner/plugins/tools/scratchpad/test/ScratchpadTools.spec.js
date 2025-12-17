// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import ScratchpadTools from '../ScratchpadTools.svelte';
import { tick } from 'svelte';
import toolDefinitions from '../toolDefinitions.js';

const tools = Object.keys(toolDefinitions).map(key => toolDefinitions[key]);

describe('ScratchpadTools', () => {
    describe('rendering', () => {
        it('should render correctly', () => {
            const { container } = render(ScratchpadTools, {
                tools
            });
            expect(container).toMatchSnapshot();
        });

        it('should render correctly with custom tools set', () => {
            const { container } = render(ScratchpadTools, {
                tools: [toolDefinitions.rectangle, toolDefinitions.text, toolDefinitions.select]
            });
            expect(container).toMatchSnapshot();
        });
    });

    describe('behaviour', () => {
        it('should expand subtools on longpress', () => {
            const { container } = render(ScratchpadTools, {
                tools
            });

            const rectangleButton = container.querySelector('button[data-test-id="scratchpadTool-rectangle"]');
            const rectangleSubOption = container.querySelector('ol[data-test-id="scratchpadTool-subtools-rectangle"]');
            fireEvent.mouseDown(rectangleButton, { buttons: 1 });
            return new Promise(resolve => {
                setTimeout(() => {
                    expect(rectangleSubOption).toHaveClass('expanded');
                    resolve();
                }, 400);
            });
        });

        it('should expand subtools of one-time tool on click', () => {
            const { container } = render(ScratchpadTools, {
                tools
            });

            const brushButton = container.querySelector('button[data-test-id="scratchpadTool-brush"]');
            const brushSubOption = container.querySelector('ol[data-test-id="scratchpadTool-subtools-brush"]');
            fireEvent.mouseDown(brushButton, { buttons: 1 });
            fireEvent.mouseUp(brushButton);

            return tick().then(() => expect(brushSubOption).toHaveClass('expanded'));
        });

        it('should collapse subtools on click outside', () => {
            const { container } = render(ScratchpadTools, {
                tools
            });

            const rectangleButton = container.querySelector('button[data-test-id="scratchpadTool-rectangle"]');
            const rectangleSubOption = container.querySelector('ol[data-test-id="scratchpadTool-subtools-rectangle"]');
            fireEvent.mouseDown(rectangleButton, { buttons: 1 });
            return new Promise(resolve => {
                setTimeout(() => {
                    expect(rectangleSubOption).toHaveClass('expanded');
                    fireEvent.mouseDown(container);
                    resolve();
                }, 400);
            })
                .then(tick)
                .then(() => {
                    expect(rectangleSubOption).not.toHaveClass('expanded');
                });
        });
    });

    describe('events', () => {
        it('should emit select event on tool click', () => {
            const { component, container } = render(ScratchpadTools, {
                tools
            });
            const onSelect = vi.fn();
            component.$on('select', onSelect);
            const eraserButton = container.querySelector('button[data-test-id="scratchpadTool-eraser"]');
            fireEvent.mouseDown(eraserButton, { buttons: 1 });
            fireEvent.mouseUp(eraserButton);
            expect(onSelect).toHaveBeenCalled();
            expect(onSelect.mock.calls[0][0].detail.tools.find(tool => tool.selected).key).toEqual('eraser');
        });
    });
});
