// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import CommentButton from '../CommentButton.svelte';

describe('CommentButton', () => {
    const rect1 = {
        getBoundingClientRect: () => ({
            x: 20,
            y: 30,
            left: 20,
            top: 30,
            right: 200,
            bottom: 300,
            width: 180,
            height: 270
        })
    };

    it('renders with closed Flyout if no reference', () => {
        const { container } = render(CommentButton, {
            props: {}
        });
        expect(container.querySelector('.comment-highlight-button-flyout')).toBeInTheDocument();
        expect(container.querySelector('.comment-highlight-button-flyout button')).not.toBeInTheDocument();
    });

    it('renders with open Flyout if reference', () => {
        const { container } = render(CommentButton, {
            props: {
                reference: rect1
            }
        });
        expect(container.querySelector('.comment-highlight-button-flyout button')).toBeInTheDocument();
    });

    it('opens Flyout if reference is added', () => {
        const { container, component } = render(CommentButton, {
            props: {}
        });
        expect(container.querySelector('.comment-highlight-button-flyout')).toBeInTheDocument();
        expect(container.querySelector('.comment-highlight-button-flyout button')).not.toBeInTheDocument();

        component.$set({ reference: rect1 });
        return tick().then(() => {
            expect(container.querySelector('.comment-highlight-button-flyout button')).toBeInTheDocument();
        });
    });

    it('closes Flyout if reference is removed', () => {
        const { container, component } = render(CommentButton, {
            props: {
                reference: rect1
            }
        });
        expect(container.querySelector('.comment-highlight-button-flyout')).toBeInTheDocument();

        component.$set({ reference: null });
        return tick().then(() => {
            expect(container.querySelector('.comment-highlight-button-flyout')).toBeInTheDocument();
            expect(container.querySelector('.comment-highlight-button-flyout button')).not.toBeInTheDocument();
        });
    });
});
