<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

# Item Session Lifecycle

The different status an item can exist in are defined in [itemSessionStatus.js](../src/runner/itemSessionStatus.js). The status mirror the [QTI Item Session Lifecycle](https://www.imsglobal.org/question/qtiv2p2p2/QTIv2p2p2-ASI-InformationModelv1p0/imsqtiv2p2p2_asi_v1p0_InfoModelv1p0.html#Lifecycle).

_Reminder:_

```js
{
    initial: 'initial',
    interacting: 'interacting',
    suspended: 'suspended',
    closed: 'closed',
    modalFeedback: 'modal feedback',
    review: 'review',
    solution: 'solution'
}
```

## Initial

The item is still loading, or not yet ready to be used.

## Interacting

The test-taker can interact with the item.

## Suspended

Can occur between multiple `interacting` sessions on the same item.

## Closed

The test-taker may no longer interact with the item, generally because it has been answered and left (in a linear test), submitted in a previous test part, or because all allowed attempts have been consumed.

## ModalFeedback

The item is displaying modal feedback to the test-taker, therefore can't be resumed until an action is taken.

## Review

Can be used if the item is in review mode (**not implemented**).

## Solution

Can be used if the item solution is being shown (**not implemented**).
