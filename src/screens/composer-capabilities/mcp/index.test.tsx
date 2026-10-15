import { describe, expect, it, jest } from '@jest/globals';

import { type SelectableMcpCapability } from '@/client';

import { mcpKeyExtractor } from './index';

jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: (styles: unknown) => styles },
    useUnistyles: () => ({ theme: {} }),
}));
jest.mock('@/client', () => ({
    pioneerClient: {},
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

describe('mobile MCP picker row identity', () => {
    it('keeps server and tool controls attached to their domain keys after insertion and reorder', () => {
        const server = { type: 'server' as const, row };
        const tool = {
            type: 'tool' as const,
            row: { ...row, key: 'tool:docs:read', raw_tool_name: 'read' },
        };
        const section = { type: 'section' as const, id: 'servers' as const, title: 'Servers' };
        expect([server, tool].map(mcpKeyExtractor)).toEqual([
            `server:${row.key}`,
            'tool:tool:docs:read',
        ]);
        expect([tool, section, server].map(mcpKeyExtractor)).toEqual([
            'tool:tool:docs:read',
            'section:servers',
            `server:${row.key}`,
        ]);
    });
});
