// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Default fallback color for markers and symbols.
 * @type {string}
 */
const DEFAULT_MARKER_COLOR = '#000000';

/**
 * Convert a free-form symbol identifier into a slug suitable for DOM/data attributes.
 * @param {string} value
 * @returns {string}
 */
export function slugifySymbolId(value) {
    if (!value) {
        return '';
    }
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function getMarkerIconName(shapeId) {
    if (!shapeId) {
        return '';
    }
    return `marker-${shapeId}-12`;
}

/**
 * Normalize incoming symbol definitions to ensure unique ids, labels, and icon values.
 * @param {Array<Object>} symbols
 * @param {Set<string>} usedIds
 * @returns {Array<Object>}
 */
export function normalizeSymbolsList(symbols = [], usedIds = new Set()) {
    return symbols.reduce((acc, symbol, index) => {
        if (!symbol) {
            return acc;
        }
        const label = symbol.label || symbol.name || symbol.id || '';
        const icon = symbol.icon || getMarkerIconName(symbol.shapeId);
        const baseId =
            symbol.id ||
            slugifySymbolId(label) ||
            slugifySymbolId(symbol.shapeId) ||
            slugifySymbolId(icon) ||
            `symbol-${index + 1}`;
        let id = baseId;
        let suffix = 1;
        while (usedIds.has(id)) {
            id = `${baseId}-${suffix}`;
            suffix += 1;
        }
        usedIds.add(id);
        acc.push({
            ...symbol,
            id,
            label,
            icon
        });
        return acc;
    }, []);
}

function isGroupedSymbols(value) {
    return Array.isArray(value) && value.length > 0 && Array.isArray(value[0]);
}

function isSectionList(value) {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every(section => section && (Array.isArray(section.symbols) || Array.isArray(section.items)))
    );
}

function normalizeSectionsFromGroups(groups = []) {
    return normalizeSections(groups.map(symbols => ({ symbols })));
}

function normalizeSections(sections = []) {
    const usedIds = new Set();
    return sections
        .map(section => ({
            ...section,
            symbols: normalizeSymbolsList(section?.symbols || section?.items || [], usedIds)
        }))
        .filter(section => section.symbols.length > 0);
}

function flattenSections(sections = []) {
    return sections.reduce((acc, section) => acc.concat(section.symbols || []), []);
}

function hasSymbolsSource(source) {
    if (!source) {
        return false;
    }
    if (Array.isArray(source)) {
        return source.length > 0;
    }
    if (source?.marks || source?.markingSymbolsPreset || source?.sections || source?.symbols) {
        return true;
    }
    return false;
}

function extractSymbolsSource(config) {
    if (!config) {
        return null;
    }
    if (Array.isArray(config)) {
        return config;
    }
    if (config.marks) {
        return config.marks;
    }
    if (config.markingSymbolsPreset) {
        return config.markingSymbolsPreset;
    }
    if (config.sections) {
        return config.sections;
    }
    if (config.symbols) {
        return config.symbols;
    }
    return null;
}

export function hasSymbolsConfig(config) {
    return hasSymbolsSource(extractSymbolsSource(config));
}

function resolveSymbolsSource(config, fallbackSymbols) {
    const source = extractSymbolsSource(config);
    if (hasSymbolsSource(source)) {
        return source;
    }
    const fallbackSource = extractSymbolsSource(fallbackSymbols);
    if (hasSymbolsSource(fallbackSource)) {
        return fallbackSource;
    }
    return fallbackSymbols || [];
}

export function normalizeSymbolsConfig(config, fallbackSymbols) {
    let sections = [];
    const source = resolveSymbolsSource(config, fallbackSymbols);

    if (Array.isArray(source)) {
        if (isGroupedSymbols(source)) {
            sections = normalizeSectionsFromGroups(source);
        } else if (isSectionList(source)) {
            sections = normalizeSections(source);
        } else {
            sections = normalizeSections([{ symbols: source }]);
        }
    } else if (source?.marks) {
        sections = normalizeSections(source.marks);
    } else if (source?.sections) {
        sections = normalizeSections(source.sections);
    } else if (source?.symbols) {
        sections = isGroupedSymbols(source.symbols)
            ? normalizeSectionsFromGroups(source.symbols)
            : normalizeSections([{ symbols: source.symbols }]);
    }

    return {
        symbols: flattenSections(sections),
        sections,
        configSource: hasSymbolsConfig(config) ? config : fallbackSymbols
    };
}

export function getSymbolById(symbols, symbolId) {
    if (!symbolId) {
        return null;
    }
    return symbols.find(symbol => symbol?.id === symbolId) || null;
}

/**
 * Resolve a marker's symbol id using stored symbol definitions.
 * @param {Object} marker
 * @param {Array<Object>} symbols
 * @returns {string|null}
 */
export function getMarkerSymbolId(marker, symbols) {
    if (!marker) {
        return null;
    }
    if (marker.symbolId) {
        return marker.symbolId;
    }
    if (marker.id) {
        return marker.id;
    }
    const markerIcon = marker.icon || getMarkerIconName(marker.shapeId);
    if (!markerIcon) {
        return null;
    }
    const markerColor = marker.color || DEFAULT_MARKER_COLOR;
    const match = symbols.find(
        symbol =>
            (symbol.color || DEFAULT_MARKER_COLOR) === markerColor &&
            (symbol.icon || getMarkerIconName(symbol.shapeId)) === markerIcon
    );
    return match ? match.id : null;
}

export function buildCountsBySymbol(symbols, markers) {
    const counts = {};
    if (!Array.isArray(markers)) {
        return counts;
    }
    markers.forEach(marker => {
        const symbolId = getMarkerSymbolId(marker, symbols);
        if (!symbolId) {
            return;
        }
        counts[symbolId] = (counts[symbolId] || 0) + 1;
    });
    return counts;
}

export function resolveMarkerAppearance(marker, symbols) {
    const symbolId = getMarkerSymbolId(marker, symbols);
    const symbol = getSymbolById(symbols, symbolId);
    return {
        icon:
            marker.icon ||
            getMarkerIconName(marker.shapeId) ||
            symbol?.icon ||
            getMarkerIconName(symbol?.shapeId) ||
            '',
        color: marker.color || symbol?.color || DEFAULT_MARKER_COLOR
    };
}

export { DEFAULT_MARKER_COLOR };
