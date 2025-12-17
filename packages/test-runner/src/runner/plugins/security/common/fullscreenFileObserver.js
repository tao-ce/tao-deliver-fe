// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
let instance = null;

const getFileInputs = () => document.querySelectorAll("input[type='file']");

export default function fullscreenFileObserver() {
    if (instance) {
        return instance;
    }

    let isFileSelection = false;
    let browserApi;
    let onExitFromFileSelection;

    function exitFromFileSelection() {
        isFileSelection = false;
        // try to enter fullscreen again if it was exited,
        // but it most likely will fail (permission won't be granted as it's not the result of user action)
        if (!browserApi.isFullscreen()) {
            browserApi.enterFullscreen();
        }
        // so if it fails, at least prevent user from proceeding until he enters fullscreen manually
        if (onExitFromFileSelection) {
            onExitFromFileSelection();
        }
    }

    function handleFileUploadClick() {
        isFileSelection = true;
        window.addEventListener('focus', exitFromFileSelection, { once: true });
    }

    function observeFileInputs(api, onExit) {
        browserApi = api;
        onExitFromFileSelection = onExit;

        getFileInputs().forEach(fileInput => {
            fileInput.addEventListener('click', handleFileUploadClick);
        });
    }

    function getIsFileSelection() {
        return isFileSelection;
    }

    function unsubscribe() {
        const inputElements = getFileInputs();
        inputElements.forEach(fileInput => {
            fileInput.removeEventListener('click', handleFileUploadClick);
        });
        isFileSelection = false;
    }

    instance = {
        observeFileInputs,
        isFileSelection: getIsFileSelection,
        unsubscribe
    };

    return instance;
}
