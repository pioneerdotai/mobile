import React, { forwardRef, useImperativeHandle } from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, expect, it, jest } from '@jest/globals';

const mockReact = React;
const mockPresent = jest.fn();
const mockDismiss = jest.fn();
const mockSetOptions = jest.fn();
const mockDiscard = jest.fn();
const mockCreate = jest.fn<() => Promise<unknown>>();
const mockT = (key: string) => key;
let mockRevision: number | undefined = 1;
let mockEndpoint = 'gateway';
let mockOperation: {
    generation: number;
    action: { kind: string };
    request: { kind: string };
} | null = null;
const mockNode = (name: string) => (props: Record<string, unknown>) =>
    mockReact.createElement(name, props, props.children as React.ReactNode);
const mockSheet = forwardRef((props: Record<string, unknown>, ref) => {
    useImperativeHandle(ref, () => ({ present: mockPresent, dismiss: mockDismiss }));
    return mockReact.createElement('Sheet', props, props.children as React.ReactNode);
});
mockSheet.displayName = 'Sheet';
jest.mock('expo-router', () => ({ useNavigation: () => ({ setOptions: mockSetOptions }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: () => ({}), hairlineWidth: 1 },
    useUnistyles: () => ({
        theme: { space: (n: number) => n, colors: {} },
        rt: { insets: { top: 0 } },
    }),
}));
jest.mock('@gorhom/bottom-sheet', () => ({
    BottomSheetModal: mockSheet,
    BottomSheetScrollView: mockNode('SheetScroll'),
}));
jest.mock('lucide-react-native', () => ({ Trash2: mockNode('Icon') }));
jest.mock('@/components/buttons/base', () => ({ Button: mockNode('Button') }));
jest.mock('@/components/buttons/create', () => ({ CreateButton: mockNode('Create') }));
jest.mock('@/components/credential-presentation', () => ({
    CredentialPresentation: mockNode('Credential'),
}));
jest.mock('@/components/feedback/spinner', () => ({
    __esModule: true,
    default: mockNode('Spinner'),
}));
jest.mock('@/components/forms/workspace-toggle-selector', () => ({
    WorkspaceToggleSelector: mockNode('Workspaces'),
}));
jest.mock('@/components/forms/label', () => ({ Label: mockNode('Label') }));
jest.mock('@/components/overlays/actions', () => ({ ActionsSheet: mockNode('Actions') }));
jest.mock('@/components/overlays/actions/menu-item', () => ({ MenuItem: mockNode('Menu') }));
jest.mock('@/components/overlays/components/backdrop', () => ({ Backdrop: mockNode('Backdrop') }));
jest.mock('@/components/overlays/components/handle', () => ({ Handle: mockNode('Handle') }));
jest.mock('@/components/primitives/box', () => ({ Box: mockNode('Box') }));
jest.mock('@/components/primitives/hstack', () => ({ HStack: mockNode('HStack') }));
jest.mock('@/components/primitives/vstack', () => ({ VStack: mockNode('VStack') }));
jest.mock('@/components/primitives/pressable', () => ({ Pressable: mockNode('Pressable') }));
jest.mock('@/components/primitives/scrollview', () => ({ ScrollView: mockNode('ScrollView') }));
jest.mock('@/components/primitives/text', () => ({ Text: mockNode('Text') }));
jest.mock('@/stores/gateway', () => ({
    useGatewayStore: (select: (s: unknown) => unknown) =>
        select({ connectionGatewayId: mockEndpoint }),
}));
jest.mock('@/stores/workspace', () => ({
    useWorkspaceStore: (select: (s: unknown) => unknown) =>
        select({ workspaces: [{ id: 'ws', name: 'Workspace' }] }),
}));
jest.mock('@/hooks/use-administration-capabilities', () => ({
    useAdministrationPrincipal: () => ({
        data: { principal: { id: 'user' }, session: { id: 'session' } },
        isPending: false,
    }),
    useAdministrationCapabilities: () => ({
        isPending: mockRevision === undefined,
        data:
            mockRevision === undefined
                ? undefined
                : { can_create_invitation: true, can_view_invitations: true },
        capabilitySnapshot:
            mockRevision === undefined
                ? undefined
                : {
                      authorization_revision: mockRevision,
                      global: {
                          invitation_role_options: [
                              { is_default: true, role: { key: 'member', display_name: 'Member' } },
                          ],
                      },
                  },
    }),
}));
jest.mock('@/services/administration/pages', () => ({
    useAdministrationPage: () => ({ snapshot: { invitations: [] }, isPending: false }),
}));
jest.mock('@/services/administration/invitations', () => ({
    createInvitationPresentation: () => mockCreate(),
    revokeInvitation: jest.fn(),
}));
jest.mock('@/services/administration/operations', () => ({
    dismissAdministrationActivation: (generation: number) => mockDiscard(generation),
    copyAdministrationActivation: jest.fn(),
    useAdministrationOperation: () => mockOperation,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const InvitationsSettingsScreen = require('./invitations').default;

const invitation = {
    operationGeneration: 7,
    canonical_uri: 'pioneer://synthetic-invitation',
    qr_width: 1,
    qr_modules: [true],
};
beforeEach(() => {
    jest.clearAllMocks();
    mockRevision = 1;
    mockEndpoint = 'gateway';
    mockOperation = null;
});

it.each(
    [false, true].flatMap((beforeResponse) =>
        ['native', 'gateway', 'done'].map((exit) => ({ beforeResponse, exit })),
    ),
)(
    'keeps QR across policy updates (before response: $beforeResponse), closes on $exit',
    async ({ beforeResponse, exit }) => {
        let tree!: ReactTestRenderer;
        let complete!: (value: typeof invitation) => void;
        mockCreate.mockImplementation(
            () =>
                new Promise((resolve) => {
                    complete = resolve;
                }),
        );
        await act(async () => {
            tree = renderer.create(<InvitationsSettingsScreen />);
        });
        await act(async () => {
            (
                mockSetOptions.mock.lastCall?.[0] as {
                    headerRight: () => React.ReactElement<{ onPressHandler: () => void }>;
                }
            )
                .headerRight()
                .props.onPressHandler();
        });
        await act(async () => {
            tree.root.findByType('Workspaces' as never).props.onToggle('ws');
        });
        mockOperation = {
            generation: 7,
            action: { kind: 'create_invitation' },
            request: { kind: 'loading' },
        };
        await act(async () => {
            tree.root
                .findAllByType('Button' as never)
                .find((b) => b.props.title === 'invitations.create')!
                .props.onPress();
        });
        const updatePolicy = async () => {
            for (const revision of [undefined, 2]) {
                mockRevision = revision;
                await act(async () => {
                    tree.update(<InvitationsSettingsScreen />);
                });
            }
        };
        if (beforeResponse) await updatePolicy();
        mockOperation.request.kind = 'ready';
        await act(async () => {
            complete(invitation);
        });
        if (!beforeResponse) await updatePolicy();
        expect(mockDismiss).not.toHaveBeenCalled();
        expect(mockDiscard).not.toHaveBeenCalled();
        expect(tree.root.findByType('Credential' as never).props.link.value).toBe(
            invitation.canonical_uri,
        );
        expect(tree.root.findByType('Credential' as never).props.qrModules).toEqual(
            invitation.qr_modules,
        );
        if (exit === 'done') {
            await act(async () => {
                tree.root
                    .findAllByType('Button' as never)
                    .find((b) => b.props.title === 'invitations.done')!
                    .props.onPress();
                tree.root.findByType('Sheet' as never).props.onDismiss();
            });
        } else {
            if (exit === 'native') mockOperation = null;
            else mockEndpoint = 'replacement';
            await act(async () => {
                tree.update(<InvitationsSettingsScreen />);
            });
        }
        expect(mockDismiss).toHaveBeenCalledTimes(1);
        expect(mockDiscard).toHaveBeenCalledWith(7);
        expect(tree.root.findAllByType('Credential' as never)).toHaveLength(0);
        await act(async () => {
            tree.unmount();
        });
    },
);
