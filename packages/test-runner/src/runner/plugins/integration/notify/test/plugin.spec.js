// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';

function setupLayout() {
    const section = document.createElement('section');
    section.innerHTML = `<main></main>`;
    document.body.appendChild(section);
    return section;
}

describe('notify plugin', () => {
    const parentOrigin = 'https://test-origin.test';
    const postMessage = vi.fn();
    const originalWindow = { ...window };
    const windowSpy = vi.spyOn(global, 'window', 'get');
    windowSpy.mockImplementation(() => ({
        ...originalWindow,
        parent: {
            postMessage
        }
    }));

    afterEach(() => {
        windowSpy.mockRestore();
        postMessage.mockReset();
    });

    it('triggers test runner life cycle events', () => {
        const container = setupLayout();
        const itemIdentifier = '12345';
        const getContainer = vi.fn(() => container);
        testRunnerFactory.registerProvider('foo', {
            loadAreaBroker() {
                return {
                    getContainer
                };
            },
            init() {}
        });
        const runner = testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId: 'test-session-1234',
            options: {
                iframeParentOrigin: parentOrigin
            }
        });

        return new Promise(resolve => {
            runner
                .on('render', () => {
                    runner.loadItem(itemIdentifier);
                })
                .on('loaditem', () => {
                    runner.renderItem(itemIdentifier);
                })
                .on('renderitem', () => {
                    runner.unloadItem(itemIdentifier);
                })
                .on('unloaditem', () => {
                    runner.finish();
                })
                .on('finish', () => {
                    runner.flush();
                })
                .on('flush', () => {
                    runner.destroy();
                })
                .on('destroy', () => {
                    resolve();
                })
                .init();
        }).then(() => {
            expect(postMessage).toHaveBeenCalledWith({ event: 'init', parameters: {} }, parentOrigin);
            expect(postMessage).toHaveBeenCalledWith({ event: 'render', parameters: {} }, parentOrigin);
            expect(postMessage).toHaveBeenCalledWith(
                { event: 'loaditem', parameters: { itemIdentifier } },
                parentOrigin
            );
            expect(postMessage).toHaveBeenCalledWith(
                { event: 'renderitem', parameters: { itemIdentifier } },
                parentOrigin
            );
            expect(postMessage).toHaveBeenCalledWith(
                { event: 'unloaditem', parameters: { itemIdentifier } },
                parentOrigin
            );
            expect(postMessage).toHaveBeenCalledWith({ event: 'finish', parameters: {} }, parentOrigin);
            expect(postMessage).toHaveBeenCalledWith({ event: 'flush', parameters: {} }, parentOrigin);
            expect(postMessage).toHaveBeenCalledWith({ event: 'destroy', parameters: {} }, parentOrigin);
        });
    });
});
