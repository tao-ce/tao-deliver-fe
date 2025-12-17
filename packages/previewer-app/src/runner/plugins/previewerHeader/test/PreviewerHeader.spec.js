// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import testsStateStore, {
    getTestStateStore
} from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';
import PreviewerHeader from '../PreviewerHeader.svelte';

const serviceCallId = 'test-session-plswrk';

const sampleTestMap = {
    label: 'SomeTest',
    parts: {
        p1: {
            sections: {
                s1: {
                    items: {
                        i1: {
                            label: 'SomeItem'
                        }
                    }
                }
            }
        }
    },
    locales: ['yy-YY', 'kk-KK']
};
const sampleTestContext = {
    testPartId: 'p1',
    sectionId: 's1',
    itemIdentifier: 'i1',
    locale: 'ab-CD'
};

describe('PreviewerHeader', () => {
    afterEach(() => {
        testsStateStore.clear();
    });

    it('fails rendering with no serviceCallId', () => {
        expect(() => {
            render(PreviewerHeader, { props: {} });
        }).toThrowError();
    });

    it('renders without error if testStateStore is empty', () => {
        const { container } = render(PreviewerHeader, {
            props: {
                serviceCallId
            }
        });
        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('renders unit label and item label and current locale and links to other locales', () => {
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap({
            ...sampleTestMap,
            locales: ['yy-YY', 'kk-KK']
        });
        stateStore.setTestContext(sampleTestContext);

        const { container } = render(PreviewerHeader, {
            props: {
                serviceCallId,
                getLaunchUrlForLocale: lc => `http://${lc}/smth`
            }
        });
        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('renders unit label and item label and current locale if no other locales', () => {
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap({
            ...sampleTestMap,
            locales: []
        });
        stateStore.setTestContext(sampleTestContext);

        const { container } = render(PreviewerHeader, {
            props: {
                serviceCallId
            }
        });
        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });
});
