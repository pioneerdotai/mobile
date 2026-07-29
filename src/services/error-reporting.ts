import { isSentryEnabled, Sentry } from '@/services/sentry';
import { redactAuthText, redactAuthValue } from '@/services/auth-redaction';

type ErrorMetadata = {
    extras?: Record<string, unknown>;
    tags?: Record<string, string>;
};

const toError = (error: unknown, context: string): Error => {
    if (error instanceof Error) {
        const redacted = new Error(redactAuthText(error.message));
        redacted.name = error.name;
        return redacted;
    }

    if (typeof error === 'string' && error.trim().length > 0) {
        return new Error(redactAuthText(`${context} ${error}`));
    }

    return new Error(context);
};

export const reportError = (
    error: unknown,
    context: string,
    metadata: ErrorMetadata = {},
): void => {
    const safeError = redactAuthValue(error);
    const safeContext = redactAuthText(context);
    const safeExtras = redactAuthValue(metadata.extras ?? {}) as Record<string, unknown>;
    if (__DEV__ || !isSentryEnabled) {
        if (metadata.extras) {
            console.error(safeContext, {
                error: safeError,
                ...safeExtras,
            });
            return;
        }

        console.error(safeContext, safeError);
        return;
    }

    Sentry.withScope((scope) => {
        scope.setExtra('errorContext', safeContext);

        for (const [key, value] of Object.entries(safeExtras)) {
            scope.setExtra(key, value);
        }

        for (const [key, value] of Object.entries(metadata.tags ?? {})) {
            scope.setTag(key, value);
        }

        if (!(safeError instanceof Error)) {
            scope.setExtra('errorValue', safeError);
        }

        Sentry.captureException(toError(safeError, safeContext));
    });
};

export const runInBackground = (
    task: Promise<unknown> | (() => Promise<unknown> | unknown),
    context: string,
): void => {
    try {
        const result = typeof task === 'function' ? task() : task;

        if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
            void Promise.resolve(result).catch((error) => {
                reportError(error, context);
            });
        }
    } catch (error) {
        reportError(error, context);
    }
};
