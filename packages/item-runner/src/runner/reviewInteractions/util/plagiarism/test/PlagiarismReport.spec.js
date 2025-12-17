// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import PlagiarismReport from '../PlagiarismReport.svelte';

describe('PlagiarismReport', () => {
    test.each([['default'], ['hbl']])('renders %s message component', provider => {
        const status = 'pending';
        const { container } = render(PlagiarismReport, {
            props: {
                report: {
                    provider,
                    status
                }
            }
        });
        expect(container.querySelector('.plagiarism-message')).toBeInTheDocument();
    });

    it('renders default message component as fallback', () => {
        const status = 'pending';
        const { container } = render(PlagiarismReport, {
            props: {
                report: {
                    status
                }
            }
        });
        expect(container.querySelector('.plagiarism-message')).toBeInTheDocument();
    });
});
