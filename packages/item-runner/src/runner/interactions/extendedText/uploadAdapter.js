// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { generateElementId, __ } from '@oat-sa-private/ui-core';
import { cloudStorageUploadRequest } from '../../services/upload/cloudStorageUploadRequest.js';
import { DeferredPromise } from '../util/promise.js';
import AbortError from 'taoDeliverAppsCommon/core/error/AbortError';

/**
 * @typedef {Object} AttachmentsUploadData
 * @property {String} uploadMethod - upload the file with `fetch(uploadUrl, {method: uploadMethod, body: file})`
 * @property {String}  uploadUrl - upload the file with `fetch(uploadUrl, {method: uploadMethod, body: file})`
 * @property {String}  downloadUrl - once you upload the file, it will be accessible by this url
 * @property {String}  id - identifier of this file that should be inluded in response, will be used by the server
 * @property {String} uploadServiceType - returns 'default' for this proxy; used to configure upload process if it depends on proxy/configuration
 */
/**
 * @typedef {Object} UploadAdapterConfig
 * @property {Function} getAttachmentsUploadData - callback which makes proxy request and returns {@link AttachmentsUploadData}
 * @property {Number} uploadTimeout - timeout second-stage actual upload request; in milliseconds
 * @property {String} responseIdentifier
 * @property {String} itemIdentifier
 * @property {String} identifierAttribute - custom <img> attribute which will hold attachment id (will be used by server to identify file and regenrate src urls);
 *    name is shared with ckeditor plugin which handles `imageComplete` event
 * @property {Function} onUploadStarted - `(uploadKey) => void` callback; notify interaction that upload has started; used to wait for upload to be finished on submit
 * @property {Function} onUploadFinished - `(uploadKey, success, error) => void` callback; notify interaction that upload has finished.
 *   `success=false & error=null` means upload was aborted (user deleted image). `success=false & error=<Error>` means there was an error
 */
/**
 * @typedef {Object} UploadResult
 * @property {Object} urls
 * @property {String} urls.default - image url, to be set as `src` of `<img>`
 * @property {String} altText
 * @property {String} identifier-attribute-name - image id; actual property name is passed in config
 */

// track all active adapters by uploadKey, for cancelling all ongoing uploads
const uploadAdapters = new Map();

//eslint-disable-next-line  es/no-classes
export class MaxSizeExceededError extends Error {}

//eslint-disable-next-line  es/no-classes
class UploadAdapter {
    /**
     * Create instance. New instance is created for each upload.
     * After this, ckeditor will insert empty `<img>` tag to model/view
     * @param {Object} ckFileLoader - ckeditor FileLoader instance
     * @param {UploadAdapterConfig} config
     */
    constructor(ckFileLoader, config) {
        this.ckFileLoader = ckFileLoader;
        this.config = config;

        this.abortController = new AbortController();
        this.abortPromise = new DeferredPromise();
        this.uploadKey = generateElementId('uploadKey');

        /**
         * Upload file to the server, for default upload type.
         * @param {File} file
         * @param {AttachmentsUploadData} attachmentsUploadData
         * @param {Number} initialProgress
         * @param {Number} finalProgress
         * @returns {Promise<UploadResult>}
         */
        this.doUpload = (file, attachmentsUploadData, initialProgress, finalProgress) => {
            const { uploadMethod, uploadUrl, downloadUrl, id } = attachmentsUploadData;
            return cloudStorageUploadRequest({
                url: uploadUrl,
                method: uploadMethod,
                file,
                timeout: this.config.uploadTimeout,
                abortController: this.abortController,
                onProgress: (bytesLoaded, bytesTotal) => {
                    this.ckFileLoader.uploaded =
                        initialProgress + (bytesLoaded / bytesTotal) * (finalProgress - initialProgress);
                }
            }).then(() => ({
                urls: {
                    default: downloadUrl
                },
                altText: __('Uploaded image'),
                [this.config.identifierAttribute]: id
            }));
        };

        /**
         * Upload file to the server, for sandbox upload type.
         * @param {File} file
         * @returns {UploadResult}
         */
        this.doSandboxUpload = file =>
            Promise.race([
                new Promise(resolve =>
                    setTimeout(() => {
                        resolve({
                            urls: {
                                default: URL.createObjectURL(file)
                            },
                            altText: __('Uploaded image'),
                            [this.config.identifierAttribute]: generateElementId('attachment')
                        });
                    }, 200)
                ),
                this.abortPromise.promise
            ]);
    }

    /**
     * Upload file to the server. Done in two stages:
     * 1) `getAttachmentsUploadData` - request data need to make actual upload request.
     *  Needs to be done on each upload because upload url for each file should be generated on the server
     * 2) `doUpload` - actual upload request which will send file to the storage specified in response to the previous request
     * At this stage, ckeditor model still contains empty <img>, but for view ckeditor will insert base64 placeholder of this image.
     * After promise resolves, `uploadComplete` event will be sent by ckeditor and <img src [identifierAttribute]> will be set.
     * @returns {Promise<UploadResult>}
     */
    upload() {
        this.ckFileLoader.uploadTotal = 100;
        this.ckFileLoader.uploaded = 10;
        this.config.onUploadStarted(this.uploadKey);

        let file;
        return this.ckFileLoader.file
            .then(ckFile => {
                file = ckFile;
                if (file.size && this.config.uploadMaxSize && file.size > this.config.uploadMaxSize) {
                    throw new MaxSizeExceededError('Image file is too big.');
                }
                uploadAdapters.set(this.uploadKey, this);
                // core/request doesn't implement AbortController, so race & abortPromise is used instead
                return Promise.race([
                    this.config.getAttachmentsUploadData(this.config.itemIdentifier, this.config.responseIdentifier),
                    this.abortPromise.promise
                ]);
            })
            .then(resp => {
                this.ckFileLoader.uploaded = 25;
                if (resp.uploadServiceType === 'sandbox') {
                    return this.doSandboxUpload(file);
                } else {
                    return this.doUpload(file, resp, this.ckFileLoader.uploaded, 90);
                }
            })
            .then(result => {
                this.ckFileLoader.uploaded = 100;
                this.config.onUploadFinished(this.uploadKey, true, null);
                return result;
            })
            .catch(error => {
                this.config.onUploadFinished(this.uploadKey, false, error);
                return Promise.reject();
            })
            .finally(() => {
                uploadAdapters.delete(this.uploadKey);
            });
    }

    /**
     * Cancel ongoing upload. For example, when user deletes the image in the editor.
     * After this, empty <img> will be deleted from model/view
     */
    abort() {
        this.abortController.abort();
        this.abortPromise.reject(new AbortError('Upload aborted'));
    }
}

/**
 * Create upload adapter factory.
 * @param {UploadAdapterConfig} config
 * @returns {Function} uploadAdapterFactory
 */
function createUploadAdapterFactory(config) {
    /**
     * Upload adapter factory. Will be called by ckeditor when it will need to start image upload.
     * @see https://ckeditor.com/docs/ckeditor5/latest/framework/guides/deep-dive/upload-adapter.html#activating-a-custom-upload-adapter
     * @param {Object} ckFileLoader - ckeditor FileLoader instance
     * @returns {UploadAdapter} upload adapter instance
     */
    function uploadAdapterFactory(ckFileLoader) {
        return new UploadAdapter(ckFileLoader, config);
    }
    return uploadAdapterFactory;
}
export default createUploadAdapterFactory;

/**
 * Cancel all ongoing uploads
 */
export function cancelAllExtendedTextUploads() {
    uploadAdapters.forEach(adapter => {
        adapter.abort();
    });
}
