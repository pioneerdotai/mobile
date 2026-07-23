import { describe, expect, it } from '@jest/globals';

import {
    resolveThreadComposerActionState,
    resolveThreadComposerActionVisual,
    resolveThreadComposerDraftPresence,
} from './voice-entry';

const base = {
    voiceMode: false,
    composerTextEmpty: true,
    modelSelectionComplete: true,
    disabled: false,
    sending: false,
    canSubmit: false,
    hasInFlightTurn: false,
    canStopTurn: true,
    turnCancelling: false,
    voiceVisible: true,
    voiceEnabled: true,
    voiceBusy: false,
    voiceProcessing: false,
};

type ActionOverrides = Partial<typeof base>;

describe('thread composer primary action', () => {
    it.each([
        { label: 'nothing selected', text: '', attachments: 0, capabilities: 0, payload: false },
        { label: 'an attachment', text: '', attachments: 1, capabilities: 0, payload: true },
        { label: 'a capability', text: '', attachments: 0, capabilities: 1, payload: true },
        {
            label: 'a skill selection',
            text: '',
            attachments: 0,
            capabilities: 0,
            skillSelections: 1,
            payload: true,
        },
        { label: 'typed text', text: 'hello', attachments: 0, capabilities: 0, payload: true },
        { label: 'whitespace', text: '   ', attachments: 0, capabilities: 0, payload: false },
    ])(
        'separates empty text from payload for $label',
        ({ text, attachments, capabilities, skillSelections = 0, payload }) => {
            expect(
                resolveThreadComposerDraftPresence(
                    text,
                    attachments,
                    capabilities,
                    skillSelections,
                ),
            ).toEqual({
                composerTextEmpty: text.trim().length === 0,
                hasComposerPayload: payload,
            });
        },
    );

    it('shows an enabled microphone for an empty ready text draft', () => {
        expect(resolveThreadComposerActionState(base)).toMatchObject({
            primaryAction: 'voice-ready',
            actionDisabled: false,
            actionLoading: false,
            activeVoiceMode: false,
            voiceModeDisabled: false,
        });
    });

    it('keeps the microphone when an empty text draft has attachments or capabilities', () => {
        const state = resolveThreadComposerActionState({
            ...base,
            composerTextEmpty: true,
            canSubmit: true,
        });

        expect(state).toMatchObject({
            primaryAction: 'voice-ready',
            actionDisabled: false,
            actionLoading: false,
        });
        expect(resolveThreadComposerActionVisual(state)).toBe('microphone');
    });

    it('uses enabled Send for typed text', () => {
        expect(
            resolveThreadComposerActionState({
                ...base,
                composerTextEmpty: false,
                canSubmit: true,
            }),
        ).toMatchObject({
            primaryAction: 'send',
            actionDisabled: false,
            actionLoading: false,
        });
    });

    const runtimeBlockedVoiceCases: { label: string; overrides: ActionOverrides }[] = [
        {
            label: 'disabled Gateway Voice Input',
            overrides: { voiceVisible: false, voiceEnabled: false },
        },
        { label: 'model or runtime not ready', overrides: { voiceEnabled: false } },
        { label: 'Gateway or local capture busy', overrides: { voiceBusy: true } },
    ];
    const blockedVoiceCases: { label: string; overrides: ActionOverrides }[] = [
        { label: 'missing chat model', overrides: { modelSelectionComplete: false } },
        ...runtimeBlockedVoiceCases,
    ];

    it.each(blockedVoiceCases)('falls back to disabled Send while $label', ({ overrides }) => {
        expect(resolveThreadComposerActionState({ ...base, ...overrides })).toMatchObject({
            primaryAction: 'send',
            actionDisabled: true,
            actionLoading: false,
        });
    });

    it.each(runtimeBlockedVoiceCases)(
        'falls back to enabled Send for non-text payload while $label',
        ({ overrides }) => {
            expect(
                resolveThreadComposerActionState({
                    ...base,
                    ...overrides,
                    canSubmit: true,
                }),
            ).toMatchObject({
                primaryAction: 'send',
                actionDisabled: false,
                actionLoading: false,
            });
        },
    );

    it('keeps voice mode active with frozen attachments or capabilities', () => {
        expect(
            resolveThreadComposerActionState({
                ...base,
                voiceMode: true,
                canSubmit: true,
                voiceBusy: true,
            }),
        ).toMatchObject({
            primaryAction: 'voice-mode',
            actionDisabled: false,
            activeVoiceMode: true,
            voiceModeDisabled: true,
        });
    });

    it.each([
        { composerTextEmpty: false },
        { modelSelectionComplete: false },
        { disabled: true },
        { sending: true },
        { hasInFlightTurn: true },
        { voiceVisible: false },
        { voiceEnabled: false },
    ])('deactivates stale voice mode when its context is lost', (overrides) => {
        expect(
            resolveThreadComposerActionState({ ...base, ...overrides, voiceMode: true }),
        ).toMatchObject({
            activeVoiceMode: false,
        });
    });

    it.each([
        { voiceMode: false, composerTextEmpty: true, voiceVisible: true },
        { voiceMode: true, composerTextEmpty: true, voiceVisible: true },
        { voiceMode: false, composerTextEmpty: false, voiceVisible: false },
    ])('always gives an in-flight turn the Stop action', (overrides) => {
        expect(
            resolveThreadComposerActionState({
                ...base,
                ...overrides,
                hasInFlightTurn: true,
            }),
        ).toMatchObject({
            primaryAction: 'stop',
            actionDisabled: false,
            actionLoading: false,
            activeVoiceMode: false,
        });
    });

    it('derives loading and disabled state from the selected action', () => {
        expect(
            resolveThreadComposerActionState({
                ...base,
                composerTextEmpty: false,
                canSubmit: false,
                sending: true,
            }),
        ).toMatchObject({
            primaryAction: 'send',
            actionDisabled: true,
            actionLoading: true,
        });
        expect(
            resolveThreadComposerActionState({
                ...base,
                hasInFlightTurn: true,
                canStopTurn: false,
                turnCancelling: true,
            }),
        ).toMatchObject({
            primaryAction: 'stop',
            actionDisabled: true,
            actionLoading: true,
        });
        expect(
            resolveThreadComposerActionState({
                ...base,
                voiceEnabled: false,
                voiceProcessing: true,
            }),
        ).toMatchObject({
            primaryAction: 'send',
            actionDisabled: true,
            actionLoading: true,
        });
    });

    it.each([
        { primaryAction: 'send' as const, actionLoading: false, visual: 'send' },
        { primaryAction: 'stop' as const, actionLoading: false, visual: 'stop' },
        { primaryAction: 'voice-ready' as const, actionLoading: false, visual: 'microphone' },
        { primaryAction: 'voice-mode' as const, actionLoading: false, visual: 'keyboard' },
        { primaryAction: 'voice-ready' as const, actionLoading: true, visual: 'loading' },
    ])(
        'maps $primaryAction to the $visual renderer',
        ({ primaryAction, actionLoading, visual }) => {
            expect(resolveThreadComposerActionVisual({ primaryAction, actionLoading })).toBe(
                visual,
            );
        },
    );
});
