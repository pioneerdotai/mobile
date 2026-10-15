import { describe, expect, it } from '@jest/globals';
import type { ProviderModelInfo } from '@/client';
import {
    filterProviderRows,
    filterModelRows,
    modelRowDisplayName,
    modelRowSecondaryText,
    type ModelSelectorProvider,
} from './model-selector';

const provider: ModelSelectorProvider = {
    id: 'provider-a',
    label: 'Provider A',
    kind: 'api',
    capabilityTarget: { kind: 'native', supports_skills: true, supports_mcp_tools: true },
    mcpReadinessReason: null,
};
const model = {
    id: 'stable-model',
    provider: 'provider-a',
    name: 'Display model',
    description: 'Useful description',
} as ProviderModelInfo;

describe('model selector presentation', () => {
    it('keeps the publication array and rows for an empty search', () => {
        const providers = [provider];
        const models = [model];
        expect(filterProviderRows(providers, '  ')).toBe(providers);
        expect(filterModelRows(models, '')).toBe(models);
    });
    it('keeps stable domain rows when transient search changes', () => {
        expect(filterProviderRows([provider], 'provider a')[0]).toBe(provider);
        expect(filterModelRows([model], 'STABLE')[0]).toBe(model);
        expect(filterModelRows([model], 'useful')[0]).toBe(model);
        expect(filterModelRows([model], 'missing')).toEqual([]);
    });
    it('preserves display copy and the id fallback', () => {
        expect(modelRowDisplayName(model)).toBe('Display model');
        expect(modelRowSecondaryText(model)).toBe('Useful description');
        const unnamed = { ...model, name: null, description: null };
        expect(modelRowDisplayName(unnamed)).toBe('stable-model');
        expect(modelRowSecondaryText(unnamed)).toBeNull();
    });
});
