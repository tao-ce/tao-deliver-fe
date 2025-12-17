// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

//eslint-disable-next-line
define('counterFactory', [], function () {
    return (dom, { step, initial = 0 }, dispatchInteractiontrace) => {
        const increaseButton = dom.querySelector('.increase');
        const decreaseButton = dom.querySelector('.decrease');
        const valueContainer = dom.querySelector('.valueContainer');

        let handleIncrease;
        let handleDecrease;

        const counter = {
            value: initial,
            getValue() {
                return counter.value;
            },
            destroy() {
                increaseButton.removeEventListener('click', handleIncrease);
                decreaseButton.removeEventListener('click', handleDecrease);
            },
            increase() {
                this.value += step;
                this.updateValueContainer();
                dispatchInteractiontrace({
                    domEventType: 'click',
                    action: 'increase',
                    newValue: this.value
                });
            },
            decrease() {
                this.value -= step;
                this.updateValueContainer();
                dispatchInteractiontrace({
                    domEventType: 'click',
                    action: 'decrease',
                    newValue: this.value
                });
            },
            updateValueContainer() {
                valueContainer.innerHTML = ` ${this.value} `;
            }
        };

        handleIncrease = counter.increase.bind(counter);
        handleDecrease = counter.decrease.bind(counter);

        increaseButton.addEventListener('click', handleIncrease);
        decreaseButton.addEventListener('click', handleDecrease);

        counter.updateValueContainer();

        return {
            getValue: counter.getValue,
            destroy: counter.destroy
        };
    };
});

//eslint-disable-next-line
define(['qtiCustomInteractionContext', 'counterFactory'], function (qtiInteractionContext, counterFactory) {
    qtiInteractionContext.register({
        get typeIdentifier() {
            return 'demoPCI';
        },
        getInstance(dom, { properties, boundTo, onready }) {
            let responseIdentifier = Object.keys(boundTo)[0];
            let response = boundTo[responseIdentifier] || {};
            let value = response.base || {};
            let initial = typeof value.integer === 'number' ? value.integer : properties.initial;
            const dispatchInteractiontrace = detail => {
                dom.dispatchEvent(
                    new CustomEvent('interactiontrace', {
                        bubbles: true,
                        detail
                    })
                );
            };
            const counter = counterFactory(dom, {...properties, initial}, dispatchInteractiontrace);
            onready({
                getResponse() {
                    return {
                        base: {
                            integer: counter.getValue()
                        }
                    };
                },
                getState() {},
                oncompleted: () => {
                    counter.destroy();
                }
            });
        }
    });
});
