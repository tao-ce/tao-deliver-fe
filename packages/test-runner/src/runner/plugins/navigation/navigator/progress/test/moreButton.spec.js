// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import MoreButton from '../MoreButton.svelte';

describe('MoreButton', () => {
    it('renders without props', () => {
        const { container } = render(MoreButton, { props: {} });
        expect(container).toMatchSnapshot();
        expect(container.getElementsByTagName('button').length).toEqual(0);
    });

    it('renders button if active is set to true', () => {
        const { container } = render(MoreButton, { props: { active: true } });
        expect(container).toMatchSnapshot();
        expect(container.getElementsByTagName('button').length).toEqual(1);
    });

    it('renders button in disabled state', () => {
        const { container } = render(MoreButton, { props: { active: true, disabled: true } });
        expect(container.querySelector('button')).toHaveAttribute('disabled');
    });

    it('emits more event on button click', () => {
        const moreHandler = vi.fn();
        const { component, container } = render(MoreButton, { props: { active: true } });
        component.$on('more', moreHandler);
        const buttonEl = container.getElementsByTagName('button')[0];
        return fireEvent.click(buttonEl).then(() => {
            expect(moreHandler).toHaveBeenCalled();
        });
    });
});
