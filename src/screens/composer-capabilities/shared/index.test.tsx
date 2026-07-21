import { describe, expect, it, jest } from '@jest/globals';

import type { ComposerCapability } from '@/client';

import { isMcpComposerCapability, selectedCapabilityKeys } from './index';

jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: (styles: unknown) => styles },
    useUnistyles: () => ({ theme: {} }),
}));
jest.mock('@/components/feedback/spinner', () => () => null);

const server: ComposerCapability = {
    id: 'mcp-server:workspace:docs',
    label: 'docs',
    kind: { McpServer: { name: 'docs', scope_kind: 'workspace' } },
};
const tool: ComposerCapability = {
    id: 'mcp-tool:workspace:docs:search',
    label: 'docs / search',
    kind: {
        McpTool: {
            server_name: 'docs',
            raw_tool_name: 'search',
            scope_kind: 'workspace',
        },
    },
};
const skill: ComposerCapability = {
    id: 'skill:DDDDDDDDDDDDDDDDDDDDD',
    label: 'docs',
    kind: {
        Skill: {
            skill_id: 'DDDDDDDDDDDDDDDDDDDDD',
            owner: null,
            slug: 'docs',
            source_kind: 'user',
        },
    },
};
const duplicateLabelSkill: ComposerCapability = {
    id: 'skill:EEEEEEEEEEEEEEEEEEEEE',
    label: 'docs',
    kind: {
        Skill: {
            skill_id: 'EEEEEEEEEEEEEEEEEEEEE',
            owner: null,
            slug: 'docs',
            source_kind: 'user',
        },
    },
};

describe('shared composer capability presentation', () => {
    it('recognizes both existing MCP attachment kinds without a CLI-specific kind', () => {
        expect(isMcpComposerCapability(server)).toBe(true);
        expect(isMcpComposerCapability(tool)).toBe(true);
        expect(isMcpComposerCapability(skill)).toBe(false);
    });

    it('preserves attachment keys and order for picker selection state', () => {
        expect(selectedCapabilityKeys([skill, duplicateLabelSkill, server, tool])).toEqual([
            skill.id,
            duplicateLabelSkill.id,
            server.id,
            tool.id,
        ]);
        expect(skill.label).toBe('docs');
        expect(duplicateLabelSkill.label).toBe(skill.label);
    });
});
