// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import BasicMessage from '../BasicMessage.svelte';

describe('BasicMessage', () => {
    test.each([[void 0], [null], [''], ['purple']])('renders no element with status %s', status => {
        const { container } = render(BasicMessage, {
            props: {
                report: {
                    status
                }
            }
        });
        expect(container.querySelector('.plagiarism-message')).not.toBeInTheDocument();
    });

    test.each([['pending'], ['error'], ['suspicious', 'http://www.essays.net'], ['clear']])(
        'renders with status %s',
        (status, href = null) => {
            const { container } = render(BasicMessage, {
                props: {
                    report: {
                        status,
                        href
                    }
                }
            });
            expect(container).toMatchSnapshot();
        }
    );
});
