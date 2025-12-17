// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import CommentEditor from '../CommentEditor.svelte';

describe('CommentEditor', () => {
    beforeAll(() => {
        document.body.innerHTML = `<div id="fixture">
            Commented
            <span class="tao-comment-txt" data-color="tao--foo123" aria-describedby="tao-description-for-tao--foo123">text</span>
            here
        </div>`;
    });

    it('renders with closed Flyout if no reference', () => {
        const { container } = render(CommentEditor, {
            props: {
                commentValue: 'foo'
            }
        });
        expect(container.querySelector('.comment-editor')).not.toBeInTheDocument();
    });

    it('renders with open Flyout if reference', () => {
        const { container } = render(CommentEditor, {
            props: {
                isEditorOpen: true,
                commentValue: 'foo'
            }
        });
        expect(container.querySelector('.comment-editor')).toBeInTheDocument();
    });

    it('allows parent to set focus', () => {
        const { container, component } = render(CommentEditor, {
            props: {
                isEditorOpen: true,
                commentValue: 'foo'
            }
        });
        expect(container.querySelector('.draggable-modal .comment-editor')).toBeInTheDocument();
        expect(document.activeElement).toBeInstanceOf(HTMLBodyElement);

        component.focusField();

        expect(document.activeElement).toBeInstanceOf(HTMLTextAreaElement);
    });

    it('renders all props', () => {
        render(CommentEditor, {
            props: {
                isEditorOpen: true,
                commentValue: 'foo',
                notificationProps: {
                    title: 'Saving failed',
                    message: 'Please try again',
                    hierarchy: 'alert'
                },
                disabled: true,
                submitting: true
            }
        });
        expect(document.body).toMatchSnapshot();
    });

    it('opens DraggableModal if isEditorOpen is set', () => {
        const { container, component } = render(CommentEditor, {
            props: {
                isEditorOpen: false,
                commentValue: 'foo'
            }
        });
        expect(container.querySelector('.draggable-modal')).not.toBeInTheDocument();
        expect(container.querySelector('.draggable-modal .comment-editor')).not.toBeInTheDocument();

        component.$set({ isEditorOpen: true });

        return tick()
            .then(tick)
            .then(() => {
                expect(container.querySelector('.draggable-modal .comment-editor')).toBeInTheDocument();
            });
    });

    it('closes DraggableModal if isEditorOpen is unset', () => {
        const { container, component } = render(CommentEditor, {
            props: {
                isEditorOpen: true,
                commentValue: 'foo'
            }
        });
        expect(container.querySelector('.draggable-modal')).toBeInTheDocument();

        component.$set({ isEditorOpen: false });

        return tick().then(() => {
            expect(container.querySelector('.draggable-modal')).not.toBeInTheDocument();
            expect(container.querySelector('.draggable-modal .comment-editor')).not.toBeInTheDocument();
        });
    });

    describe('Events', () => {
        it('cancel button dispatches "close"', () => {
            const { component, container } = render(CommentEditor, {
                props: {
                    isEditorOpen: true,
                    commentValue: 'foo'
                }
            });
            const closeSpy = vi.fn();
            component.$on('close', closeSpy);

            container.querySelector('button[name="cancel-comment"]').click();

            expect(closeSpy).toHaveBeenCalledTimes(1);
            expect(closeSpy.mock.calls[0][0].detail).toEqual({});
        });

        it('save button dispatches "save" if text changed', async () => {
            const { component, container } = render(CommentEditor, {
                props: {
                    isEditorOpen: true,
                    commentValue: 'foo'
                }
            });
            const saveSpy = vi.fn();
            component.$on('save', saveSpy);

            const textarea = container.querySelector('textarea');
            await fireEvent.input(textarea, { target: { value: 'bar' } });

            container.querySelector('button[name="save-comment"]').setAttribute('type', 'button'); // jsdom cannot handle submit
            container.querySelector('button[name="save-comment"]').click();

            expect(saveSpy).toHaveBeenCalledTimes(1);
            expect(saveSpy.mock.calls[0][0].detail).toEqual({ commentValue: 'bar' });
        });

        it('save button dispatches "delete" if text removed', async () => {
            const { component, container } = render(CommentEditor, {
                props: {
                    isEditorOpen: true,
                    commentValue: 'foo'
                }
            });
            const deleteSpy = vi.fn();
            component.$on('delete', deleteSpy);

            const textarea = container.querySelector('textarea');
            await fireEvent.input(textarea, { target: { value: '' } });

            container.querySelector('button[name="save-comment"]').setAttribute('type', 'button'); // jsdom cannot handle submit
            container.querySelector('button[name="save-comment"]').click();

            expect(deleteSpy).toHaveBeenCalledTimes(1);
            expect(deleteSpy.mock.calls[0][0].detail).toEqual({});
        });

        it('delete buttonLink dispatches "delete"', () => {
            const { component, container } = render(CommentEditor, {
                props: {
                    isEditorOpen: true,
                    commentValue: 'foo'
                }
            });
            const deleteSpy = vi.fn();
            component.$on('delete', deleteSpy);

            container.querySelector('a.button-link').click();

            expect(deleteSpy).toHaveBeenCalledTimes(1);
            expect(deleteSpy.mock.calls[0][0].detail).toEqual({});
        });
    });
});
