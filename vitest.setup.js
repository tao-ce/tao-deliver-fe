// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import 'core-js/stable/structured-clone';
import '@testing-library/jest-dom/vitest'; // extends matchers

global.MutationObserver = vi.fn().mockImplementation(callback => ({
    callback,
    disconnect: vi.fn(),
    observe: vi.fn()
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe() {},
    unobserve() {},
    disconnect() {}
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
}));

// Mock env, needed in deep-linking-app
window.env = {};

/**
 * TAO 3.x libs section
 */

vi.mock('core/logger', () => import('./__mocks__/core/logger.js'));

/**
 * LDS section
 */

// Mock window.matchMedia for Plyr
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
    }))
});

// Mock SVG imports
vi.mock('plyr/dist/plyr.svg', () => ({
    default: '<svg />'
}));

// Mock CSS imports
vi.mock('*.css', () => ({}));

// Mock CKEditor
vi.mock('@oat-sa-private/ui-elements/richTextEditor/ckeditor.js', () => ({
    default: {},
    EditorWatchdog: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        setCreator: vi.fn(),
        setDestructor: vi.fn(),
        create: vi.fn(),
        destroy: vi.fn()
    })),
    HtmlDataProcessor: vi.fn().mockImplementation(() => ({
        toView: vi.fn().mockReturnValue(''),
        toData: vi.fn().mockReturnValue('')
    })),
    ClassicEditor: {
        builtinPlugins: [],
        create: vi.fn().mockResolvedValue({
            model: { document: { on: vi.fn() } },
            editing: {
                view: {
                    getDomRoot: () => ({ addEventListener: vi.fn() }),
                    document: { getRoot: vi.fn(), on: vi.fn() },
                    change: vi.fn(),
                    on: vi.fn()
                }
            },
            ui: {
                element: { style: {} },
                view: {
                    toolbar: {
                        element: { setAttribute: vi.fn(), removeAttribute: vi.fn(), addEventListener: vi.fn() },
                        items: []
                    },
                    editable: { element: {} }
                }
            },
            plugins: { get: vi.fn() },
            sourceElement: { getAttribute: vi.fn() },
            setData: vi.fn(),
            getData: vi.fn().mockReturnValue(''),
            destroy: vi.fn().mockResolvedValue(),
            on: vi.fn(),
            enableReadOnlyMode: vi.fn(),
            disableReadOnlyMode: vi.fn()
        })
    }
}));

const generateElementId = vi.fn(nodeName => `tao-${nodeName}-123`);

function getPointerEventCoords(event) {
    // Handle different event types for touch tests
    if (event && event.touches && event.touches.length > 0) {
        return { x: event.touches[0].clientX || 50, y: event.touches[0].clientY || 50 };
    }
    if (event && event.changedTouches && event.changedTouches.length > 0) {
        return { x: event.changedTouches[0].clientX || 50, y: event.changedTouches[0].clientY || 50 };
    }
    if (event && typeof event.clientX !== 'undefined') {
        return { x: event.clientX, y: event.clientY };
    }
    return { x: 50, y: 50 };
}

vi.mock('@oat-sa-private/ui-core', async () => {
    const actual = await vi.importActual('@oat-sa-private/ui-core');
    return {
        ...actual,
        generateElementId,
        getLocale: vi.fn(() => 'en'),
        getDefaultRemSizePx: () => 16,
        getRemSizePx: () => 16,
        remToPx: vi.fn(rem => rem * 16), // Mock conversion: 1rem = 16px
        pxToRem: vi.fn(px => px / 16), // Mock conversion: 16px = 1rem
        visibilityObserver: () => ({
            update: () => {},
            destroy: () => {}
        }),
        getPointerEventCoords,
        ResizeObserver: global.ResizeObserver
    };
});

vi.mock('@oat-sa-private/ui-core/dom/dom.js', async importOriginal => {
    const actual = await importOriginal();
    return {
        ...actual,
        generateElementId,
        getPointerEventCoords
    };
});

vi.mock('@oat-sa-private/ui-core/dom/positioning.js', async importOriginal => {
    const actual = await importOriginal();
    return {
        ...actual,
        calculateAbsolutePosition: vi.fn(() => ({ top: '0px', left: '0px', bottom: 'unset', right: 'unset' })),
        getParentDimensions: vi.fn(() => ({ scrollTop: 0, scrollLeft: 0, clientWidth: 1024, clientHeight: 768 }))
    };
});

vi.mock('pdfjs-dist', () => ({
    __esModule: true,
    getDocument: () => ({
        promise: Promise.resolve({
            // pdfDocument
            numPages: 1,
            getPage: () => ({
                // pdfPage
                render: () => ({
                    promise: Promise.resolve()
                }),
                streamTextContent: () => {},
                getViewport: () => ({ width: 400, height: 600, scale: 1 })
            })
        }),
    }),
    TextLayer: () => {},
    ResponseException: Error,
    InvalidPDFException: Error,
    PixelsPerInch: {
        PDF_TO_CSS_UNITS: 1
    },
    GlobalWorkerOptions: {}
}));

// Silence Svelte's stupid prop warnings
// eslint-disable-next-line
const originalConsoleWarn = console.warn;
// eslint-disable-next-line
console.warn = (...args) => {
    if (args[0]?.match(/with unknown prop|without expected prop|unexpected slot/)) {
        return;
    }
    originalConsoleWarn(...args);
};
