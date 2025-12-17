// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';

function setupLayout() {
    const section = document.createElement('section');
    section.innerHTML = `
    <header tabindex="-1"></header>
    <main>
        <a href="#location">a link</a>
        <a href="#anchor-1">first choice</a>
        <a href="#anchor-2">second choice</a>
        <a href="https://www.anonanchorlink.com">a link</a>
        <div id="location"></div>
        <ul>
            <li>
                <span class="hidden"><span id="anchor-1">Choice 1</span></span>
                <span id="anchor-1">Choice 1</span>
            </li>
            <li>
                <span class="hidden"><span id="anchor-2">Choice 2</span></span>
                <span id="anchor-2">Choice 2</span>
            </li>
            <li>
                <span class="hidden"><span id="anchor-3">Choice 3</span></span>
                <span id="anchor-3">Choice 3</span>
            </li>
        </ul>
    </main>
 `;
    document.body.appendChild(section); //for focus test
    return section;
}

describe('anchor base url converter plugin', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'location', {
            value: new URL('https://www.testurl.com'),
            writable: true
        });
    });

    it('converts an anchor', () =>
        new Promise(done => {
            const container = setupLayout();

            const getHeaderArea = vi.fn(() => container.querySelector('header'));
            const getContainer = vi.fn(() => container);
            testRunnerFactory.registerProvider('foo', {
                loadAreaBroker() {
                    return {
                        getHeaderArea,
                        getContainer
                    };
                },
                init() {}
            });

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId: 'test-session-12'
            });

            runner
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .after(`renderitem`, () => {
                    expect(container).toMatchSnapshot();
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));
});
