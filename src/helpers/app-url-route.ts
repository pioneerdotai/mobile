import * as Linking from 'expo-linking';
import { router } from 'expo-router';

/**
 * Removes a deep-link payload from Expo Router's current route without
 * replacing the screen. Replacing a route during a cold start unmounts it
 * after the native initial URL has already been cleared, which loses the
 * one-time credential before it can be parsed.
 */
export const sanitizePioneerAppUrlRoute = (...parameterNames: string[]): void => {
    const params: Record<string, undefined> = { '#': undefined };
    for (const parameterName of parameterNames) {
        params[parameterName] = undefined;
    }

    router.setParams(params);
    Linking.clearInitialURL();
};
