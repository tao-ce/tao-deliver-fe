// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { bookletFileConverterFactory } from '../bookletFileConverter.js';

describe('bookletFileConverter', () => {
    it('returns api object', () => {
        const api = bookletFileConverterFactory();
        expect(api).toBeTypeOf('object');
        expect(api.convert).toBeTypeOf('function');
        expect(api.downloadBooklet).toBeTypeOf('function');
        expect(api.downloadHtml).toBeTypeOf('function');
        expect(api.getFilenameForTest).toBeTypeOf('function');
    });

    it('getFilenameForTest', () => {
        const api = bookletFileConverterFactory();
        expect(api.getFilenameForTest({}, { id: '', label: '' }, 0, 0)).toBe('booklet___1-1');
        expect(api.getFilenameForTest({}, { id: 'WO79SJ0', label: 'warm clothing' }, 0, 34)).toBe(
            'WO79SJ0_warm-clothing__1-35'
        );
        expect(
            api.getFilenameForTest(
                { locale: 'fr-FR' },
                { id: 'ый0123ццч456ф789йя', label: 'wa_rm ый цч-clothing' },
                31,
                34
            )
        ).toBe('0123-456-789_wa_rm-clothing_fr-FR_32-35');
        expect(api.getFilenameForTest({ locale: 'fr-FR' }, { id: 'ыййя', label: 'ый цч' }, 31, 34)).toBe(
            'booklet__fr-FR_32-35'
        );
    });

    it('convert: accepts html string and returns docx blob', async () => {
        const textContent = 'Here we go 夏休み';
        const imageContent = 'iVBORw0KGgoAAAANSUhEU=';
        const htmlSample =
            '<html><head><meta charset="UTF-8"></head><body>' +
            `<p style="font-style:bold">${textContent}</p><img src="data:image/png;base64,${imageContent}">` +
            '</body></html>';
        const api = bookletFileConverterFactory();
        const docxResult = await api.convert(htmlSample);

        expect(docxResult instanceof Blob).toBe(true);
        expect(docxResult.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const docxText = reader.result;
                    expect(docxText.includes(textContent)).toBe(true);
                    expect(docxText.includes(imageContent)).toBe(true);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(docxResult, 'UTF-8');
        });
    });
});
