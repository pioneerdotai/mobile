import Constants from 'expo-constants';

export type PioneerAppUrlScheme = 'pioneer' | 'pioneer-dev';
export type PioneerAppUrlTarget = 'activate' | 'invite';

const isPioneerAppUrlScheme = (value: unknown): value is PioneerAppUrlScheme =>
    value === 'pioneer' || value === 'pioneer-dev';

const configuredScheme = Constants.expoConfig?.extra?.appUrlScheme;

export const PIONEER_APP_URL_SCHEME: PioneerAppUrlScheme = isPioneerAppUrlScheme(configuredScheme)
    ? configuredScheme
    : __DEV__
      ? 'pioneer-dev'
      : 'pioneer';

export const isPioneerAppUrl = (
    value: string | null,
    target: PioneerAppUrlTarget,
): value is string => {
    if (!value) {
        return false;
    }
    try {
        const parsed = new URL(value);
        return (
            parsed.protocol === `${PIONEER_APP_URL_SCHEME}:` &&
            parsed.hostname === target &&
            (parsed.pathname === '' || parsed.pathname === '/')
        );
    } catch {
        return false;
    }
};
