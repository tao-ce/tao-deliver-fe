<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

# Interactions

> How to add a new interaction

## The Svelte component

To implement a new interaction type, you'll need: 

1. A Svelte component in the directory `src/runner/interactions`, that matches the minimal API
2. Ensure the component is exported with the correct naming convention into `src/runner/interactions/index.js`

For example, if we want to implement the [drawing interaction](https://www.imsglobal.org/question/qtiv2p2p2/QTIv2p2p2-ASI-InformationModelv1p0/imsqtiv2p2p2_asi_v1p0_InfoModelv1p0.html#Data_DrawingInteraction)

We need to create a Svelte component in `src/runner/interactions/drawing/DrawingInteraction.svelte`.
It's mandatory to export it in the `index.js` using the following convention: `${qtiClassName}Interaction`. 
For example,
```js
export { default as DrawingInteraction } from './drawing/DrawingInteraction.svelte';
```
The item parser will try to find the matching Svelte component inside this file, so if the interaction is not loaded, please check the name in the tree block matches the exported name.

### Base properties


Each interaction must expose the following properties: 
 - `itemIdentifier`: the item unique identifier, used by the store 
 - `responseIdentifier`: how we identify interactions within an item, it's used as a key for the interaction state and responses
 - `baseType`: matching the QTI response type
 - `cardinality`: matching the QTI response cardinally

In addition, each interaction comes with a set of attributes that will be mapped directly to the Svelte component.

The following set of HTML oriented attributes can be set on any interaction, so the Svelte component should support them: 

- `id`
- `classes`: the CSS class list (not `class` because it's a reserved keyword in Javascript)
- `role`
- `dir`
- `language`
- `ariaAttrs`: an object of ARIA attributes 
- `dataAttrs`: an object with the data-attributes

With our example, the component looks like: 
```svelte
<script>

    export let cardinality = 'single';
    export let baseType = 'file';
    export let itemIdentifier;
    export let responseIdentifier;
    export let language;
    export let id;
    export let classes = '';
    export let dir;
    export let role;
    export let ariaAttrs = {};
    export let dataAttrs = {};

</script>
<div
    class="qti-interaction qti-blockInteraction qti-drawingInteraction {classes}"
    data-qti-class="drawingInteraction"
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}
>
    Draw something here 
</div>
```

You've noticed the interaction contains already some classes (ie. `qti-blockInteraction`). We usually get them from the current version of TAO, to maintain some kind of compatibility. 

### Specific properties

In addition, each interaction supports its own set of attributes in QTI.  

#### Direct mapping

To support a new attribute, exposing the property in the component is enough for a direct mapping. 
For example, to support the property `maxChoices` in a ChoiceInteraction, the component has to: 

```svelte
export let maxChoices = 1;
```

The property name has to match the QTI attribute name.

> A good practice is to use a default value, matching the default value defined by the QTI specification.

#### Custom mapping

But sometimes, having a _1:1_ mapping doesn't work for the component, or the attribute value must be casted. 

At the interaction level, a custom mapping is defined by a [mapper](./architecture.md#mappers). All you need is to add a new mapper named according to your interaction. 

For the `DrawingInteraction` the mapper will be `src/runner/item/parser/mapper/drawing.js`. 
Exported in `src/runner/item/parser/mapper/index.js` as `export { default as drawingInteractionMapper } from './drawing.js';`.

In order to map the parsed attributes to the component properties, the mapper has to export an object with a `mapProperties` method: 

```js
export default {
    mapProperties( properties = {} ) {
        //the DrawingInteraction component expects a background property
        if ( properties.object &&  properties.object.data) {
            properties.background = properties.object.data;
        }
        return properties;
    }

```

#### Choices

Some interactions contain a set of choices. Those choices are mapped directly to the interaction component as the property `choices`.
This property is a collection of objects, each one representing one choice.

```svelte
export let choices = [];
```

Choices attributes will be mapped directly to their respective object. 

A custom mapper can also be registered for each choice, by adding the method `mapChoiceProperties(choiceProperties = {})`.

If the choice has complex content, the choice has a _block tree_ entry.

#### Prompt

Interactions with a prompt will get a `prompt` property. It contains the _block tree_ for the prompt (prompts are always complex content). The property can be used directly with the `Prompt.svelte` component.

```svelte
<script>
    import Prompt from './Prompt.svelte';

    export let prompt;
</script>
{#if prompt}
    <Prompt blockTree={prompt} />
{/if}
```

### Shared vocabulary

The [shared vocabulary](https://www.imsglobal.org/spec/qti/v3p0/impl#h.q0bgy0kk6j43) is a set of CSS classes and data attributes used to preserve some presentation and behavioral consistency across systems. For example, the class `qti-input-control-hidden` is used on the choice interaction to hide controls like radio or checkbox.

#### Extract from classes

We often need to extract a value from the shared vocabulary classes. For example, the classes `qti-choices-stacking-4` is used to display the interaction choices over 4 columns. 

A helper is available to ease the class detection or to extract such values. For example,  

```js
import { hasClass, extractFromClasses } from '../util/attributes.js';

export let classes;

const hideControls = hasClass('qti-input-control-hidden');
const stacking = extractFromClasses(classes, 'qti-choices-stacking-', val => parseInt(val, 10));
```

#### Extract from data attributes

Some values in the shared vocabularies, like custom feedback messages, aren't provided as classes but as data attributes.

If they're defined, we have access to them through the `dataAttrs` property: 

```js
export let dataAttrs = {};

const qtiMaxChoicesMessage = dataAttrs['data-max-selections-message'];
const qtiMinChoicesMessage = dataAttrs['data-min-selections-message'];
```

### Handle the state and the responses

In order to handle the state of an interaction, each interaction has access to the interaction state store through the [itemsStateStore](./itemStateStore.md).

This store lets an interaction access a derived store, from the `itemIdentifier` and `responseIdentifier`.

```js
import { getInteractionStateStore } from '../../itemsStateStore.js';

const interactionStateStore = getInteractionStateStore(
    itemIdentifier, 
    responseIdentifier
);
```

Since it's a svelte store, we can observe store changes. The store proposes also convenience methods to read and write the state and responses.

Each interaction state is an object, that contains the responses under the `response` key: 
```js
{
    "response": {
        "base": {
            "identifier": [
                "Pathfinder"
            ]
        }
    }
}
```
So responses can be handled from that object but there are some helpers to let you read and write responses directly.


```js
$: selected = $interactionStateStore ? interactionStateStore.getResponseValue() : [];
```

#### Initial response

All interactions should do an initial response save during initialization. This shoule be an empty response and it should contain the correct validity. For example, if the response is required then the empty response is not valid, so it should be false.

```js
// do initial response definition
if (!interactionStateStore.hasResponse()) {
    interactionStateStore.setResponseValue(
        {
            cardinality,
            baseType,
            value: null
        },
        !required
    );
}
```

#### Validation

Validation is handled at the level of the interaction state, by setting a boolean value to the validity key: 


```js
{
    "response": {
        "base": {
            "identifier": [
                "Pathfinder"
            ]
        }
    },
    validity : true
}
```

Again, a helper lets you set the validity status: 

```js
interactionStateStore.setResponseValue({
      cardinality: 'single',
      baseType: 'string',
      value: 'some invalid value'
    },
    false //the validity
  );
```

#### Session Status

When an item has `closed` sessionStatus, it is displayed as dimmed and is no longer interactable (apart from keyboard focus, for screen readers). All of the interactions within this item will be put in `disabled` mode in this situation (or `readonly` if it is an input field or textarea, so they can still receive focus).
