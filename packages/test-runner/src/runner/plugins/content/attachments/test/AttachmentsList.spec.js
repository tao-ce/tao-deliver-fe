// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import AttachmentsList from '../AttachmentsList.svelte';

describe('AttachmentsList', () => {
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

    it('renders with attachments', () => {
        const { container } = render(AttachmentsList, {
            props: {
                attachments
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('focuses first button on mount', () => {
        const { container } = render(AttachmentsList, {
            props: {
                attachments
            }
        });
        return tick().then(() => {
            const button = container.querySelector('li:first-child button:first-child');
            expect(document.activeElement).toEqual(button);
        });
    });

    it('fires click event (inNewTab: false)', () =>
        new Promise(done => {
            const { container, component } = render(AttachmentsList, {
                props: {
                    attachments
                }
            });
            component.$on('click', event => {
                expect(event.detail).toEqual({ id: '1', inNewTab: false });
                done();
            });
            const button = container.querySelector('li:first-child button:first-child');
            button.click();
        }));

    it('fires click event (inNewTab: true)', () =>
        new Promise(done => {
            const { container, component } = render(AttachmentsList, {
                props: {
                    attachments
                }
            });
            component.$on('click', event => {
                expect(event.detail).toEqual({ id: '2', inNewTab: true });
                done();
            });
            const button = container.querySelector('li:last-child button:last-child');
            button.click();
        }));

    it('fires close event on escape keydown', () => {
        const { container, component } = render(AttachmentsList, {
            props: {
                attachments
            }
        });
        const closeSpy = vi.fn();
        component.$on('close', closeSpy);

        const button = container.querySelector('button');
        fireEvent.keyDown(button, { keyCode: 27 }); //esc

        expect(closeSpy).toHaveBeenCalled();
    });
});
