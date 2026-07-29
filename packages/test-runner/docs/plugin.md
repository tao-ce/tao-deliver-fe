<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

# Test Runner plugin

> How to add a plugin

## The plugin

A test runner plugin lets you add some feature and behavior to the test runner. It hooks on the test runner lifecycle. It has the specificity to be activated/deactivated from the configuration, so it offers a good candidate to implement flexible features.

The test runner plugin needs to follow the [plugin API](https://github.com/oat-sa/tao-core-sdk-fe/blob/master/src/core/plugin.js).

In this provider the plugins are located in `src/runner/plugins` and to expose them they can be exported in `src/runner/plugins/index.js`.

The plugin has to provide at least a name and an `init` method.

If we want to create a "red button" plugin, we can create it in `src/runner/plugins/tools/redbutton/plugin.js`

```js
import pluginFactory from 'taoTests/runner/plugin.js';

export default pluginFactory({

    name: 'redButton',

    init(){
        //mandatory
    }
});
```

And export it in `src/runner/plugins/index.js`:

```js
export { default as redButtonPlugin } from './tools/redButton/plugin.js';
```

It will be available in the sandbox.

## With Svelte

In order to use Svelte components in plugins we have to follow some lifecycle constraints (because the TestLayout is ready only once the test runner is initialized). So we mount the component when the plugin renders and attach it to areas using the `areaBroker`:

```js
import { mount, unmount } from 'svelte';
import RedButton from './RedButton.svelte';
import pluginFactory from 'taoTests/runner/plugin.js';

export default pluginFactory({

    name: 'redButton',

    init(){
        //mandatory
    },

    render(){
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        const serviceCallId = testConfig.serviceCallId;

        this.redButton = mount(RedButton, {
            target : areaBroker.getContentArea(),
            props : {
                serviceCallId
            }
        });

        this.redButton.$on('click', function() {
            testRunner.destroy();
        });
    },

    destroy(){
        if (this.redButton) {
            unmount(this.redButton);
        }
    }
});
```
