<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

# Feedback modes for validated inputs

## Standard constraint validation

The following lists describe the behaviours of validated input feedbacks under different conditions.

### Default mode (no existing component yet)

- applies `required` prop
- applies `maxlength` & `minlength` props
- applies `pattern` & `patternMessage` props
- error icon shows whenever state is invalid
- multiple valid and invalid feedbacks can display (when focused)

### Inline mode (`<Input feedback="inline">`)

- applies `pattern` & `patternMessage` props
- error icon shows whenever state is invalid (after first blur)
- multiple valid and invalid feedbacks can display (when focused)
- input also has "answered" border state
- valid/invalid is shown per-message with a tick (during first try)
- valid/invalid is shown per-message with a tick + blue/red (after first blur)

### Inline custom (`<Input feedback="inline">`) (no custom patternMessage)

- applies `pattern` prop
- error icon shows whenever state is invalid (after first blur)
- 1 invalid red feedback can display (when focused)
- implemented in Input by setting `showValidFeedback = false` when no `patternMessage`
- input also has "answered" border state

## Custom validity

When we need to override an input's internal validity from the outside, we can pass back a `customValidity` prop. This tells the input validation

> "even if all other constraints are valid, we want the input to display invalid feedback"

The prop format is:

```js
customValidity = {
    msg: 'Invalid value.',
    valid: false
}
```
