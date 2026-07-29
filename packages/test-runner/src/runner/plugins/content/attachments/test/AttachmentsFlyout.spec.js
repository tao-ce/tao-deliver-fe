// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import AttachmentsFlyout from '../AttachmentsFlyout.svelte';
import { getTestSessionStatusStore } from '../../../../testsStateStore.js';
import { decommentify } from '@/test-utils/helpers.js';

describe('AttachmentsFlyout', () => {
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
    const dummyElement = document.createElement('div');

    beforeEach(() => {
        getTestSessionStatusStore(serviceCallId).set('interacting');
        document.body.appendChild(dummyElement);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when testSessionStatus not interacting', () => {
        getTestSessionStatusStore(serviceCallId).set('overlay');

        const { container } = render(AttachmentsFlyout, {
            props: {
                serviceCallId
            }
        });
        expect(decommentify(container.innerHTML.trim())).toBe('');
    });

    it('renders when reference present and clicked', async () => {
        const { container } = render(AttachmentsFlyout, {
            props: {
                attachments,
                serviceCallId,
                reference: dummyElement
            }
        });
        expect(container.querySelector('.attachments-flyout')).toBeInTheDocument();
        expect(container.querySelector('.attachments-list')).not.toBeInTheDocument();

        dummyElement.click();
        await tick();

        expect(container.querySelector('.attachments-list')).toBeInTheDocument();
    });

    it('forwards show & hide events from Flyout', async () => {
        const { component } = render(AttachmentsFlyout, {
            props: {
                attachments,
                serviceCallId,
                reference: dummyElement
            }
        });
        const showSpy = vi.fn();
        const hideSpy = vi.fn();
        component.$on('show', showSpy);
        component.$on('hide', hideSpy);

        expect(showSpy).not.toHaveBeenCalled();
        expect(hideSpy).not.toHaveBeenCalled();

        dummyElement.click();
        await tick();
        await tick();
        expect(showSpy).toHaveBeenCalledTimes(1);

        document.body.click();
        await tick();
        await tick();
        expect(hideSpy).toHaveBeenCalledTimes(1);
    });
});
