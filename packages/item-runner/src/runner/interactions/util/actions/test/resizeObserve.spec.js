// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('@oat-sa-private/ui-core', async importOriginal => {
    const originalModule = await importOriginal();
    return Object.assign(
        {
            __esModule: true
        },
        originalModule,
        {
            ResizeObserver: vi.fn()
        }
    );
});

const originalRrequestAnimationFrame = window.requestAnimationFrame;

import resizeObserve from '../resizeObserve.js';
import { ResizeObserver } from '@oat-sa-private/ui-core';
import { tick } from 'svelte';

describe('the resizeObserve action', () => {
    afterEach(() => {
        ResizeObserver.mockClear();
        window.requestAnimationFrame = originalRrequestAnimationFrame;
    });

    it('dispatches "resized" with boundingClientRect detail using ResizeObserver', () =>
        new Promise(resolve => {
            ResizeObserver.mockImplementation(callback => ({
                observe(node) {
                    callback([
                        {
                            target: node
                        }
                    ]);
                },
                unobserve() {},
                disconnect() {}
            }));

            const node = document.createElement('div');
            node.getBoundingClientRect = vi.fn(() => ({ someWidth: 'myWidth' }));

            const action = resizeObserve(node);
            node.addEventListener('resized', event => {
                expect(event instanceof CustomEvent).toBe(true);
                expect(event.detail).toEqual({ someWidth: 'myWidth' });

                action.destroy();
                resolve();
            });
        }));

    it('uses requestAnimationFrame when dispatching "resized" event', () =>
        new Promise(resolve => {
            const requestAnimationFrameSpy = vi.fn(callback => {
                tick().then(() => {
                    callback();
                });
            });
            window.requestAnimationFrame = requestAnimationFrameSpy;
            ResizeObserver.mockImplementation(callback => ({
                observe(node) {
                    callback([
                        {
                            target: node
                        }
                    ]);
                },
                unobserve() {},
                disconnect() {}
            }));

            const node = document.createElement('div');

            const action = resizeObserve(node);
            node.addEventListener('resized', () => {
                expect(requestAnimationFrameSpy).toHaveBeenCalled();

                action.destroy();
                resolve();
            });
        }));

    it('disconnects ResizeObserver on destroy', () => {
        const disconnectSpy = vi.fn();
        ResizeObserver.mockImplementation(() => ({
            observe() {},
            unobserve() {},
            disconnect: disconnectSpy
        }));

        const node = document.createElement('div');

        const action = resizeObserve(node);
        action.destroy();

        expect(disconnectSpy).toHaveBeenCalled();
    });
});
