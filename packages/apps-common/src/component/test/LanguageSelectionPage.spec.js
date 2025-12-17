// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { fireEvent, render } from '@testing-library/svelte';
import LanguageSelectionPage from '../LanguageSelectionPage.svelte';
import request from 'core/fetchRequest';

vi.mock('core/fetchRequest');

const props = {
    submitSelectionEndpoint: 'https://localeSubmitUrl',
    defaultLocale: 'ru-RU',
    supportedLocales: ['en-GB', 'ru-RU', 'fr-FR']
};

describe('LanguageSelectionPage component', () => {
    it('Renders correctly with no props', () => {
        const { container } = render(LanguageSelectionPage);
        expect(container).toMatchSnapshot();
    });

    it('Renders correctly with props set', () => {
        const { container } = render(LanguageSelectionPage, props);
        expect(container).toMatchSnapshot();
    });

    it('Sets the first locale from a list of supportedLocales if default is not specified', () => {
        const propsWithoutDefaultLocale = Object.assign({}, props, { defaultLocale: void 0 });
        const { container } = render(LanguageSelectionPage, propsWithoutDefaultLocale);
        expect(container).toMatchSnapshot();
    });

    it('Sends the selected locale to the specified endpoint', async () => {
        const { container, component } = render(LanguageSelectionPage, props);
        const selectButton = container.querySelector('button.actionable');

        const selectedMock = vi.fn();
        component.$on('selected', selectedMock);

        await fireEvent.click(selectButton);

        expect(request).toHaveBeenCalledWith(props.submitSelectionEndpoint, {
            body: JSON.stringify({ locale: 'ru-RU' }),
            headers: { 'Content-Type': 'application/json' },
            method: 'PUT'
        });

        await tick();

        expect(selectedMock).toHaveBeenCalled();
    });
});
