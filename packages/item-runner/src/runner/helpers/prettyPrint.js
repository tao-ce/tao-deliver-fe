// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const formatters = {
    boolean(value) {
        return value ? 'true' : 'false';
    },
    integer(value) {
        return value;
    },
    float(value) {
        return value;
    },
    string(value) {
        return value === '' ? 'NULL' : `"${value}"`;
    },
    point(value) {
        return `[${value[0]}, ${value[1]}]`;
    },
    pair(value) {
        return `[${value[0]}, ${value[1]}]`;
    },
    directedPair(value) {
        return `[${value[0]}, ${value[1]}]`;
    },
    duration(value) {
        return value;
    },
    file() {
        return 'binary data';
    },
    uri(value) {
        return value;
    },
    intOrIdentifier(value) {
        return value;
    },
    identifier(value) {
        return value;
    }
};

/**
 * Print a QTI response into a human-readable string.
 *
 * @param {Object} response A response in QTI representation.
 * @returns {String} A human-readable version of the QTI response.
 */
export default function prettyPrint(response) {
    if (typeof response.base !== 'undefined') {
        // -- BaseType.
        return printBase(response.base, true);
    }

    if (typeof response.list !== 'undefined') {
        // -- ListType
        return printList(response.list, true);
    }

    if (typeof response.record !== 'undefined') {
        // -- RecordType
        return printRecord(response.record);
    }

    throw new Error('Not a valid PCI JSON Response');
}

/**
 * Return the pretty print string for a qti base variable
 *
 * @param {type} base
 * @param {boolean} withType - the qti baseType
 * @returns {String|void}
 */
function printBase(base, withType = true) {
    let print = '';

    if (base) {
        Object.keys(formatters).forEach(baseType => {
            if (baseType in base) {
                const formatter = formatters[baseType];
                print += withType ? `(${baseType}) ` : '';
                print += formatter(base[baseType]);

                return print;
            }
        });

        return print;
    }
}

/**
 * Return the pretty print string for a qti list variable
 *
 * @param {object} list
 * @param {boolean} withType - the qti baseType of the list
 * @returns {string|void}
 */
function printList(list, withType = true) {
    let print = '';

    if (list) {
        Object.keys(formatters).forEach(baseType => {
            const formatter = formatters[baseType];

            if (list[baseType]) {
                print += withType ? `(${baseType}) ` : '';

                print += '[';

                if (list[baseType].length) {
                    list[baseType].forEach(element => {
                        print += `${formatter(element)}, `;
                    });
                    print = print.substring(0, print.length - 2);
                }

                print += ']';

                return print;
            }
        });
        return print;
    }
}

/**
 * Return the pretty print string for a qti record variable
 *
 * @param {object} record
 * @returns {String}
 */
function printRecord(record) {
    return `(record) ${JSON.stringify(record)}`;
}
