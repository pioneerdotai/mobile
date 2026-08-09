import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, jest } from '@jest/globals';

import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { UserMessageRow } from './user-message-row';

jest.mock('react-native-unistyles', () => ({
    StyleSheet: { create: (styles: unknown) => styles },
    useUnistyles: () => ({
        theme: {
            space: () => 14,
            colors: {
                textMuted: '#777',
            },
        },
    }),
}));
jest.mock('lucide-react-native', () => ({
    FileAudio: () => null,
    FileText: () => null,
    Image: () => null,
    Pencil: () => null,
    Reply: () => null,
    Trash2: () => null,
    Video: () => null,
    Zap: () => null,
}));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));
jest.mock('@/components/icons/mcp-icon', () => ({ McpIcon: () => null }));
jest.mock('@/components/member-avatar', () => ({ MemberAvatar: () => null }));
jest.mock('@/components/primitives/box', () => ({ Box: 'Box' }));
jest.mock('@/components/primitives/hstack', () => ({ HStack: 'HStack' }));
jest.mock('@/components/primitives/pressable', () => ({ Pressable: 'Pressable' }));
jest.mock('@/components/primitives/text', () => ({ Text: 'Text' }));
jest.mock('@/components/primitives/vstack', () => ({ VStack: 'VStack' }));
jest.mock('./markdown-content', () => ({ MarkdownContent: () => null }));
jest.mock('./timeline-copy-button', () => ({ TimelineCopyButton: () => null }));

describe('mobile user message pack chips', () => {
    it('renders one full-pack chip and individual partial and standalone labels', async () => {
        const row: Extract<TimelineRow, { type: 'user-message' }> = {
            type: 'user-message',
            key: 'user-message:user_turn',
            itemId: 'user_turn',
            turnId: 'turn',
            text: 'research',
            timestampLabel: '',
            mode: 'Message',
            author: null,
            reply: null,
            replyState: null,
            mentions: [],
            revision: 0,
            edited: false,
            deleted: false,
            attachments: [
                {
                    id: 'skill-pack:PPPPPPPPPPPPPPPPPPPPP',
                    label: 'Research Pack',
                    kind: 'skill',
                    artifact: null,
                },
                {
                    id: 'skill:SSSSSSSSSSSSSSSSSSSSS',
                    label: 'Research Pack / Search',
                    kind: 'skill',
                    artifact: null,
                },
                {
                    id: 'skill:DDDDDDDDDDDDDDDDDDDDD',
                    label: 'Docs',
                    kind: 'skill',
                    artifact: null,
                },
            ],
        };
        let tree: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<UserMessageRow row={row} />);
        });

        const output = JSON.stringify(tree!.toJSON());
        expect(output.match(/Research Pack/g)).toHaveLength(2);
        expect(output).toContain('Research Pack / Search');
        expect(output).toContain('Docs');
        expect(output.match(/skill-pack:/g)).toBeNull();
    });

    it('renders authoritative author and reply while delegating the long press', async () => {
        const longPress = jest.fn();
        const row: Extract<TimelineRow, { type: 'user-message' }> = {
            type: 'user-message',
            key: 'user-message:user_turn',
            itemId: 'user_turn',
            turnId: 'turn',
            text: 'hello',
            timestampLabel: '12:00',
            attachments: [],
            mode: 'Message',
            author: {
                actor: { kind: 'principal', id: 'principal-a' },
                display_name: 'Historical Name',
                nickname: 'historical',
                avatar_revision: null,
            },
            reply: { turnId: 'parent', text: 'parent text', deleted: false, author: null },
            replyState: 'available',
            mentions: [{ principal_id: 'principal-b', nickname: 'friend' }],
            revision: 2,
            edited: true,
            deleted: false,
        };
        let tree: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(
                <UserMessageRow
                    row={row}
                    currentPrincipalId="principal-a"
                    onLongPress={longPress}
                />,
            );
        });

        const output = JSON.stringify(tree!.toJSON());
        expect(output).not.toContain('Historical Name · @historical');
        expect(output).toContain('parent text');
        expect(output).not.toContain('@friend');
        expect(output).not.toContain('timelineMessageEdited');
        expect(output).not.toContain('timelineMessageReplyAction');
        expect(output).not.toContain('timelineMessageEditAction');
        expect(output).not.toContain('timelineMessageDeleteAction');

        await act(async () => {
            tree!.root
                .find(
                    (node) =>
                        node.props.delayLongPress === 300 &&
                        typeof node.props.onLongPress === 'function',
                )
                .props.onLongPress();
        });
        expect(longPress).toHaveBeenCalledWith(row);
    });

    it('renders a tombstone without leaked message text or mentions', async () => {
        const row: Extract<TimelineRow, { type: 'user-message' }> = {
            type: 'user-message',
            key: 'user-message:deleted',
            itemId: 'deleted',
            turnId: 'turn-deleted',
            text: 'secret',
            timestampLabel: '',
            attachments: [
                {
                    id: 'artifact-secret',
                    label: 'secret.pdf',
                    kind: 'artifact',
                    artifact: null,
                },
            ],
            mode: 'Message',
            author: null,
            reply: null,
            replyState: null,
            mentions: [],
            revision: 3,
            edited: true,
            deleted: true,
        };
        let tree: ReactTestRenderer;
        await act(async () => {
            tree = renderer.create(<UserMessageRow row={row} />);
        });

        const output = JSON.stringify(tree!.toJSON());
        expect(output).toContain('timelineMessageDeleted');
        expect(output).not.toContain('secret');
    });
});
