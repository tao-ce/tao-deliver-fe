// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { hasValidTarget, getCopiedText, getPastedText } from '../helpers.js';

describe('disableCommands helpers', () => {
    it.each([
        // empty
        [() => void 0, false],
        // target is input
        [() => document.createElement('input'), true],
        [() => document.createElement('textarea'), true],
        [
            () => {
                const div = document.createElement('div');
                div.setAttribute('contenteditable', true);
                return div;
            },
            true
        ],
        // element in editable container
        [
            () => {
                const div = document.createElement('div');
                div.setAttribute('contenteditable', true);
                const p = document.createElement('p');
                div.appendChild(p);
                return p;
            },
            true
        ],
        // element has allow-copy attribute
        [
            () => {
                const div = document.createElement('div');
                div.setAttribute('data-allow-copy', true);
                const p = document.createElement('p');
                div.appendChild(p);
                return p;
            },
            true
        ],
        // textnodes
        [
            () => {
                const input = document.createElement('input');
                const textNode = document.createTextNode('foo');
                input.appendChild(textNode);
                return textNode;
            },
            true
        ],
        [
            () => {
                const textarea = document.createElement('textarea');
                const textNode = document.createTextNode('foo');
                textarea.appendChild(textNode);
                return textNode;
            },
            true
        ],
        [
            () => {
                const div = document.createElement('div');
                div.setAttribute('contenteditable', true);
                const textNode = document.createTextNode('foo');
                div.appendChild(textNode);
                return textNode;
            },
            true
        ],
        [
            () => {
                const div = document.createElement('div');
                div.setAttribute('contenteditable', true);
                div.innerHTML = 'foo';
                return div.childNodes[0];
            },
            true
        ],
        // negative tests
        [
            () => {
                const div = document.createElement('div');
                div.innerHTML = 'foo';
                return div.childNodes[0];
            },
            false
        ],
        [() => document.createElement('p'), false],
        [
            () => {
                const div = document.createElement('p');
                div.innerHTML = 'foo';
                return div.childNodes[0];
            },
            false
        ]
    ])('detects valid target correctly %#', (createTarget, result) => {
        const event = { target: createTarget() };
        expect(hasValidTarget(event)).toBe(result);
    });

    it('gets html copied content', () => {
        const html = '<p>hello</p>';
        const clipboardData = {
            getData(format) {
                expect(format).toBe('text/html');
                return html;
            }
        };
        const event = { clipboardData };

        expect(getCopiedText(event)).toBe('hello');
    });

    it('gets selected text', () => {
        const text = 'hello';
        const clipboardData = {
            getData(format) {
                expect(format).toBe('text/html');
                return '';
            }
        };
        const event = { clipboardData };
        document.getSelection = () => ({
            toString() {
                return text;
            }
        });

        expect(getCopiedText(event)).toBe(text);

        // clean
        delete document.getSelection;
    });

    it('gets pasted html', () => {
        const html = '<p>hello</p>';
        const clipboardData = {
            getData(format) {
                expect(format).toBe('text/html');
                return html;
            }
        };
        const event = { clipboardData };

        expect(getPastedText(event)).toBe('hello');
    });

    it('gets pasted text', () => {
        expect.assertions(2);

        const text = '<p>hello</p>';
        const clipboardData = {
            getData(format) {
                if (format === 'text/html') {
                    // this should be called
                    expect(true).toBe(true);
                    return '';
                }

                if (format === 'text/plain') {
                    return text;
                }

                throw new Error('getData should be html or plain text');
            }
        };
        const event = { clipboardData };

        expect(getPastedText(event)).toBe(text);
    });
});
