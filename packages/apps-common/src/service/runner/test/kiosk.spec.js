// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import kioskServiceFactory, { clearKioskServiceInstance } from '../kiosk.js';
import KioskError from '../../../core/error/KioskError.js';

function kioskServiceFactoryOnce(...args) {
    const f = kioskServiceFactory(...args);
    clearKioskServiceInstance();
    return f;
}

describe('kioskServiceFactory', () => {
    it('returns an api object', async () => {
        const f = kioskServiceFactoryOnce({ providerId: 'kiosked', minVersion: '11.22.33' });
        expect(typeof f.validateMinVersion).toBe('function');
        expect(typeof f.validateProcessDenyList).toBe('function');
        expect(typeof f.addBreachListener).toBe('function');
        expect(typeof f.removeBreachListener).toBe('function');
        expect(typeof f.exit).toBe('function');
    });

    it('throws if required parameters not passed', async () => {
        let ff = () => kioskServiceFactoryOnce({ providerId: 'foo', minVersion: '11.22.33' });
        expect(ff).toThrow();

        ff = () => kioskServiceFactoryOnce({ providerId: 'kiosked' });
        expect(ff).toThrow();
    });
});

describe('KioskED provider', () => {
    const providerId = 'kiosked';
    const ExpectedErrorClass = KioskError;

    const defaultDeviceInfo = { app: { version: '11.22.33' } };
    const defaultProcessDenyList = [
        { name: 'pr-a', label: 'Process A' },
        { name: 'pr-b', label: 'Process B' },
        { name: 'pr-c', label: 'Process C' }
    ];

    function mockKioskEdApi({ deviceInfo, processList }) {
        let callbacks = {};

        window.kiosked = {
            _triggerEvent: (ename, payload) => {
                callbacks[ename]?.(payload);
            },
            getDeviceInfo: vi.fn().mockImplementation(() => Promise.resolve(deviceInfo)),
            getProcessList: vi.fn().mockImplementation(() => Promise.resolve(processList)),
            exit: vi.fn(),
            addEventListener: vi.fn().mockImplementation((ename, cb) => {
                callbacks[ename] = cb;
            }),
            removeEventListener: vi.fn().mockImplementation(ename => {
                delete callbacks[ename];
            })
        };
        return window.kiosked;
    }

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        delete window.kiosked;
    });

    it('validates that window.kiosked exists', async () => {
        delete window.kiosked;
        const f = kioskServiceFactoryOnce({ providerId, minVersion: '11.22.33' });
        await expect(f.validateMinVersion()).rejects.toThrow(ExpectedErrorClass);
    });

    it('validates minVersion', async () => {
        const ff = () => kioskServiceFactoryOnce({ providerId, minVersion: '11.22.33' });

        //api doesn't have getDeviceInfo method
        mockKioskEdApi({ deviceInfo: { app: { version: '11.22.33' } } });
        delete window.kiosked.getDeviceInfo;
        await expect(ff().validateMinVersion()).rejects.toThrow(ExpectedErrorClass);

        // api returns no version
        mockKioskEdApi({ deviceInfo: { app: { version: null } } });
        await expect(ff().validateMinVersion()).rejects.toThrow(ExpectedErrorClass);
        mockKioskEdApi({ deviceInfo: { foo: 'bar' } });
        await expect(ff().validateMinVersion()).rejects.toThrow(ExpectedErrorClass);
        mockKioskEdApi({ deviceInfo: null });
        await expect(ff().validateMinVersion()).rejects.toThrow(ExpectedErrorClass);

        //api returns lower version
        mockKioskEdApi({ deviceInfo: { app: { version: '11.22.32' } } });
        await expect(ff().validateMinVersion()).rejects.toThrow(ExpectedErrorClass);

        //api returns equal verion
        mockKioskEdApi({ deviceInfo: { app: { version: '11.22.33' } } });
        await expect(ff().validateMinVersion()).resolves.not.toThrowError();

        //api returns higher version
        mockKioskEdApi({ deviceInfo: { app: { version: '11.22.34' } } });
        await expect(ff().validateMinVersion()).resolves.not.toThrowError();
    });

    it('validates minVersion: timeout case', async () => {
        //api doesn't return (callback is never executed)
        mockKioskEdApi({ deviceInfo: defaultDeviceInfo });
        window.kiosked.getDeviceInfo = () => new Promise(() => {});

        const f = kioskServiceFactoryOnce({ providerId, minVersion: '11.22.33' });
        const promise = f.validateMinVersion();
        vi.advanceTimersByTime(6000);
        await expect(promise).rejects.toThrow(ExpectedErrorClass);
    });

    it('validates processDenyList', async () => {
        const ff = processDenyList => kioskServiceFactoryOnce({ providerId, minVersion: '11.22.33', processDenyList });
        const mockApi = processList => mockKioskEdApi({ deviceInfo: defaultDeviceInfo, processList });

        // processDenyList is not defined
        mockApi(['pr-b', 'pr-c', 'pr-d']);
        await expect(ff(void 0).validateProcessDenyList()).resolves.not.toThrowError();

        // processDenyList is empty
        mockApi(['pr-b', 'pr-c', 'pr-d']);
        await expect(ff([]).validateProcessDenyList()).resolves.not.toThrowError();

        // api doesn't have getProcessList method
        mockApi(['pr-b', 'pr-c', 'pr-d']);
        delete window.kiosked.getProcessList;
        await expect(ff(defaultProcessDenyList).validateProcessDenyList()).rejects.toThrow(ExpectedErrorClass);

        // api returns no running processes
        mockApi([]);
        await expect(ff(defaultProcessDenyList).validateProcessDenyList()).resolves.not.toThrowError();

        // api returns no processes matching processDenyList
        mockApi(['pr-d', 'pr-e']);
        await expect(ff(defaultProcessDenyList).validateProcessDenyList()).resolves.not.toThrowError();

        // api returns some processes matching processDenyList
        mockApi(['pr-b', 'pr-c', 'pr-d']);
        let err;
        try {
            await ff(defaultProcessDenyList).validateProcessDenyList();
        } catch (e) {
            err = e;
        }
        expect(err instanceof ExpectedErrorClass).toBe(true);
        expect(err.denyProcesses).toEqual([
            { name: 'pr-b', label: 'Process B' },
            { name: 'pr-c', label: 'Process C' }
        ]);
    });

    it('default provider is "kiosked"; "exit" calls api method', async () => {
        mockKioskEdApi({});
        const f = kioskServiceFactoryOnce({ providerId: void 0, minVersion: '11.22.33' });
        f.exit();
        expect(window.kiosked.exit).toHaveBeenCalled();
    });

    it('addBreachListener adds breach event listener, removeBreachListener removes it', async () => {
        const mockApi = () => mockKioskEdApi({ deviceInfo: defaultDeviceInfo, processList: ['pr-a', 'pr-b'] });
        const onBreach = vi.fn();
        const breachEvent = { preventDefault: vi.fn() };

        const providerApi = mockApi();
        const f = kioskServiceFactoryOnce({ providerId: void 0, minVersion: '11.22.33' });

        f.addBreachListener(onBreach);
        providerApi._triggerEvent('breach', breachEvent);

        await vi.waitFor(() => {
            expect(onBreach).toHaveBeenCalledWith({ deviceInfo: defaultDeviceInfo, processList: ['pr-a', 'pr-b'] });
            expect(breachEvent.preventDefault).toHaveBeenCalled();
            onBreach.mockClear();
        });

        f.removeBreachListener();
        providerApi._triggerEvent('breach', breachEvent);
        expect(onBreach).not.toHaveBeenCalled();
    });
});
