// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../../../util/locale.js', async importOriginal => {
    const originalModule = await importOriginal();
    return Object.assign({ __esModule: true }, originalModule, {
        getLocale: () => 'ab-CD'
    });
});
import { render } from '@testing-library/svelte';
import ChoiceFeedbackBlock from '../ChoiceFeedbackBlock.svelte';
import { tick } from 'svelte';

function setupLayout() {
    // interaction holder
    return `<div class="qti-interaction" tabindex="-1"></div>`;
}

describe('ChoiceFeedbackBlock', () => {
    beforeEach(() => {
        document.body.innerHTML = setupLayout();
    });

    it('renders empty element when no message string', () => {
        const { container } = render(ChoiceFeedbackBlock, {
            target: document.querySelector('.qti-interaction'),
            props: {
                isInteractionFocused: true,
                selectedNumber: 1
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders valid feedback correctly', () => {
        const { container } = render(ChoiceFeedbackBlock, {
            target: document.querySelector('.qti-interaction'),
            props: {
                isInteractionFocused: true,
                maxChoices: 1,
                minChoices: -1,
                selectedNumber: 1
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders invalid feedback correctly', () => {
        const { container } = render(ChoiceFeedbackBlock, {
            target: document.querySelector('.qti-interaction'),
            props: {
                isInteractionFocused: true,
                maxChoices: 2,
                minChoices: 2,
                selectedNumber: 1,
                type: 'associations'
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders valid feedback until interacted', () => {
        const { container, component } = render(ChoiceFeedbackBlock, {
            target: document.querySelector('.qti-interaction'),
            props: {
                isInteractionFocused: false,
                maxChoices: 2,
                minChoices: 2,
                selectedNumber: 0
            }
        });
        expect(container.querySelector('.feedback')).toHaveClass('info');

        component.$set({
            isInteractionFocused: true,
            selectedNumber: 1
        });

        return tick().then(() => {
            expect(container.querySelector('.feedback')).toHaveClass('warning');
        });
    });

    test.each([
        [void 0, null, ''],
        ['', '', ''],
        ['en-US', 'en-US', 'ltr'],
        ['ar-arb', 'ar-arb', 'rtl'],
        ['de', 'de', 'ltr']
    ])('render an accurate lang attribute', (lang, expectedLang, expectedDir) => {
        const { container } = render(ChoiceFeedbackBlock, {
            target: document.querySelector('.qti-interaction'),
            props: {
                isInteractionFocused: true,
                maxChoices: 1,
                minChoices: -1,
                selectedNumber: 1,
                lang
            }
        });
        expect(container.querySelector('.qti-instruction-container').getAttribute('lang')).toBe(expectedLang);
        expect(container.querySelector('.qti-instruction-container').getAttribute('dir')).toBe(expectedDir);
    });

    it('renders feedback for "selectChoices" type', () => {
        const { container } = render(ChoiceFeedbackBlock, {
            target: document.querySelector('.qti-interaction'),
            props: {
                maxChoices: 4,
                minChoices: 2,
                type: 'selectChoices'
            }
        });
        expect(container.querySelector('.qti-instruction-container p').textContent.trim()).toBe(
            'You need to select from 2 to 4 choices'
        );
    });

    it('renders feedback for "placeAnswers" type', () => {
        const { container } = render(ChoiceFeedbackBlock, {
            target: document.querySelector('.qti-interaction'),
            props: {
                maxChoices: 4,
                minChoices: 2,
                type: 'placeAnswers'
            }
        });
        expect(container.querySelector('.qti-instruction-container p').textContent.trim()).toBe(
            'You need to place from 2 to 4 answers'
        );
    });
});
