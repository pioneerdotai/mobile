import { expect, jest, test } from '@jest/globals';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

const events: string[] = [];
let initialized = false;
const hydrate = jest.fn(async () => {
    expect(initialized).toBe(true);
    events.push('hydrate');
});
const readGateway = jest.fn(() => {
    if (!initialized) throw new Error('Client read before native initialization');
    return { hydrate };
});

// Render the real root layout while fonts are pending. Child screens should
// not mount yet, and no selector may run before the native bootstrap effect.
for (const name of [
    '@/components/navigation/semantic-navigation',
    'react-native-reanimated',
    'react-native-gesture-handler',
    '@tanstack/react-query',
    'expo-system-ui',
    'react-native-keyboard-controller',
    'expo-router/js-stack',
    'react-native-edge-to-edge',
    '@/hooks/use-gateway-session',
    '@/hooks/use-thread-tree',
    '@/hooks/use-workspace',
    '@/hooks/use-screen',
    '@gorhom/bottom-sheet',
    '@/components/overlays/gateway',
    '@/components/overlays/workspace',
    '@/components/overlays/composer-attachments',
    '@/components/overlays/thread-mode',
    '@/components/overlays/thread-permission',
    '@/components/gateway/session-terminal-navigation',
    '@/services/query/client',
    '@/services/voice-input/data-source',
    '@/services/tasks/user-notifications',
    '@/services/telemetry/mobile-startup-readiness',
    '@/hooks/use-administration-capabilities',
    '@/stores/active-thread',
    '@/stores/gateway',
    '@/stores/thread-tree',
    '@/stores/workspace',
])
    jest.doMock(name, () => ({}));
jest.doMock('expo-font', () => ({ useFonts: () => [false, null] }));
jest.doMock('expo-file-system', () => ({ Paths: { cache: { uri: 'file:///cache/' } } }));
jest.doMock('react-native-unistyles', () => ({ StyleSheet: { create: () => ({}) } }));
jest.doMock('@/locale/i18n', () => ({ t: (key: string) => key }));
jest.doMock('@/services/sentry', () => ({ initializeSentry: jest.fn(), isSentryEnabled: false }));
jest.doMock('@/services/app-splash', () => ({ preventAppSplashAutoHide: jest.fn() }));
jest.doMock('@/services/telemetry/mobile-startup', () => ({
    mobileStartup: { begin: jest.fn(), succeed: jest.fn(), fail: jest.fn() },
}));
jest.doMock('@/client', () => ({
    pioneerClient: {
        initialize: jest.fn(() => {
            initialized = true;
            events.push('initialize');
        }),
    },
}));
jest.doMock('@/client/onboarding', () => ({ hydrateOnboarding: hydrate }));
jest.doMock('@/hooks/use-gateway', () => ({ useGateway: readGateway }));
jest.doMock('@/services/gateway/platform-effects', () => ({
    initializeMobilePlatformEffects: () => {
        expect(initialized).toBe(true);
        events.push('effects');
    },
}));

test('root initializes native Client before effects, hydration, or gateway selectors', async () => {
    const RootLayout =
        jest.requireActual<typeof import('../routes/_layout')>('../routes/_layout').default;
    let root: renderer.ReactTestRenderer;
    await act(async () => {
        root = renderer.create(<RootLayout />);
    });
    expect(events).toEqual(['initialize', 'effects', 'hydrate']);
    expect(readGateway).not.toHaveBeenCalled();
    expect(hydrate).toHaveBeenCalledTimes(1);
    await act(async () => root!.unmount());
});
