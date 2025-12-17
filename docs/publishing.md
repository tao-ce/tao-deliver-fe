<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

# Release and publishing

Requirements:

-   the last version of [taoRelease](https://www.npmjs.com/package/@oat-sa/tao-extension-release): `npm i -g @oat-sa/tao-extension-release`, configured with a github token.
-   an npm account with publishing permissions

Process:

Run the release tool, from the repository root.

Monthly release example:
`taoRelease npmReleaseMonorepo --base-branch <release-YYYY-MM> --release-branch main --release-tag <YYYY.MM> --conventional-bump-type minor`.<br>

NB! For monthly release, don't forget to manually merge `main` to `develop` afterwards.

Version bump options, for packages:
- `--conventional-bump-type minor`
  -  `1.2.3` -> `1.3.0` for all packages
- `--conventional-bump-type patch`
  -  `1.2.3` -> `1.2.4` for all packages
- `--conventional-bump-type none`
  - will not update version. Manually update versions in the PR opened by the release tool.
- without `--conventional-bump-type` option
  - will calculate from conventional commits

Manual version bump for packages: `npx lerna version --no-git-tag-version`. After this command fix identation with: `npx prettier --write 'packages/**/package-lock.json'`

Release without publishing: `taoRelease npmReleaseMonorepo <other args> --no-publish`.

Manual publish: `npx lerna publish from-package`
