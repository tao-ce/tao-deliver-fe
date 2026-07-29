// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../page.js', () => ({
    __esModule: true,
    default: controller =>
        Object.assign(controller, {
            container: document.body,
            logger: {
                error: vi.fn()
            }
        })
}));

vi.mock('../../component/TheEnd.svelte', () => ({
    __esModule: true,
    default: vi.fn().mockImplementation(() => ({
        $destroy: vi.fn()
    }))
}));

import ThankYouController from '../thankyou.js';
import TheEnd from '../../component/TheEnd.svelte';
import { __ } from '@oat-sa-private/ui-core';

describe('thank you controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    it('renders the default thank-you page without a proceed action', async () => {
        const controller = ThankYouController();

        await controller.start();

        const props = TheEnd.mock.calls[0][1];

        expect(props).toEqual({
            title: 'Thank you',
            info: 'Your test has been submitted.',
            icon: 'finish-16'
        });
    });

    it('renders a proceed action when a valid return URL is provided', async () => {
        const controller = ThankYouController();
        const returnUrl = 'https://portal.example.com/my-sessions';

        await controller.start({ returnUrl });

        const props = TheEnd.mock.calls[0][1];

        expect(props).toEqual({
            title: 'Thank you',
            info: 'Your test has been submitted.',
            icon: 'finish-16',
            actionHref: returnUrl,
            actionLabel: 'Proceed',
            actionTarget: '_top'
        });
    });

    it('ignores invalid return URLs', async () => {
        const controller = ThankYouController();

        await controller.start({ returnUrl: 'not a valid url' });

        const props = TheEnd.mock.calls[0][1];

        expect(props).toEqual({
            title: 'Thank you',
            info: 'Your test has been submitted.',
            icon: 'finish-16'
        });
    });

    it('uses lti_msg from the nested return URL when it is not provided directly', async () => {
        const controller = ThankYouController();
        const returnUrl = 'https://portal.example.com/return?lti_msg=Test+is+finished';

        await controller.start({ returnUrl });

        const props = TheEnd.mock.calls[0][1];

        expect(props.info).toBe('Test is finished');
    });

    it('applies lti_locale before rendering the page', async () => {
        const controller = ThankYouController();
        const setLocaleSpy = vi.spyOn(__, 'setLocale').mockResolvedValue();
        vi.spyOn(__, 'setFallbackLocale').mockResolvedValue();
        vi.spyOn(__, 'getLocale').mockReturnValue('en-US');

        await controller.start({ lti_locale: 'ja-JP' });

        expect(setLocaleSpy).toHaveBeenCalledWith('ja-JP');
        expect(TheEnd).toHaveBeenCalled();
    });

    it('still renders the thank-you page when locale setup fails', async () => {
        const controller = ThankYouController();
        const localeError = new Error('locale load failed');

        vi.spyOn(__, 'setLocale').mockRejectedValue(localeError);
        vi.spyOn(__, 'getLocale').mockReturnValue('en-US');

        await controller.start({ lti_locale: 'ja-JP' });

        expect(controller.logger.error).toHaveBeenCalledWith(localeError);
        expect(TheEnd).toHaveBeenCalled();
    });
});
