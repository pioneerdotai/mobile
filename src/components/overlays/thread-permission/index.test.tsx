import React from 'react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ThreadPermissionModeSwitcherSheet from './index';
import { dispatchComposer } from '@/client/composer';
const mockClose = jest.fn();
const mockState = {
    activeComposerThreadId: 'a',
    composerSelectedPermissionMode: 'full_access',
    showComposerPermissionModeSwitcher: true,
    setComposerPermissionModeSwitcherOpen: mockClose,
};
let mockPublication = {
    thread_id: 'a',
    draft_id: 1,
    permission_options: [{ mode: 'supervised', label: 'Supervised', description: 'Ask' }],
};
jest.mock('@/stores/active-thread', () => ({
    useActiveThreadStore: Object.assign(
        (selector: (value: typeof mockState) => unknown) => selector(mockState),
        { getState: () => mockState },
    ),
}));
jest.mock('@/client/composer', () => ({
    useComposerPublication: () => mockPublication,
    composerSnapshot: () => mockPublication,
    dispatchComposer: jest.fn(),
}));
jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: () => ({}) },
    useUnistyles: () => ({ theme: { space: (v: number) => v }, rt: { insets: { top: 0 } } }),
}));
jest.mock('@gorhom/bottom-sheet', () => ({
    BottomSheetModal: 'BottomSheetModal',
    BottomSheetScrollView: 'BottomSheetScrollView',
}));
jest.mock('lucide-react-native', () => ({
    ShieldAlert: () => null,
    ShieldCheck: () => null,
    ShieldX: () => null,
}));
jest.mock('@/components/overlays/components/backdrop', () => ({ Backdrop: () => null }));
jest.mock('@/components/overlays/components/handle', () => ({ Handle: () => null }));
jest.mock('@/components/primitives/box', () => ({ Box: 'Box' }));
jest.mock('@/components/primitives/hstack', () => ({ HStack: 'HStack' }));
jest.mock('@/components/primitives/pressable', () => ({ Pressable: 'Pressable' }));
jest.mock('@/components/primitives/text', () => ({ Text: 'Text' }));
jest.mock('@/components/primitives/vstack', () => ({ VStack: 'VStack' }));
jest.mock('@/helpers/styles', () => ({ stableOutlineWidth: () => 1 }));
let root: ReactTestRenderer | undefined;
afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    jest.mocked(dispatchComposer).mockClear();
    mockClose.mockClear();
    mockState.activeComposerThreadId = 'a';
});
describe('controlled permission sheet', () => {
    it('does not reconcile a publication and sends one identity-scoped user intent', () => {
        act(() => {
            root = create(<ThreadPermissionModeSwitcherSheet />);
        });
        expect(dispatchComposer).not.toHaveBeenCalled();
        const row = root!.root.findByProps({ accessibilityLabel: 'Supervised' });
        act(() => row.props.onPress());
        expect(dispatchComposer).toHaveBeenCalledTimes(1);
        expect(dispatchComposer).toHaveBeenCalledWith({
            kind: 'domain',
            thread_id: 'a',
            draft_id: 1,
            action: { SetPermissionMode: { mode: 'supervised' } },
        });
        act(() => root?.update(<ThreadPermissionModeSwitcherSheet />));
        expect(dispatchComposer).toHaveBeenCalledTimes(1);
    });
    it('rejects a retained callback after thread or draft replacement', () => {
        act(() => {
            root = create(<ThreadPermissionModeSwitcherSheet />);
        });
        const callback = root!.root.findByProps({ accessibilityLabel: 'Supervised' }).props.onPress;
        mockState.activeComposerThreadId = 'b';
        act(() => callback());
        mockState.activeComposerThreadId = 'a';
        mockPublication = { ...mockPublication, draft_id: 2 };
        act(() => callback());
        expect(dispatchComposer).not.toHaveBeenCalled();
        expect(mockClose).not.toHaveBeenCalled();
    });
});
