<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

# Troubleshooting

## JavaScript heap size

If you encounter one of the following errors:

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

or

```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

This is most likely due a memory leak in lerna `stream` or to the huge number of files watched or build.
Increasing the heap size to 2, 4 or even 8GB can workaround the problem.

- On windows:

```sh
 $env:NODE_OPTIONS="--max-old-space-size=8192"
```

- On Linux and OSX:

```sh
export NODE_OPTIONS=--max-old-space-size=8192
```

## Screwed dependencies

When linking external packages, or updating manually node modules, it's possible to have the wrong modules loaded. Cleaning up completely all packages' modules often solves the problem:

```sh
npx lerna clean
npm ci
```
