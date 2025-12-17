// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import customInteractionContextFactory from '../customInteractionContext';

describe('customInteractionContext', () => {
    it('is a factory', () => {
        expect(customInteractionContextFactory()).not.toBe(customInteractionContextFactory());
    });

    it('resolves registerPromise if registered was called', async () => {
        const customInteractionContext = customInteractionContextFactory();

        const promise = customInteractionContext.registerPromise;

        customInteractionContext.register({
            typeIdentifier: 'foo'
        });

        await expect(promise).resolves.toBeUndefined();
    });

    it('calls getInstance on registered interaction with correct parameters', () =>
        new Promise(resolve => {
            const customInteractionContext = customInteractionContextFactory();

            const container = document.body;
            const configuration = { foo: 12 };
            const state = { bar: 'baz' };
            const typeIdentifier = 'foo';

            const interaction = {
                typeIdentifier,
                getInstance(containerParam, configurationParam, stateParam) {
                    expect(containerParam).toBe(container);
                    expect(configurationParam).toBe(configuration);
                    expect(stateParam).toBe(state);
                    resolve();
                }
            };

            customInteractionContext.registerPromise.then(() => {
                customInteractionContext.getInstance(typeIdentifier, container, configuration, state);
            });

            customInteractionContext.register(interaction);
        }));

    it('calls getInstance on correct registered interaction', () =>
        new Promise(resolve => {
            const customInteractionContext = customInteractionContextFactory();

            const interaction1 = {
                typeIdentifier: 'foo',
                getInstance() {
                    expect(true).toBe(true);
                }
            };

            const interaction2 = {
                typeIdentifier: 'bar',
                getInstance() {
                    resolve();
                }
            };

            customInteractionContext.registerPromise.then(() => {
                customInteractionContext.getInstance('foo');
                customInteractionContext.getInstance('bar');
            });

            customInteractionContext.register(interaction1);
            customInteractionContext.register(interaction2);
        }));

    it('throws error if an unregistered PCI should be instantiated', () => {
        const customInteractionContext = customInteractionContextFactory();
        const typeIdentifier = 'unregistered';

        expect(() => {
            customInteractionContext.getInstance(typeIdentifier);
        }).toThrowError(`Unable to instantiate ${typeIdentifier} PCI, because it is not loaded and registered.`);
    });
});
