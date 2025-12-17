// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent, waitFor } from '@testing-library/svelte';
import PasswordPage from '../PasswordPage.svelte';
import request from 'core/fetchRequest';

const props = {
    validationEndpoint: 'https://validation/end-point',
    deliveryId: 'delivery-id'
};
const password = 'tests-password';
const incorrectPassword = 'incorrect-password';
vi.mock('core/fetchRequest');

const mutationObserverOriginal = global.MutationObserver;
const mutationObserverMock = vi.fn(function MutationObserver() {
    this.observe = vi.fn();
    this.disconnect = vi.fn();
    this.takeRecords = vi.fn(() => []);
});
global.MutationObserver = mutationObserverMock;

describe('PasswordPage component', () => {
    beforeEach(() => {
        request.mockReset();
    });
    afterAll(() => {
        global.MutationObserver = mutationObserverOriginal;
    });

    it('renders correctly with all properties', () => {
        const { container } = render(PasswordPage, { props });

        expect(container).toMatchSnapshot();
    });
    it('should call the handleSubmit function on button click', async () => {
        request.mockResolvedValue();
        // render the component
        const { container } = render(PasswordPage, { props });

        // input a value in the input field
        const input = container.querySelector('input[type="text"]');
        await fireEvent.input(input, { target: { value: password } });
        // click the button
        const button = container.querySelector('button[type="submit"]');
        await fireEvent.click(button);
        expect(request).toHaveBeenCalledWith(props.validationEndpoint, {
            body: JSON.stringify({ password, deliveryId: props.deliveryId }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST'
        });
    });

    it('renders the error message when password is invalid', async () => {
        request.mockRejectedValue({ response: { status: 401 } });
        // render the component
        const { container } = render(PasswordPage, { props });

        // input an incorrect value in the input field
        const input = container.querySelector('input[type="text"]');
        await fireEvent.input(input, { target: { value: incorrectPassword } });
        // click the button
        const button = container.querySelector('button[type="submit"]');
        await fireEvent.click(button);
        await waitFor(() => {
            expect(container.querySelector('.error-container')).toBeInTheDocument();
        });
    });

    it('renders the error message when request fails', async () => {
        request.mockRejectedValue({ error: { message: '' } });
        // render the component
        const { container } = render(PasswordPage, { props });

        // input a value in the input field
        const input = container.querySelector('input[type="text"]');
        await fireEvent.input(input, { target: { value: password } });
        // click the button
        const button = container.querySelector('button[type="submit"]');
        await fireEvent.click(button);
        await waitFor(() => {
            expect(container.querySelector('.error-container')).toBeInTheDocument();
        });
    });
});
