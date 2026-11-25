import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockIdentity = { thread_id: 'thread-a', draft_id: 17, generation: 4 };
let mockThread: string | null = 'thread-a';
let mockCanUseSkills = true;
let mockCanUseMcp = true;
let mockIdentityAvailable = true;
const mockRows = [
    { key: 'available', plugin_id: 'package-a', label: 'First', selected: false, selectable: true, stale: false },
    { key: 'unavailable', plugin_id: 'package-b', label: 'Second', selected: false, selectable: false, stale: false },
    { key: 'selected-stale', plugin_id: 'package-c', label: 'Third', selected: true, selectable: false, stale: true },
];
const mockInput = {
    app_request: { state: { kind: 'ready' } },
    plugin_request: { state: { kind: 'ready' } },
    apps: [{ id: 'package-a', description: 'Apps description' }],
    plugins: [{ id: 'package-a', description: 'Plugin description' }],
};
const mockPluginShell = jest.fn((_request: unknown) => ({ picker: mockRows }));
const mockDispatch = jest.fn((_intent: unknown) => undefined);
const mockUsePicker = jest.fn((_thread: string | null, _draft: number | null, _kind: 'apps' | 'plugins', enabled: boolean) => ({
    input: enabled ? mockInput : null,
    identity: enabled && mockIdentityAvailable ? mockIdentity : null,
}));

jest.mock('@shopify/flash-list', () => ({
    FlashList: (props: any) => {
        const React = require('react');
        return React.createElement('PackageList', props, [
            props.ListHeaderComponent,
            ...props.data.map((item: any, index: number) => props.renderItem({ item, index })),
            ...(props.data.length ? [] : [props.ListEmptyComponent]),
        ]);
    },
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/client', () => ({ pioneerClient: { pluginShell: mockPluginShell } }));
jest.mock('@/client/composer', () => ({
    composerSnapshot: () => ({ draft_id: 17 }),
    useComposerPublication: () => ({ draft_id: 17 }),
}));
jest.mock('@/client/composer-catalog', () => ({
    dispatchComposerCatalog: mockDispatch,
    useComposerPicker: mockUsePicker,
}));
jest.mock('@/stores/active-thread', () => {
    const useActiveThreadStore = (selector: any) => selector({ activeComposerThreadId: mockThread });
    useActiveThreadStore.getState = () => ({ activeComposerThreadId: mockThread });
    return { useActiveThreadStore };
});
jest.mock('@/stores/workspace', () => ({
    useWorkspaceStore: (selector: any) => selector({ activeWorkspaceId: 'workspace-a' }),
}));
jest.mock('@/hooks/use-administration-capabilities', () => ({
    useAdministrationCapabilities: () => ({
        data: { can_use_skills: mockCanUseSkills, can_use_mcp: mockCanUseMcp },
        isPending: false,
    }),
}));
jest.mock('../shared', () => {
    const React = require('react');
    return {
        CapabilityCard: ({ children }: any) => React.createElement('CapabilityCard', null, children),
        CapabilitySelectionRow: (props: any) => React.createElement('SelectionRow', props),
        ListHeader: (props: any) => React.createElement('ListHeader', props),
        ListState: (props: any) => React.createElement('ListState', props),
        styles: {},
    };
});

const { ComposerPackageCapabilitiesScreen } = require('./index');
let tree: ReactTestRenderer | undefined;
const render = (kind: 'apps' | 'plugins') => {
    act(() => { tree = create(<ComposerPackageCapabilitiesScreen kind={kind} />); });
};
const rows = () => tree!.root.findAllByType('SelectionRow' as never);

beforeEach(() => {
    jest.clearAllMocks();
    mockThread = 'thread-a';
    mockCanUseSkills = true;
    mockCanUseMcp = true;
    mockIdentityAvailable = true;
});
afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = undefined;
});

describe('shared Apps and plugin composer picker', () => {
    it.each([
        { kind: 'apps' as const, picker: 'app_composer_picker', intent: { kind: 'toggle_app', app_id: 'package-a' }, description: 'Apps description' },
        { kind: 'plugins' as const, picker: 'composer_picker', intent: { kind: 'toggle_plugin', plugin_id: 'package-a' }, description: 'Plugin description' },
    ])('uses the $kind scope, native picker and owned toggle identity', ({ kind, picker, intent, description }) => {
        render(kind);
        expect(mockUsePicker).toHaveBeenLastCalledWith('thread-a', 17, kind, true);
        expect(mockPluginShell).toHaveBeenCalledWith({ kind: picker, thread_id: 'thread-a', draft_id: 17, query: '' });
        expect(rows()[0].props.description).toBe(description);
        act(() => rows()[0].props.onPress());
        expect(mockDispatch).toHaveBeenCalledWith({ ...intent, identity: mockIdentity });
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        act(() => tree!.root.findByType('ListHeader' as never).props.onChangeText('hello'));
        expect(mockPluginShell).toHaveBeenLastCalledWith({ kind: picker, thread_id: 'thread-a', draft_id: 17, query: 'hello' });
    });

    it.each(['apps', 'plugins'] as const)('blocks unavailable unselected %s rows but allows deselecting stale ones', (kind) => {
        render(kind);
        expect(rows()[1].props.disabled).toBe(true);
        act(() => rows()[1].props.onPress());
        expect(mockDispatch).not.toHaveBeenCalled();
        expect(rows()[2].props.disabled).toBe(false);
        expect(rows()[2].props.description).toBe('settings:plugins.staleSelection');
        act(() => rows()[2].props.onPress());
        expect(mockDispatch).toHaveBeenCalledWith(kind === 'apps'
            ? { kind: 'toggle_app', app_id: 'package-c', identity: mockIdentity }
            : { kind: 'toggle_plugin', plugin_id: 'package-c', identity: mockIdentity });
    });

    it('does not send a toggle if the picker identity is missing', () => {
        mockIdentityAvailable = false;
        render('apps');
        expect(rows()[0].props.disabled).toBe(true);
        act(() => rows()[0].props.onPress());
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('disables plugins without MCP permission while still allowing Apps with skills permission', () => {
        mockCanUseMcp = false;
        render('plugins');
        expect(mockUsePicker).toHaveBeenLastCalledWith('thread-a', 17, 'plugins', false);
        expect(mockPluginShell).not.toHaveBeenCalled();
        act(() => tree!.update(<ComposerPackageCapabilitiesScreen kind="apps" />));
        expect(mockUsePicker).toHaveBeenLastCalledWith('thread-a', 17, 'apps', true);
        expect(mockPluginShell).toHaveBeenCalledWith({ kind: 'app_composer_picker', thread_id: 'thread-a', draft_id: 17, query: '' });
    });

    it('disables the picker when the active thread changes from its owning thread', () => {
        render('apps');
        mockThread = 'thread-b';
        act(() => tree!.update(<ComposerPackageCapabilitiesScreen kind="apps" />));
        expect(mockUsePicker).toHaveBeenLastCalledWith('thread-a', 17, 'apps', false);
        expect(rows()).toHaveLength(0);
        expect(mockDispatch).not.toHaveBeenCalled();
    });
});