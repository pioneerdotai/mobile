import { describe, expect, it } from '@jest/globals';

import type { TimelineRow } from '@/services/threads/conversation/timeline';

import {
    TIMELINE_AGENT_MESSAGE_VERTICAL_PADDING_UNITS,
    TIMELINE_GROUP_VERTICAL_PADDING_UNITS,
    TIMELINE_RUNNING_ROW_BOTTOM_PADDING_UNITS,
    TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS,
    TASK_CHILD_TIMELINE_PRESENTATION_CONTEXT,
    TimelineGroupingIndex,
} from './timeline-grouping';

const timelineRow = (value: Record<string, unknown>): TimelineRow => value as TimelineRow;

const userMessage = ({
    authorId,
    avatarRevision = null,
    displayName,
    key,
    nickname,
    optimistic = false,
}: {
    authorId?: string;
    avatarRevision?: string | null;
    displayName?: string;
    key: string;
    nickname?: string;
    optimistic?: boolean;
}): TimelineRow => {
    const turnId = `turn-${key}`;
    return timelineRow({
        type: 'user-message',
        key,
        itemId: optimistic ? `user_${turnId}` : `item-${key}`,
        turnId,
        author: authorId
            ? {
                  actor: { kind: 'principal', id: authorId },
                  display_name: displayName ?? authorId,
                  nickname: nickname ?? authorId,
                  avatar_revision: avatarRevision,
              }
            : null,
    });
};

describe('TimelineGroupingIndex', () => {
    it('compacts consecutive current-principal messages without creating an avatar group', () => {
        const rows = [
            userMessage({ key: 'one', optimistic: true }),
            userMessage({ key: 'two', optimistic: true }),
        ];

        const grouping = TimelineGroupingIndex.build(rows, 'current-principal');

        expect(grouping.rowLayout(0)).toEqual({
            groupKind: 'current-user',
            compactTopSpacing: false,
            startsAvatarGroup: false,
        });
        expect(grouping.rowLayout(1).compactTopSpacing).toBe(true);
        expect(grouping.avatarGroups).toHaveLength(0);
    });

    it('groups only consecutive historical messages from the same author', () => {
        const rows = [
            userMessage({ key: 'alice-one', authorId: 'alice' }),
            userMessage({ key: 'alice-two', authorId: 'alice' }),
            userMessage({ key: 'bob', authorId: 'bob' }),
            userMessage({ key: 'alice-three', authorId: 'alice' }),
        ];

        const grouping = TimelineGroupingIndex.build(rows, 'current-principal');

        expect(
            grouping.avatarGroups.map(({ startIndex, endIndex }) => [startIndex, endIndex]),
        ).toEqual([
            [0, 1],
            [2, 2],
            [3, 3],
        ]);
        expect(grouping.rowLayout(0).startsAvatarGroup).toBe(true);
        expect(grouping.rowLayout(1).compactTopSpacing).toBe(true);
        expect(grouping.rowLayout(1).startsAvatarGroup).toBe(false);
        expect(grouping.avatarGroups[0].bottomInsetUnits).toBe(
            TIMELINE_GROUP_VERTICAL_PADDING_UNITS,
        );
    });

    it('keeps profile revisions from the same principal in one group', () => {
        const rows = [
            userMessage({
                key: 'before',
                authorId: 'alice',
                displayName: 'Alice',
                nickname: 'alice',
                avatarRevision: 'old-avatar',
            }),
            userMessage({
                key: 'after',
                authorId: 'alice',
                displayName: 'Alicia',
                nickname: 'alicia',
                avatarRevision: 'new-avatar',
            }),
        ];

        const grouping = TimelineGroupingIndex.build(rows, 'current-principal');

        expect(
            grouping.avatarGroups.map(({ startIndex, endIndex }) => [startIndex, endIndex]),
        ).toEqual([[0, 1]]);
        expect(grouping.rowLayout(1)).toEqual({
            groupKind: 'historical-user',
            compactTopSpacing: true,
            startsAvatarGroup: false,
        });
        expect(grouping.avatarGroups[0].source).toEqual({
            kind: 'historical-user',
            author: expect.objectContaining({
                display_name: 'Alice',
                nickname: 'alice',
                avatar_revision: 'old-avatar',
            }),
        });
    });

    it('keeps a system-authored task-child input attributed to system', () => {
        const childInput = timelineRow({
            type: 'user-message',
            key: 'turn:child-turn:user',
            itemId: 'durable-child-input',
            turnId: 'child-turn',
            author: {
                actor: { kind: 'system' },
                display_name: 'System',
                nickname: 'system',
                avatar_revision: null,
            },
        });
        const otherUser = userMessage({ key: 'other-user', authorId: 'other-principal' });

        const standard = TimelineGroupingIndex.build([childInput], 'current-principal');
        const child = TimelineGroupingIndex.build(
            [childInput, otherUser],
            'current-principal',
            TASK_CHILD_TIMELINE_PRESENTATION_CONTEXT,
        );

        expect(standard.rowLayout(0).groupKind).toBe('historical-user');
        expect(child.rowLayout(0)).toEqual({
            groupKind: 'historical-user',
            compactTopSpacing: false,
            startsAvatarGroup: true,
        });
        expect(child.avatarGroups).toHaveLength(2);
        expect(child.avatarGroups[0].source).toEqual({
            kind: 'historical-user',
            author: childInput.author,
        });
    });

    it('keeps an agent-authored task-child input attributed to the exact agent', () => {
        const author = {
            actor: { kind: 'agent_execution' as const, id: 'E12345678901234567890' },
            display_name: 'Planner',
            nickname: 'planner',
            avatar_revision: 'avatar-2',
            agent: {
                agent_identity_id: 'A12345678901234567890',
                agent_execution_id: 'E12345678901234567890',
                identity_source_kind: 'cli_runtime_instance' as const,
                identity_source_revision: 2,
                display_name: 'Planner',
                nickname: 'planner',
                avatar_revision: 'avatar-2',
                role_label: 'Coordinator',
            },
        };
        const row = timelineRow({
            type: 'user-message',
            key: 'agent-input',
            itemId: 'user_child-turn',
            turnId: 'child-turn',
            author,
        });

        const rootGrouping = TimelineGroupingIndex.build([row], 'current-principal');
        const childGrouping = TimelineGroupingIndex.build(
            [row],
            'current-principal',
            TASK_CHILD_TIMELINE_PRESENTATION_CONTEXT,
        );

        expect(rootGrouping.rowLayout(0)).toEqual({
            groupKind: 'historical-user',
            compactTopSpacing: false,
            startsAvatarGroup: true,
        });
        expect(rootGrouping.avatarGroups[0].source).toEqual({
            kind: 'historical-user',
            author,
        });
        expect(childGrouping.rowLayout(0)).toEqual({
            groupKind: 'historical-user',
            compactTopSpacing: false,
            startsAvatarGroup: true,
        });
        expect(childGrouping.avatarGroups).toHaveLength(1);
        expect(childGrouping.avatarGroups[0].source).toEqual({
            kind: 'historical-user',
            author,
        });
    });

    it('keeps agent output and technical rows from one turn in one group', () => {
        const rows = [
            timelineRow({ type: 'assistant-message', key: 'answer', turnId: 'turn-a' }),
            timelineRow({ type: 'tool-call', key: 'tool', turnId: 'turn-a' }),
            timelineRow({ type: 'task-anchor', key: 'child-thread', turnId: 'turn-a' }),
            timelineRow({ type: 'running', key: 'running', turnId: 'turn-b' }),
        ];

        const grouping = TimelineGroupingIndex.build(rows, 'current-principal');

        expect(
            grouping.avatarGroups.map(({ source, startIndex, endIndex }) => ({
                source: source.kind,
                startIndex,
                endIndex,
            })),
        ).toEqual([
            { source: 'agent', startIndex: 0, endIndex: 2 },
            { source: 'agent', startIndex: 3, endIndex: 3 },
        ]);
        expect(grouping.rowLayout(0).startsAvatarGroup).toBe(true);
        expect(grouping.rowLayout(1).compactTopSpacing).toBe(true);
        expect(grouping.rowLayout(2).compactTopSpacing).toBe(true);
        expect(grouping.rowLayout(3).compactTopSpacing).toBe(false);
        expect(grouping.avatarGroups[0].bottomInsetUnits).toBe(0);
        expect(grouping.avatarGroups[1].bottomInsetUnits).toBe(
            TIMELINE_RUNNING_ROW_BOTTOM_PADDING_UNITS,
        );
    });

    it('shows the running dino only for the active agent group in a child thread', () => {
        const rows = [
            timelineRow({ type: 'assistant-message', key: 'answer', turnId: 'turn-a' }),
            timelineRow({ type: 'running', key: 'running', turnId: 'turn-b' }),
        ];

        const rootGrouping = TimelineGroupingIndex.build(rows, 'current-principal');
        const childGrouping = TimelineGroupingIndex.build(
            rows,
            'current-principal',
            TASK_CHILD_TIMELINE_PRESENTATION_CONTEXT,
        );

        expect(rootGrouping.avatarGroups.map(({ source }) => source)).toEqual([
            { kind: 'agent', author: null, showsRunningDino: false },
            { kind: 'agent', author: null, showsRunningDino: false },
        ]);
        expect(childGrouping.avatarGroups.map(({ source }) => source)).toEqual([
            { kind: 'agent', author: null, showsRunningDino: false },
            { kind: 'agent', author: null, showsRunningDino: true },
        ]);
    });

    it('uses the live responding agent snapshot for the running avatar group', () => {
        const author = {
            actor: { kind: 'agent_execution' as const, id: 'execution-responding' },
            display_name: 'Researcher',
            nickname: 'researcher',
            agent: {
                agent_execution_id: 'execution-responding',
                agent_identity_id: 'identity-responding',
                identity_source_kind: 'cli_runtime_instance' as const,
                identity_source_revision: 7,
                display_name: 'Researcher',
                nickname: 'researcher',
                role_label: 'Researcher',
            },
        };
        const grouping = TimelineGroupingIndex.build(
            [
                timelineRow({
                    type: 'running',
                    key: 'running',
                    turnId: 'turn-b',
                    author: author,
                }),
            ],
            'current-principal',
            TASK_CHILD_TIMELINE_PRESENTATION_CONTEXT,
        );

        expect(grouping.avatarGroups[0].source).toEqual({
            kind: 'agent',
            author,
            showsRunningDino: true,
        });
    });

    it('keeps ready authored rows in one stable turn group', () => {
        const author = {
            actor: { kind: 'agent_execution' as const, id: 'execution-responding' },
            display_name: 'Researcher',
            nickname: 'researcher',
            agent: {
                agent_execution_id: 'execution-responding',
                agent_identity_id: 'identity-responding',
                identity_source_kind: 'cli_runtime_instance' as const,
                identity_source_revision: 7,
                display_name: 'Researcher',
                nickname: 'researcher',
                role_label: 'Researcher',
            },
        };
        const rows = [
            timelineRow({
                type: 'work-group',
                key: 'work',
                turnId: 'turn-a',
                author: author,
            }),
            timelineRow({
                type: 'running',
                key: 'running',
                turnId: 'turn-a',
                author: author,
            }),
            timelineRow({
                type: 'assistant-message',
                key: 'answer',
                turnId: 'turn-a',
                author: author,
            }),
        ];

        const grouping = TimelineGroupingIndex.build(rows, 'current-principal');

        expect(grouping.avatarGroups).toHaveLength(1);
        expect(grouping.avatarGroups[0]).toMatchObject({
            startIndex: 0,
            endIndex: 2,
            source: { kind: 'agent', author, showsRunningDino: false },
        });
        expect(grouping.rowLayout(1).compactTopSpacing).toBe(true);
        expect(grouping.rowLayout(2).compactTopSpacing).toBe(true);
    });

    it('uses the rendered footer and bottom padding as the group bottom inset', () => {
        const rows = [
            timelineRow({
                type: 'assistant-message',
                key: 'final-answer',
                turnId: 'turn-final',
                phase: 'final_answer',
                taskTimeline: false,
            }),
            timelineRow({
                type: 'assistant-message',
                key: 'commentary',
                turnId: 'turn-commentary',
                phase: 'commentary',
                taskTimeline: false,
            }),
            timelineRow({ type: 'tool-call', key: 'tool', turnId: 'turn-tool' }),
        ];

        const grouping = TimelineGroupingIndex.build(rows, null);

        expect(grouping.avatarGroups.map((group) => group.bottomInsetUnits)).toEqual([
            TIMELINE_AGENT_MESSAGE_VERTICAL_PADDING_UNITS,
            TIMELINE_AGENT_MESSAGE_VERTICAL_PADDING_UNITS,
            TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS,
        ]);
    });

    it('treats rows without a turn id as standalone agent groups', () => {
        const rows = [
            timelineRow({ type: 'artifact', key: 'artifact-one' }),
            timelineRow({ type: 'artifact', key: 'artifact-two' }),
        ];

        const grouping = TimelineGroupingIndex.build(rows, null);

        expect(grouping.avatarGroups).toHaveLength(2);
        expect(grouping.rowLayout(0).compactTopSpacing).toBe(false);
        expect(grouping.rowLayout(1).compactTopSpacing).toBe(false);
    });
});
