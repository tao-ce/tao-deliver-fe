<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

# Non Interactive Elements

> How to handle a non interactive (or static) QTI element

## The Svelte component

To implement a new element, you'll need: 

1. A Svelte component in the directory `src/runner/static`, that matches the minimal API
2. Ensure the component is exported with the correct naming convention into `src/runner/static/index.js`

It's mandatory to export it in the `index.js` using the following convention: `${qtiClassName}Interaction`. 

For example, if we want to support the `<audio>` element: 
```js
export { default as AudioInteraction } from './Audio.svelte';
```

The item parser will try to find the matching Svelte component inside this file when an element is found.


### Base properties

Each element must expose the following exposed properties: 
 - `itemIdentifier`: the item unique identifier, used to access the item store or the context 
 - `attributes`: the list of the attributes of the tag

With our example, the component would look like: 
```svelte
<script>
    export let itemIdentifier;
    export let attributes = {};
</script>
<audio {...attributes}><slot /></audio>
```
