<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

# Operating tao-deliver-fe

## npm scripts

Those top level npm scripts are available:

| Command                           | Description                                                                 | Targets                                         |
| --------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| `npm run build`                   | Generates all bundles.                                                      | All packages.                                   |
| `npm run build:app`               | Generates the bundle for the main application.                              | `deliver-app`                                   |
| `npm run build:report`            | Generates all bundles, with a report to analyze bundles.                    | All packages.                                   |
| `npm run dev:app`                 | Run the deliver application, in development mode (`watch`).                 | Watch all packages but build from `deliver-app` |
| `npm run dev:sandboxes`           | Run the sandboxes applications, in development mode (`watch`).              | `item-runner` and `test-runner`                 |
| `npm run dev:sandbox:item-runner` | Run the item runner sandbox, in development mode (`watch`).                 | `item-runner`                                   |
| `npm run dev:sandbox:test-runner` | Run the test runner sandbox, in development mode (`watch`).                 | `test-runner`                                   |
| `npm run cy:open`                 | Run the e2e test suites with the Cypress app.                               |                                                 |
| `npm run cy:run`                  | Run the e2e test suites, headless.                                          |                                                 |
| `npm test`                        | Run the unit test suites.                                                   | All packages.                                   |
| `npm test:cov`                    | Run the unit test suites and generate coverage data.                        | All packages.                                   |
| `npm test:cov:ci`                 | Run the unit test suites, optimized for CI envs and generate coverage data. | All packages.                                   |
| `npm coverage:build`              | Merge coverage data from all packages.                                      | All packages.                                   |
| `npm coverage:html`               | Generates the HTML coverage report, from the merged coverage.               | All packages.                                   |
| `npm coverage:html`               | Generates the Clover coverage report, from the merged coverage.             | All packages.                                   |
| `npm run lint`                    | Run eslint on sources.                                                      | All packages and tests.                         |
| `npm run lint:report`             | Run eslint on sources and generate a report.                                | All packages and tests.                         |

## Run any commands

This repository is managed by [lerna](https://github.com/lerna/lerna), which can be used to run

### On the top level repo

Any shared tool, is available, as usual from the root of the repository. For example, you can run `eslint`, `prettier` or `jest` directly from the repository root.
To run Prettier on all config files:

```sh
npx prettier  *.config.js
```

### On packages

To run a command in a package, lerna proposes 2 commands: `run` and `exec`

#### `lerna exec`

`lerna exec` will run any `command` on one, multiple, or all packages.

For example, to run `git diff` on the rollup config, on the item runner:

```sh
npx lerna exec --scope @oat-sa-private/tao-item-runner-qtinui --stream --no-prefix -- git diff rollup.config.js
```

To run it on the test and item runner:

```sh
npx lerna exec --scope '@oat-sa-private/tao-*-runner-qtinui' --stream -- git diff rollup.config.js
```

To run it on all packages:

```sh
npx lerna exec --stream -- git diff rollup.config.js
```

Please see the [lerna exec documentation](https://github.com/lerna/lerna/tree/main/commands/exec#readme)

#### `lerna run`

`lerna run` will run an `npm script` on one, multiple, or all packages.

For example, to run the `npm run lint` script on the item runner:

```sh
npx lerna run lint --scope @oat-sa-private/tao-item-runner-qtinui --stream --no-prefix
```

To run it on the test and item runner:

```sh
npx lerna run lint --scope '@oat-sa-private/tao-*-runner-qtinui' --stream
```

To run it on all packages:

```sh
npx lerna run lint --stream
```

Please see the [lerna run documentation](https://github.com/lerna/lerna/tree/main/commands/run#readme)

## Development

### Dependency management

The dependencies in the project are organized as:

-   in the root repository
    -   all `devDependencies`.
    -   a few shared `dependencies` like the packages of the design system. But this is an exception.
-   Each package contains it's own `dependencies`
-   Dependencies between packages must not be updated manually. For example, the version of `@oat-sa-private/tao-test-runner-qtinui` in `deliver-app` shouldn't be updated manually. During development those dependencies are linked internally by `lerna`. When releasing, the version number will be update by `lerna`.
-   Version of the packages' direct dependencies must be updated manually. The `package-lock.json` might need to be updated as well. If running `npm i` from the root doesn't update the `package-lock.json` you may need to run `npx lerna bootstrap --no-ci`.
