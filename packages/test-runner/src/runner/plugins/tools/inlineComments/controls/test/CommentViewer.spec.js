// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import CommentViewer from '../CommentViewer.svelte';

describe('CommentViewer', () => {
    beforeAll(() => {
        document.body.innerHTML = `<div id="fixture">
            Commented
            <span class="tao-comment-txt" data-color="tao--foo123" aria-describedby="tao-description-for-tao--foo123">text</span>
            here
        </div>`;
    });

    it('renders with closed Flyout if no reference', () => {
        const { container } = render(CommentViewer, {
            props: {
                commentValue: 'foo'
            }
        });
        expect(container.querySelector('.comment-highlight-viewer-flyout')).toBeInTheDocument();
        expect(container.querySelector('.comment-highlight-viewer-flyout .comment-viewer')).not.toBeInTheDocument();
    });

    it('renders with open Flyout if reference', () => {
        const { container } = render(CommentViewer, {
            props: {
                reference: document.querySelector('.tao-comment-txt[data-color="tao--foo123"]'),
                commentValue: 'foo'
            }
        });
        expect(container.querySelector('.comment-highlight-viewer-flyout .comment-viewer')).toBeInTheDocument();
    });

    it('opens Flyout if reference is added', () => {
        const { container, component } = render(CommentViewer, {
            props: {
                commentValue: 'foo'
            }
        });
        expect(container.querySelector('.comment-highlight-viewer-flyout')).toBeInTheDocument();
        expect(container.querySelector('.comment-highlight-viewer-flyout .comment-viewer')).not.toBeInTheDocument();

        component.$set({ reference: document.querySelector('.tao-comment-txt[data-color="tao--foo123"]') });

        return tick()
            .then(tick)
            .then(() => {
                expect(container.querySelector('.comment-highlight-viewer-flyout .comment-viewer')).toBeInTheDocument();
            });
    });

    it('closes Flyout if reference is removed', () => {
        const { container, component } = render(CommentViewer, {
            props: {
                reference: document.querySelector('.tao-comment-txt[data-color="tao--foo123"]'),
                commentValue: 'foo'
            }
        });
        expect(container.querySelector('.comment-highlight-viewer-flyout')).toBeInTheDocument();

        component.$set({ reference: null });

        return tick().then(() => {
            expect(container.querySelector('.comment-highlight-viewer-flyout')).toBeInTheDocument();
            expect(container.querySelector('.comment-highlight-viewer-flyout .comment-viewer')).not.toBeInTheDocument();
        });
    });

    it('dispatches "close" on click outside', () => {
        const { component } = render(CommentViewer, {
            props: {
                reference: document.querySelector('.tao-comment-txt[data-color="tao--foo123"]'),
                commentValue: 'foo'
            }
        });
        const closeSpy = vi.fn();
        component.$on('close', closeSpy);

        document.body.click();

        return tick().then(() => {
            expect(closeSpy).toHaveBeenCalled();
        });
    });
});
