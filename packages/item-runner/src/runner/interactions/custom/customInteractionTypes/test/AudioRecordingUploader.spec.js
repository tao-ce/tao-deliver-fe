// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// global.jest must be defined for jest-fetch-mock to run
global.jest = { fn: vi.fn };
require('jest-fetch-mock').enableMocks();

import { tick } from 'svelte';
import { render, waitFor } from '@testing-library/svelte';
import { getInteractionStateStore } from '../../../../itemsStateStore.js';
import AudioRecordingUploader from '../AudioRecordingUploader.svelte';
import ContextWrapper from './ContextWrapper.svelte';
import { base64ToBuffer } from '../../../../services/upload/util.js';
import { mockXhr } from '../../../../services/upload/test/mockXhr.js';

vi.mock('../../../../services/upload/UploadProgress.svelte', async () => {
    const MockUploadProgress = await import('../../../../services/upload/test/MockUploadProgress.svelte');
    return {
        default: MockUploadProgress.default
    };
});

vi.mock('../AudioRecordingInteractionImpl.svelte', async () => {
    const MockAudioRecordingInteractionImpl = await import('./MockAudioRecordingInteractionImpl.svelte');
    return {
        default: MockAudioRecordingInteractionImpl.default,
        triggerHandleResponse: MockAudioRecordingInteractionImpl.triggerHandleResponse
    };
});

import { triggerHandleResponse } from '../AudioRecordingInteractionImpl.svelte';

const itemIdentifier = 'item-123';
const responseIdentifier = 'RESPONSE_1';
const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

const uploadData = {
    uploadServiceType: 'cloud-storage',
    uploadMethod: 'PUT',
    uploadUrl: '/attachments/upload',
    id: '123',
    downloadUrl: '/attachments/download'
};
const itemContext = {
    registerLoadingElement: vi.fn(),
    getGetAttachmentsUploadData: vi.fn(() => vi.fn().mockResolvedValue(uploadData)),
    getLogger: vi.fn(() => ({
        error: vi.fn()
    })),
    getInstructionsLang: vi.fn(() => 'en-US'),
    trigger: vi.fn(),
    showItemNotification: vi.fn(),
    clearItemNotificationsByKeys: vi.fn()
};

describe('AudioRecordingUploader', () => {
    let xhrSpy;

    beforeEach(() => {
        window.isSecureContext = true;
        xhrSpy = vi.spyOn(window, 'XMLHttpRequest');
    });
    afterEach(() => {
        interactionStateStore.set({});
        vi.clearAllMocks();
        fetch.resetMocks();
        xhrSpy.mockRestore();
    });

    it('renders props into markup', async () => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext: itemContext,
                testComponent: AudioRecordingUploader,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier: 'foo123',
                    role: 'someUniqueRole',
                    ariaAttrs: {
                        ariaFoo: 12,
                        ariaBar: 'baz'
                    },
                    dataAttrs: {
                        'data-foo': 'bar',
                        'data-baz': 24
                    },
                    language: 'hu',
                    id: 'interactionId',
                    classes: 'foo bar baz',
                    dir: 'rtl',
                    markup: '<div class="markup"></div>',
                    properties: {
                        autoStart: false,
                        allowPlayback: true,
                        maxRecordingTime: 7
                    }
                }
            }
        });
        await waitFor(() => {
            expect(container.querySelector('.mock-audio-interaction')).toBeInTheDocument();
        });
        expect(container).toMatchSnapshot();
    });

    it('initially downloads a file if the stored response is a fileHash', async () => {
        const name = 'foo.wav';
        const mime = 'audio/wav';
        const fileHashResponse = {
            base: {
                fileHash: {
                    id: uploadData.id,
                    data: 'fileHash',
                    name,
                    mime,
                    downloadUrl: uploadData.downloadUrl
                }
            }
        };

        interactionStateStore.setResponse(fileHashResponse);

        fetch.mockResponseOnce(request => {
            expect(request.url).toBe(uploadData.downloadUrl);
            expect(request.method).toBe('GET');
            return Promise.resolve(new Response(base64ToBuffer('validbase64data=')));
        });

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext: itemContext,
                testComponent: AudioRecordingUploader,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    markup: '<div class="markup"></div>',
                    properties: {}
                }
            }
        });
        await waitFor(() => {
            expect(container.querySelector('.mock-audio-interaction')).toBeInTheDocument();
            expect(container.querySelector('.audio-recording-uploader.upload-initial')).toBeInTheDocument();
            expect(fetch).toHaveBeenCalledTimes(1);
            expect(interactionStateStore.getResponse()).toEqual(fileHashResponse);
        });
    });

    it('initially uploads a file if the stored response is a file', async () => {
        const data = 'audiofile123';
        const name = 'foo.wav';
        const mime = 'audio/wav';
        const fileResponse = {
            base: {
                file: {
                    data,
                    name,
                    mime
                }
            }
        };

        interactionStateStore.setResponse(fileResponse);

        const xhrMock = mockXhr();
        xhrSpy.mockImplementation(() => xhrMock);

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext: itemContext,
                testComponent: AudioRecordingUploader,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    markup: '<div class="markup"></div>',
                    properties: {}
                }
            }
        });

        await waitFor(() => {
            expect(container.querySelector('.mock-audio-interaction')).toBeInTheDocument();
            expect(container.querySelector('.audio-recording-uploader.upload-ready')).toBeInTheDocument();

            expect(xhrMock.open).toHaveBeenCalledTimes(1);
            expect(xhrMock.open).toHaveBeenCalledWith(uploadData.uploadMethod, uploadData.uploadUrl, true);
            expect(xhrMock.send).toHaveBeenCalledTimes(1);
            expect(xhrMock.send.mock.calls[0][0]).toBeInstanceOf(File);

            const storedResponse = interactionStateStore.getResponse();

            delete storedResponse.base.fileHash.localFile; // jest can't compare File objects
            expect(storedResponse).toEqual({
                base: {
                    fileHash: {
                        data: 'abcd-efgh', // from core-digest mock
                        name,
                        mime,
                        id: uploadData.id,
                        version: null,
                        downloadUrl: uploadData.downloadUrl
                    }
                }
            });
        });
    });

    it('uploads a file and stores fileHash response after recorder-stop PCI event', async () => {
        const data = 'audiofile123';
        const name = 'foo.wav';
        const mime = 'audio/wav';
        const fileResponse = {
            base: {
                file: {
                    data,
                    name,
                    mime
                }
            }
        };

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext: itemContext,
                testComponent: AudioRecordingUploader,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    markup: '<div class="markup"></div>',
                    properties: {}
                }
            }
        });

        await tick();
        expect(container.querySelector('.mock-audio-interaction')).toBeInTheDocument();

        const xhrMock = mockXhr();
        xhrSpy.mockImplementation(() => xhrMock);

        // the following is used as a workaround for 'stateupdate' event:
        triggerHandleResponse(fileResponse);
        container.querySelector('.mock-audio-interaction').dispatchEvent(new CustomEvent('recorder-stop'));

        await waitFor(() => {
            expect(container.querySelector('.audio-recording-uploader.upload-ready')).toBeInTheDocument();

            expect(xhrMock.open).toHaveBeenCalledTimes(1);
            expect(xhrMock.open).toHaveBeenCalledWith(uploadData.uploadMethod, uploadData.uploadUrl, true);
            expect(xhrMock.send).toHaveBeenCalledTimes(1);
            expect(xhrMock.send.mock.calls[0][0]).toBeInstanceOf(File);

            const storedResponse = interactionStateStore.getResponse();
            delete storedResponse.base.fileHash.localFile; // jest can't compare File objects
            expect(storedResponse).toEqual({
                base: {
                    fileHash: {
                        data: 'abcd-efgh', // from core-digest mock
                        name,
                        mime,
                        id: uploadData.id,
                        version: null,
                        downloadUrl: uploadData.downloadUrl
                    }
                }
            });
        });
    });

    it('stores file response if upload fails after recorder-stop PCI event', async () => {
        const data = 'audiofile123';
        const name = 'foo.wav';
        const mime = 'audio/wav';
        const fileResponse = {
            base: {
                file: {
                    data,
                    name,
                    mime
                }
            }
        };

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext: itemContext,
                testComponent: AudioRecordingUploader,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    markup: '<div class="markup"></div>',
                    properties: {}
                }
            }
        });

        await tick();
        expect(container.querySelector('.mock-audio-interaction')).toBeInTheDocument();

        const xhrMock = mockXhr({
            send: vi.fn(() => xhrMock.abort())
        });
        xhrSpy.mockImplementation(() => xhrMock);

        // the following is used as a workaround for 'stateupdate' event:
        triggerHandleResponse(fileResponse);
        container.querySelector('.mock-audio-interaction').dispatchEvent(new CustomEvent('recorder-stop'));

        await waitFor(() => {
            expect(container.querySelector('.audio-recording-uploader.upload-ready')).toBeInTheDocument();

            expect(xhrMock.open).toHaveBeenCalledTimes(1);
            expect(xhrMock.send).toHaveBeenCalledTimes(1);

            const storedResponse = interactionStateStore.getResponse();
            expect(storedResponse).toEqual(fileResponse);
        });
    });

    it('clears response after recorder-reset PCI event', async () => {
        const name = 'foo.wav';
        const mime = 'audio/wav';
        const fileHashResponse = {
            base: {
                fileHash: {
                    id: uploadData.id,
                    data: 'fileHash',
                    name,
                    mime,
                    downloadUrl: uploadData.downloadUrl
                }
            }
        };

        interactionStateStore.setResponse(fileHashResponse);

        fetch.mockResponseOnce(request => {
            expect(request.url).toBe(uploadData.downloadUrl);
            expect(request.method).toBe('GET');
            return Promise.resolve(new Response(base64ToBuffer('validbase64data=')));
        });

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext: itemContext,
                testComponent: AudioRecordingUploader,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    markup: '<div class="markup"></div>',
                    properties: {}
                }
            }
        });
        await waitFor(() => {
            expect(container.querySelector('.mock-audio-interaction')).toBeInTheDocument();

            container.querySelector('.mock-audio-interaction').dispatchEvent(new CustomEvent('recorder-reset'));

            expect(container.querySelector('.audio-recording-uploader.upload-initial')).toBeInTheDocument();
            expect(interactionStateStore.getResponse()).toEqual({
                base: null
            });
        });
    });

    it('shows uncancelable progress bar during long upload', async () => {
        const data = 'audiofile123';
        const name = 'foo.wav';
        const mime = 'audio/wav';
        const fileResponse = {
            base: {
                file: {
                    data,
                    name,
                    mime
                }
            }
        };

        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: itemIdentifier,
                testContext: itemContext,
                testComponent: AudioRecordingUploader,
                testComponentProps: {
                    itemIdentifier,
                    responseIdentifier,
                    markup: '<div class="markup"></div>',
                    properties: {}
                }
            }
        });

        await tick();
        expect(container.querySelector('.mock-audio-interaction')).toBeInTheDocument();

        const xhrMock = mockXhr({
            sendDelay: 5000
        });
        xhrSpy.mockImplementation(() => xhrMock);

        // the following is used as a workaround for 'stateupdate' event:
        triggerHandleResponse(fileResponse);
        container.querySelector('.mock-audio-interaction').dispatchEvent(new CustomEvent('recorder-stop'));

        await waitFor(() => {
            expect(container.querySelector('.mock-upload-progress')).toBeInTheDocument();
            expect(container.querySelector('.mock-upload-progress').dataset.props).toBe(
                JSON.stringify({
                    bytesLoaded: 0,
                    bytesTotal: 0,
                    cancelable: false
                })
            );
            xhrMock.abort();
        });
    });
});
