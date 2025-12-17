// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import blockTreeBuilder, { convertToDOM } from '../blocks/blockTreeBuilder.js';
import blockTypes from '../blocks/blockTypes.js';

import Ajv from 'ajv';
import itemDataSchema from './itemDataSchema.json';
import * as mappers from './mapper';
import { cloneDeep } from 'lodash';
import * as staticComponents from '../../static';
import { getCustomLayouts } from '../layouts/parseLayout.js';

const ajv = new Ajv();
const itemDataValidator = ajv.compile(itemDataSchema);

/**
 * Parse the compiled item data and make it a tree that can be rendered as ItemBlocks.
 * @param {Object} compiledItemData
 * @param {Object} itemRunnerConfig
 * @param {() => SvelteComponent} getInteractionComponent
 * @returns {Object} the parsed item tree
 */
export default function itemDataParser(compiledItemData, itemRunnerConfig, getInteractionComponent) {
    if (!compiledItemData || !itemDataValidator(compiledItemData)) {
        const error = itemDataValidator.errors[0];
        throw new Error(`Compiled item data schema error: ${error.dataPath} ${error.message}`);
    }

    const itemData = compiledItemData.itemData.data;
    const itemBody = itemData.body;
    const itemIdentifier = compiledItemData.itemIdentifier;
    const itemClassList = itemData.attributes.class;
    const itemLang = itemData.attributes['xml:lang'];
    const itemTitle = itemData.attributes.title;
    const itemDir = itemData.attributes.dir || void 0;
    const portableElements = compiledItemData.portableElements || {};
    const pci = portableElements.pci || {};
    const itemClasses = {};
    const usedInteractionQtiClasses = new Set();
    const excludeComponents = [];

    const qtiClassMapper = {
        _tooltip: 'tooltip'
    };

    if (itemRunnerConfig?.options?.hideTooltips ?? true) {
        excludeComponents.push('Tooltip');
    }

    /**
     * Get the custom mapper for an element
     * @param {Object} element
     * @returns {Object|void} the custom mapper
     */
    function getElementMapper(element = {}) {
        if (element) {
            return mappers[`${element.qtiClass}Mapper`];
        }
    }

    /**
     * Get an element within the compiled item data
     * @param {String} elementId - the key of the element
     * @param {Object} itemDataNode - the node from the item data that contains the elements
     * @returns {Object} the element data
     */
    function getElement(elementId = '', itemDataNode) {
        return itemDataNode && itemDataNode.elements && itemDataNode.elements[elementId];
    }

    /**
     * Get the possible scope class for a stylesheet.
     * @param {object} stylesheetNode - The node from item data that contains the stylesheet definition.
     * @returns {string|boolean} - Returns the scope class if any, and empty string if none. If stylesheet is from foreign scope, `false`.
     */
    function getStylesheetScope(stylesheetNode) {
        if (!stylesheetNode || !stylesheetNode.attributes || !stylesheetNode.attributes.includeSerial) {
            return '';
        }

        // The scope class is given by the target element that is including the stylesheet.
        // As the stylesheet declares to which element it is bound,
        // we can retrieve the class from the mapping created earlier.
        const scopeClass = itemClasses[stylesheetNode.attributes.includeSerial];

        if (scopeClass) {
            // Make sure to only return one class as it may be composed.
            // See parseStaticElementAttributes()
            return scopeClass.split(' ').pop();
        } else {
            //itemData can contain stylesheets info for modalFeedback passages which don't exist in itemData body,
            // so don't render scoped stylesheet if its scope can't be found.
            return false;
        }
    }

    /**
     * Get custom stylesheets
     * @param {Object} itemDataNode - the node from the item data that contains the stylesheets
     * @returns {Object} the copy of stylesheets data
     */
    function getStylesheets(itemDataNode) {
        const stylesheets = cloneDeep((itemDataNode && itemDataNode.stylesheets) || {});

        // Retrieve the possible link between elements and stylesheets thanks to the serial.
        // If a link is made, then the stylesheet must be scoped to the element by its CSS class name.
        let toRemove = [];
        Object.keys(stylesheets).forEach(serial => {
            const stylesheet = stylesheets[serial];
            const scopeClass = getStylesheetScope(stylesheet);
            if (scopeClass) {
                stylesheet.attributes.scope = `.${scopeClass}`;
            } else if (scopeClass === false) {
                toRemove.push(serial);
            }
        });
        toRemove.forEach(serial => {
            delete stylesheets[serial];
        });
        return stylesheets;
    }

    /**
     * Get the component name from a QTI class name
     * @param {String} qtiClass - from the compiledData
     * @returns {String} the component name (capitalized qtiClass)
     */
    function getComponentName(qtiClass = '') {
        qtiClass = qtiClassMapper[qtiClass] || qtiClass;
        return `${qtiClass.charAt(0).toUpperCase()}${qtiClass.slice(1)}`;
    }

    /**
     * Get the component prototype for an element tag.
     * @param {String} componentName - the component name (without the suffix)
     * @returns {Function*} the component prototype
     */
    function getStaticComponent(componentName = '') {
        if (excludeComponents.includes(componentName)) {
            return null;
        }
        return staticComponents[`${componentName}Element`] || null;
    }

    /**
     * get the response declaration for a given interaction
     * @param {String} responseIdentifier - the response identifier of an interaction
     * @returns {Object} with baseType and cardinality
     */
    function getInteractionResponseDeclaration(responseIdentifier = '') {
        const responseDeclaration = Object.values(itemData.responses).find(
            declaration => declaration.identifier === responseIdentifier
        );
        if (responseDeclaration) {
            return {
                baseType: responseDeclaration.attributes.baseType,
                cardinality: responseDeclaration.attributes.cardinality
            };
        }
        return {};
    }

    /**
     * Retrieve element-specific config stored under itemRunnerConfig, by the element's component name
     * @param {String} componentName - respecting case of QTI class, e.g. HottextInteraction
     * @returns {Object} the config
     */
    function getElementConfiguration(componentName = '') {
        return (itemRunnerConfig && itemRunnerConfig.elements && itemRunnerConfig.elements[componentName]) || {};
    }

    /**
     * Parse element attributes
     * to create the component properties.
     * @param {Object} element - the element to parse
     * @returns {Object} the properties
     */
    function parseElementAttributes(element = {}) {
        const mapper = getElementMapper(element);

        //custom mapping of element data, before parsing the properties
        if (mapper && typeof mapper.mapElement === 'function') {
            element = mapper.mapElement(element);
        }

        if (element.attributes && element.attributes.responseIdentifier) {
            return parseInteractionAttributes(element);
        }
        return parseStaticElementAttributes(element);
    }

    /**
     * Override element properties from config
     * @param {String} qtiClass
     * @param {String} [typeIdentifier] - only if a PCI
     * @param {Object} [properties] - element properties
     */
    function updatePropertiesFromConfig(qtiClass, typeIdentifier = null, properties = {}) {
        const elementKey = typeIdentifier ? `${qtiClass}_${typeIdentifier}` : qtiClass;
        const elementConfig = getElementConfiguration(getComponentName(elementKey));
        if (elementConfig) {
            if (Array.isArray(elementConfig.qtiClassesOverride)) {
                const overrideClasses = elementConfig.qtiClassesOverride.join(' ');
                properties.classes = `${properties.classes || ''} ${overrideClasses}`.trim();
            }

            // property overrides
            // the implementation depends if we are trying to override an object or scalar
            if (typeof elementConfig.propertyOverride === 'object') {
                Object.entries(elementConfig.propertyOverride).forEach(([key, value]) => {
                    switch (key) {
                        case 'dataAttrs':
                        case 'ariaAttrs':
                            if (key in properties) {
                                Object.assign(properties[key], value);
                            } else {
                                properties[key] = value;
                            }
                            break;
                        default:
                            properties[key] = value;
                            break;
                    }
                });
            }
        }
    }

    /**
     * Parse and transform the attributes of the interactions elements
     * @param {Object} element
     * @returns {Object} attributes
     */
    function parseInteractionAttributes(element = {}) {
        const mapper = getElementMapper(element);

        //remap some properties
        const properties = Object.entries(element.attributes).reduce((props, [key, value]) => {
            //we cannot use a property named `class` in a component
            if (key === 'class') {
                props.classes = Array.isArray(value) ? value.join(' ') : value;

                //remap data and aria to a dedicated object
            } else if (/^data-/.test(key)) {
                props.dataAttrs = props.dataAttrs || {};
                props.dataAttrs[key] = value;
            } else if (/^aria-/.test(key)) {
                props.ariaAttrs = props.ariaAttrs || {};
                props.ariaAttrs[key] = value;

                //otherwise keep the key/value
            } else {
                props[key] = value;
            }

            return props;
        }, {});

        //apply interaction attributes
        Object.assign(properties, getInteractionResponseDeclaration(properties.responseIdentifier));

        // apply configuration overrides
        updatePropertiesFromConfig(element.qtiClass, element.typeIdentifier, properties);

        // standard properties
        if (element.prompt) {
            properties.prompt = getBlockTree(element.prompt);
        }
        if (typeof element.body === 'object') {
            properties.blockTree = getBlockTree(element.body);
        }
        if (typeof element.choices === 'object') {
            const choiceSets = [].concat(element.choices);
            properties.choices = choiceSets.map(choiceSet =>
                //eslint-disable-next-line implicit-arrow-linebreak
                Object.values(choiceSet).map(choice => {
                    const choiceProperties = parseChoiceAttributes(choice);

                    //interaction's choice property mapper
                    if (mapper && typeof mapper.mapChoiceProperties === 'function') {
                        return mapper.mapChoiceProperties(choiceProperties, choice, element);
                    }
                    return choiceProperties;
                })
            );

            // flatten choices array if there was only 1 choice set
            if (choiceSets.length === 1) {
                properties.choices = properties.choices[0];
            }
        }

        if (typeof element.object === 'object') {
            properties.object = parseStaticElementAttributes(element.object);
        }

        // add component and response id data attributes
        properties.dataAttrs = {
            ...properties.dataAttrs,
            'data-qti-class': element.qtiClass,
            'data-response-id': properties.responseIdentifier
        };

        //interaction property mapper
        if (mapper && typeof mapper.mapProperties === 'function') {
            return mapper.mapProperties(properties, element);
        }

        return properties;
    }

    /**
     * Parse and transform the attributes of the static elements
     * @param {Object} element
     * @returns {Object} attributes
     */
    function parseStaticElementAttributes(element = {}) {
        const mapper = getElementMapper(element);
        const properties = Object.assign({}, element.attributes || {});
        if (element.body) {
            properties.content = element.body.body;
            //for complex content give access to the blocktree
            properties.blockTree = getBlockTree(element.body);
        }
        // apply configuration overrides
        updatePropertiesFromConfig(element.qtiClass, null, properties);
        if (properties.classes) {
            properties.class = `${properties.classes} ${properties.class || ''}`.trim();
            delete properties.classes;
        }
        // map custom properties if mapper is defined
        if (mapper && typeof mapper.mapProperties === 'function') {
            //property mapper
            return mapper.mapProperties(properties, element);
        }

        return properties;
    }

    /**
     * Parse choice attributes
     * to create the component properties.
     * @param {Object} choice - the element to parse
     * @returns {Object} the properties
     */
    function parseChoiceAttributes(choice = {}) {
        const properties = Object.assign({}, choice.attributes);

        if (choice.body) {
            properties.content = choice.body.body;

            //for complex content give access to the blocktree
            properties.blockTree = getBlockTree(choice.body);
        }
        if (choice.text || choice.text === '') {
            properties.content = choice.text;
        }
        return properties;
    }

    /**
     * Parse recursively a blockTree in order to add
     * the component prototypes and the properties to give to the components.
     * @param {Object[]} blocks
     * @param {Object} [itemDataNode] - the node from the item data that contains the blocks
     * @returns {Object[]} the augmented blockTree
     */
    function parseTree(blocks = [], itemDataNode = itemBody) {
        blocks.forEach(block => {
            if (block.type === blockTypes.container) {
                const componentName = getComponentName(block.content);
                const component = getStaticComponent(componentName);
                if (component) {
                    block.component = component;
                    block.props.itemIdentifier = itemIdentifier;
                }
            }

            if (block.type === blockTypes.element) {
                const element = getElement(block.content, itemDataNode);
                if (element) {
                    const attributes = parseElementAttributes(element);
                    const componentName = getComponentName(element.qtiClass);
                    let component = getInteractionComponent(componentName);

                    // Keep a mapping of classes applied by element.
                    // This will be used to scope stylesheets when needed.
                    if (attributes.class && element.serial) {
                        itemClasses[element.serial] = attributes.class;
                    }

                    if (component) {
                        block.component = component;
                        block.props = Object.assign(
                            {
                                itemIdentifier
                            },
                            attributes
                        );
                        usedInteractionQtiClasses.add(element.qtiClass);
                    } else {
                        component = getStaticComponent(componentName);
                        if (component) {
                            block.component = component;
                            block.props = {
                                itemIdentifier,
                                attributes
                            };
                        }
                    }
                }
            }
            if (block.children && block.children.length) {
                parseTree(block.children, itemDataNode);
            }
        });
        return blocks;
    }

    /**
     * Get the block tree from a given item data node
     * @param {Object} itemDataNode - the node that contains a body and elements
     * @returns {Object[]} the blockTree
     */
    function getBlockTree(itemDataNode = itemBody) {
        return parseTree(blockTreeBuilder(itemDataNode.body), itemDataNode);
    }

    /**
     * List of custom layouts applied to item
     * @returns {[]}
     */
    function getLayouts() {
        const dom = convertToDOM(itemBody.body);
        const layouts = getCustomLayouts(dom.body);

        if (
            usedInteractionQtiClasses.has('textEntryInteraction') ||
            usedInteractionQtiClasses.has('inlineChoiceInteraction')
        ) {
            layouts.push('inlineInteractionsLayout');
        }

        if (itemRunnerConfig && itemRunnerConfig.hideFeedbacks === true) {
            layouts.push('hideFeedbacksLayout');
        }

        return layouts;
    }

    return {
        itemIdentifier,
        itemClassList,
        itemLang,
        itemTitle,
        itemDir,
        blockTree: getBlockTree(),
        stylesheets: getStylesheets(itemData),
        layouts: getLayouts(),
        pci
    };
}
