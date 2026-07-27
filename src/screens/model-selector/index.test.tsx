import { describe, expect, it, jest } from '@jest/globals';

import type { CliRuntimeMcpReadinessReason } from '@/services/providers/cli-runtime';
import type { ModelSelectorProvider } from '@/services/providers/model-selector';

import { providerMcpReadinessTranslationKey } from './index';

jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: (styles: unknown) => styles },
    useUnistyles: () => ({ theme: {} }),
}));
jest.mock('@/components/feedback/spinner', () => () => null);
jest.mock('@/client', () => ({}));
jest.mock('lucide-react-native', () => ({
    ChevronRight: () => null,
}));
jest.mock('@/hooks/use-provider-model-display-name', () => ({
    useProviderDisplayName: () => ({ label: null, loading: false }),
    useProviderModelDisplayName: () => ({ label: null, loading: false }),
}));

const provider = (reason: CliRuntimeMcpReadinessReason | null): ModelSelectorProvider => ({
    id: 'cli_runtime:codex',
    label: 'Codex',
    kind: 'cliRuntime',
    capabilityTarget: {
        kind: 'cli',
        supports_skills: true,
        supports_mcp_tools: false,
    },
    mcpReadinessReason: reason,
});

describe('model selector MCP readiness presentation', () => {
    const cases: readonly (readonly [CliRuntimeMcpReadinessReason, string])[] = [
        ['runtimeNotReady', 'modelSelectorMcpRuntimeNotReady'],
        ['unsupportedContract', 'modelSelectorMcpUnsupportedContract'],
        ['strictIsolationFailed', 'modelSelectorMcpStrictIsolationFailed'],
        ['helperSelfProbeFailed', 'modelSelectorMcpHelperSelfProbeFailed'],
        ['platformIpcUnavailable', 'modelSelectorMcpPlatformIpcUnavailable'],
        ['continuityUnavailable', 'modelSelectorMcpContinuityUnavailable'],
        ['readinessUnavailable', 'modelSelectorMcpReadinessUnavailable'],
    ];

    it.each(cases)('renders %s through safe localized copy', (reason, expectedKey) => {
        expect(providerMcpReadinessTranslationKey(provider(reason))).toBe(expectedKey);
    });

    it('renders no runtime-readiness row for MCP-capable or API providers', () => {
        expect(providerMcpReadinessTranslationKey(provider(null))).toBeNull();
        expect(
            providerMcpReadinessTranslationKey({
                ...provider(null),
                id: 'openai',
                kind: 'api',
                capabilityTarget: {
                    kind: 'native',
                    supports_skills: true,
                    supports_mcp_tools: true,
                },
            }),
        ).toBeNull();
    });
});
