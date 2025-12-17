// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';

function setupLayout() {
    const section = document.createElement('div');
    section.innerHTML = `
    <aside></aside>
 `;
    return section;
}

describe('menu panel plugin', () => {
    it('renders and destroys', () =>
        new Promise(done => {
            const container = setupLayout();
            const getPanelArea = vi.fn(() => container.querySelector('aside'));
            testRunnerFactory.registerProvider('foo', {
                loadAreaBroker() {
                    return {
                        getPanelArea
                    };
                },
                install() {
                    this.getTheme = () => ({});
                },
                init() {}
            });
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container
            });

            expect(container).toMatchSnapshot();
            expect(getPanelArea).not.toHaveBeenCalled();

            runner
                .on('render', () => {
                    expect(container).toMatchSnapshot();

                    expect(getPanelArea).toHaveBeenCalled();
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(container).toMatchSnapshot();
                    done();
                })
                .init();
        }));

    it('renders a custom theme', () =>
        new Promise(done => {
            const container = setupLayout();
            const getTheme = vi.fn(() => ({
                menu: {
                    links: [
                        {
                            label: 'Foo',
                            href: 'https://www.foo.bar'
                        }
                    ],
                    footer: {
                        logo: {
                            src: 'http://192.168.1.12:8080/logo.png',
                            alt: 'my logo'
                        }
                    }
                }
            }));
            testRunnerFactory.registerProvider('foo', {
                loadAreaBroker() {
                    return {
                        getPanelArea: () => container.querySelector('aside')
                    };
                },
                install() {
                    this.getTheme = getTheme;
                },
                init() {}
            });
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container
            });

            expect(container).toMatchSnapshot();
            expect(getTheme).not.toHaveBeenCalled();

            runner
                .on('render', () => {
                    expect(container).toMatchSnapshot();

                    expect(getTheme).toHaveBeenCalled();
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(container).toMatchSnapshot();
                    done();
                })
                .init();
        }));
});
