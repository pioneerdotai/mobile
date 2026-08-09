import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockClose = jest.fn();
const mockOpenMembers = jest.fn();

jest.mock('@tanstack/react-query', () => ({
    useMutation: () => ({ isPending: false, mutate: jest.fn() }),
    useQueryClient: () => ({ setQueryData: jest.fn() }),
}));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('lucide-react-native', () => ({
    Eye: () => null,
    EyeOff: () => null,
    UserCheck: () => null,
}));
jest.mock('@/components/overlays/actions', () => ({
    ActionsSheet: ({ children }: { children: React.ReactNode }) =>
        mockReact.createElement('ActionsSheet', null, children),
}));
jest.mock('@/components/overlays/actions/menu-item', () => ({
    MenuItem: (props: Record<string, unknown>) => mockReact.createElement('MenuItem', props),
}));
jest.mock('@/components/primitives/vstack', () => ({
    VStack: ({ children }: { children: React.ReactNode }) =>
        mockReact.createElement('VStack', null, children),
}));
jest.mock('@/services/threads/scope', () => ({
    nextThreadVisibility: () => 'workspace',
    updateThreadVisibility: jest.fn(),
}));
jest.mock('@/services/threads/timeline-query', () => ({
    timelineQueryKeys: { threadSnapshot: (id: string) => ['timeline', id] },
}));
jest.mock('@/services/threads/tree', () => ({
    applyThreadUpdatedToTreeSnapshot: jest.fn(),
}));
jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: { connectionState: string }) => unknown) =>
        selector({ connectionState: 'Connected' }),
}));
jest.mock('@/stores/thread-tree', () => ({
    useThreadTreeStore: { getState: () => ({ snapshot: null }) },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ThreadActionsSheet } = require('./index') as typeof import('./index');

describe('thread actions members navigation', () => {
    it('closes the sheet before opening Members', async () => {
        mockClose.mockClear();
        mockOpenMembers.mockClear();
        let tree: ReactTestRenderer | null = null;
        await act(async () => {
            tree = renderer.create(
                <ThreadActionsSheet
                    open
                    thread={
                        {
                            id: 'thread-a',
                            workspace_id: 'workspace-a',
                            visibility: 'private',
                            status: 'Open',
                        } as never
                    }
                    onClose={mockClose}
                    onOpenMembers={mockOpenMembers}
                />,
            );
        });
        const members = tree!.root.find(
            (node) => String(node.type) === 'MenuItem' && node.props.title === 'members.title',
        );

        act(() => members.props.onPress());

        expect(mockClose).toHaveBeenCalledTimes(1);
        expect(mockOpenMembers).toHaveBeenCalledTimes(1);
        expect(mockClose.mock.invocationCallOrder[0]).toBeLessThan(
            mockOpenMembers.mock.invocationCallOrder[0]!,
        );
    });
});
