export const CLI_RUNTIME_PROVIDER_PREFIX = 'cli_runtime:';

export const cliRuntimeProviderKey = (runtimeId: string): string =>
    `${CLI_RUNTIME_PROVIDER_PREFIX}${runtimeId}`;

export const runtimeIdFromCliRuntimeProviderKey = (provider: string | null | undefined) => {
    const value = provider?.trim();

    if (!value?.startsWith(CLI_RUNTIME_PROVIDER_PREFIX)) {
        return null;
    }

    const runtimeId = value.slice(CLI_RUNTIME_PROVIDER_PREFIX.length).trim();

    return runtimeId.length > 0 ? runtimeId : null;
};

export const isCliRuntimeProvider = (provider: string | null | undefined): boolean =>
    runtimeIdFromCliRuntimeProviderKey(provider) !== null;
