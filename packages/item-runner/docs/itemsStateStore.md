<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

# Items State Store

[Writable Svelte store](https://Svelte.dev/docs#writable) to store states of all QTI items.

## Format

The store is a javascript object, where keys are item identifiers and values are states of the items.

```js
{
  [itemIdentifier]: itemStateStore { // key can be only itemIdentifier
    [responseIdentifier]: interactionStateStore {
      response: { // Mandatory! PCIResponse format.
        base: {
          integer: 0;
        }
      },
      validity: true, // Mandatory! Validity of response. Can be false, when the interaction respones is invalid.
      alreadyVisited: true // Any other interaction state can be stored here. This is an example only.
    },
    player: { // Any other QTI item state can be stored here. This is an example only.
      position: 0,
      muted: false,
      volume: 100
    }
  }
}
```

## Usage

This is the global state store of all items, so please be sure this level of the store is required for you with checking API of [item state store](#item-state-store) and [interaction state store](#interaction-state-store).

Most of the time, this store level should be used in tests, to clear store after test case, and during debugging.

```js
import itemsStateStore from 'itemsStateStore.js';
```

## API

The API covers the standard Svelte store API, so it can be used as a store (`$itemsStateStore`) in Svelte components.

### `clear()`

Clears store and state of all items.

# Item State store

[Writable Svelte store](https://Svelte.dev/docs#writable) to store state of a QTI Item.

## Format

The store is a javascript object, where keys are response identifiers and values are states of the interaction.

```js
{
  [responseIdentifier]: interactionStateStore {
    response: { // Mandatory! PCIResponse format.
      base: {
        integer: 0;
      }
    },
    validity: true, // Mandatory! Validity of response. Can be false, when the interaction respones is invalid.
    alreadyVisited: true // Any other interaction state can be stored here. This is an example only.
  },
  player: { // Any other QTI item state can be stored here. This is an example only.
    position: 0,
    muted: false,
    volume: 100
  }
}
```

## Usage

This is that level of the store, where all items state related data can be stored.

Most of the time, this store level should be used in runner, where item state related modifications and checks are happening.

```js
import { getItemStateStore } from 'itemsStateStore.js';
const itemStateStore = getItemStateStore(itemIdentifier);

// subscribe to changes in svelte component
$: itemState = $itemStateStore && itemStateStore.get();
$: itemResponses = $itemStateStore && itemStateStore.getItemResponses();

// subscribe to changes in vanilla js
itemStateStore.subscribe(state => {
  let itemState = itemStateStore.get();
  let itemResponses = itemStateStore.getResponses();
});
```

## API

The API covers the standard Svelte store API, so it can be used as a store (`$itemStateStore`) in Svelte components.

### `get()`

Returns with item state or empty object

 * **Returns:** `object` — item state

### `clear()`

Clears item state

### `getItemResponses()`

Returns with item responses

 * **Returns:** `object` — responses {responseIdentifier: response}

### `setItemResponses(responses)`

Update/append item responses with the provided responses

 * **Parameters:** `responses` — `object` — new responses {responseIdentifier: response}

### `getItemElementState(elementIdentifier)`

Return the state of an item element based on the provided identifier (item element can be an interaction, or a static element, or something else)

-   **Parameters:** `elementIdentifier` — `string` — element identifier (response identifier if interaction)
-   **Returns:** `object` — state of interaction

### `setItemElementState(elementIdentifier, state)`

Replaces the state of an item element with the provided state (item element can be an interaction, or a static element, or something else)

-   **Parameters:**
    -   `elementIdentifier` — `string` — element identifier (response identifier if interaction)
    -   `state` — `object` — new state of the interaction

### `hasInteractionResponse(responseIdentifier)`

Returns with the response existence of an interaction

 * **Parameters:** `responseIdentifier` — `string` — response identifier
 * **Returns:** `boolean` — response existence

### `getInteractionResponse(responseIdentifier)`

Returns with the response of an interaction

 * **Parameters:** `responseIdentifier` — `string` — response identifier
 * **Returns:** `object` — response of the interaction or empty object

### `setInteractionResponse(responseIdentifier, response, validity = true)`

Replaces the interaction response with the provided new response

 * **Parameters:**
   * `responseIdentifier` — `string` — response identifier
   * `response` — `object` — new response object
   * `[validity=true]` — `boolean` — defines interaction validity

### `getInteractionValidity(responseIdentifier)`

Request validity of interaction

 * **Parameters:** `responseIdentifier` — `string` — response identifier
 * **Returns:** `boolean` — validity of interaction

### `setInteractionValidity(responseIdentifier, validity)`

Replaces validity of interaction. BE CAREFUL: if validity is undefined, what is a falsy variable, will set validity to false

 * **Parameters:**
   * `responseIdentifier` — `string` — response identifier
   * `validity` — `boolean` — define interaction validity

# Interaction state store

[Writable Svelte store](https://Svelte.dev/docs#writable) to store state of an interaction in QTI Item.

## Format

The store is a javascript object, where `response` contains the PCIResponse JSON format and `validity` defines its validity.

```js
{
  response: { // Mandatory! PCIResponse format.
    base: {
      integer: 0;
    }
  },
  validity: true, // Mandatory! Validity of response. Can be false, when the interaction respones is invalid.
  alreadyVisited: true // Any other interaction state can be stored here. This is an example only.
}
```

## Usage

This is that level of the store, where all interactions state related data can be stored.

Most of the time, this store level should be used in interactions, where interaction response related modifications and checks are happening.

```js
import { getInteractionStateStore } from 'itemsStateStore.js';
const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

// load state and value in svelte component
$: state = $interactionStateStore && interactionStateStore.get();
$: value = $interactionStateStore && interactionStateStore.getResponseValue();

// save response
function saveResponse(e) {
  const newValue = e.target.value;
  const validity = someValidation(newValue);
  interactionStateStore.setResponseValue({
      cardinality: 'single',
      baseType: 'string',
      value: newValue
    },
    validity
  );
}

<input type="text" {value} on:input={saveResponse} />
```

## API

The API covers the standard Svelte store API, so it can be used as a store (`$interactionStateStore`) in Svelte components.

### `get()`

Returns with item state or empty object

 * **Returns:** `object` — item state

### `hasResponse()`

Returns with the response existence of an interaction.

 * **Returns:** `boolean` — response existence

### `getResponse()`

Returns with the response of an interaction. The response is in PCIResponse format.

 * **Returns:** `object` — response of the interaction or empty object

### `getResponseValue()`

Returns with the decoded response value of an interaction. The value is a simple value, it is already decoded from PCIResponse format.

 * **Returns:** `any` — decoded response value of an interaction

### `setResponse(response, validity = true)`

Replaces the interaction response with the provided new response

 * **Parameters:**
   * `response` — `object` — new response object
   * `[validity=true]` — `boolean` — defines interaction validity

### `setResponseValue(response, validity = true)`

Replaces the interaction response value with the provided new response value. The stored value will be encoded to PCIResponse format.

 * **Parameters:**
   * `response` — `object` — new response object
   * `response.cardinality` — `string` — cardinality of the response value
   * `response.baseType` — `string` — base type of the response value
   * `response.value` — `any` — response value
   * `[validity=true]` — `boolean` — defines interaction validity

### `getValidity()`

Request validity of interaction

 * **Returns:** `boolean` — validity of interaction

### `setValidity(validity)`

Set validity of interaction

 * **Parameters:** `validity` — `boolean` — define interaction validity
