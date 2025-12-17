// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export default function useArrowKeys(node) {
    const keydownListener = evt => {
        if (['ArrowUp', 'ArrowDown'].includes(evt.key)) {
            node.dispatchEvent(new CustomEvent(evt.key.toLowerCase()));
        }
    };

    node.addEventListener('keydown', keydownListener);

    return {
        destroy() {
            node.removeEventListener('keydown', keydownListener);
        }
    };
}
