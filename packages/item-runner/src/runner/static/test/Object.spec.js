// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('@oat-sa-private/ui-components/player/Plyr.js');

vi.mock('@oat-sa-private/ui-components/documentViewer/DocumentViewer.svelte', async () => {
    const MockDocumentViewer = (await import('./MockDocumentViewer.svelte')).default;
    return {
        default: MockDocumentViewer
    };
});

import { render } from '@testing-library/svelte';
import ObjectElement from '../ObjectElement.svelte';
import ContextWrapper from './ContextWrapper.svelte';
import Plyr from '@oat-sa-private/ui-components/player/Plyr.js';

const mockDocument = vi.fn(() => document);

Plyr.mockImplementation((id, config) => {
    const document = mockDocument();
    return {
        on: () => vi.fn(),
        play: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        ended: vi.fn(),
        destroy: vi.fn(),
        fullscreen: {
            active: false
        },
        set source(src) {},
        media: {
            addEventListener: vi.fn()
        },
        elements: {
            container: document.createElement('div'),
            controls: document.createElement('div')
        },
        currentTime: 0,
        config
    };
});

describe('Object', () => {
    const resolve = vi.fn(e => e);
    const getAssetManager = vi.fn(() => ({
        resolve
    }));
    const getLogger = vi.fn(() => ({ error: vi.fn() }));
    const testContext = {
        getAssetManager,
        getLogger
    };

    afterEach(() => vi.clearAllMocks());

    it('renders correctly with no props', () => {
        const { container } = render(ObjectElement, { props: {} });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with HTML attributes', () => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: 'item2',
                testContext,
                testComponent: ObjectElement,
                testComponentProps: {
                    itemIdentifier: 'item2',
                    attributes: {
                        data: 'assets/sheet.pdf',
                        type: 'application/pdf',
                        role: 'application',
                        'aria-label': 'explanation sheet',
                        class: 'fancy highlighted',
                        'data-foo': 'bar'
                    }
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders an audio player for audio/* type', () => {
        const { container } = render(ObjectElement, {
            props: {
                itemIdentifier: 'item1',
                attributes: {
                    data: 'assets/music.pm3',
                    type: 'audio/mpeg'
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders a video player for video/* type', () => {
        const { container } = render(ObjectElement, {
            props: {
                itemIdentifier: 'item1',
                attributes: {
                    data: 'assets/scene.webm',
                    type: 'video/webm',
                    id: 'scene-video',
                    'aria-hidden': true
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('loads the item context', () => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: 'item3',
                testContext,
                testComponent: ObjectElement,
                testComponentProps: {
                    itemIdentifier: 'item3',
                    attributes: {
                        data: 'assets/sheet.pdf',
                        type: 'application/pdf'
                    }
                }
            }
        });
        expect(getAssetManager).toHaveBeenCalled();
        expect(resolve).toHaveBeenCalledWith('assets/sheet.pdf');
        expect(container).toMatchSnapshot();
    });

    it('resolves data through the asset manager', () => {
        resolve.mockReturnValue('http://localhost/assets/pig.png');
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: 'item4',
                testContext,
                testComponent: ObjectElement,
                testComponentProps: {
                    itemIdentifier: 'item4',
                    attributes: {
                        data: 'pig.png'
                    }
                }
            }
        });
        expect(container).toMatchSnapshot();
    });
});
