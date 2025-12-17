// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Encoder/decoder for conversion of pciResponses between object and JSON formats
 */

const encodingCardinalities = Object.freeze({
    single: 'base',
    multiple: 'list',
    ordered: 'list',
    record: 'record'
});
const decodingCardinalities = Object.freeze({
    base: 'single',
    list: 'multiple',
    record: 'record'
});

// baseTypes keys are pre-lowercased to standardise comparison with incoming JSON keys
// while values remain case-sensitive and accurate to QTI spec
const baseTypes = Object.freeze({
    null: null,
    boolean: 'boolean',
    integer: 'integer',
    float: 'float',
    string: 'string',
    point: 'point',
    pair: 'pair',
    directedpair: 'directedPair',
    duration: 'duration',
    file: 'file',
    filehash: 'fileHash',
    uri: 'uri',
    intoridentifier: 'intOrIdentifier',
    identifier: 'identifier'
});

export default {
    /**
     * Encode a given cardinality, baseType & value to its corresponding PCI JSON representation
     * @param {Object} input {cardinality, baseType, value}
     * @param {string} input.cardinality
     * @param {string} input.baseType
     * @param {any} input.value
     * @returns {Object} PCI JSON
     * @throws {TypeError}
     */
    encode({ cardinality, baseType, value } = {}) {
        // normalise case before lookups
        cardinality = cardinality.toLowerCase();
        baseType = typeof baseType === 'string' ? baseType.toLowerCase() : baseType;

        if (!(cardinality in encodingCardinalities)) {
            throw new TypeError('No valid cardinality provided to encoder');
        }
        if (!(baseType in baseTypes)) {
            throw new TypeError('No valid baseType provided to encoder');
        }

        //if the value comes as an array but the baseTyle is single
        if (cardinality === 'single' && !['point', 'pair', 'directedpair'].includes(baseType) && Array.isArray(value)) {
            value = value.length ? value[0] : null;
        }

        // correction of stringified booleans
        const boolTransform = boolString => ({ true: true, false: false }[boolString.toLowerCase()]);

        if (baseType === 'boolean') {
            if (cardinality === 'single' && typeof value === 'string') {
                value = boolTransform(value);
            } else if (cardinality === 'multiple' && Array.isArray(value)) {
                value = value.map(item => {
                    if (typeof item === 'string') {
                        return boolTransform(item);
                    }
                    return item;
                });
            }
            // correction of single mis-formatted pair/directedPair
        } else if (cardinality === 'single' && baseType !== null && baseType.match(/pair$/)) {
            value = typeof value === 'string' ? value.split(/\s+/) : value;
        }

        // correction of non-array array
        if ((cardinality === 'multiple' || cardinality === 'ordered') && !Array.isArray(value)) {
            value = value === null ? [] : [value];
        }

        let innerObj;
        if (cardinality === encodingCardinalities.record) {
            innerObj = value;
        } else if (baseType === null || (value === null && cardinality === 'single')) {
            innerObj = null;
        } else {
            innerObj = {
                [baseTypes[baseType]]: value
            };
        }

        return {
            [encodingCardinalities[cardinality]]: innerObj
        };
    },

    /**
     * Decode a given PCI JSON object to its cardinality, baseType & value
     * @param {Object} pciJson
     * @returns {Object} {cardinality, baseType, value}
     * @throws {TypeError}
     */
    decode(pciJson) {
        const cardinality = Object.keys(pciJson).find(key => key.toLowerCase() in decodingCardinalities);
        if (!cardinality) {
            throw new TypeError('No valid cardinality found in PCI JSON');
        }

        const innerObj = pciJson[cardinality];
        let baseType = null;
        let value;

        const lowerCardinality = cardinality.toLowerCase();
        let lowerBaseType = baseType;

        if (lowerCardinality === decodingCardinalities.record) {
            value = innerObj;
        } else if (innerObj !== null) {
            baseType = Object.keys(innerObj).find(key => key.toLowerCase() in baseTypes);
            if (!baseType) {
                throw new TypeError('No valid baseType found in PCI JSON');
            }
            value = innerObj[baseType];
            lowerBaseType = baseType.toLowerCase();
        }

        return {
            cardinality: decodingCardinalities[lowerCardinality],
            baseType: baseTypes[lowerBaseType],
            value
        };
    }
};
