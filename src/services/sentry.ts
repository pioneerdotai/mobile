import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { redactAuthValue } from '@/services/auth-redaction';

type SentryExtra = {
    dsn?: string | null;
    environment?: string | null;
    release?: string | null;
};

type ExpoExtra = {
    sentry?: SentryExtra;
};

const normalizeConfigValue = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
const sentryConfig = extra.sentry ?? {};

const sentryDsn = normalizeConfigValue(sentryConfig.dsn);
const sentryEnvironment = normalizeConfigValue(sentryConfig.environment);
const sentryRelease = normalizeConfigValue(sentryConfig.release);

let sentryInitialized = false;

export const isSentryEnabled = !!sentryDsn;

export const initializeSentry = (): void => {
    if (!sentryDsn || sentryInitialized) {
        return;
    }

    sentryInitialized = true;

    Sentry.init({
        dsn: sentryDsn,
        ...(sentryEnvironment ? { environment: sentryEnvironment } : {}),
        ...(sentryRelease ? { release: sentryRelease } : {}),
        enableAutoSessionTracking: true,
        enableNativeCrashHandling: true,
        sendDefaultPii: false,
        beforeSend: (event) => redactAuthValue(event) as typeof event,
        beforeBreadcrumb: (breadcrumb) => redactAuthValue(breadcrumb) as typeof breadcrumb,
    });
};

export { Sentry };
