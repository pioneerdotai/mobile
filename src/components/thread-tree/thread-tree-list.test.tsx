import React from 'react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { FlashList } from '@shopify/flash-list';
import type { Thread, ThreadFolder } from '@/client';
import { ThreadTreeList } from './thread-tree-list';

jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: () => ({}) },
    useUnistyles: () => ({
        rt: { themeName: 'dark' },
        theme: {
            space: (n: number) => n * 4,
            colors: { typography: 'white', background: 'black' },
        },
    }),
}));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_: string, { count }: { count: number }) => `${count} unread` }),
}));
jest.mock('lucide-react-native', () => ({
    ChevronRight: () => null,
    Folder: () => null,
    FileText: () => null,
}));
jest.mock('@/services/threads/tree', () => ({ threadTitle: (thread: Thread) => thread.name }));
jest.mock('@/components/feedback/spinner', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/primitives/box', () => ({
    Box: (props: { children?: React.ReactNode }) => {
        const React = jest.requireActual<typeof import('react')>('react');
        return React.createElement('Box', props, props.children);
    },
}));
jest.mock('@/components/primitives/hstack', () => ({
    HStack: (props: { children?: React.ReactNode }) => {
        const React = jest.requireActual<typeof import('react')>('react');
        return React.createElement('HStack', props, props.children);
    },
}));
jest.mock('@/components/primitives/vstack', () => ({
    VStack: (props: { children?: React.ReactNode }) => {
        const React = jest.requireActual<typeof import('react')>('react');
        return React.createElement('VStack', props, props.children);
    },
}));
jest.mock('@/components/primitives/text', () => ({
    Text: (props: { children?: React.ReactNode }) => {
        const React = jest.requireActual<typeof import('react')>('react');
        return React.createElement('Text', props, props.children);
    },
}));
jest.mock('@/components/primitives/pressable', () => ({
    Pressable: (props: { children?: React.ReactNode }) => {
        const React = jest.requireActual<typeof import('react')>('react');
        return React.createElement('Pressable', props, props.children);
    },
}));
jest.mock('@shopify/flash-list', () => ({
    FlashList: (props: {
        data: { id: string }[];
        renderItem: (args: object) => React.ReactNode;
    }) => {
        const React = jest.requireActual<typeof import('react')>('react');
        return React.createElement(
            React.Fragment,
            null,
            ...props.data.map((item, index) =>
                React.createElement(
                    React.Fragment,
                    { key: item.id },
                    props.renderItem({ item, index, target: 'Cell' }),
                ),
            ),
        );
    },
}));

describe('folder unread badges in every tree level', () => {
    let tree: ReactTestRenderer | null = null;
    afterEach(() => {
        act(() => tree?.unmount());
        tree = null;
    });
    const folders = [{ id: 'work', name: 'Long folder name' }] as ThreadFolder[];
    const threads = [{ id: 'thread', name: 'Thread' }] as Thread[];
    const props = {
        agentsDocLabel: 'AGENTS.md',
        emptyLabel: 'Empty',
        errorLabel: 'Error',
        loading: false,
        onFolderPress: jest.fn<(id: string) => void>(),
        showAgentsDoc: false,
        untitledLabel: 'Untitled',
        folders,
        threads,
        unreadByThreadId: { thread: 2 },
    };
    const labels = () =>
        tree!.root
            .findAll(
                (node) =>
                    typeof node.type === 'string' &&
                    typeof node.props.accessibilityLabel === 'string',
            )
            .map((node) => node.props.accessibilityLabel);

    it('updates badges and list extraData when only folder sums change, then removes zero badges', () => {
        act(() => {
            tree = renderer.create(<ThreadTreeList {...props} unreadByFolderId={{ work: 9 }} />);
        });
        expect(labels()).toEqual(['9 unread', '2 unread']);
        const rows = tree!.root.findByType(FlashList).props.data;
        const next = { work: 12 };
        act(() => {
            tree!.update(<ThreadTreeList {...props} unreadByFolderId={next} />);
        });
        expect(labels()).toEqual(['12 unread', '2 unread']);
        expect(tree!.root.findByType(FlashList).props.data).toBe(rows);
        expect(tree!.root.findByType(FlashList).props.extraData.unreadByFolderId).toBe(next);
        act(() => {
            tree!.update(<ThreadTreeList {...props} unreadByFolderId={{ work: 0 }} />);
        });
        expect(labels()).toEqual(['2 unread']);
    });

    it('uses the supplied total for nested folder rows and keeps folder navigation', () => {
        act(() => {
            tree = renderer.create(
                <ThreadTreeList
                    {...props}
                    threads={[]}
                    folders={[{ id: 'archive', name: 'Archive' }] as ThreadFolder[]}
                    unreadByFolderId={{ work: 9, projects: 7, archive: 4 }}
                />,
            );
        });
        expect(labels()).toEqual(['4 unread']);
        const row = tree!.root.find(
            (node) => typeof node.type === 'string' && node.props.accessibilityRole === 'button',
        );
        act(() => row.props.onPress());
        expect(props.onFolderPress).toHaveBeenCalledWith('archive');
    });
});
