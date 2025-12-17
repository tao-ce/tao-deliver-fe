// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import SettingsContent from '../SettingsContent.svelte';
import { generateElementId } from '@oat-sa-private/ui-core';
import {
    getTestSessionUserDataService,
    clearAllTestSessionsUserData
} from '../../../session/testSessionUserDataService.js';
import settingsKeys from '../settingsKeys.js';

describe('SettingsContent', () => {
    let serviceCallId;
    let testSessionUserDataService;
    let settingsStore;

    beforeEach(() => {
        serviceCallId = 'test-serviceCallId';
        testSessionUserDataService = getTestSessionUserDataService(serviceCallId);
        settingsStore = testSessionUserDataService.getSettingsStore();
    });
    afterEach(() => clearAllTestSessionsUserData());

    it('Renders itself correctly', () => {
        const settings = {
            choiceElimination: false
        };
        settingsStore.set(settings);

        const { container } = render(SettingsContent, {
            props: {
                serviceCallId
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('fails without a serviceCallId', () => {
        expect(() => render(SettingsContent, { props: {} })).toThrow(TypeError);
    });

    describe('choice elimination', () => {
        it('hide settings if disabled', () => {
            const settings = {
                _disabledKeys: [settingsKeys.choiceElimination]
            };
            settingsStore.set(settings);

            const { container } = render(SettingsContent, {
                props: {
                    serviceCallId
                }
            });
            const captionId = generateElementId(`caption-${settingsKeys.choiceElimination}`);
            const checkbox = container.querySelector(`#${captionId} input`);

            expect(checkbox).toBeNull();
        });

        it('settings are applied', () => {
            const settings = {
                _disabledKeys: [], // Ensure the setting is not disabled
                choiceElimination: true
            };
            settingsStore.set(settings);

            const { container } = render(SettingsContent, {
                props: {
                    serviceCallId
                }
            });

            // Find the checkbox that's labeled by a caption containing the choice elimination text
            const checkbox = container.querySelector('input[type="checkbox"][role="switch"]');

            expect(checkbox).not.toBeNull();
            expect(checkbox.checked).toBe(true);
        });

        it('fires change event with value', () => {
            const onChange = vi.fn();
            const settings = {
                _disabledKeys: [], // Ensure the setting is not disabled
                [settingsKeys.choiceElimination]: true
            };
            settingsStore.set(settings);

            const { container, component } = render(SettingsContent, {
                props: {
                    serviceCallId
                }
            });
            // Find the first checkbox (choice elimination)
            const checkbox = container.querySelector('input[type="checkbox"][role="switch"]');

            component.$on('change', onChange);

            expect(checkbox).not.toBeNull();
            checkbox.click();

            expect(onChange.mock.calls[0][0].detail).toMatchObject({
                key: settingsKeys.choiceElimination,
                value: false
            });
        });
    });
});
