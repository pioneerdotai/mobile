import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockReact = React;
const mockNavigateEditor = jest.fn();
const mockThreadTreeList = (props: Record<string, unknown>) =>
    mockReact.createElement('ThreadTreeList', props);
const mockCreateButton = (props: Record<string, unknown>) =>
    mockReact.createElement('CreateButton', props);
const mockText = (props: Record<string, unknown>) => mockReact.createElement('Text', props);
let mockActiveGatewayId: string | null = null;
let mockActiveWorkspaceId: string | null = null;
let mockBootstrappedConnectionId: number | null = null;
let mockConnectionId: number | null = null;
let mockConnectionState = 'Idle';
let mockTerminalReason: string | null = null;
let mockRemotes: { id: string }[] = [];
let mockCanManageWorkspace = false;
let mockAgentsDocSummary: Record<string, unknown> | null = null;

jest.setMock('expo-router', {
    __esModule: true,
    useRouter: () => ({ push: jest.fn() }),
});

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-unistyles', () => ({
    StyleSheet: {
        create: () => ({
            container: {},
            contentContainer: {},
            gatewayCreateContent: {},
            gatewayCreateDescription: {},
            gatewayCreateMessage: {},
            gatewayCreateOverlay: {},
            gatewayCreateTitle: {},
            headerContent: {},
            header: {},
            list: {},
        }),
    },
}));

jest.mock('@/components/buttons/create', () => ({
    CreateButton: mockCreateButton,
}));
jest.mock('@/components/primitives/box', () => ({
    Box: (props: Record<string, unknown>) => mockReact.createElement('Box', props),
}));
jest.mock('@/components/primitives/hstack', () => ({
    HStack: (props: Record<string, unknown>) => mockReact.createElement('HStack', props),
}));
jest.mock('@/components/primitives/text', () => ({
    Text: mockText,
}));
jest.mock('@/components/primitives/vstack', () => ({
    VStack: (props: Record<string, unknown>) => mockReact.createElement('VStack', props),
}));
jest.mock('@/components/thread-tree/thread-tree-list', () => ({
    ThreadTreeList: mockThreadTreeList,
}));
jest.mock('@/components/typography/title', () => ({
    Title: (props: Record<string, unknown>) => mockReact.createElement('Title', props),
}));
jest.mock('@/hooks/use-thread-tree', () => ({
    useThreadTreeLevel: () => ({
        currentAgentsDocSummary: mockAgentsDocSummary,
        folders: [],
        threads: [],
        loading: false,
        error: null,
    }),
}));
jest.mock('@/hooks/use-administration-capabilities', () => ({
    useAdministrationCapabilities: () => ({
        data: { can_manage_workspace: mockCanManageWorkspace },
    }),
}));
jest.mock('@/hooks/use-editor', () => ({
    useEditor: () => ({ navigate: mockNavigateEditor }),
}));
jest.mock('@/hooks/use-workspace', () => ({
    useWorkspace: () => ({
        activeWorkspaceId: mockActiveWorkspaceId,
        bootstrappedConnectionId: mockBootstrappedConnectionId,
    }),
}));
jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
            registry: {
                active_gateway_id: mockActiveGatewayId,
                remotes: mockRemotes,
            },
            connectionId: mockConnectionId,
            connectionState: mockConnectionState,
            sessionTerminalReason: mockTerminalReason,
        }),
}));
jest.mock('../workspace', () => ({
    Workspace: () => mockReact.createElement('Workspace'),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ThreadTree } = require('.') as typeof import('.');

describe('ThreadTree', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockActiveGatewayId = null;
        mockActiveWorkspaceId = null;
        mockBootstrappedConnectionId = null;
        mockConnectionId = null;
        mockConnectionState = 'Idle';
        mockTerminalReason = null;
        mockRemotes = [];
        mockCanManageWorkspace = false;
        mockAgentsDocSummary = null;
    });

    it('renders an empty thread list without an active gateway or workspace', async () => {
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<ThreadTree />);
        });

        expect(tree!.root.findByType(mockThreadTreeList).props).toMatchObject({
            emptyLabel: 'emptyLevelTitle',
            folders: [],
            header: null,
            hideEmptyState: true,
            threads: [],
            loading: false,
            showAgentsDoc: false,
        });

        const createButton = tree!.root.findByType(mockCreateButton);
        expect(createButton.props.accessibilityLabel).toBe('noGatewayAction');
        expect(tree!.root.findByType(mockText).props.children).toBe('noGatewayDescription');

        act(() => {
            createButton.props.onPressHandler();
        });

        expect(mockNavigateEditor).toHaveBeenCalledWith({ type: 'gateway__create' });
    });

    it('does not flash thread or workspace content while the Gateway is connecting', async () => {
        mockActiveGatewayId = 'remote-1';
        mockRemotes = [{ id: 'remote-1' }];
        mockConnectionState = 'Connecting';
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<ThreadTree />);
        });

        expect(tree!.root.findByType(mockThreadTreeList).props).toMatchObject({
            folders: [],
            header: null,
            hideEmptyState: true,
            threads: [],
            loading: false,
            showAgentsDoc: false,
        });
        expect(tree!.root.findAllByType(mockCreateButton)).toHaveLength(0);
    });

    it('shows the workspace and thread content only after workspace bootstrap', async () => {
        mockActiveGatewayId = 'remote-1';
        mockRemotes = [{ id: 'remote-1' }];
        mockConnectionId = 7;
        mockConnectionState = 'Connected';
        mockActiveWorkspaceId = 'workspace-1';
        mockBootstrappedConnectionId = 7;
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<ThreadTree />);
        });

        const list = tree!.root.findByType(mockThreadTreeList);
        expect(list.props.header).not.toBeNull();
        expect(list.props.hideEmptyState).toBe(false);
        expect(tree!.root.findAllByType(mockCreateButton)).toHaveLength(0);
    });

    it('only exposes workspace AGENTS.md to workspace managers', async () => {
        mockActiveGatewayId = 'remote-1';
        mockRemotes = [{ id: 'remote-1' }];
        mockConnectionId = 7;
        mockConnectionState = 'Connected';
        mockActiveWorkspaceId = 'workspace-1';
        mockBootstrappedConnectionId = 7;
        mockAgentsDocSummary = { workspace_id: 'workspace-1' };

        let memberTree: ReactTestRenderer | null = null;
        await act(async () => {
            memberTree = renderer.create(<ThreadTree />);
        });
        expect(memberTree!.root.findByType(mockThreadTreeList).props).toMatchObject({
            onAgentsDocPress: undefined,
            showAgentsDoc: false,
        });

        mockCanManageWorkspace = true;
        let managerTree: ReactTestRenderer | null = null;
        await act(async () => {
            managerTree = renderer.create(<ThreadTree />);
        });
        expect(managerTree!.root.findByType(mockThreadTreeList).props.showAgentsDoc).toBe(true);
        expect(managerTree!.root.findByType(mockThreadTreeList).props.onAgentsDocPress).toEqual(
            expect.any(Function),
        );
    });

    it('renders authentication recovery on Home for the active gateway', async () => {
        mockActiveGatewayId = 'remote-1';
        mockRemotes = [{ id: 'remote-1' }];
        mockTerminalReason = 'authentication_required';
        let tree: ReactTestRenderer | null = null;

        await act(async () => {
            tree = renderer.create(<ThreadTree />);
        });

        expect(tree!.root.findByType(mockThreadTreeList).props).toMatchObject({
            folders: [],
            header: null,
            hideEmptyState: true,
            threads: [],
            loading: false,
            showAgentsDoc: false,
        });

        const messages = tree!.root.findAllByType(mockText).map((node) => node.props.children);
        expect(messages).toEqual([
            'terminal.authentication_required.title',
            'terminal.authentication_required.description',
        ]);

        const createButton = tree!.root.findByType(mockCreateButton);
        expect(createButton.props.accessibilityLabel).toBe('terminal.activateAction');

        act(() => {
            createButton.props.onPressHandler();
        });

        expect(mockNavigateEditor).toHaveBeenCalledWith({
            type: 'gateway__authenticate',
            payload: { gatewayId: 'remote-1' },
        });
    });
});
