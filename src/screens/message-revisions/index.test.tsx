import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, jest } from '@jest/globals';

import { dispatchMessageRevisions, useMessageRevisions } from '@/client/message-revisions';
import MessageRevisionsScreen, { formatRevisionDate } from './index';

jest.mock('@/client/message-revisions', () => ({
    useMessageRevisions: jest.fn(),
    dispatchMessageRevisions: jest.fn(),
}));
jest.mock('@shopify/flash-list', () => ({ FlashList: 'FlashList' }));
jest.mock('react-native-unistyles', () => ({
    StyleSheet: {
        create: () =>
            new Proxy(
                {},
                {
                    get: () => ({}),
                },
            ),
    },
    useUnistyles: () => ({ theme: { colors: { typography: '#fff' } } }),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/components/feedback/spinner', () => ({ __esModule: true, default: 'Spinner' }));
jest.mock('@/components/primitives/box', () => ({ Box: 'Box' }));
jest.mock('@/components/primitives/pressable', () => ({ Pressable: 'Pressable' }));
jest.mock('@/components/primitives/text', () => ({ Text: 'Text' }));
jest.mock('@/components/primitives/vstack', () => ({ VStack: 'VStack' }));

const FlashListMock = 'FlashList' as unknown as React.ElementType;

const renderElement = async (element: React.ReactElement): Promise<ReactTestRenderer> => {
    let tree: ReactTestRenderer;
    await act(async () => {
        tree = renderer.create(element);
    });
    return tree!;
};

describe('mobile Message revision history screen', () => {
    it('paginates disclosed content and keeps redacted content hidden', async () => {
        const identity = { thread_id: 'thread-a', turn_id: 'turn-a', generation: 7 };
        const first = {
            revision: 1,
            change_kind: 'edit',
            changed_by: { kind: 'principal', id: 'principal-a' },
            created_at: 1,
            text: 'First disclosed version',
            mentions: [],
            content_redacted: false,
        };
        const redacted = {
            revision: 0,
            change_kind: 'delete',
            changed_by: { kind: 'system' },
            created_at: 0,
            text: 'must not render',
            mentions: [{ principal_id: 'secret', nickname: 'secret' }],
            content_redacted: true,
        };
        const publication = {
            identity,
            revision: 2,
            request_generation: 8,
            state: 'ready',
            page: {
                thread_id: 'thread-a',
                turn_id: 'turn-a',
                workspace_id: 'workspace-a',
                revisions: [first],
                next_cursor: 'cursor-2',
            },
        };
        jest.mocked(useMessageRevisions).mockReturnValue(publication as never);

        let tree: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<MessageRevisionsScreen threadId="thread-a" turnId="turn-a" />);
        });

        let list = tree!.root.findByType(FlashListMock);
        const firstRevision = await renderElement(
            list.props.renderItem({ item: list.props.data[0], index: 0 }),
        );
        const firstOutput = JSON.stringify(firstRevision.toJSON());
        expect(firstOutput).toContain('First disclosed version');
        expect(firstOutput).not.toContain('principal-a');
        expect(firstOutput).not.toContain('timelineMessageHistoryRevision');

        const footer = await renderElement(list.props.ListFooterComponent);
        await act(async () => {
            footer.root
                .find((node) => node.props.children === 'timelineMessageHistoryMore')
                .parent!.props.onPress();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(dispatchMessageRevisions).toHaveBeenLastCalledWith({ kind: 'more', identity });
        jest.mocked(useMessageRevisions).mockReturnValue({
            ...publication,
            revision: 3,
            page: { ...publication.page, revisions: [first, redacted], next_cursor: null },
        } as never);
        await act(async () =>
            tree!.update(<MessageRevisionsScreen threadId="thread-a" turnId="turn-a" />),
        );
        list = tree!.root.findByType(FlashListMock);
        expect(list.props.data).toHaveLength(2);

        const redactedRevision = await renderElement(
            list.props.renderItem({ item: list.props.data[1], index: 1 }),
        );
        const redactedOutput = JSON.stringify(redactedRevision.toJSON());
        expect(redactedOutput).toContain('timelineMessageHistoryRedacted');
        expect(redactedOutput).not.toContain('must not render');
        expect(redactedOutput).not.toContain('@secret');
        await act(async () => {
            tree.unmount();
            firstRevision.unmount();
            footer.unmount();
            redactedRevision.unmount();
        });
    });

    it('interprets the protocol timestamp as Unix seconds', () => {
        expect(formatRevisionDate(1)).toBe(new Date(1_000).toLocaleString());
    });
});
