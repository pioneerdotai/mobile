import { describe, expect, it, jest } from '@jest/globals';

import { pioneerClient, type ComposerCapability, type SelectableMcpCapability } from '@/client';

import { toggleMcpComposerCapabilitySelection } from './index';

jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: (styles: unknown) => styles },
    useUnistyles: () => ({ theme: {} }),
}));
jest.mock('@/client', () => ({
    pioneerClient: {
        composerMcpToggle: jest.fn(),
    },
}));
jest.mock('@/hooks/use-administration-capabilities', () => ({
    useAdministrationCapabilities: () => ({
        data: { can_use_mcp: true },
        isPending: false,
    }),
}));
jest.mock('lucide-react-native', () => ({
    ChevronDown: () => null,
    ChevronUp: () => null,
}));
jest.mock('@/components/feedback/spinner', () => () => null);

const row: SelectableMcpCapability = {
    key: 'mcp-server:workspace:docs',
    label: 'docs',
    description: '',
    server_id: 'server:docs',
    server_name: 'docs',
    raw_tool_name: null,
    scope_kind: 'workspace',
    tools_count: 1,
    selectable: true,
    unavailable_reason: null,
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

describe('mobile MCP picker native projection adapter', () => {
    it('delegates the complete current selection to pioneer-client', () => {
        const projected = {
            capabilities: [
                skill,
                {
                    id: row.key,
                    label: row.label,
                    kind: { McpServer: { name: 'docs', scope_kind: 'workspace' as const } },
                },
            ],
            selected_keys: [row.key],
            collapse_active_server: true,
        };
        jest.mocked(pioneerClient.composerMcpToggle).mockReturnValue(projected);

        expect(toggleMcpComposerCapabilitySelection([skill], [], [row], [], row)).toEqual(
            projected,
        );
        expect(pioneerClient.composerMcpToggle).toHaveBeenCalledWith({
            capabilities: [skill],
            selected_keys: [],
            server_rows: [row],
            tool_rows: [],
            row,
        });
    });
});
