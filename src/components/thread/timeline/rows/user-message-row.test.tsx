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
    Video: () => null,
    Zap: () => null,
}));
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));
jest.mock('@/components/icons/mcp-icon', () => ({ McpIcon: () => null }));
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
});
