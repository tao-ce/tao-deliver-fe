// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import ResponsePanel from '../ResponsePanel.svelte';

const mockResponses = [
    {
        submitId: Symbol('submitId'),
        itemResponses: [
            {
                identifier: 'RESPONSE1',
                responseData: '(directedPair) [[choice_2, gap_1]]'
            }
        ],
        score: 1,
        maxScore: 1
    },
    {
        submitId: Symbol('submitId'),
        itemResponses: [
            {
                identifier: 'RESPONSE1',
                responseData: '(identifier) Discovery'
            }
        ],
        score: 0,
        maxScore: 1
    },
    {
        submitId: Symbol('submitId'),
        itemResponses: [
            {
                identifier: 'RESPONSE1',
                responseData: '(identifier) Discovery'
            },
            {
                identifier: 'RESPONSE1',
                responseData: '(string) "1982"'
            }
        ],
        score: 2,
        maxScore: 3
    }
];

describe('ResponsePanel', () => {
    beforeAll(() => {
        //mock scroll method otherwise test will throw an error to console
        const scrollMock = vi.fn();
        Element.prototype.scroll = scrollMock;
    });

    it('renders correctly', () => {
        const { container } = render(ResponsePanel, {
            responses: mockResponses
        });
        expect(container).toMatchSnapshot();
    });

    it('triggers submit event', () => {
        const { container, component } = render(ResponsePanel, { responses: mockResponses });
        let mockEvent = vi.fn();
        component.$on('submit', mockEvent);
        fireEvent.click(container.querySelector('[data-test-id="submit-response"]'));
        expect(mockEvent).toHaveBeenCalled();
    });
});
