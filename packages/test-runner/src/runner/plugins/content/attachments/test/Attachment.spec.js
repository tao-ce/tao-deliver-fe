// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import Attachment from '../Attachment.svelte';
import { getTestSessionStatusStore } from '../../../../testsStateStore.js';

describe('Attachment', () => {
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
    const assetManager = {
        resolve: url => url
    };
    const serviceCallId = 'test-session-123afdhj';

    beforeEach(() => {
        getTestSessionStatusStore(serviceCallId).set('interacting');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders empty div when testSessionStatus not interacting', () => {
        getTestSessionStatusStore(serviceCallId).set('overlay');

        const { container } = render(Attachment, {
            props: {
                attachment: attachments[0],
                assetManager,
                serviceCallId
            }
        });
        expect(container.querySelector('.attachment-box')).toBeEmptyDOMElement();
    });

    it('renders with PDF attachment', async () => {
        const { container } = render(Attachment, {
            props: {
                attachment: attachments[0],
                assetManager,
                serviceCallId
            }
        });
        await tick();
        expect(container).toMatchSnapshot();
    });

    it('renders with image attachment', () => {
        const { container } = render(Attachment, {
            props: {
                attachment: attachments[1],
                assetManager,
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('fires mount event with flyoutAnchorElt on mount', () =>
        new Promise(done => {
            const { component } = render(Attachment, {
                props: {
                    attachment: attachments[0],
                    assetManager,
                    serviceCallId
                }
            });
            component.$on('mount', event => {
                expect(event.detail.flyoutAnchorElt).not.toBeNull();
                done();
            });
        }));

    it('fires toggle-menu event on button click', () =>
        new Promise(done => {
            const { container, component } = render(Attachment, {
                props: {
                    attachment: attachments[0],
                    assetManager,
                    serviceCallId
                }
            });
            const toggleMenuSpy = vi.fn();
            component.$on('toggle-menu', toggleMenuSpy);

            const button = container.querySelector('.actions.start button');
            fireEvent.click(button);
            expect(toggleMenuSpy).toHaveBeenCalled();
            done();
        }));

    it('fires close event on button click', () =>
        new Promise(done => {
            const { container, component } = render(Attachment, {
                props: {
                    attachment: attachments[0],
                    assetManager,
                    serviceCallId
                }
            });
            const closeSpy = vi.fn();
            component.$on('close', closeSpy);

            const button = container.querySelector('.actions.end button');
            fireEvent.click(button);
            expect(closeSpy).toHaveBeenCalled();
            done();
        }));
});
