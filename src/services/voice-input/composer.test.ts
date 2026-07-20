import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { pioneerClient } from '@/client';
import { resolveVoiceComposerAvailability } from './composer';

jest.mock('@/client', () => ({
    pioneerClient: {
        voiceInputSettingsPlan: jest.fn(),
    },
}));
jest.mock('@/services/gateway/registry', () => ({
    defaultGatewayRegistry: () => ({ version: 1, active_gateway_id: null, remotes: [] }),
}));

const reduction = (
    presentation: 'disabled' | 'needs_selection' | 'preparing' | 'ready' | 'failed',
    phase:
        | 'disabled'
        | 'model_not_selected'
        | 'missing'
        | 'downloading'
        | 'installing'
        | 'loading'
        | 'ready'
        | 'failed',
) => {
    jest.mocked(pioneerClient.voiceInputSettingsPlan).mockReturnValue({
        operation: 'status_reduction',
        reduction: {
            desired_enabled: presentation !== 'disabled',
            effective_enabled: presentation === 'ready',
            model_selected: phase !== 'disabled' && phase !== 'model_not_selected',
            non_terminal: presentation === 'preparing',
            phase,
            presentation,
            retry_available: presentation === 'failed',
            show_progress: phase === 'downloading',
        },
    });
};

describe('active-Gateway Voice Input composer availability', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('hides the microphone until enabled Gateway settings are authoritative', () => {
        expect(
            resolveVoiceComposerAvailability({
                online: false,
                settingsLoading: false,
                settingsError: false,
                settings: { enabled: true },
                voiceStatus: 'ready',
            }),
        ).toEqual({ kind: 'hidden' });

        for (const state of [
            { settingsLoading: true, settingsError: false, settings: undefined },
            { settingsLoading: false, settingsError: true, settings: undefined },
            { settingsLoading: false, settingsError: false, settings: undefined },
        ]) {
            expect(
                resolveVoiceComposerAvailability({
                    online: true,
                    ...state,
                    voiceStatus: 'ready',
                }),
            ).toEqual({ kind: 'hidden' });
        }

        reduction('disabled', 'disabled');
        expect(
            resolveVoiceComposerAvailability({
                online: true,
                settingsLoading: false,
                settingsError: false,
                settings: { enabled: false },
                voiceStatus: 'ready',
            }),
        ).toEqual({ kind: 'hidden' });
    });

    const blockedCases: [
        'needs_selection' | 'preparing',
        'model_not_selected' | 'missing' | 'downloading' | 'installing' | 'loading',
    ][] = [
        ['needs_selection', 'model_not_selected'],
        ['preparing', 'missing'],
        ['preparing', 'downloading'],
        ['preparing', 'installing'],
        ['preparing', 'loading'],
    ];

    it.each(blockedCases)('shows but blocks the microphone for %s/%s', (presentation, phase) => {
        reduction(presentation, phase);
        expect(
            resolveVoiceComposerAvailability({
                online: true,
                settingsLoading: false,
                settingsError: false,
                settings: { enabled: true, model: 'model-1', runtime: { phase } },
                voiceStatus: 'ready',
            }),
        ).toEqual({ kind: 'blocked', reason: phase, error: null });
    });

    it('enables capture only when both settings runtime and voice status are ready', () => {
        reduction('ready', 'ready');
        expect(
            resolveVoiceComposerAvailability({
                online: true,
                settingsLoading: false,
                settingsError: false,
                settings: { enabled: true, runtime: { phase: 'ready' } },
                voiceStatus: 'ready',
            }),
        ).toEqual({ kind: 'ready' });
        expect(
            resolveVoiceComposerAvailability({
                online: true,
                settingsLoading: false,
                settingsError: false,
                settings: { enabled: true, runtime: { phase: 'ready' } },
                voiceStatus: 'busy',
            }),
        ).toEqual({ kind: 'blocked', reason: 'busy', error: null });
    });

    it('shows a bounded failure without enabling capture', () => {
        reduction('failed', 'failed');
        expect(
            resolveVoiceComposerAvailability({
                online: true,
                settingsLoading: false,
                settingsError: false,
                settings: {
                    enabled: true,
                    runtime: { phase: 'failed', error: 'x'.repeat(500) },
                },
                voiceStatus: 'error',
            }),
        ).toMatchObject({ kind: 'blocked', reason: 'failed' });
        const result = resolveVoiceComposerAvailability({
            online: true,
            settingsLoading: false,
            settingsError: false,
            settings: {
                enabled: true,
                runtime: { phase: 'failed', error: 'x'.repeat(500) },
            },
            voiceStatus: 'error',
        });
        expect(result.kind === 'blocked' ? result.error : null).toHaveLength(240);
    });
});
