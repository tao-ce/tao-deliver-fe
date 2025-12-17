<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

# Testing

## Unit testing with Vitest

All packages of the repository use [Vitest](https://vitest.dev/) as a unit test runner (previously they used Jest, migration was done in July 2025).

### Structure

Tests specifications are located inside packages. Each specification is defined close to its target, under a `test` folder.

For example the specification of `packages/item-runner/src/runner/item/Item.svelte` is located at `packages/item-runner/src/runner/item/test/Item.spec.js`.

Snapshots are under a `__snapshots__` folder, as sibling of the specification.

### Configuration

The configuration is shared for all packages at the repository root:

-   `vitest.config.js`: the main configuration.
-   `vitest.setup.js`: additional setup and shared mocks.
-   `.nycrc.json`: configuration of the coverage reporter & instrumenter.

### Running jest

To run all tests:

```sh
npm test
```

To run tests for a given package:

```sh
npx lerna run test --scope <package>
```

### Code coverage

To collect code coverage for all packages:

```sh
npm run test:cov
```

Then the coverage data needs to be merged and aggregated

```sh
npm run test:cov:build
```

Report can be generated from the merged coverage data:

```sh
npm run coverage:html
npm run coverage:clover
```

The script `test:cov:html` let's you run all the steps from the tests to the HTML report.

```sh
npm run test:cov:html
```

## End-to-end testing with Cypress

End-to-end tests runs with [cypress](https://www.cypress.io/)

### Structure

The file `cypress.json` contains the main configuration.
All tests suites and data are located under the `cypress/` folder.

### Configuration

Main cypress configuration is available in the `cypress.json` file.
Environments files needs to be created according to the expected test run. Samples files are available at `cypress/envs/`.

### Running cypress

To run the configured test suite:

```sh
npm run cy:open
```

To run it headless:

```sh
npm run cy:open
```

See the [detailed documentation](./cypress/README.md)
