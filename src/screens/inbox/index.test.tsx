import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Pressable } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { TaskInboxPublication } from '@/client/generated/task_inbox_publication';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockDispatch = jest.fn(() => ({ outcome: 'changed' as string }));
let mockFocused = true;
let mockScope = { key: 'a', workspaceId: 'workspace', enabled: true, canAcknowledge: true };
let mockInbox: TaskInboxPublication;
const mockList = (props: Record<string, unknown>) => React.createElement('InboxList', props);
const mockCollapse = (props: Record<string, unknown>) => React.createElement('Collapse', props);
let mockHeader: Record<string, any>;
jest.mock('expo-router', () => ({
    router: { push: mockPush, back: mockBack },
    useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('expo-router/js-stack', () => ({ Stack: { Screen: ({ options }: any) => { mockHeader = options; return null; } } }));
jest.mock('@shopify/flash-list', () => ({ FlashList: mockList }));
jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: () => ({}) },
    useUnistyles: () => ({ theme: { colors: { typography: 'black', background: 'white' } } }),
}));
jest.mock('@/client/task-inbox', () => ({ useTaskInbox: () => mockInbox, taskInboxSnapshot: () => mockInbox, dispatchTaskNotification: mockDispatch }));
jest.mock('@/services/tasks/inbox-scope', () => ({ useInboxScope: () => mockScope }));
jest.mock('@/screens/thread/hooks', () => ({ useThreadScreen: () => ({ options: {} }) }));
jest.mock('@/components/buttons/collapse', () => ({ CollapseButton: mockCollapse }));
jest.mock('@/components/feedback/spinner', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/primitives/text', () => ({ Text: (props: any) => require('react').createElement('Label', props) }));
jest.mock('lucide-react-native', () => ({ EyeOff: () => null, RefreshCw: () => null }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const InboxScreen = require('./index').default;
const item = { revision: 7, dismissing: false, notification: { runId: 'run', taskId: 'task', workspaceId: 'workspace', threadId: 'cached', threadTitle: 'Result', title: 'Task', completedAt: 1700000000, status: 'succeeded' as const } };
const opened = { operation_id: 4, notification_id: 'run', task_id: 'task', task_revision: 7, thread_id: 'confirmed' };
let tree: ReactTestRenderer;
const render = () => act(() => { tree = create(<InboxScreen />); });
const update = () => act(() => { tree.update(<InboxScreen />); });
const row = () => {
    let rendered: ReactTestRenderer;
    act(() => { rendered = create(tree.root.findByType(mockList).props.renderItem({ item })); });
    return rendered!;
};
beforeEach(() => {
    jest.clearAllMocks(); mockDispatch.mockImplementation(() => ({ outcome: 'changed' })); mockFocused = true;
    mockScope = { key: 'a', workspaceId: 'workspace', enabled: true, canAcknowledge: true };
    mockInbox = { workspace_id: 'workspace', items: [item], unread_count: 125, revision: 1, loading: false, request_busy: false, completed_operation_id: 1, native_notifications: [], next_cursor: 'page-2' };
});
afterEach(() => act(() => tree?.unmount()));
describe('inbox presentation interactions', () => {
    it('opens once to the confirmed target, keeping inbox mounted through back', () => {
        render(); const card = row();
        act(() => card.root.findAllByType(Pressable)[0].props.onPress());
        expect(mockPush).not.toHaveBeenCalled();
        expect(mockDispatch).toHaveBeenCalledWith({ kind: 'open', workspace_id: 'workspace', notification_id: 'run', revision: 7 });
        mockInbox = { ...mockInbox, opened, request_busy: false, completed_operation_id: opened.operation_id }; update();
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith({ pathname: '/inbox/thread/[threadId]', params: { threadId: 'confirmed' } });
        mockFocused = false; update(); mockFocused = true; update();
        expect(mockPush).toHaveBeenCalledTimes(1);
        act(() => tree.unmount()); render();
        expect(mockPush).toHaveBeenCalledTimes(1);
        act(() => card.unmount());
    });
    it.each(['close', 'scope'] as const)('fences a late confirmation after %s', (reason) => {
        render(); const card = row();
        act(() => card.root.findAllByType(Pressable)[0].props.onPress());
        if (reason === 'close') { act(() => tree.unmount()); }
        else { mockScope = { ...mockScope, key: 'b', enabled: true }; update(); }
        mockInbox = { ...mockInbox, opened, request_busy: false, completed_operation_id: opened.operation_id }; if (reason === 'scope') update();
        expect(mockPush).not.toHaveBeenCalled();
        act(() => card.unmount());
    });
    it('dismisses a run without opening it, and read-all addresses the whole workspace', () => {
        render(); const card = row(); const stopPropagation = jest.fn();
        act(() => card.root.findAllByType(Pressable)[1].props.onPress({ stopPropagation }));
        expect(stopPropagation).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ kind: 'dismiss', workspace_id: 'workspace', notification_id: 'run', revision: 7 });
        expect(mockPush).not.toHaveBeenCalled();
        act(() => tree.root.findByProps({ accessibilityLabel: 'inboxReadAll' }).props.onPress());
        expect(mockDispatch).toHaveBeenLastCalledWith({ kind: 'read_all', workspace_id: 'workspace' });
        act(() => card.unmount());
    });
    it('uses ordinary back for collapse, preserving the originating folder stack', () => {
        render(); let button: ReactTestRenderer;
        act(() => { button = create(mockHeader.headerLeft()); });
        act(() => button!.root.findByType(mockCollapse).props.onPressHandler());
        expect(mockBack).toHaveBeenCalledTimes(1); expect(mockPush).not.toHaveBeenCalled();
        act(() => button!.unmount());
    });
    it('keeps B blocked when push removes busy A, and releases it only after the dismiss RPC completes', () => {
        const dismissingA = { ...item, dismissing: true, notification: { ...item.notification, runId: 'A' } };
        mockInbox = { ...mockInbox, items: [dismissingA, item], loading: false, request_busy: true };
        render(); const card = row();
        act(() => card.root.findAllByType(Pressable)[0].props.onPress());
        expect(mockDispatch).not.toHaveBeenCalled();
        // Push removes A. The RPC and completion watermark have NOT changed.
        mockInbox = { ...mockInbox, revision: 2, items: [item] }; update();
        act(() => card.unmount()); const afterPush = row();
        expect(afterPush.root.findAllByType(Pressable)[0].props.disabled).toBe(true);
        act(() => afterPush.root.findAllByType(Pressable)[0].props.onPress());
        expect(mockDispatch).not.toHaveBeenCalled();
        // The later RPC completion actually frees the slot.
        mockInbox = { ...mockInbox, revision: 3, request_busy: false, completed_operation_id: 2 }; update();
        act(() => afterPush.unmount()); const available = row();
        act(() => available.root.findAllByType(Pressable)[0].props.onPress());
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        mockInbox = { ...mockInbox, revision: 4, opened, completed_operation_id: opened.operation_id }; update();
        expect(mockPush).toHaveBeenCalledTimes(1);
        act(() => available.unmount());
    });
    it('retains Open B after push removes B and navigates on its later successful RPC confirmation', () => {
        render(); const card = row();
        act(() => card.root.findAllByType(Pressable)[0].props.onPress());
        mockInbox = { ...mockInbox, revision: 2, request_busy: true, items: [{ ...item, dismissing: true }] }; update();
        // Push does not finish the request even though no busy rows remain.
        mockInbox = { ...mockInbox, revision: 3, items: [] }; update();
        expect(mockPush).not.toHaveBeenCalled();
        mockInbox = { ...mockInbox, revision: 4, request_busy: false, completed_operation_id: opened.operation_id, opened }; update();
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith({ pathname: '/inbox/thread/[threadId]', params: { threadId: 'confirmed' } });
        update(); expect(mockPush).toHaveBeenCalledTimes(1);
        act(() => card.unmount());
    });
    it.each([true, false])('retains a queued noop until coalesced Open completion (opened=%s)', (success) => {
        render(); const card = row();
        mockDispatch.mockImplementation(() => {
            // Another shared operation won the slot after the last idle snapshot.
            mockInbox = { ...mockInbox, revision: 2, request_busy: true };
            return { outcome: 'noop' };
        });
        act(() => card.root.findAllByType(Pressable)[0].props.onPress());
        mockInbox = { ...mockInbox, revision: 3, completed_operation_id: 2 }; update();
        expect(mockPush).not.toHaveBeenCalled();
        // Pending Open starts and finishes in one process batch; no observed B-busy row required.
        mockInbox = { ...mockInbox, revision: 5, request_busy: false, completed_operation_id: opened.operation_id, opened: success ? opened : null }; update();
        expect(mockPush).toHaveBeenCalledTimes(success ? 1 : 0);
        act(() => card.unmount()); const available = row();
        expect(available.root.findAllByType(Pressable)[0].props.disabled).toBe(false);
        act(() => available.unmount());
    });
    it('checks synchronous publications before a stale row handler can queue Open', () => {
        render(); const stale = row();
        // The store has advanced before React re-renders this row.
        mockInbox = { ...mockInbox, request_busy: true, items: [item] };
        act(() => stale.root.findAllByType(Pressable)[0].props.onPress());
        expect(mockDispatch).not.toHaveBeenCalled();
        act(() => stale.unmount());
    });
    it('serializes dismiss, read-all, retry and page demand against an active shared action', () => {
        mockInbox = { ...mockInbox, request_busy: true, items: [item], error: 'page failed' };
        render(); const card = row(); const list = tree.root.findByType(mockList);
        act(() => card.root.findAllByType(Pressable)[1].props.onPress({ stopPropagation: jest.fn() }));
        const readAll = tree.root.findByProps({ accessibilityLabel: 'inboxReadAll' });
        const retry = tree.root.findAllByType(Pressable).find((node) => !node.props.accessibilityLabel)!;
        expect(readAll.props.disabled).toBe(true); expect(retry.props.disabled).toBe(true);
        act(() => { readAll.props.onPress(); retry.props.onPress(); list.props.onEndReached(); });
        expect(mockDispatch).not.toHaveBeenCalled();
        act(() => card.unmount());
    });
    it('blocks repeated and competing handlers immediately after Open, before a render', () => {
        render(); const stale = row();
        act(() => {
            stale.root.findAllByType(Pressable)[0].props.onPress();
            stale.root.findAllByType(Pressable)[0].props.onPress();
            stale.root.findAllByType(Pressable)[1].props.onPress({ stopPropagation: jest.fn() });
            tree.root.findByProps({ accessibilityLabel: 'inboxReadAll' }).props.onPress();
            tree.root.findByType(mockList).props.onEndReached();
        });
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        act(() => stale.unmount());
    });
    it.each(['noop', 'stale', 'rejected'])('does not retain an unaccepted %s Open', (outcome) => {
        mockDispatch.mockReturnValue({ outcome });
        render(); const card = row();
        act(() => card.root.findAllByType(Pressable)[0].props.onPress());
        mockInbox = { ...mockInbox, revision: 2, opened, completed_operation_id: opened.operation_id }; update();
        expect(mockPush).not.toHaveBeenCalled();
        const available = row();
        expect(available.root.findAllByType(Pressable)[0].props.disabled).toBe(false);
        act(() => available.unmount());
        act(() => card.unmount());
    });
    it.each([null, 'RPC failed'])('releases opening after coalesced terminal completion without opened (%s)', (error) => {
        render(); const card = row();
        act(() => card.root.findAllByType(Pressable)[0].props.onPress());
        // Revisions 2 (busy) and 3 (stale completion) may be installed in one process batch.
        mockInbox = { ...mockInbox, revision: 3, items: error ? [] : [item], error, completed_operation_id: 4, request_busy: false }; update();
        expect(mockPush).not.toHaveBeenCalled();
        // A later push can restore the row after an RPC error; it must already be unlocked.
        mockInbox = { ...mockInbox, revision: 4, items: [item], error: null }; update();
        act(() => card.unmount()); const available = row();
        expect(available.root.findAllByType(Pressable)[0].props.disabled).toBe(false);
        act(() => available.unmount());
    });
    it('releases a removed Open without opened only at its terminal watermark', () => {
        render(); const card = row();
        act(() => card.root.findAllByType(Pressable)[0].props.onPress());
        mockInbox = { ...mockInbox, revision: 2, items: [], request_busy: true }; update();
        mockInbox = { ...mockInbox, revision: 3, items: [item] }; update();
        const stillBusy = row();
        expect(stillBusy.root.findAllByType(Pressable)[0].props.disabled).toBe(true);
        mockInbox = { ...mockInbox, revision: 4, request_busy: false, completed_operation_id: 4 }; update();
        act(() => stillBusy.unmount()); const released = row();
        expect(released.root.findAllByType(Pressable)[0].props.disabled).toBe(false);
        expect(mockPush).not.toHaveBeenCalled();
        act(() => { released.unmount(); card.unmount(); });
    });
    it('fills short pages from viewport demand, stops at the cap and resumes after a push shrink', () => {
        render(); const list = () => tree.root.findByType(mockList);
        const entries = (count: number) => Array.from({ length: count }, (_, index) => ({
            ...item, notification: { ...item.notification, runId: `run-${index}` },
        }));
        act(() => list().props.onViewableItemsChanged({ viewableItems: [{ index: 0 }] }));
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        for (const count of [2, 3, 4]) {
            mockInbox = { ...mockInbox, revision: count, items: entries(count), next_cursor: `page-${count + 1}` };
            update();
            act(() => list().props.onViewableItemsChanged({ viewableItems: [{ index: count - 1 }] }));
        }
        expect(mockDispatch).toHaveBeenCalledTimes(3);
        act(() => list().props.onEndReached());
        expect(mockDispatch).toHaveBeenCalledTimes(3);
        mockInbox = { ...mockInbox, revision: 5, items: entries(1) }; update();
        expect(mockDispatch).toHaveBeenCalledTimes(4);
        expect(mockDispatch).toHaveBeenLastCalledWith({ kind: 'load_more', workspace_id: 'workspace' });
    });
    it('deduplicates end demand and resumes immediately after successful Retry without a gesture', () => {
        render(); const list = () => tree.root.findByType(mockList);
        act(() => { list().props.onEndReached(); list().props.onEndReached(); });
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        mockInbox = { ...mockInbox, error: 'failed', revision: 2 }; update();
        act(() => list().props.onEndReached());
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        const retry = tree.root.findAllByType(Pressable).find((node) => !node.props.accessibilityLabel)!;
        act(() => retry.props.onPress());
        expect(mockDispatch).toHaveBeenLastCalledWith({ kind: 'retry', workspace_id: 'workspace' });
        mockInbox = { ...mockInbox, error: null, revision: 3 }; update();
        expect(mockDispatch).toHaveBeenCalledTimes(3);
        expect(mockDispatch).toHaveBeenLastCalledWith({ kind: 'load_more', workspace_id: 'workspace' });
        act(() => list().props.onEndReached());
        expect(mockDispatch).toHaveBeenCalledTimes(3);
    });
});
