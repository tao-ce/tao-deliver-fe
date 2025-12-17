// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// eslint-disable-next-line
define(['qtiCustomInteractionContext'], function (qtiInteractionContext) {
    const template = `
        <div>
            <h2>Navigate helper</h2>
            ${['previous', 'next']
                .map(direction =>
                    ['test', 'testPart', 'section', 'item']
                        .map(
                            scope =>
                                `<button data-event="navigate" data-direction="${direction}" data-scope="${scope}">${direction} ${scope}</button>`
                        )
                        .join(' ')
                )
                .join('<br>')}
        </div>

        <div>
            <h2>Disable navigation</h2>
            ${['disable', 'enable']
                .map(
                    action => `
                        <button data-event="${action}Navigation">${action} navigation</button>
                        <button data-event="${action}Navigation" data-direction="previous">${action} navigation previous</button>
                        <button data-event="${action}Navigation" data-direction="next">${action} navigation next</button>
                    `
                )
                .join('<br>')}
        </div>

        <div>
            <h2>Navigation listen</h2>
            <button data-event="navigation">Listen on navigation</button>
        </div>
    `;

    qtiInteractionContext.register({
        get typeIdentifier() {
            return 'navigationHelperTestPCI';
        },
        getInstance(dom, { onready }) {
            dom.innerHTML = template;



            const onClick = e => {
                const { event, direction, scope } = e.target.dataset;

                if (event === 'navigation') {
                    e.srcElement.disabled = true;
                    dom.addEventListener('navigation', navigationEvent => {
                        // eslint-disable-next-line no-alert
                        if (confirm('Should navigation be blocked?') === true) {
                            navigationEvent.preventDefault();
                        }
                    });
                } else {
                    dom.dispatchEvent(new CustomEvent(event, { detail: { direction, scope }, bubbles: true }));
                }
            };

            dom.addEventListener('click', onClick);

            onready({
                getResponse() {
                    return {
                        base: null
                    };
                },
                getState() {},
                oncompleted: () => {
                    dom.removeEventListener('click', onClick);
                }
            });
        }
    });
});
