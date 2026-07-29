// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent, render } from '@testing-library/svelte';
import AssociationLine from '../AssociationLine.svelte';

describe('Association line', () => {
    it('renders line', () => {
        const { container } = render(AssociationLine, {
            props: {
                activeLineStart: [0, 0],
                activeLineEnd: [10, 10]
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders line with remove button', () => {
        const { container } = render(AssociationLine, {
            props: {
                activeLineStart: [0, 0],
                activeLineEnd: [10, 10],
                removable: true,
                ariaLabel: 'rmbt'
            }
        });
        expect(container).toMatchSnapshot();
        const button = container.querySelector('.button-container');
        expect(button).toHaveAttribute('aria-label');
        expect(button.getAttribute('aria-label')).toEqual('rmbt');
    });

    it('renders line in disabled state', () => {
        const { container } = render(AssociationLine, {
            props: {
                activeLineStart: [0, 0],
                activeLineEnd: [10, 10],
                disabled: true
            }
        });
        expect(container.querySelector('.association-line')).toHaveClass('disabled');
    });

    it('renders line in selected state', () => {
        const { container } = render(AssociationLine, {
            props: {
                activeLineStart: [0, 0],
                activeLineEnd: [10, 10],
                selected: true
            }
        });
        expect(container.querySelector('.association-line')).toHaveClass('selected');
    });

    it('fires click', () => {
        const { container, component } = render(AssociationLine, {
            props: {
                activeLineStart: [0, 0],
                activeLineEnd: [10, 10],
                removable: true
            }
        });

        const removeSpy = vi.fn();
        const lineClickSpy = vi.fn();
        component.$on('remove', removeSpy);
        component.$on('lineClick', lineClickSpy);

        fireEvent.click(container.querySelector('.shape-line-hover'));
        expect(lineClickSpy).toHaveBeenCalled();

        fireEvent.click(container.querySelector('.remove-button-hitbox'));
        expect(removeSpy).toHaveBeenCalled();
    });

    it('forwards keyup/keydown event', () => {
        const { container, component } = render(AssociationLine, {
            props: {
                activeLineStart: [0, 0],
                activeLineEnd: [10, 10],
                removable: true
            }
        });
        const keyUpFnc = vi.fn();
        const keyDownFnc = vi.fn();
        component.$on('keyup', keyUpFnc);
        component.$on('keydown', keyDownFnc);

        const button = container.querySelector('.remove-button-hitbox');
        fireEvent.keyUp(button);
        expect(keyUpFnc).toHaveBeenCalled();

        fireEvent.keyDown(button);
        expect(keyDownFnc).toHaveBeenCalled();
    });

    it('does not dispatch click if disabled', () => {
        const { container, component } = render(AssociationLine, {
            props: {
                activeLineStart: [0, 0],
                activeLineEnd: [10, 10],
                removable: true,
                disabled: true
            }
        });

        const removeSpy = vi.fn();
        const lineClickSpy = vi.fn();
        component.$on('remove', removeSpy);
        component.$on('lineClick', lineClickSpy);

        fireEvent.click(container.querySelector('.shape-line-hover'));
        expect(lineClickSpy).not.toHaveBeenCalled();

        fireEvent.click(container.querySelector('.remove-button-hitbox'));
        expect(removeSpy).not.toHaveBeenCalled();
    });
});
