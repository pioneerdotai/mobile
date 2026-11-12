import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, jest } from '@jest/globals';

const mockPush = jest.fn();
let mockPath = '/';
let mockCount = 125;
let mockEnabled = true;
const mockBase = (props: any) => React.createElement('HeaderButton', props);
jest.mock('./base-icon-button', () => ({ BaseIconButton: mockBase }));
jest.mock('expo-router', () => ({ router: { push: mockPush }, usePathname: () => mockPath }));
jest.mock('@/client/task-inbox', () => ({ useTaskInbox: () => ({ unread_count: mockCount, items: [] }) }));
jest.mock('@/services/tasks/inbox-scope', () => ({ useInboxScope: () => ({ enabled: mockEnabled, workspaceId: 'workspace' }) }));
jest.mock('@/components/primitives/text', () => ({ Text: (props: any) => require('react').createElement('Label', props) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, options?: any) => options ? `${key}:${options.count}` : key }) }));
jest.mock('react-native-unistyles', () => ({ StyleSheet: { create: () => ({}) }, useUnistyles: () => ({ theme: { colors: { background: 'white', neutral: {}, lime: {}, red: {} } } }) }));
jest.mock('@/hooks/use-screen', () => ({ useScreen: () => ({ options: {} }) }));
jest.mock('@/stores/gateway', () => ({ useGatewayStore: (selector: any) => selector({ connectionState: 'Idle', registry: {} }) }));
const { useHomeTab } = require('@/screens/home/hooks');
const { useThreadsFolderScreen } = require('@/screens/threads/folder/hooks');
const { InboxButton } = require('./inbox');

// Exercises both header owners with the shared server count, including nested folders.
describe('thread list inbox headers', () => {
    it.each(['/', '/threads/folder', '/threads/nested-folder'])('opens from %s without depending on loaded rows', (path) => {
        mockPath = path; mockCount = 125; mockEnabled = true; mockPush.mockClear();
        const Header = () => {
            const home = useHomeTab(); const folder = useThreadsFolderScreen();
            return (path === '/' ? home : folder).options.headerRight();
        };
        let tree: ReactTestRenderer;
        act(() => { tree = create(<Header />); });
        expect(tree!.root.findByType(mockBase).props.accessibilityLabel).toBe('inboxOpen:125');
        expect(tree!.root.findByType('Label').props.children).toBe('99+');
        act(() => tree!.root.findByType(mockBase).props.onPressHandler());
        expect(mockPush).toHaveBeenCalledWith({ pathname: '/inbox', params: { returnTo: path } });
        act(() => tree!.unmount());
    });
    it('keeps the bell at zero and hides it outside an authorized connection', () => {
        mockCount = 0; mockEnabled = true;
        let tree: ReactTestRenderer;
        act(() => { tree = create(<InboxButton />); });
        expect(tree!.root.findAllByType(mockBase)).toHaveLength(1);
        expect(tree!.root.findAllByType('Label')).toHaveLength(0);
        mockEnabled = false;
        act(() => tree!.update(<InboxButton />));
        expect(tree!.toJSON()).toBeNull();
        act(() => tree!.unmount());
    });
});
