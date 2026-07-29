import { PioneerClientNativeError, pioneerClient } from '@/client';
import type { ClientDiagnosticEvent } from '@/client';
import { reportError } from '@/services/error-reporting';
import { isSentryEnabled, Sentry } from '@/services/sentry';
import { redactAuthText } from '@/services/auth-redaction';

const FFI_PANIC_CODE = 'pioneer_client_ffi_panic';

const addClientBreadcrumb = (operation: string, message: string): void => {
    if (!isSentryEnabled) {
        return;
    }

    Sentry.addBreadcrumb({
        category: 'pioneer.client_ffi',
        level: 'info',
        message,
        data: {
            operation,
        },
    });
};

const addDiagnosticBreadcrumb = (event: ClientDiagnosticEvent): void => {
    if (!isSentryEnabled) {
        return;
    }

    Sentry.addBreadcrumb({
        category: 'pioneer.client_ffi',
        level: event.level === 'error' ? 'error' : 'info',
        message: redactAuthText(event.message),
        data: {
            code: event.code ?? null,
            operation: event.operation,
            sequence: event.sequence,
            unixMs: event.unix_ms,
        },
    });
};

const isFfiPanicError = (error: unknown): boolean => {
    return (
        error instanceof PioneerClientNativeError &&
        (error.code === FFI_PANIC_CODE || /^panic in pioneer client ffi:/i.test(error.message))
    );
};

const reportFfiPanic = (error: unknown, operation: string, event?: ClientDiagnosticEvent): void => {
    const reportedError = error instanceof Error ? new Error(redactAuthText(error.message)) : error;

    reportError(reportedError, 'Pioneer client FFI panic', {
        tags: {
            operation: event?.operation ?? operation,
            source: 'client-ffi',
        },
        extras: {
            code: event?.code ?? (error instanceof PioneerClientNativeError ? error.code : null),
            operation,
            sequence: event?.sequence ?? null,
            unixMs: event?.unix_ms ?? null,
        },
    });
};

const drainClientDiagnostics = (operation: string): ClientDiagnosticEvent[] => {
    try {
        return pioneerClient.diagnosticsDrain();
    } catch (error) {
        reportError(error, 'Failed to drain pioneer client diagnostics', {
            tags: {
                operation,
                source: 'client-ffi',
            },
        });
        return [];
    }
};

export const captureClientDiagnosticsOnError = async <T>(
    operation: string,
    task: () => Promise<T>,
): Promise<T> => {
    addClientBreadcrumb(operation, `${operation} started`);

    try {
        return await task();
    } catch (error) {
        const diagnostics = drainClientDiagnostics(operation);
        let reported = false;

        for (const event of diagnostics) {
            addDiagnosticBreadcrumb(event);
            if (event.code === FFI_PANIC_CODE) {
                reportFfiPanic(new Error(event.message), operation, event);
                reported = true;
            }
        }

        if (!reported && isFfiPanicError(error)) {
            reportFfiPanic(error, operation);
        }

        throw error;
    }
};
