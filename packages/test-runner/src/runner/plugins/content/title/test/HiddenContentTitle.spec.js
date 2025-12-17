// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import HiddenContentTitle from '../HiddenContentTitle.svelte';
import testsStateStore, { getTestStateStore, getTestSessionStatusStore } from '../../../../testsStateStore.js';

describe('HiddentContentTitle', () => {
    afterEach(() => testsStateStore.clear());

    it('fails without a serviceCallId', () => {
        expect(() => render(HiddenContentTitle, { props: {} })).toThrow(TypeError);
    });

    it('updates based on the store content', () => {
        const serviceCallId = 'test-session-aj6jh';
        const { container } = render(HiddenContentTitle, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();

        const stateStore = getTestStateStore(serviceCallId);
        const statusStore = getTestSessionStatusStore(serviceCallId);
        statusStore.set('interacting');
        stateStore.setTestMap({
            stats: { total: 6 },
            parts: {
                p1: {
                    position: 0,
                    sections: {
                        s1: {
                            items: {
                                i1: { position: 0 },
                                i2: { position: 1 }
                            }
                        }
                    },
                    stats: { total: 2 }
                },
                p2: {
                    position: 1,
                    sections: {
                        s2: {
                            items: {
                                i3: { position: 2 },
                                i4: { position: 3 }
                            }
                        },
                        s3: {
                            items: {
                                i5: { position: 4 },
                                i6: { position: 5 }
                            }
                        }
                    },
                    stats: { total: 4 }
                }
            }
        });
        stateStore.setTestContext({
            testPartId: 'p1',
            sectionId: 's1',
            itemIdentifier: 'i2'
        });

        return tick()
            .then(() => tick)
            .then(() => expect(container).toMatchSnapshot())
            .then(() => {
                stateStore.setTestContext({
                    testPartId: 'p2',
                    sectionId: 's3',
                    itemIdentifier: 'i5'
                });
                return tick();
            })
            .then(() => expect(container).toMatchSnapshot());
    });
});
