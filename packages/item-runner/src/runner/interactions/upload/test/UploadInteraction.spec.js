// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import itemsStateStore, { getInteractionStateStore } from '../../../itemsStateStore.js';
import ContextWrapper from './ContextWrapper.svelte';
import { DeferredPromise } from '../../util/promise.js';

const mockUploadService = {
    upload: vi.fn(
        ({ data: file }) =>
            new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        data: file,
                        mime: file.type,
                        name: file.name
                    });
                }, 5);
            })
    ),
    cancel: vi.fn(),
    getBaseType: vi.fn(() => 'file')
};
vi.mock('../../../services/upload/uploadService.js', () => ({
    __esModule: true,
    default: vi.fn(() => mockUploadService)
}));
vi.mock('../../../services/upload/util.js', () => ({
    __esModule: true,
    getFile: vi.fn(({ data }) => new Promise(resolve => setTimeout(() => resolve(data), 3))),
    getLink: vi.fn(() => {})
}));
vi.mock('../../../services/upload/UploadProgress.svelte', async () => {
    const MockUploadProgress = (await import('../../../services/upload/test/MockUploadProgress.svelte')).default;
    return {
        __esModule: true,
        default: MockUploadProgress
    };
});

const mockLogger = {
    error: vi.fn()
};
const mockGetAttachmentsUploadData = vi.fn().mockResolvedValue({
    uploadMethod: 'PUT',
    uploadUrl: '/attachments/upload',
    downloadUrl: '/attachments/download',
    id: 'dxid/item/response/fileid',
    uploadServiceType: 'base64'
});
const showItemNotificationSpy = vi.fn();

// itemContext
const contextContent = {
    getLogger() {
        return mockLogger;
    },
    getInstructionsLang() {
        return 'nb-NO';
    },
    getGetAttachmentsUploadData() {
        return mockGetAttachmentsUploadData;
    },
    registerLoadingElement() {},
    showItemNotification: showItemNotificationSpy,
    removeItemNotification: vi.fn()
};

import { getFile, getLink } from '../../../services/upload/util.js';
import UploadInteraction from '../UploadInteraction.svelte';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../../../itemsSessionStatusStore.js';

const expectFileSelectUi = container => ({
    toBeLoading() {
        expect(container.querySelector('.loading')).toBeInTheDocument();
    },
    toBeEmpty() {
        expect(container.querySelector('.selected-file-container')).not.toBeInTheDocument();
    },
    toBeValid() {
        expect(container.querySelector('.selected-file-container:not(.invalid)')).toBeInTheDocument();
    },
    toBeInvalid() {
        expect(container.querySelector('.selected-file-container.invalid')).toBeInTheDocument();
    },
    toBeDisabled() {
        expect(container.querySelector('input')).toBeDisabled();
    },
    toBeEnabled() {
        expect(container.querySelector('input')).not.toBeDisabled();
    }
});

const qtiClass = 'qti-uploadInteraction';

describe('UploadInteraction', () => {
    beforeEach(() => {
        window.URL.createObjectURL = vi.fn(() => 'object-url');
        vi.clearAllMocks();
    });

    afterEach(() => {
        itemsStateStore.clear();
        window.URL.createObjectURL.mockReset();
    });

    it('renders props into markup', () => {
        const itemIdentifier = 'upload';
        const { container } = render(UploadInteraction, {
            props: {
                disabled: true,
                role: 'someUniqueRole',
                ariaAttrs: {
                    'aria-foo': 12,
                    'aria-bar': 'baz'
                },
                dataAttrs: {
                    'data-foo': 'bar',
                    'data-baz': 24
                },
                language: 'hu',
                id: 'interactionId',
                classes: 'foo bar baz',
                dir: 'rtl',
                type: 'image/png',
                prompt: 'Fill out the input',
                itemIdentifier
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('sets instruction language from context', () => {
        const itemIdentifier = 'upload';

        const { container } = render(ContextWrapper, {
            props: {
                contextContent,
                uploadInteractionProperties: {
                    itemIdentifier
                }
            }
        });

        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('updates disabled state', () => {
        const itemIdentifier = 'upload';
        const props = {
            disabled: false,
            id: 'interactionId',
            type: 'image/png',
            itemIdentifier
        };

        const { container } = render(UploadInteraction, {
            props
        });

        expect(container.querySelector('.qti-uploadInteraction .disabled')).not.toBeInTheDocument();

        const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);

        itemSessionStatusStore.set('closed');

        return tick().then(() => {
            expect(container.querySelector('.qti-uploadInteraction .disabled')).toBeInTheDocument();
            itemsSessionStatusStore.clear();
        });
    });

    it('listens store modifications', () => {
        const itemIdentifier = 'iabcd';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        const mime = 'image/png';
        const name = 'test.png';
        const file = new File(['content'], name, {
            type: mime
        });

        interactionStateStore.setResponse({
            base: null
        });

        const { container } = render(UploadInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier
            }
        });

        return new Promise(resolve => setTimeout(resolve, 6))
            .then(() => {
                expect(container).toMatchSnapshot();
                interactionStateStore.setResponse({
                    base: {
                        file: {
                            data: file,
                            mime,
                            name
                        }
                    }
                });

                return new Promise(resolve => setTimeout(resolve, 6));
            })
            .then(() => {
                expect(container).toMatchSnapshot();
                interactionStateStore.setResponse({
                    base: null
                });

                return new Promise(resolve => setTimeout(resolve, 6));
            })
            .then(() => {
                //change from existing value to null is ignored
                expect(container).toMatchSnapshot();
            });
    });

    it('sets store value correctly when valid file is selected', () => {
        const itemIdentifier = 'bcdk';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        const type = 'text/plain';
        const name = 'file.txt';
        const content = 'content';

        const { container } = render(UploadInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier
            }
        });
        expect(interactionStateStore.get()).toMatchObject({ qtiClass });

        const file = new File([content], name, {
            type
        });
        fireEvent.change(container.querySelector('input'), {
            target: {
                files: [file]
            }
        });

        return tick()
            .then(tick)
            .then(() => {
                expect(interactionStateStore.get()).toMatchObject({
                    resolvingValue: expect.objectContaining({
                        name: file.name,
                        type: file.type,
                        size: file.size
                    })
                });

                return new Promise(resolve => setTimeout(resolve, 50));
            })
            .then(() => {
                expect(interactionStateStore.get()).toEqual({
                    response: {
                        base: {
                            file: {
                                data: file,
                                mime: type,
                                name
                            }
                        }
                    },
                    validity: true,
                    qtiClass
                });

                // click to clear button
                document.querySelectorAll('.selected-file-container button')[1].click();
                return new Promise(resolve => setTimeout(resolve, 50));
            })
            .then(() => {
                expect(interactionStateStore.get()).toMatchObject({
                    response: {
                        base: null
                    },
                    validity: true,
                    qtiClass
                });
            });
    });

    it('sets store value correctly when invalid file is selected', () => {
        const itemIdentifier = 'bcdk';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        const type = 'text/plain';
        const name = 'file.txt';
        const content = 'content';

        const { container } = render(UploadInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier,
                type: 'image/png'
            }
        });

        const file = new File([content], name, {
            type
        });
        fireEvent.change(container.querySelector('input'), {
            target: {
                files: [file]
            }
        });

        return tick()
            .then(tick)
            .then(() => {
                expect(container).toMatchSnapshot();
                expect(interactionStateStore.get()).toEqual({
                    response: {
                        base: null
                    },
                    validity: true,
                    qtiClass: 'qti-uploadInteraction'
                });
            });
    });

    it('sets initial response', () => {
        const itemIdentifier = 'bcdkt';
        const responseIdentifier = 'RESPONSE_123';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        render(UploadInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier
            }
        });

        return tick()
            .then(tick)
            .then(() => {
                expect(interactionStateStore.getResponse()).toMatchObject({
                    base: null
                });
            });
    });

    it('restore states with fileHash baseType', () => {
        const itemIdentifier = 'a123';
        const responseIdentifier = 'RESPONSE_456';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        mockUploadService.getBaseType.mockReturnValueOnce('fileHash');

        getFile.mockImplementationOnce(data =>
            Promise.resolve(
                new File([], data.name, {
                    type: data.mime
                })
            )
        );
        getLink.mockImplementationOnce(data => Promise.resolve(data.link));

        const { container } = render(UploadInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier
            }
        });
        interactionStateStore.setResponse({
            base: {
                fileHash: {
                    id: 'file123',
                    data: 'a12c-edff-ge45',
                    name: 'foo.wav',
                    mime: 'audio/wav',
                    link: 'http://link.to/foo.wav'
                }
            }
        });

        return tick()
            .then(tick)
            .then(tick)
            .then(() => {
                expect(container).toMatchSnapshot();
            });
    });

    it('restore states with a local file in a fileHash baseType', () => {
        const itemIdentifier = 'c987';
        const responseIdentifier = 'RESPONSE_987';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        const mime = 'image/png';
        const name = 'test.png';
        const file = new File(['content'], name, {
            type: mime
        });

        mockUploadService.getBaseType.mockReturnValueOnce('fileHash');

        getFile.mockImplementationOnce(data => Promise.resolve(data.localFile));
        getLink.mockImplementationOnce(data => Promise.resolve(data.link));

        const { container } = render(UploadInteraction, {
            props: {
                itemIdentifier,
                responseIdentifier
            }
        });
        interactionStateStore.setResponse({
            base: {
                fileHash: {
                    id: 'file123',
                    data: 'a12c-edff-ge45',
                    name: 'foo.wav',
                    mime: 'audio/wav',
                    localFile: file
                }
            }
        });

        return tick()
            .then(tick)
            .then(tick)
            .then(() => {
                expect(container).toMatchSnapshot();
            });
    });

    it('init failure gives Notification and original state', () => {
        expect.assertions(7);
        const itemIdentifier = 'c989';
        const responseIdentifier = 'RESPONSE_989';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        const file = new File(['content'], 'foo.png', {
            type: 'image/png'
        });

        const err = new Error('Unable to reach /attachments');

        const { container } = render(ContextWrapper, {
            props: {
                contextContent: {
                    ...contextContent,
                    getGetAttachmentsUploadData() {
                        return vi.fn().mockRejectedValue(err);
                    }
                },
                uploadInteractionProperties: {
                    itemIdentifier,
                    responseIdentifier
                }
            }
        });

        fireEvent.change(container.querySelector('input'), {
            target: {
                files: [file]
            }
        });

        return tick()
            .then(tick)
            .then(tick)
            .then(tick)
            .then(() => {
                expectFileSelectUi(container).toBeEmpty();
                expectFileSelectUi(container).toBeEnabled();

                expect(interactionStateStore.get()).toMatchObject({
                    response: {
                        base: null
                    },
                    validity: true
                });

                expect(mockUploadService.upload).not.toHaveBeenCalled();

                expect(showItemNotificationSpy).toHaveBeenCalled();

                expect(mockLogger.error).toHaveBeenCalled();
                expect(mockLogger.error).toHaveBeenCalledWith(err);
            });
    });

    it('upload failure gives Notification and original state', () => {
        expect.assertions(6);
        const itemIdentifier = 'c989';
        const responseIdentifier = 'RESPONSE_989';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        const file = new File(['content'], 'foo.png', {
            type: 'image/png'
        });
        const err = new Error('Unable to contact the service');
        mockUploadService.upload.mockImplementationOnce(vi.fn(() => Promise.reject(err)));

        const { container } = render(ContextWrapper, {
            props: {
                contextContent,
                uploadInteractionProperties: {
                    itemIdentifier,
                    responseIdentifier
                }
            }
        });

        fireEvent.change(container.querySelector('input'), {
            target: {
                files: [file]
            }
        });

        return tick()
            .then(tick)
            .then(tick)
            .then(tick)
            .then(() => {
                expectFileSelectUi(container).toBeEmpty();
                expectFileSelectUi(container).toBeEnabled();

                expect(interactionStateStore.get()).toMatchObject({
                    response: {
                        base: null
                    },
                    validity: true
                });

                expect(showItemNotificationSpy).toHaveBeenCalled();

                expect(mockLogger.error).toHaveBeenCalled();
                expect(mockLogger.error).toHaveBeenCalledWith(err);
            });
    });

    it('upload failure while changing files gives Notification and previous file', () => {
        expect.assertions(10);
        const itemIdentifier = 'c989';
        const responseIdentifier = 'RESPONSE_989';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

        const file1 = new File(['content'], 'file1.wav', {
            type: 'audio/wav'
        });
        const file2 = new File(['content'], 'file2.png', {
            type: 'image/png'
        });

        getFile.mockImplementation(data => Promise.resolve(data.localFile));
        getLink.mockImplementation(data => Promise.resolve(data.link));

        mockUploadService.getBaseType.mockReturnValueOnce('fileHash');

        const err = new Error('Unable to contact the service');
        mockUploadService.upload.mockImplementationOnce(vi.fn(() => Promise.reject(err)));

        interactionStateStore.setResponse({
            base: {
                fileHash: {
                    id: 'file1',
                    data: 'a12c-edff-ge45',
                    name: 'file1.wav',
                    mime: 'audio/wav',
                    localFile: file1
                }
            }
        });

        const { container } = render(ContextWrapper, {
            props: {
                contextContent,
                uploadInteractionProperties: {
                    itemIdentifier,
                    responseIdentifier
                }
            }
        });

        return tick()
            .then(tick)
            .then(tick)
            .then(tick)
            .then(() => {
                expectFileSelectUi(container).toBeValid();
                expectFileSelectUi(container).toBeEnabled();
                expect(container.querySelector('.selected-file-container p')).toHaveTextContent(
                    'Answer file selected: file1.wav'
                );

                fireEvent.change(container.querySelector('input'), {
                    target: {
                        files: [file2]
                    }
                });
            })
            .then(tick)
            .then(tick)
            .then(tick)
            .then(tick)
            .then(() => {
                expectFileSelectUi(container).toBeValid();
                expectFileSelectUi(container).toBeEnabled();
                expect(container.querySelector('.selected-file-container p')).toHaveTextContent(
                    'Answer file selected: file1.wav'
                );

                expect(interactionStateStore.get()).toMatchObject({
                    response: {
                        base: {
                            fileHash: {
                                id: 'file1',
                                data: 'a12c-edff-ge45',
                                name: 'file1.wav',
                                mime: 'audio/wav',
                                localFile: expect.objectContaining({
                                    name: file1.name,
                                    type: file1.type,
                                    size: file1.size
                                })
                            }
                        }
                    },
                    validity: true
                });

                expect(showItemNotificationSpy).toHaveBeenCalled();

                expect(mockLogger.error).toHaveBeenCalled();
                expect(mockLogger.error).toHaveBeenCalledWith(err);
            });
    });

    it('shows progress bar during long upload', async () => {
        expect.assertions(4);
        const itemIdentifier = 'c989';
        const responseIdentifier = 'RESPONSE_989';
        const file = new File(['content'], 'foo.png', {
            type: 'image/png'
        });
        mockUploadService.upload.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

        const { container } = render(ContextWrapper, {
            props: {
                contextContent,
                uploadInteractionProperties: {
                    itemIdentifier,
                    responseIdentifier
                }
            }
        });

        fireEvent.change(container.querySelector('input'), {
            target: {
                files: [file]
            }
        });

        await waitFor(() => {
            expect(container.querySelector('.mock-upload-progress')).toBeInTheDocument();
            expect(container.querySelector('.mock-upload-progress button')).toBeInTheDocument();
            expect(container.querySelector('.mock-upload-progress').dataset.props).toBe(
                JSON.stringify({
                    bytesLoaded: 0,
                    bytesTotal: 0
                })
            );
        });
    });

    it('restores old response silently if upload cancelled', async () => {
        expect.assertions(9);
        const itemIdentifier = 'c989';
        const responseIdentifier = 'RESPONSE_989';
        const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
        const file = new File(['content'], 'foo.png', {
            type: 'image/png'
        });
        const uploadPromise = new DeferredPromise();
        mockUploadService.upload.mockImplementationOnce(() => uploadPromise.promise);
        mockUploadService.cancel.mockImplementationOnce(() => uploadPromise.reject());

        const { container } = render(ContextWrapper, {
            props: {
                contextContent,
                uploadInteractionProperties: {
                    itemIdentifier,
                    responseIdentifier
                }
            }
        });

        fireEvent.change(container.querySelector('input'), {
            target: {
                files: [file]
            }
        });

        await waitFor(() => {
            expect(container.querySelector('.mock-upload-progress')).toBeInTheDocument();
        });

        expect(container.querySelector('.mock-upload-progress button')).toBeInTheDocument();
        container.querySelector('.mock-upload-progress button').click();

        expect(mockUploadService.cancel).toHaveBeenCalled();

        await tick();
        await tick();
        await tick();
        await tick();

        expectFileSelectUi(container).toBeEmpty();
        expectFileSelectUi(container).toBeEnabled();

        expect(interactionStateStore.get()).toMatchObject({
            response: {
                base: null
            },
            validity: true
        });

        expect(showItemNotificationSpy).not.toHaveBeenCalled();
        expect(mockLogger.error).not.toHaveBeenCalled();
    });
});
