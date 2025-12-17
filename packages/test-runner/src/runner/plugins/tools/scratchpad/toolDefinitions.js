// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { __ } from '@oat-sa-private/ui-core';

export default {
    select: {
        key: 'select',
        type: 'select',
        label: __('Select'),
        icon: 'select-16'
    },
    text: {
        key: 'text',
        type: 'text',
        label: __('Text'),
        icon: 'type-16'
    },
    brush: {
        key: 'brush',
        type: 'brush',
        label: __('Brush'),
        icon: 'brush-16',
        opener: true,
        onetime: true,
        tools: [
            {
                key: 'brush-small',
                label: __('Small brush'),
                icon: 'brush-8px-16',
                options: {
                    size: 8
                }
            },
            {
                key: 'brush-medium',
                label: __('Medium brush'),
                icon: 'brush-12px-16',
                options: {
                    size: 12
                }
            },
            {
                key: 'brush-large',
                label: __('Large brush'),
                icon: 'brush-16px-16',
                options: {
                    size: 16
                }
            }
        ]
    },
    rectangle: {
        key: 'rectangle',
        type: 'rectangle',
        label: __('Rectangle'),
        icon: 'rectangle-16',
        opener: true,
        tools: [
            { key: 'rectangle', type: 'rectangle', label: __('Rectangle'), icon: 'rectangle-16' },
            { key: 'oval', type: 'oval', label: __('Oval'), icon: 'oval-16' },
            { key: 'line', type: 'line', label: __('Line'), icon: 'line-16' }
        ]
    },
    eraser: {
        key: 'eraser',
        type: 'eraser',
        label: __('Eraser'),
        icon: 'eraser-16'
    }
};
