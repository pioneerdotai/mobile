import { expect, jest, test } from '@jest/globals';
jest.mock('intl-pluralrules', () => ({}));
jest.mock('react-native-get-random-values', () => ({}));
jest.mock('../services/dev-warnings', () => ({}));
jest.mock('../services/telemetry/mobile-startup', () => ({}));
jest.mock('../../unistyles', () => ({}));
jest.mock('./native', () => ({
    pioneerClient: {
        clientScopedSnapshot: jest.fn(() => null),
    },
}));
jest.mock('expo-router/entry', () => {
    // With Metro inlineRequires the first selector runs before any lazily
    // imported Client export is used. Keep the real process binding here.
    const { mobileClientBinding } =
        jest.requireActual<typeof import('./mobile-client-binding')>('./mobile-client-binding');
    mobileClientBinding.scope({ kind: 'gateway_destinations' }).getSnapshot();
    return {};
});

test('app entry configures the process bridge before the router reads its first scope', () => {
    jest.isolateModules(() => {
        expect(() => jest.requireActual('../../index')).not.toThrow();
        const { pioneerClient } = jest.requireMock<typeof import('./native')>('./native');
        expect(pioneerClient.clientScopedSnapshot).toHaveBeenCalledWith({
            schema_version: 1,
            scope: { kind: 'gateway_destinations' },
            after_revision: null,
        });
    });
});
