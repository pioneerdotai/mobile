import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPush = jest.fn();
const mockDispatch = jest.fn((_workspace: string, _connection: number | null, _intent: unknown, _kind: 'apps' | 'plugins') => ({ outcome: 'changed' }));
const mockRemove = jest.fn();
const mockPick = jest.fn<(_skill: boolean) => Promise<{ uri: string; remove: () => void } | null>>();
const mockShell = jest.fn((_request: any) => ({ operation_id: 77 }));
let mockCanManage = true;
let mockConnection: number | null = 42;
let mockWorkspace: string | null = 'workspace-a';
let mockUpload: any = null;
const mockPackage = {
    id: 'package-a',
    name: 'Example package',
    revision: 12,
    enabled: true,
    state: 'installed',
    status: 'ready',
    version: '1.0',
    metadata: { app: { has_ui: true } },
    components: [],
    diagnostics: [],
};
const mockUsePackages = jest.fn((_workspace: string | null, selected: string | null, _kind: 'apps' | 'plugins') => ({
    managing: true,
    busy: false,
    error: null,
    plugins: [mockPackage],
    details: selected ? mockPackage : null,
    skills: [],
    mcp: [],
    skill_health: [],
    mcp_details: [],
    oauth: [],
}));

jest.mock('expo-router', () => ({ router: { push: mockPush } }));
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() }, Switch: 'NativeSwitch', TextInput: 'NativeTextInput' }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: () => ({}), hairlineWidth: 1 },
    useUnistyles: () => ({ theme: { colors: { textMuted: 'grey' } } }),
}));
jest.mock('@/components/primitives/scrollview', () => ({ ScrollView: 'ScrollView' }));
jest.mock('@/components/primitives/pressable', () => ({ Pressable: 'PackageButton' }));
jest.mock('@/components/primitives/vstack', () => ({ VStack: 'VStack' }));
jest.mock('@/components/primitives/hstack', () => ({ HStack: 'HStack' }));
jest.mock('@/components/primitives/text', () => ({ Text: 'PackageText' }));
jest.mock('@/stores/workspace', () => {
    const useWorkspaceStore = (selector: any) => selector({ activeWorkspaceId: mockWorkspace });
    useWorkspaceStore.getState = () => ({ activeWorkspaceId: mockWorkspace });
    return { useWorkspaceStore };
});
jest.mock('@/hooks/use-administration-capabilities', () => ({
    useAdministrationCapabilities: () => ({ data: { can_manage_capabilities: mockCanManage } }),
}));
jest.mock('@/client/packages', () => ({
    dispatchPackage: mockDispatch,
    pluginOriginConnection: () => mockConnection,
    usePackages: mockUsePackages,
    usePluginUpload: () => mockUpload,
    usePluginChildAction: () => null,
}));
jest.mock('@/client', () => ({ pioneerClient: { pluginShell: mockShell } }));
jest.mock('@/services/packages/archive', () => ({ pickPluginArchive: mockPick }));

const { PackageSettingsScreen } = require('./index');
let tree: ReactTestRenderer | undefined;
const render = (kind: 'apps' | 'plugins') => {
    act(() => { tree = create(<PackageSettingsScreen kind={kind} />); });
};
const buttons = () => tree!.root.findAllByType('PackageButton' as never);
const button = (label: string) => {
    const result = buttons().find((node) => node.findAllByType('PackageText' as never)
        .some((text) => text.children.includes(label)));
    if (!result) throw new Error(`Button not found: ${label}`);
    return result;
};
const press = (label: string) => act(() => button(label).props.onPress());
const pressAsync = async (label: string) => {
    await act(async () => { button(label).props.onPress(); await Promise.resolve(); });
};

beforeEach(() => {
    jest.clearAllMocks();
    mockCanManage = true;
    mockConnection = 42;
    mockWorkspace = 'workspace-a';
    mockUpload = null;
    mockPick.mockResolvedValue({ uri: 'file:///cache/package.zip', remove: mockRemove });
});
afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = undefined;
});

describe('shared Apps and plugin settings', () => {
    it.each(['apps', 'plugins'] as const)('keeps %s selection, refresh and mutation in its own scope', (kind) => {
        render(kind);
        expect(mockUsePackages).toHaveBeenLastCalledWith('workspace-a', null, kind);
        press('plugins.refresh');
        expect(mockDispatch).toHaveBeenLastCalledWith('workspace-a', 42, { kind: 'observe', plugin_id: null }, kind);
        press('Example package');
        expect(mockUsePackages).toHaveBeenLastCalledWith('workspace-a', 'package-a', kind);
        const enabled = tree!.root.findAllByType('NativeSwitch' as never)
            .find((node) => node.props.accessibilityLabel === 'plugins.enabled');
        expect(enabled).toBeDefined();
        act(() => enabled!.props.onValueChange(false));
        expect(mockDispatch).toHaveBeenLastCalledWith('workspace-a', 42, {
            kind: 'set_enabled', plugin_id: 'package-a', expected_revision: 12, enabled: false,
        }, kind);
    });

    it.each([
        { kind: 'apps' as const, target: { kind: 'app_preview' } },
        { kind: 'plugins' as const, target: { kind: 'plugin_preview' } },
    ])('starts $kind archive preview with owning workspace and connection', async ({ kind, target }) => {
        render(kind);
        await pressAsync('plugins.addArchive');
        expect(mockPick).toHaveBeenCalledWith(false);
        expect(mockShell).toHaveBeenCalledWith({
            kind: 'start_archive', workspace_id: 'workspace-a', expected_connection: 42,
            target, file_uri: 'file:///cache/package.zip',
        });
        act(() => tree!.unmount()); tree = undefined;
        expect(mockShell).toHaveBeenCalledWith({ kind: 'cancel_upload', workspace_id: 'workspace-a', operation_id: 77 });
        expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it.each([
        { kind: 'apps' as const, target: { kind: 'app_update_preview', app_id: 'package-a', expected_revision: 12 } },
        { kind: 'plugins' as const, target: { kind: 'plugin_update_preview', plugin_id: 'package-a', expected_revision: 12 } },
    ])('binds $kind archive update to the selected package and revision', async ({ kind, target }) => {
        render(kind);
        press('Example package');
        await pressAsync('plugins.updateArchive');
        expect(mockShell).toHaveBeenCalledWith({
            kind: 'start_archive', workspace_id: 'workspace-a', expected_connection: 42,
            target, file_uri: 'file:///cache/package.zip',
        });
    });

    it.each(['apps', 'plugins'] as const)('applies a previewed %s install through the corresponding scope', async (kind) => {
        render(kind);
        await pressAsync('plugins.addArchive');
        mockUpload = {
            state: 'succeeded', sent_bytes: 4, total_bytes: 4,
            target: { kind: kind === 'apps' ? 'app_preview' : 'plugin_preview' },
            plugin_preview: { package: { name: 'Example', version: '1', components: [], diagnostics: [] } },
        };
        act(() => tree!.update(<PackageSettingsScreen kind={kind} />));
        press('plugins.install');
        expect(mockDispatch).toHaveBeenLastCalledWith('workspace-a', 42, { kind: 'install', upload_operation: 77 }, kind);
    });

    it.each([
        { kind: 'apps' as const, target: { kind: 'app_update_preview', app_id: 'package-a', expected_revision: 12 } },
        { kind: 'plugins' as const, target: { kind: 'plugin_update_preview', plugin_id: 'package-a', expected_revision: 12 } },
    ])('applies a current $kind update preview and blocks a stale revision', async ({ kind, target }) => {
        render(kind);
        press('Example package');
        await pressAsync('plugins.updateArchive');
        mockUpload = {
            state: 'succeeded', sent_bytes: 4, total_bytes: 4, target,
            plugin_update_preview: { preview: {
                package: { name: 'Example', version: '2', components: [], diagnostics: [] },
                added: [], updated: [], identity_resets: [], removed: [], authorization_changes: [],
            } },
        };
        act(() => tree!.update(<PackageSettingsScreen kind={kind} />));
        expect(button('plugins.applyUpdate').props.disabled).toBe(false);
        press('plugins.applyUpdate');
        expect(mockDispatch).toHaveBeenLastCalledWith('workspace-a', 42, {
            kind: 'apply_update', upload_operation: 77, confirm_changes: true,
        }, kind);
        mockUpload = { ...mockUpload, target: { ...target, expected_revision: 11 } };
        act(() => tree!.update(<PackageSettingsScreen kind={kind} />));
        expect(button('plugins.applyUpdate').props.disabled).toBe(true);
    });

    it('exposes the App view only in the Apps settings', () => {
        render('apps');
        press('Example package');
        press('apps.openView');
        expect(mockPush).toHaveBeenCalledWith({ pathname: '/app-view', params: { workspace: 'workspace-a', app: 'package-a' } });
        act(() => tree!.unmount()); tree = undefined;
        render('plugins');
        press('Example package');
        expect(buttons().some((node) => node.findAllByType('PackageText' as never)
            .some((text) => text.children.includes('apps.openView')))).toBe(false);
    });

    it('does not start an archive when the user lacks management permission', async () => {
        mockCanManage = false;
        render('apps');
        expect(button('plugins.addArchive').props.disabled).toBe(true);
        await pressAsync('plugins.addArchive');
        expect(mockPick).not.toHaveBeenCalled();
        expect(mockShell).not.toHaveBeenCalled();
    });

    it('discards a picker result after its owner unmounts', async () => {
        let finish!: (value: { uri: string; remove: () => void }) => void;
        mockPick.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
        render('apps');
        await pressAsync('plugins.addArchive');
        act(() => tree!.unmount()); tree = undefined;
        await act(async () => { finish({ uri: 'file:///cache/package.zip', remove: mockRemove }); await Promise.resolve(); });
        expect(mockRemove).toHaveBeenCalledTimes(1);
        expect(mockShell).not.toHaveBeenCalled();
    });

    it('discards a picker result after the gateway connection changes', async () => {
        let finish!: (value: { uri: string; remove: () => void }) => void;
        mockPick.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
        render('apps');
        await pressAsync('plugins.addArchive');
        mockConnection = 43;
        act(() => tree!.update(<PackageSettingsScreen kind="apps" />));
        await act(async () => { finish({ uri: 'file:///cache/package.zip', remove: mockRemove }); await Promise.resolve(); });
        expect(mockRemove).toHaveBeenCalledTimes(1);
        expect(mockShell).not.toHaveBeenCalled();
    });
});