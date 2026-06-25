import { beforeEach, describe, expect, it } from '@jest/globals';

import { useActiveThreadStore } from './active-thread';

const resetStore = () => {
    useActiveThreadStore.getState().resetDefaultComposerModelSelection();
    useActiveThreadStore.getState().reset();
};

describe('active thread reasoning effort state', () => {
    beforeEach(() => {
        resetStore();
    });

    it('preserves effort when user keeps the same provider and model', () => {
        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5');
        useActiveThreadStore.getState().setComposerReasoningEffortFromUser('high');

        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('high');
    });

    it('clears effort when user changes provider or model', () => {
        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5');
        useActiveThreadStore.getState().setComposerReasoningEffortFromUser('high');

        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5.5');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBeNull();

        useActiveThreadStore.getState().setComposerReasoningEffortFromUser('low');
        useActiveThreadStore
            .getState()
            .setComposerModelSelectionFromUser('anthropic', 'claude-opus-4-5');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBeNull();
    });

    it('syncs effort from the resolved default selection', () => {
        useActiveThreadStore
            .getState()
            .syncDefaultComposerModelSelection('workspace-1', 'openai', 'gpt-5', ' high ');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('high');
        expect(useActiveThreadStore.getState().defaultComposerReasoningEffort).toBe('high');

        useActiveThreadStore
            .getState()
            .syncDefaultComposerModelSelection('workspace-1', 'openai', 'gpt-5', null);

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBeNull();

        useActiveThreadStore
            .getState()
            .syncDefaultComposerModelSelection('workspace-1', 'openai', 'gpt-5.5', 'max');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('max');
    });

    it('syncs effort from the active thread selection unless user selected manually', () => {
        useActiveThreadStore.getState().syncComposerModelSelection('openai', 'gpt-5', 'high');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('high');

        useActiveThreadStore.getState().syncComposerModelSelection('openai', 'gpt-5', null);

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBeNull();

        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5');
        useActiveThreadStore.getState().setComposerReasoningEffortFromUser('low');

        useActiveThreadStore.getState().syncComposerModelSelection('openai', 'gpt-5', 'max');

        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('low');
    });

    it('restores default effort on reset paths', () => {
        useActiveThreadStore
            .getState()
            .syncDefaultComposerModelSelection('workspace-1', 'openai', 'gpt-5', 'high');
        useActiveThreadStore.getState().setComposerModelSelectionFromUser('openai', 'gpt-5.5');
        useActiveThreadStore.getState().setComposerReasoningEffortFromUser('low');

        useActiveThreadStore.getState().reset();

        expect(useActiveThreadStore.getState().composerSelectedProvider).toBe('openai');
        expect(useActiveThreadStore.getState().composerSelectedModel).toBe('gpt-5');
        expect(useActiveThreadStore.getState().composerSelectedReasoningEffort).toBe('high');
    });
});
