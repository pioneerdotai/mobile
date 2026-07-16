import { describe, expect, it, jest } from '@jest/globals';

import type { ComposerCapability, SelectableMcpCapability } from '@/client';

import { replaceSelectedMcpComposerCapabilities } from './index';

jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: (styles: unknown) => styles },
    useUnistyles: () => ({ theme: {} }),
}));
jest.mock('@/client', () => ({ pioneerClient: {} }));
jest.mock('@/components/feedback/spinner', () => () => null);

const row = (serverName: string, rawToolName: string | null): SelectableMcpCapability => ({
    key: rawToolName
        ? `mcp-tool:workspace:${serverName}:${rawToolName}`
        : `mcp-server:workspace:${serverName}`,
    label: rawToolName ? `${serverName} / ${rawToolName}` : serverName,
    description: '',
    server_id: `server:${serverName}`,
    server_name: serverName,
    raw_tool_name: rawToolName,
    scope_kind: 'workspace',
    tools_count: rawToolName ? null : 1,
    selectable: true,
    unavailable_reason: null,
});

const capabilityFromRow = (selected: SelectableMcpCapability): ComposerCapability => ({
    id: selected.key,
    label: selected.label,
    kind: selected.raw_tool_name
        ? {
              McpTool: {
                  server_name: selected.server_name,
                  raw_tool_name: selected.raw_tool_name,
                  scope_kind: selected.scope_kind,
              },
          }
        : {
              McpServer: {
                  name: selected.server_name,
                  scope_kind: selected.scope_kind,
              },
          },
});

const skill: ComposerCapability = {
    id: 'skill:user:docs',
    label: 'docs',
    kind: { Skill: { slug: 'docs', source_kind: 'user' } },
};

describe('mobile MCP picker capability projection', () => {
    it('uses the existing MCP server attachment kind for whole-server selection', () => {
        const server = row('docs', null);
        const rowsByKey = new Map([[server.key, server]]);

        expect(
            replaceSelectedMcpComposerCapabilities(
                [skill],
                [server.key],
                rowsByKey,
                capabilityFromRow,
            ),
        ).toEqual([skill, capabilityFromRow(server)]);
    });

    it('uses the existing MCP tool attachment kind for individual-tool selection', () => {
        const tool = row('docs', 'search');
        const rowsByKey = new Map([[tool.key, tool]]);

        expect(
            replaceSelectedMcpComposerCapabilities(
                [skill],
                [tool.key],
                rowsByKey,
                capabilityFromRow,
            ),
        ).toEqual([skill, capabilityFromRow(tool)]);
    });

    it('replaces only current MCP selections and preserves unrelated capabilities', () => {
        const oldServer = capabilityFromRow(row('old', null));
        const nextTool = row('docs', 'search');
        const rowsByKey = new Map([[nextTool.key, nextTool]]);

        expect(
            replaceSelectedMcpComposerCapabilities(
                [skill, oldServer],
                [nextTool.key],
                rowsByKey,
                capabilityFromRow,
            ),
        ).toEqual([skill, capabilityFromRow(nextTool)]);
    });
});
