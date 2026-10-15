import { AppState } from 'react-native';
import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import type { AgentsDocumentPublication } from '@/client/generated/agents_document_publication';
const mockReact = React;
let mockPublication: AgentsDocumentPublication;
const mockIntent = jest.fn();
const mockBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigationDispatch = jest.fn();
const mockRouter = { back: mockBack, navigate: mockNavigate, canGoBack: () => true };
const mockNavigation = { dispatch: mockNavigationDispatch };
const mockPrevent = jest.fn();
let mockAppState: ((state: string) => void) | undefined;
const mockRemove = jest.fn();
jest.mock('@/client/agents-document', () => ({
    useAgentsDocument: () => mockPublication,
    dispatchAgentsDocument: mockIntent,
}));
jest.mock('expo-router', () => ({
    useRouter: () => mockRouter,
    useNavigation: () => mockNavigation,
}));
jest.mock('expo-router/react-navigation', () => ({
    usePreventRemove: (...args: unknown[]) => mockPrevent(...args),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: () => ({}) },
    useUnistyles: () => ({
        rt: { insets: { bottom: 0 } },
        theme: { space: (v: number) => v, colors: { typography: '#000' } },
    }),
}));
jest.mock('@/components/editor/source-document-editor', () => ({
    SourceDocumentEditor: (props: Record<string, unknown>) =>
        mockReact.createElement('SourceDocumentEditor', props),
}));
jest.mock('@/components/buttons/base', () => ({
    Button: (props: Record<string, unknown>) => mockReact.createElement('Button', props),
}));
jest.mock('@/components/feedback/spinner', () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => mockReact.createElement('Spinner', props),
}));
jest.mock('@/components/primitives/box', () => ({
    Box: (props: Record<string, unknown>) => mockReact.createElement('Box', props),
}));
jest.mock('@/components/primitives/hstack', () => ({
    HStack: (props: Record<string, unknown>) => mockReact.createElement('HStack', props),
}));
jest.mock('@/components/primitives/keyboard', () => ({
    KeyboardAvoidingView: (props: Record<string, unknown>) =>
        mockReact.createElement('KeyboardAvoidingView', props),
}));
jest.mock('@/components/primitives/scrollview', () => ({
    ScrollView: (props: Record<string, unknown>) => mockReact.createElement('ScrollView', props),
}));
jest.mock('@/components/primitives/text', () => ({
    Text: (props: Record<string, unknown>) => mockReact.createElement('Text', props),
}));
jest.mock('@/components/primitives/vstack', () => ({
    VStack: (props: Record<string, unknown>) => mockReact.createElement('VStack', props),
}));
jest.mock('@/components/typography/title', () => ({
    Title: (props: Record<string, unknown>) => mockReact.createElement('Title', props),
}));

const Screen = jest.requireActual<typeof import('./index')>('./index').default;
const scope = { kind: 'root' as const, workspace_id: 'workspace' };
beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
        mockAppState = callback as typeof mockAppState;
        return { remove: mockRemove };
    });
    mockPublication = {
        scope,
        revision: 1,
        owner_generation: 3,
        edit_revision: 1,
        content: 'draft',
        load: { kind: 'loaded' },
        save: { kind: 'dirty' },
        access: true,
        close_ready: false,
    };
});
describe('Agents document scoped native editor', () => {
    it('routes input to Client and controlled save publications do not echo a user edit', () => {
        let tree!: ReactTestRenderer;
        act(() => {
            tree = renderer.create(<Screen workspaceId="workspace" folderId={null} />);
        });
        const editor = tree.root.findByType('SourceDocumentEditor' as never);
        act(() => editor.props.onChangeText('new draft'));
        expect(mockIntent).toHaveBeenLastCalledWith({
            kind: 'scoped',
            scope,
            expected_owner: 3,
            action: { kind: 'edit', content: 'new draft' },
        });
        mockPublication = { ...mockPublication, content: 'new draft', save: { kind: 'saving' } };
        act(() => tree.update(<Screen workspaceId="workspace" folderId={null} />));
        expect(mockIntent).toHaveBeenCalledTimes(1);
        expect(tree.root.findByType('SourceDocumentEditor' as never).props.value).toBe('new draft');
        act(() => tree.unmount());
        expect(mockRemove).toHaveBeenCalledTimes(1);
    });
    it('defers native navigation until Client confirms close and retains the destination through a save error', () => {
        let tree!: ReactTestRenderer;
        act(() => {
            tree = renderer.create(<Screen workspaceId="workspace" folderId={null} />);
        });
        const args = mockPrevent.mock.calls.at(-1)!;
        expect(args[0]).toBe(true);
        const action = { type: 'GO_BACK' };
        act(() => {
            (args[1] as (value: unknown) => void)({ data: { action } });
        });
        expect(mockIntent).toHaveBeenLastCalledWith({
            kind: 'scoped',
            scope,
            expected_owner: 3,
            action: { kind: 'close' },
        });
        expect(mockNavigationDispatch).not.toHaveBeenCalled();
        mockPublication = {
            ...mockPublication,
            save: { kind: 'error', message: 'synthetic offline' },
        };
        act(() => tree.update(<Screen workspaceId="workspace" folderId={null} />));
        expect(mockNavigationDispatch).not.toHaveBeenCalled();
        mockPublication = {
            ...mockPublication,
            save: { kind: 'saved', saved_at: 1 },
            close_ready: true,
        };
        act(() => tree.update(<Screen workspaceId="workspace" folderId={null} />));
        expect(mockNavigationDispatch).toHaveBeenCalledTimes(1);
        expect(mockNavigationDispatch).toHaveBeenCalledWith(action);
        expect(mockBack).not.toHaveBeenCalled();
        act(() => tree.unmount());
    });
    it('flushes through Client on background and keeps editor input disabled after access loss', () => {
        let tree!: ReactTestRenderer;
        act(() => {
            tree = renderer.create(<Screen workspaceId="workspace" folderId={null} />);
        });
        act(() => mockAppState?.('background'));
        expect(mockIntent).toHaveBeenLastCalledWith({
            kind: 'scoped',
            scope,
            expected_owner: 3,
            action: { kind: 'save' },
        });
        mockPublication = {
            ...mockPublication,
            access: false,
            content: '',
            load: { kind: 'failed', value: 'access lost' },
            save: { kind: 'error', message: 'access lost' },
        };
        act(() => tree.update(<Screen workspaceId="workspace" folderId={null} />));
        expect(tree.root.findAllByType('SourceDocumentEditor' as never)).toHaveLength(0);
        act(() => tree.unmount());
    });
});
