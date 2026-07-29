// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import HblMessage from '../HblMessage.svelte';
import ContextWrapper from '../../../../static/test/ContextWrapper.svelte';

describe('HblMessage', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders link with href="#" when status == suspicious', () => {
        const { container } = render(HblMessage, {
            props: {
                report: {
                    status: 'suspicious',
                    href: 'http://cdn.plagiarism.tao'
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('calls getData and updates href when link clicked', async () => {
        const itemIdentifier = 'item-1';
        const reportUrl = '/api/v1/delivery-executions/dxId-123/hbl/hbl-report-1';
        const dynamicReportUrl = 'http://cdn.plagiarism.tao/hbl-report-1';

        const mockGetData = vi.fn();
        mockGetData.mockResolvedValue({
            reportUrl: dynamicReportUrl
        });

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext: {
                    getGetData: () => mockGetData,
                    getLogger: () => {},
                    showItemNotification: () => {},
                    removeItemNotification: () => {}
                },
                testComponent: HblMessage,
                testComponentProps: {
                    itemIdentifier,
                    report: {
                        status: 'suspicious',
                        reportUrl
                    }
                }
            }
        });
        expect(container.querySelector('a')).toHaveAttribute('href', '#');

        container.querySelector('a').click();
        await tick();

        expect(mockGetData).toHaveBeenCalledWith(reportUrl, {}, { returnParsedJsonResponse: true });
        expect(container.querySelector('a')).toHaveAttribute('href', dynamicReportUrl);
    });
});
