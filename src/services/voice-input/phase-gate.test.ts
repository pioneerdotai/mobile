import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { QueryClient } from '@tanstack/react-query';

import type { GatewaySettingsGetResponse } from '@/client';
import { pioneerClient } from '@/client';
import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';
import { voiceInputDataSourceState } from './data-source';
import { activeVoiceInputGatewayTarget, type VoiceInputGatewayTarget } from './gateway-target';
import { refetchVoiceInputAfterResume } from './lifecycle';
import { VOICE_INPUT_POLL_INTERVAL_MS, voiceInputPollInterval } from './presentation';
import { clearVoiceInputQueries, fetchVoiceInputSettings, voiceInputQueryKeys } from './query';

jest.mock('@/client', () => ({
    pioneerClient: {
        gatewaySettingsGet: jest.fn(),
        voiceInputSettingsPlan: jest.fn(),
    },
}));
jest.mock('@/services/gateway/registry', () => ({
    defaultGatewayRegistry: () => ({ version: 1, active_gateway_id: null, remotes: [] }),
}));

const target = (gatewayId: string, connectionId: number): VoiceInputGatewayTarget => ({
    gatewayId,
    connectionId,
    workspaceId: 'workspace-1',
});

const connect = (gatewayId: string, connectionId: number, kind: 'local' | 'remote' = 'local') => {
    useGatewayStore.setState({
        registry: {
            version: 1,
            active_gateway_id: gatewayId,
            remotes: [
                {
                    id: gatewayId,
                    kind,
                    name: `${kind} Gateway`,
                    gateway_base_url:
                        kind === 'remote' ? 'https://gateway.example.test/' : 'http://127.0.0.1/',
                },
            ],
        },
        connectionId,
        connectionGatewayId: gatewayId,
        connectionState: 'Connected',
    });
    useWorkspaceStore.setState({ activeWorkspaceId: 'workspace-1' });
};

const settingsResponse = (
    enabled: boolean,
    model: string | null,
    phase:
        | 'disabled'
        | 'model_not_selected'
        | 'missing'
        | 'downloading'
        | 'installing'
        | 'loading'
        | 'ready'
        | 'failed',
): GatewaySettingsGetResponse =>
    ({
        settings: {
            memory: {},
            voice_input: {
                enabled,
                provider: model ? 'local' : null,
                model,
                runtime: { phase, model, effective_enabled: phase === 'ready' },
            },
        },
    }) as GatewaySettingsGetResponse;

describe('mobile Voice Input composer integration gate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useGatewayStore.setState({
            registry: { version: 1, active_gateway_id: null, remotes: [] },
            connectionId: null,
            connectionGatewayId: null,
            connectionState: 'Idle',
        });
        useWorkspaceStore.setState({ activeWorkspaceId: null });
    });

    it.each([
        'disabled',
        'model_not_selected',
        'missing',
        'downloading',
        'installing',
        'loading',
        'ready',
        'failed',
    ] as const)('keeps Gateway A %s state out of Gateway B after a switch', async (phase) => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
        });
        const gatewayA = target('gateway-a', 7);
        const gatewayB = target('gateway-b', 8);
        connect('gateway-a', 7);
        queryClient.setQueryData(
            voiceInputQueryKeys.settings(gatewayA),
            settingsResponse(
                phase !== 'disabled',
                phase === 'model_not_selected' ? null : 'model-a',
                phase,
            ),
        );

        connect('gateway-b', 8, 'remote');
        expect(queryClient.getQueryData(voiceInputQueryKeys.settings(gatewayB))).toBeUndefined();
        expect(voiceInputDataSourceState('gateway-b', 8, true, 'workspace-1')).toEqual({
            kind: 'online',
            gatewayId: 'gateway-b',
            readOnly: false,
            target: gatewayB,
        });

        await clearVoiceInputQueries(queryClient);
        expect(queryClient.getQueryData(voiceInputQueryKeys.settings(gatewayA))).toBeUndefined();
    });

    it('disconnects read-only, reconnects with a new identity, and resumes authoritative refetch', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { gcTime: Number.POSITIVE_INFINITY } },
        });
        const firstConnection = target('gateway-a', 7);
        const secondConnection = target('gateway-a', 9);
        connect('gateway-a', 7);
        queryClient.setQueryData(
            voiceInputQueryKeys.settings(firstConnection),
            settingsResponse(true, 'model-a', 'ready'),
        );

        useGatewayStore.setState({ connectionState: 'Disconnected' });
        expect(voiceInputDataSourceState('gateway-a', 7, false, 'workspace-1').kind).toBe(
            'offline',
        );

        connect('gateway-a', 9);
        queryClient.setQueryData(
            voiceInputQueryKeys.settings(secondConnection),
            settingsResponse(true, 'model-a', 'loading'),
        );
        await expect(refetchVoiceInputAfterResume(queryClient, secondConnection)).resolves.toBe(
            true,
        );
        expect(
            queryClient.getQueryState(voiceInputQueryKeys.settings(secondConnection))
                ?.isInvalidated,
        ).toBe(true);
        expect(
            queryClient.getQueryData(voiceInputQueryKeys.settings(firstConnection)),
        ).toBeDefined();
    });

    it('recovers a dropped notification through bounded nonterminal polling only', () => {
        expect(
            voiceInputPollInterval(
                settingsResponse(true, 'model-a', 'downloading').settings.voice_input,
                true,
            ),
        ).toBe(VOICE_INPUT_POLL_INTERVAL_MS);
        expect(
            voiceInputPollInterval(
                settingsResponse(true, 'model-a', 'ready').settings.voice_input,
                true,
            ),
        ).toBe(false);
    });

    it('uses the same Nitro settings boundary for a remote Gateway identity', async () => {
        connect('remote-gateway', 17, 'remote');
        const remoteTarget = target('remote-gateway', 17);
        const response = settingsResponse(true, 'model-a', 'ready');
        jest.mocked(pioneerClient.gatewaySettingsGet).mockResolvedValue(response as never);

        expect(activeVoiceInputGatewayTarget()).toEqual(remoteTarget);
        await expect(fetchVoiceInputSettings(remoteTarget)).resolves.toBe(response);
        expect(pioneerClient.gatewaySettingsGet).toHaveBeenCalledTimes(1);
    });

    it('contains no production mobile model-weight download or filesystem path', () => {
        const files = [
            'src/services/voice-input/query.ts',
            'src/services/voice-input/composer.ts',
            'src/services/voice/mobile-capture.ts',
        ];
        const source = files
            .map((file) => readFileSync(path.join(process.cwd(), file), 'utf8'))
            .join('\n');

        expect(source).not.toMatch(/expo-file-system|react-native-fs|AsyncStorage/);
        expect(source).not.toMatch(/https?:\/\//);
        expect(source).not.toMatch(/\bfetch\s*\(|axios\s*\(/);
        expect(source).not.toMatch(/\.onnx|\.tar\.gz|\.bin\b/);
    });

    it('does not expose Voice Input configuration in mobile Settings', () => {
        for (const file of [
            'src/routes/settings/voice-input.tsx',
            'src/screens/settings/voice-input.tsx',
            'src/screens/settings/components/voice-model-selector.tsx',
            'src/services/voice-input/model-rows.ts',
        ]) {
            expect(existsSync(path.join(process.cwd(), file))).toBe(false);
        }

        const settingsSurface = [
            'src/screens/settings/index.tsx',
            'src/routes/settings/_layout.tsx',
        ]
            .map((file) => readFileSync(path.join(process.cwd(), file), 'utf8'))
            .join('\n');
        const querySource = readFileSync(
            path.join(process.cwd(), 'src/services/voice-input/query.ts'),
            'utf8',
        );

        expect(settingsSurface).not.toMatch(/voice-input|voiceInput/);
        expect(querySource).not.toMatch(
            /applyVoiceInputAction|fetchVoiceInputCatalog|gatewaySettingsUpdate|providerListTranscriptionModels/,
        );
    });

    it('keeps composer locale keys but no Voice Input settings locale', () => {
        const locales = ['de', 'en', 'es', 'fr', 'hi', 'ja', 'ru', 'zh'];
        const threadKeys = [
            'voiceModelNotSelected',
            'voiceModelDownloading',
            'voiceModelLoading',
            'voiceBusy',
        ];

        for (const locale of locales) {
            const settings = JSON.parse(
                readFileSync(
                    path.join(process.cwd(), 'src', 'locale', 'resources', locale, 'settings.json'),
                    'utf8',
                ),
            ) as Record<string, unknown>;
            const threads = JSON.parse(
                readFileSync(
                    path.join(process.cwd(), 'src', 'locale', 'resources', locale, 'threads.json'),
                    'utf8',
                ),
            ) as Record<string, unknown>;

            expect(settings.voiceInput).toBeUndefined();
            expect(threadKeys.every((key) => key in threads)).toBe(true);
        }
    });
});
