import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ProviderModelInfo, ReasoningEffortRowsRequest, RuntimeSummary } from '@/client';
import { pioneerClient } from '@/client';

import {
    listProviders,
    listProviderModels,
    reasoningEffortDisplayLabelForModel,
    reasoningEffortRowsForModel,
    resolveSelectedProviderModel,
} from './model-selector';
import { refreshCliRuntimeSummaries } from './cli-runtime-live';

jest.mock('@/client', () => ({
    pioneerClient: {
        cliRuntimeListModels: jest.fn(),
        composerCapabilityTarget: jest.fn(),
        providerList: jest.fn(),
        providerListModels: jest.fn(),
        reasoningEffortRows: jest.fn(({ model, selected_effort }: ReasoningEffortRowsRequest) => {
            const reasoning = model.capabilities.reasoning;
            const effortOptions = reasoning?.effort_options ?? [];

            if (reasoning?.supported !== true || effortOptions.length === 0) {
                return { rows: [] };
            }

            return {
                rows: effortOptions.map((effort: string) => ({
                    effort,
                    label:
                        effort === 'xhigh'
                            ? 'Extra High'
                            : effort[0].toUpperCase() + effort.slice(1),
                    selected: effort === selected_effort,
                })),
            };
        }),
    },
}));

jest.mock('./cli-runtime-live', () => ({
    refreshCliRuntimeSummaries: jest.fn(),
}));

const providerModel = (
    reasoning: ProviderModelInfo['capabilities']['reasoning'],
): ProviderModelInfo => ({
    id: 'gpt-5',
    name: 'GPT-5',
    description: null,
    created: null,
    provider: 'openai',
    owned_by: null,
    limits: {
        max_input_tokens: null,
        max_output_tokens: null,
        context_window: null,
    },
    capabilities: {
        vision: null,
        tool_calling: null,
        json_output: null,
        streaming: true,
        thinking: reasoning?.supported ?? null,
        reasoning,
        fine_tuning: null,
        input_modalities: null,
        output_modalities: null,
    },
    pricing: null,
    active: true,
    family: null,
    lifecycle_status: null,
});

describe('model selector reasoning helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('resolves selected model by provider and model id', () => {
        const selected = providerModel({
            supported: true,
            effort_options: ['low'],
        });

        expect(resolveSelectedProviderModel([selected], 'openai', 'gpt-5')).toBe(selected);
        expect(resolveSelectedProviderModel([selected], 'anthropic', 'gpt-5')).toBeNull();
        expect(resolveSelectedProviderModel([selected], 'openai', null)).toBeNull();
    });

    it('returns rows and display label for supported reasoning metadata', () => {
        const model = providerModel({
            supported: true,
            effort_options: ['low', 'high', 'xhigh'],
        });

        expect(reasoningEffortRowsForModel(model, 'xhigh')).toEqual([
            { effort: 'low', label: 'Low', selected: false },
            { effort: 'high', label: 'High', selected: false },
            { effort: 'xhigh', label: 'Extra High', selected: true },
        ]);
        expect(reasoningEffortDisplayLabelForModel(model, 'xhigh')).toBe('Extra High');
    });

    it('returns no rows for unsupported reasoning metadata', () => {
        const model = providerModel({
            supported: false,
            effort_options: ['low', 'high'],
        });

        expect(reasoningEffortRowsForModel(model, 'high')).toEqual([]);
        expect(reasoningEffortDisplayLabelForModel(model, 'high')).toBeNull();
    });

    it('returns no rows for unknown reasoning metadata', () => {
        expect(reasoningEffortRowsForModel(providerModel(null), 'high')).toEqual([]);
        expect(reasoningEffortRowsForModel(null, 'high')).toEqual([]);
        expect(reasoningEffortDisplayLabelForModel(providerModel(null), 'high')).toBeNull();
    });

    it('loads CLI capability policy from live runtime readiness', async () => {
        const runtime = {
            runtime_id: 'codex',
            kind: 'codex',
            display_name: 'Codex CLI',
            enabled: true,
            status: { state: 'ready' },
            capabilities: {
                supports_threads: true,
                supports_model_list: true,
                supports_skills: true,
                supports_mcp_tools: true,
            },
            diagnostics: [{ code: 'cli_runtime.mcp.ready', level: 'info', message: 'ready' }],
        } as RuntimeSummary;
        jest.mocked(pioneerClient.providerList).mockResolvedValue({ providers: [] });
        jest.mocked(refreshCliRuntimeSummaries).mockResolvedValue([runtime]);
        jest.mocked(pioneerClient.composerCapabilityTarget).mockReturnValue({
            kind: 'cli',
            supports_skills: true,
            supports_mcp_tools: true,
        });

        await expect(listProviders('workspace-1')).resolves.toEqual([
            {
                id: 'cli_runtime:codex',
                label: 'Codex CLI',
                kind: 'cliRuntime',
                capabilityTarget: {
                    kind: 'cli',
                    supports_skills: true,
                    supports_mcp_tools: true,
                },
                mcpReadinessReason: null,
            },
        ]);
        expect(refreshCliRuntimeSummaries).toHaveBeenCalledWith('workspace-1');
    });

    it('hides the local API provider from the chat composer without hiding CLI runtimes', async () => {
        const runtime = {
            runtime_id: 'codex',
            kind: 'codex',
            display_name: 'Codex CLI',
            enabled: true,
            status: { state: 'ready' },
            capabilities: {
                supports_threads: true,
                supports_model_list: true,
                supports_skills: true,
                supports_mcp_tools: false,
            },
            diagnostics: [],
        } as unknown as RuntimeSummary;
        jest.mocked(pioneerClient.providerList).mockResolvedValue({
            providers: [{ name: 'local' }, { name: 'openai' }],
        });
        jest.mocked(refreshCliRuntimeSummaries).mockResolvedValue([runtime]);
        jest.mocked(pioneerClient.composerCapabilityTarget).mockReturnValue({
            kind: 'cli',
            supports_skills: true,
            supports_mcp_tools: false,
        });

        const providers = await listProviders('workspace-1');

        expect(providers.map((provider) => provider.id)).toEqual(['openai', 'cli_runtime:codex']);
    });

    it('delegates CLI runtime provider model conversion to the native client helper', async () => {
        const convertedModel = providerModel({
            supported: true,
            effort_options: ['low', 'high'],
            default_effort: null,
            mandatory: null,
            supports_token_budget: null,
            source: 'cli_metadata',
        });
        jest.mocked(pioneerClient.providerListModels).mockResolvedValue({
            provider: 'cli_runtime:codex',
            models: [convertedModel],
        });

        const response = await listProviderModels('workspace-1', 'cli_runtime:codex');

        expect(pioneerClient.providerListModels).toHaveBeenCalledWith({
            workspace_id: 'workspace-1',
            provider: 'cli_runtime:codex',
        });
        expect(pioneerClient.cliRuntimeListModels).not.toHaveBeenCalled();
        expect(response.models[0]?.capabilities.reasoning).toEqual(
            convertedModel.capabilities.reasoning,
        );
    });
});
