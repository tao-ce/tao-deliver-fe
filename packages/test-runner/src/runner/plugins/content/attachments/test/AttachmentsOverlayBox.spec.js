// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import AttachmentsOverlayBox from '../AttachmentsOverlayBox.svelte';
import { getTestSessionStatusStore } from '../../../../testsStateStore.js';

describe('AttachmentsOverlayBox', () => {
    const attachments = [
        {
            id: '1',
            url: '//api/v1/attachment1.pdf',
            name: 'Attachment 1',
            type: 'application/pdf'
        },
        {
            id: '2',
            url: '//api/v1/attachment2.png',
            name: 'Attachment 2',
            type: 'image/png'
        }
    ];
    const serviceCallId = 'test-session-123afdhj';

    beforeEach(() => {
        getTestSessionStatusStore(serviceCallId).set('interacting');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders empty div when testSessionStatus not interacting', () => {
        getTestSessionStatusStore(serviceCallId).set('overlay');

        const { container } = render(AttachmentsOverlayBox, {
            props: {
                attachments,
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders with attachments', () => {
        const { container } = render(AttachmentsOverlayBox, {
            props: {
                attachments,
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('fires close event on escape keydown', () => {
        const { container, component } = render(AttachmentsOverlayBox, {
            props: {
                attachments,
                serviceCallId
            }
        });
        const closeSpy = vi.fn();
        component.$on('close', closeSpy);

        const button = container.querySelector('button');
        fireEvent.keyDown(button, { keyCode: 27 }); //esc

        expect(closeSpy).toHaveBeenCalled();
    });
});
