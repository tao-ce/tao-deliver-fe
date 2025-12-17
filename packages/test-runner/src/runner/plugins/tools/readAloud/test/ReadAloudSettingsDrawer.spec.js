// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import ReadAloudSettingsDrawer from '../ReadAloudSettingsDrawer.svelte';
import { cloneDeep } from 'lodash';

const defaultReadAloudSettings = {
    constraints: {
        voice: {
            disabled: false
        },
        speed: {
            disabled: false,
            options: ['slowest', 'normal', 'fastest']
        },
        pitch: {
            disabled: false,
            options: ['lowest', 'medium', 'highest']
        }
    }
};

describe('ReadAloudSettingsDrawer', () => {
    it('renders with default props & toolState', () => {
        const { container } = render(ReadAloudSettingsDrawer);
        expect(container).toMatchSnapshot();
    });

    it('renders restoring given toolState', () => {
        const readAloudSettings = cloneDeep(defaultReadAloudSettings);
        readAloudSettings.toolState = {
            voice: 'male',
            speed: 'fastest',
            pitch: 'lowest'
        };

        const { container } = render(ReadAloudSettingsDrawer, {
            props: {
                readAloudSettings
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders in disabled state', () => {
        const { container } = render(ReadAloudSettingsDrawer, {
            props: {
                disabled: true
            }
        });
        expect(container.querySelectorAll('input:disabled')).toHaveLength(2);
        expect(container.querySelectorAll('input:not(:disabled)')).toHaveLength(0);
        expect(container.querySelectorAll('button:disabled')).toHaveLength(4);
        expect(container.querySelectorAll('button:not(:disabled)')).toHaveLength(0);
    });

    test.each(['voice', 'speed', 'pitch'])('renders only %s control if constraints say so', key => {
        const readAloudSettings = cloneDeep(defaultReadAloudSettings);
        readAloudSettings.constraints.voice.disabled = true;
        readAloudSettings.constraints.speed.disabled = true;
        readAloudSettings.constraints.pitch.disabled = true;
        readAloudSettings.constraints[key].disabled = false;

        const { container } = render(ReadAloudSettingsDrawer, {
            props: {
                readAloudSettings
            }
        });
        expect(container).toMatchSnapshot();
    });

    test.each([
        ['voice', 'input', 0, 'male'],
        ['speed', 'button', 0, 'fastest'],
        ['pitch', 'button', 3, 'lowest']
    ])('fires change event with key "%s" on control change', (key, selector, index, expectedValue) => {
        const { container, component } = render(ReadAloudSettingsDrawer, {
            props: {
                readAloudSettings: defaultReadAloudSettings
            }
        });
        const onChange = vi.fn();
        component.$on('change', onChange);

        const element = container.querySelectorAll(selector)[index];
        fireEvent.click(element);

        return tick().then(() => {
            expect(onChange).toHaveBeenCalled();
            expect(onChange.mock.calls[0][0].detail).toEqual({
                key,
                value: expectedValue
            });
        });
    });
});
