// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import Dots from '../Dots.svelte';
import testStoreMock from '../../test/testStoreMocks/presetOneSectionLinear.json';

const stats = testStoreMock.testMap.parts.TP01.stats;
const currentPosition = 0;

describe('Dots component', () => {
    it('Has to render empty with no props', () => {
        const { container } = render(Dots, {});
        expect(container.getElementsByClassName('dots').length).toEqual(0);
    });

    it('Has to render correct quantity of viewed and unseen dots', () => {
        const { container } = render(Dots, { total: stats.total, currentPosition });

        expect(container.getElementsByTagName('li').length).toEqual(3);
        expect(container.getElementsByClassName('viewed').length).toEqual(1);
        expect(container).toMatchSnapshot();
    });

    it('Has to render correct message for screen reader', () => {
        const { container } = render(Dots, { total: stats.total, currentPosition });

        expect(container.getElementsByTagName('span')[0].textContent).toEqual('Question 1 of 3');
        expect(container).toMatchSnapshot();
    });
});
