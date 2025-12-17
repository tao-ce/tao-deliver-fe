// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import config from '../config.js';
import TableContainer from './TableContainer.svelte';

vi.mock('../config.js', () => ({
    __esModule: true,
    default: {
        dataTable: {
            batteries: {
                columns: [
                    { id: 'name', label: 'Name' },
                    { id: 'id', label: 'ID' }
                    //{ id: 'nrOfDeliveries', label: 'Deliveries' }
                ]
            }
        }
    }
}));

describe('TableContainer component', () => {
    it('should render', () => {
        const { getByText } = render(TableContainer, {
            props: {
                columns: config.dataTable.batteries.columns,
                items: [
                    { name: 'battery numero uno', id: 'id1' },
                    { name: 'Battery number two', id: 'id2' }
                ],
                isLoading: false
            }
        });

        expect(getByText('Battery number two'));
    });

    it('should filter rows by search term', () => {
        const { container } = render(TableContainer, {
            props: {
                columns: config.dataTable.batteries.columns,
                items: [
                    { name: 'battery numero uno', id: 'id1' },
                    { name: 'Battery number two', id: 'id2' }
                ],
                searchValue: 'two',
                isLoading: false
            }
        });

        expect(container).toMatchSnapshot();
    });
});
