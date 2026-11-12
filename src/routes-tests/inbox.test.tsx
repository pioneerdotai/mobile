import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, jest } from '@jest/globals';
const mockDismissTo = jest.fn();
let mockScope = { key: 'connection-a/workspace-a', enabled: true };
const mockNavigator = () => React.createElement('ThreadNavigator');
jest.mock('expo-router', () => ({ router: { dismissTo: mockDismissTo }, useLocalSearchParams: () => ({ returnTo: '/threads/nested-folder' }) }));
jest.mock('@/services/tasks/inbox-scope', () => ({ useInboxScope: () => mockScope }));
jest.mock('@/routes/thread/_layout', () => ({ __esModule: true, default: mockNavigator }));
const InboxLayout = require('@/routes/inbox/_layout').default;
describe('inbox route scope lifetime', () => {
    it('removes the entire stale chat stack and returns to its originating folder', () => {
        mockDismissTo.mockClear(); mockScope = { key: 'connection-a/workspace-a', enabled: true };
        let tree: ReactTestRenderer;
        act(() => { tree = create(<InboxLayout />); });
        expect(tree!.root.findAllByType(mockNavigator)).toHaveLength(1);
        mockScope = { key: 'connection-b/workspace-b', enabled: true };
        act(() => tree!.update(<InboxLayout />));
        expect(tree!.toJSON()).toBeNull();
        expect(mockDismissTo).toHaveBeenCalledWith('/threads/nested-folder');
        act(() => tree!.unmount());
    });
});
