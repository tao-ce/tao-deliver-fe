// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import testsStateStore, {
    getTestStateStore
} from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';

function setupLayout() {
    const div = document.createElement('div');
    div.innerHTML = '<div class="top-bar"></div>';
    return div;
}

const serviceCallId = 'test-session-plswrk';

describe('previewerHeader plugin', () => {
    let container;
    let getContainer;
    let getTopBarArea;
    let clearAreasContent;
    let testProviderApi;

    beforeEach(() => {
        container = setupLayout();
        getContainer = () => container;
        getTopBarArea = () => container.querySelector('.top-bar');
        clearAreasContent = () => {};

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getTopBarArea,
                    clearAreasContent
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            init() {}
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        testsStateStore.clear();
        container.innerHTML = '';
    });

    it('mounts PreviewHeader component', () =>
        new Promise(done => {
            const stateStore = getTestStateStore(serviceCallId);
            stateStore.setTestMap({
                label: 'Something',
                locales: ['yy-YY']
            });
            stateStore.setTestContext({ locale: 'ab-CD' });

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId,
                getLaunchUrlForLocale: lc => `http://${lc}/smth`
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect(container).toMatchSnapshot();
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(container).toMatchSnapshot(); //empty
                    done();
                })
                .init();
        }));
});
