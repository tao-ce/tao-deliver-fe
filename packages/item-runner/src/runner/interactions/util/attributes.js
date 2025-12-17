// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Methods to help with extracting props from QTI classes
 */

/**
 * Check if QTI classes list contains a given class
 * @param {String} classes
 * @param {String} className
 * @returns {Boolean}
 */
export function hasClass(classes = '', className = '') {
    const pattern = String.raw`\b${className}\b`;
    return new RegExp(pattern).test(classes);
}

/**
 * @param {string} classes
 * @param {string} targetClassName
 * @returns {string}
 */
export function removeClass(classes = '', targetClassName = '') {
    return classes
        .split(' ')
        .filter(className => className !== targetClassName)
        .join(' ');
}

/**
 * Generic prefixed class suffix extractor with transform function param
 *
 * @example
 * extractFromClasses('qti-first qti-middle qti-last', 'qti-'); // returns 'last'
 *
 * @param {String} [classes='']
 * @param {String} [classPrefix='']
 * @param {Function} [transform]
 * @param {any} [defaultValue=null]
 * @param {Boolean} [findFromRight=true]
 * @returns {any}
 *
 */
export function extractFromClasses(
    classes = '',
    classPrefix = '',
    transform = val => val,
    defaultValue = null,
    findFromRight = true
) {
    let classList = classes.split(' ');
    if (findFromRight) {
        classList = classList.reverse();
    }
    const fullClass = classList.find(cls => cls.startsWith(classPrefix));
    if (fullClass && typeof transform === 'function') {
        const classSuffix = fullClass.replace(classPrefix, '');
        return transform(classSuffix);
    }
    return defaultValue;
}

/**
 * Extracts all prefixed specifiers from a list of classes.
 *
 * @example
 * extractAllFromClasses('qti-first qti-middle qti-last test', 'qti-'); // returns ['first', 'middle', 'last']
 *
 * @param {string|string[]} [classes=''] - The list of classes from which extract the specifiers.
 * @param {string} [classPrefix=''] - The prefix to match for extracting a specifier.
 * @param {function} [transform] - A possible transformer applied to the specifier.
 * @returns {string[]} - A list of specifiers extracted from the classes.
 *
 */
export function extractAllFromClasses(classes = '', classPrefix = '', transform = val => val) {
    let classList = Array.isArray(classes) ? classes : classes.split(' ');
    const specifiers = classList.reduce((specs, cls) => {
        if (cls.startsWith(classPrefix)) {
            let specifier = cls.replace(classPrefix, '');
            if ('function' === typeof transform) {
                specifier = transform(specifier);
            }
            specs.add(specifier);
        }
        return specs;
    }, new Set());
    return [...specifiers];
}

/**
 * Find the last matching class in a string of classes, from a list of candidates
 * @param {String} classes
 * @param {String[]} candidates - list of classNames we are searching for
 * @returns {String|null} last matching candidate
 */
export function extractLastMatchingClass(classes = '', candidates = []) {
    const matchIndexes = candidates.map(className => classes.indexOf(className));
    const highMatchIndex = Math.max(...matchIndexes);
    if (highMatchIndex > -1) {
        const candidateIndex = matchIndexes.indexOf(highMatchIndex);
        return candidates[candidateIndex];
    }
    return null;
}

/**
 * Extract list of strings from a data-attribute comma-separated value
 * @param {String} attrValue
 * @returns {String[]}
 */
export function extractDataValueList(attrValue = '') {
    if (!attrValue) {
        return [];
    }
    return attrValue.split(',').map(s => s.trim());
}
