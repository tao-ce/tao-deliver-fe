// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// global.jest must be defined for jest-fetch-mock to run
global.jest = { fn: vi.fn };
require('jest-fetch-mock').enableMocks();

import {
    prefetchImages,
    prefetchStylesheets,
    prefetchAudios,
    prefetchVideos,
    validateFileSize,
    preloadNextItemAssets
} from '../preloaders.js';
import item1 from './fixtures/assetsItem.json';

vi.spyOn(document.head, 'appendChild');

const expectLinkTagWithAttrs = (link, href, as, crossOrigin) => {
    expect(link).toBeInstanceOf(HTMLLinkElement);
    expect(link).toHaveProperty('rel', 'prefetch');
    expect(link).toHaveProperty('href', href);
    expect(link).toHaveProperty('as', as);
    // Note: In Vitest, crossOrigin is null when not set, vs empty string in Jest
    const expectedCrossOrigin = crossOrigin === '' ? null : crossOrigin;
    expect(link).toHaveProperty('crossOrigin', expectedCrossOrigin);
};

const offStrategy = {
    stylesheets: false,
    images: false,
    audios: false,
    videos: false
};
const stylesStrategy = Object.assign({}, offStrategy, { stylesheets: true });
const imagesStrategy = Object.assign({}, offStrategy, { images: true });
const audiosStrategy = Object.assign({}, offStrategy, { audios: true });
const videosStrategy = Object.assign({}, offStrategy, { videos: true });
const audiosThresholdStrategy = Object.assign({}, audiosStrategy, { audiosThreshold: 100 });
const videosThresholdStrategy = Object.assign({}, videosStrategy, { videosThreshold: 200 });

afterEach(() => {
    document.head.appendChild.mockClear();
    vi.clearAllMocks();
});

describe('prefetchImages', () => {
    it('appends all link tags - no baseUrl', () => {
        prefetchImages(Object.values(item1.itemData.assets.img));

        expect(document.head.appendChild).toHaveBeenCalledTimes(2);

        const link1 = document.head.appendChild.mock.calls[0][0];
        const link2 = document.head.appendChild.mock.calls[1][0];
        expectLinkTagWithAttrs(link1, 'http://localhost:3000/image1.jpg', 'image', '');
        expectLinkTagWithAttrs(link2, 'http://localhost:3000/image2.png', 'image', '');
    });
});

describe('prefetchStylesheets', () => {
    it('appends all link tags - no baseUrl', () => {
        prefetchStylesheets(Object.values(item1.itemData.assets.css));

        expect(document.head.appendChild).toHaveBeenCalledTimes(2);

        const link1 = document.head.appendChild.mock.calls[0][0];
        const link2 = document.head.appendChild.mock.calls[1][0];
        expectLinkTagWithAttrs(link1, 'http://localhost:3000/styles/myStyles.css', 'style', 'anonymous');
        expectLinkTagWithAttrs(link2, 'http://localhost:3000/styles/yourStyles.css', 'style', 'anonymous');
    });
});

describe('prefetchAudios', () => {
    it('appends 1 of 2 link tags based on threshold - no baseUrl', () => {
        fetch.mockResolvedValueOnce(
            new Response('', {
                status: 200,
                headers: {
                    'content-length': '99'
                }
            })
        );
        fetch.mockResolvedValueOnce(
            new Response('', {
                status: 200,
                headers: {
                    'content-length': '101'
                }
            })
        );

        return prefetchAudios(Object.values(item1.itemData.assets.audio), {
            preloadStrategy: audiosThresholdStrategy
        }).then(() => {
            expect(document.head.appendChild).toHaveBeenCalledTimes(1);
            const link1 = document.head.appendChild.mock.calls[0][0];
            expectLinkTagWithAttrs(link1, 'http://localhost:3000/audio1.mp3', 'audio', 'anonymous');
        });
    });

    // eslint-disable-next-line arrow-body-style
    it('appends all link tags without threshold check', () => {
        return prefetchAudios(Object.values(item1.itemData.assets.audio), { preloadStrategy: audiosStrategy }).then(
            () => {
                expect(document.head.appendChild).toHaveBeenCalledTimes(2);
                const link1 = document.head.appendChild.mock.calls[0][0];
                const link2 = document.head.appendChild.mock.calls[1][0];
                expectLinkTagWithAttrs(link1, 'http://localhost:3000/audio1.mp3', 'audio', 'anonymous');
                expectLinkTagWithAttrs(link2, 'http://localhost:3000/audio2.wav', 'audio', 'anonymous');
            }
        );
    });
});

describe('prefetchVideos', () => {
    it('appends 1 of 2 link tags based on threshold - no baseUrl', () => {
        fetch.mockResolvedValueOnce(
            new Response('', {
                status: 200,
                headers: {
                    'content-length': '199'
                }
            })
        );
        fetch.mockResolvedValueOnce(
            new Response('', {
                status: 200,
                headers: {
                    'content-length': '201'
                }
            })
        );

        return prefetchVideos(Object.values(item1.itemData.assets.video), {
            preloadStrategy: videosThresholdStrategy
        }).then(() => {
            expect(document.head.appendChild).toHaveBeenCalledTimes(1);
            const link1 = document.head.appendChild.mock.calls[0][0];
            expectLinkTagWithAttrs(link1, 'http://localhost:3000/video1.mp4', 'video', 'anonymous');
        });
    });

    // eslint-disable-next-line arrow-body-style
    it('appends all link tags without threshold check', () => {
        return prefetchVideos(Object.values(item1.itemData.assets.video), { preloadStrategy: videosStrategy }).then(
            () => {
                expect(document.head.appendChild).toHaveBeenCalledTimes(2);
                const link1 = document.head.appendChild.mock.calls[0][0];
                const link2 = document.head.appendChild.mock.calls[1][0];
                expectLinkTagWithAttrs(link1, 'http://localhost:3000/video1.mp4', 'video', 'anonymous');
                expectLinkTagWithAttrs(link2, 'http://localhost:3000/video2.mov', 'video', 'anonymous');
            }
        );
    });
});

describe('validateFileSize', () => {
    const fileUrl = 'http://foo.bar/file';
    const config = {
        requestTimeout: 100,
        threshold: 50
    };

    it('validates true for file under threshold', () => {
        fetch.mockResolvedValueOnce(
            new Response('', {
                status: 200,
                headers: {
                    'content-length': '49'
                }
            })
        );

        return validateFileSize(fileUrl, config).then(valid => {
            expect(fetch).toBeCalled();
            expect(fetch).toBeCalledWith(fileUrl, expect.objectContaining({ method: 'HEAD' }));
            expect(valid).toBe(true);
        });
    });

    it('validates false for file over threshold', () => {
        fetch.mockResolvedValueOnce(
            new Response('', {
                status: 200,
                headers: {
                    'content-length': '51'
                }
            })
        );

        return validateFileSize(fileUrl, config).then(valid => {
            expect(fetch).toBeCalled();
            expect(fetch).toBeCalledWith(fileUrl, expect.objectContaining({ method: 'HEAD' }));
            expect(valid).toBe(false);
        });
    });

    it('validates false for unknown content length', () => {
        fetch.mockResolvedValueOnce(
            new Response('', {
                status: 200,
                headers: {
                    'content-length': 'unknown'
                }
            })
        );

        return validateFileSize(fileUrl, config).then(valid => {
            expect(fetch).toBeCalled();
            expect(fetch).toBeCalledWith(fileUrl, expect.objectContaining({ method: 'HEAD' }));
            expect(valid).toBe(false);
        });
    });

    it('validates false for unknown threshold', () => {
        fetch.mockResolvedValueOnce(
            new Response('', {
                status: 200,
                headers: {
                    'content-length': '49'
                }
            })
        );

        return validateFileSize(fileUrl).then(valid => {
            expect(fetch).toBeCalled();
            expect(fetch).toBeCalledWith(fileUrl, expect.objectContaining({ method: 'HEAD' }));
            expect(valid).toBe(false);
        });
    });

    it('validates false if timed out', () => {
        fetch.mockImplementationOnce(
            () =>
                new Promise(resolve =>
                    setTimeout(
                        () =>
                            resolve(
                                new Response('', {
                                    status: 200,
                                    headers: {
                                        'content-length': '49'
                                    }
                                })
                            ),
                        120
                    )
                )
        );

        return validateFileSize(fileUrl).then(valid => {
            expect(fetch).toBeCalled();
            expect(fetch).toBeCalledWith(fileUrl, expect.objectContaining({ method: 'HEAD' }));
            expect(valid).toBe(false);
        });
    });

    it('validates false if fetch rejection', () => {
        fetch.mockRejectedValueOnce(new Error('network'));

        return validateFileSize(fileUrl).then(valid => {
            expect(fetch).toBeCalled();
            expect(fetch).toBeCalledWith(fileUrl, expect.objectContaining({ method: 'HEAD' }));
            expect(valid).toBe(false);
        });
    });
});

describe('preloadNextItemAssets', () => {
    it('skips item with no itemData', () => {
        const item = null;
        return preloadNextItemAssets(item, { preloadStrategy: stylesStrategy }).then(() => {
            expect(document.head.appendChild).toHaveBeenCalledTimes(0);
        });
    });

    it('calls stylesheets preloader if enabled', () => {
        const item2 = Object.assign(item1, { flags: { containsNonPreloadedAssets: true } });
        return preloadNextItemAssets(item2, { preloadStrategy: stylesStrategy }).then(() => {
            expect(document.head.appendChild).toHaveBeenCalledTimes(2);

            const link1 = document.head.appendChild.mock.calls[0][0];
            const link2 = document.head.appendChild.mock.calls[1][0];
            expectLinkTagWithAttrs(
                link1,
                'http://localhost:3000/my/base/url/styles/myStyles.css',
                'style',
                'anonymous'
            );
            expectLinkTagWithAttrs(
                link2,
                'http://localhost:3000/my/base/url/styles/yourStyles.css',
                'style',
                'anonymous'
            );
        });
    });

    it('calls images preloader if enabled', () => {
        const item2 = Object.assign(item1, { flags: { containsNonPreloadedAssets: true } });
        return preloadNextItemAssets(item2, { preloadStrategy: imagesStrategy }).then(() => {
            expect(document.head.appendChild).toHaveBeenCalledTimes(2);

            const link1 = document.head.appendChild.mock.calls[0][0];
            const link2 = document.head.appendChild.mock.calls[1][0];
            expectLinkTagWithAttrs(link1, 'http://localhost:3000/my/base/url/image1.jpg', 'image', '');
            expectLinkTagWithAttrs(link2, 'http://localhost:3000/my/base/url/image2.png', 'image', '');
        });
    });

    it('calls audios preloader if enabled', () => {
        const item2 = Object.assign(item1, { flags: { containsNonPreloadedAssets: true } });

        fetch.mockResolvedValue(
            new Response('', {
                status: 200,
                headers: {
                    'content-length': '42'
                }
            })
        );

        return preloadNextItemAssets(item2, { preloadStrategy: audiosThresholdStrategy }).then(() => {
            expect(document.head.appendChild).toHaveBeenCalledTimes(2);

            const link1 = document.head.appendChild.mock.calls[0][0];
            const link2 = document.head.appendChild.mock.calls[1][0];
            expectLinkTagWithAttrs(link1, 'http://localhost:3000/my/base/url/audio1.mp3', 'audio', 'anonymous');
            expectLinkTagWithAttrs(link2, 'http://localhost:3000/my/base/url/audio2.wav', 'audio', 'anonymous');
        });
    });

    it('calls videos preloader if enabled', () => {
        const item2 = Object.assign(item1, { flags: { containsNonPreloadedAssets: true } });

        fetch.mockResolvedValue(
            new Response('', {
                status: 200,
                headers: {
                    'content-length': '42'
                }
            })
        );

        return preloadNextItemAssets(item2, { preloadStrategy: videosThresholdStrategy }).then(() => {
            expect(document.head.appendChild).toHaveBeenCalledTimes(2);

            const link1 = document.head.appendChild.mock.calls[0][0];
            const link2 = document.head.appendChild.mock.calls[1][0];
            expectLinkTagWithAttrs(link1, 'http://localhost:3000/my/base/url/video1.mp4', 'video', 'anonymous');
            expectLinkTagWithAttrs(link2, 'http://localhost:3000/my/base/url/video2.mov', 'video', 'anonymous');
        });
    });

    it('calls no preloader if none enabled', () => {
        const item2 = Object.assign(item1, { flags: { containsNonPreloadedAssets: true } });
        return preloadNextItemAssets(item2, { preloadStrategy: offStrategy })
            .then(() => {
                expect(document.head.appendChild).toHaveBeenCalledTimes(0);
                return preloadNextItemAssets(item2, { preloadStrategy: {} });
            })
            .then(() => {
                expect(document.head.appendChild).toHaveBeenCalledTimes(0);
                return preloadNextItemAssets(item2);
            })
            .then(() => {
                expect(document.head.appendChild).toHaveBeenCalledTimes(0);
            });
    });
});
