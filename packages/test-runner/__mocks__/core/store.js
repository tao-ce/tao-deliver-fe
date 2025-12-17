// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const storeFactory = () =>
    Promise.resolve({
        getItem: () => Promise.resolve(),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
        clear: () => Promise.resolve(),
        getItems: () => Promise.resolve([]),
        on: () => {},
        off: () => {},
        removeAll: () => Promise.resolve()
    });

storeFactory.backends = {
    memory: () =>
        Promise.resolve({
            getItem: () => Promise.resolve(),
            setItem: () => Promise.resolve(),
            removeItem: () => Promise.resolve(),
            clear: () => Promise.resolve()
        })
};

storeFactory.removeAll = () => Promise.resolve();
storeFactory.cleanUpSpace = () => Promise.resolve();
storeFactory.getAll = () => Promise.resolve([]);
storeFactory.getIdentifier = () => 'mock-store';

export default storeFactory;
