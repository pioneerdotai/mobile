import type { TimelineRow } from '@/services/threads/conversation/timeline';
import type { TurnAuthorSnapshot } from '@/client/generated/timeline_row';

export const TIMELINE_AVATAR_SIZE_UNITS = 8;
export const TIMELINE_AVATAR_RAIL_WIDTH_UNITS = 10;
export const TIMELINE_GROUP_VERTICAL_PADDING_UNITS = 3.5;
export const TIMELINE_AVATAR_STICKY_BOTTOM_GAP_UNITS = 1;
export const TIMELINE_AVATAR_BOTTOM_STOP_OFFSET_UNITS = 0;
export const TIMELINE_AGENT_MESSAGE_VERTICAL_PADDING_UNITS = 3;
export const TIMELINE_AGENT_TASK_VERTICAL_PADDING_UNITS = 2;
export const TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS = 2;
export const TIMELINE_RUNNING_ROW_BOTTOM_PADDING_UNITS = 2;
export const TIMELINE_CARD_VERTICAL_MARGIN_UNITS = 1.5;

type UserMessageTimelineRow = Extract<TimelineRow, { type: 'user-message' }>;

export type TimelinePresentationContext = Readonly<{
    taskChildThread: boolean;
}>;

export const DEFAULT_TIMELINE_PRESENTATION_CONTEXT: TimelinePresentationContext = {
    taskChildThread: false,
};

export const TASK_CHILD_TIMELINE_PRESENTATION_CONTEXT: TimelinePresentationContext = {
    taskChildThread: true,
};

export type TimelineAvatarSource =
    | {
          kind: 'historical-user';
          author: UserMessageTimelineRow['author'];
      }
    | {
          kind: 'agent';
          author: TurnAuthorSnapshot | null;
          showsRunningDino: boolean;
      };

export type TimelineAvatarGroup = {
    key: string;
    startIndex: number;
    endIndex: number;
    startKey: string;
    endKey: string;
    bottomInsetUnits: number;
    source: TimelineAvatarSource;
};

export type TimelineRowGroupKind = 'current-user' | 'historical-user' | 'agent';

export type TimelineRowLayout = {
    groupKind: TimelineRowGroupKind;
    compactTopSpacing: boolean;
    startsAvatarGroup: boolean;
};

type TimelineClusterDescriptor = {
    key: string;
    kind: TimelineRowGroupKind;
    avatarSource: TimelineAvatarSource | null;
};

const DEFAULT_ROW_LAYOUT: TimelineRowLayout = {
    groupKind: 'agent',
    compactTopSpacing: false,
    startsAvatarGroup: true,
};

export class TimelineGroupingIndex {
    readonly avatarGroups: readonly TimelineAvatarGroup[];
    readonly renderFingerprint: string;

    private readonly rowLayouts: readonly TimelineRowLayout[];
    private readonly avatarGroupsByRow: readonly (TimelineAvatarGroup | null)[];
    private readonly avatarGroupsByKey: ReadonlyMap<string, TimelineAvatarGroup>;

    private constructor({
        avatarGroups,
        avatarGroupsByKey,
        avatarGroupsByRow,
        renderFingerprint,
        rowLayouts,
    }: {
        avatarGroups: TimelineAvatarGroup[];
        avatarGroupsByKey: Map<string, TimelineAvatarGroup>;
        avatarGroupsByRow: (TimelineAvatarGroup | null)[];
        renderFingerprint: string;
        rowLayouts: TimelineRowLayout[];
    }) {
        this.avatarGroups = avatarGroups;
        this.avatarGroupsByKey = avatarGroupsByKey;
        this.avatarGroupsByRow = avatarGroupsByRow;
        this.renderFingerprint = renderFingerprint;
        this.rowLayouts = rowLayouts;
    }

    static build(
        rows: readonly TimelineRow[],
        currentPrincipalId?: string | null,
        presentationContext: TimelinePresentationContext = DEFAULT_TIMELINE_PRESENTATION_CONTEXT,
    ): TimelineGroupingIndex {
        const descriptors = rows.map((row) => timelineClusterDescriptor(row, currentPrincipalId));
        const rowLayouts = Array<TimelineRowLayout>(rows.length);
        const avatarGroupsByRow = Array<TimelineAvatarGroup | null>(rows.length).fill(null);
        const avatarGroupsByKey = new Map<string, TimelineAvatarGroup>();
        const avatarGroups: TimelineAvatarGroup[] = [];
        const fingerprintParts: string[] = [];

        let index = 0;
        while (index < rows.length) {
            const descriptor = descriptors[index];
            const startIndex = index;
            while (index + 1 < rows.length && descriptors[index + 1].key === descriptor.key) {
                index += 1;
            }
            const endIndex = index;
            const startsAvatarGroup = descriptor.avatarSource !== null;
            const avatarSource =
                descriptor.avatarSource?.kind === 'agent'
                    ? {
                          kind: 'agent' as const,
                          author: descriptor.avatarSource.author,
                          showsRunningDino:
                              presentationContext.taskChildThread &&
                              rows
                                  .slice(startIndex, endIndex + 1)
                                  .some((row) => row.type === 'running'),
                      }
                    : descriptor.avatarSource;

            for (let rowIndex = startIndex; rowIndex <= endIndex; rowIndex += 1) {
                rowLayouts[rowIndex] = {
                    groupKind: descriptor.kind,
                    compactTopSpacing: rowIndex > startIndex,
                    startsAvatarGroup: startsAvatarGroup && rowIndex === startIndex,
                };
            }

            const groupKey = `${descriptor.kind}:${rows[startIndex].key}`;
            const authorFingerprint =
                avatarSource?.kind === 'agent' ? JSON.stringify(avatarSource.author) : '';
            fingerprintParts.push(
                `${groupKey}:${rows[endIndex].key}:${avatarSource?.kind === 'agent' && avatarSource.showsRunningDino ? 'running-dino' : 'avatar'}:${authorFingerprint}`,
            );
            if (avatarSource !== null) {
                const group: TimelineAvatarGroup = {
                    key: groupKey,
                    startIndex,
                    endIndex,
                    startKey: rows[startIndex].key,
                    endKey: rows[endIndex].key,
                    bottomInsetUnits: timelineAvatarGroupBottomInsetUnits(rows[endIndex]),
                    source: avatarSource,
                };
                avatarGroups.push(group);
                avatarGroupsByKey.set(group.key, group);
                for (let rowIndex = startIndex; rowIndex <= endIndex; rowIndex += 1) {
                    avatarGroupsByRow[rowIndex] = group;
                }
            }

            index += 1;
        }

        return new TimelineGroupingIndex({
            avatarGroups,
            avatarGroupsByKey,
            avatarGroupsByRow,
            renderFingerprint: fingerprintParts.join('|'),
            rowLayouts,
        });
    }

    rowLayout(index: number): TimelineRowLayout {
        return this.rowLayouts[index] ?? DEFAULT_ROW_LAYOUT;
    }

    avatarGroupAt(index: number): TimelineAvatarGroup | null {
        return this.avatarGroupsByRow[index] ?? null;
    }

    avatarGroup(key: string): TimelineAvatarGroup | null {
        return this.avatarGroupsByKey.get(key) ?? null;
    }

    visibleAvatarGroupKeys(indices: readonly number[]): string[] {
        const keys: string[] = [];
        const seen = new Set<string>();

        for (const index of [...indices].sort((left, right) => left - right)) {
            const group = this.avatarGroupAt(index);
            if (!group || seen.has(group.key)) continue;
            seen.add(group.key);
            keys.push(group.key);
        }

        return keys;
    }
}

export const isCurrentPrincipalUserMessage = (
    row: TimelineRow,
    currentPrincipalId?: string | null,
): boolean => {
    if (row.type !== 'user-message') return false;

    if (row.author?.actor.kind === 'principal') {
        return row.author.actor.id === currentPrincipalId;
    }
    if (row.author) return false;

    return (
        row.itemId === `user_${row.turnId}` ||
        row.itemId === `turn:${row.turnId}:user` ||
        row.itemId === row.key
    );
};

const timelineClusterDescriptor = (
    row: TimelineRow,
    currentPrincipalId?: string | null,
): TimelineClusterDescriptor => {
    if (row.type === 'user-message') {
        if (isCurrentPrincipalUserMessage(row, currentPrincipalId)) {
            return {
                key: 'current-user',
                kind: 'current-user',
                avatarSource: null,
            };
        }

        const actor = row.author?.actor;
        const actorKey = actor
            ? actor.kind === 'system'
                ? 'system'
                : `${actor.kind}:${actor.id}`
            : `unknown:${row.key}`;
        return {
            key: `historical-user:${actorKey}`,
            kind: 'historical-user',
            avatarSource: { kind: 'historical-user', author: row.author },
        };
    }

    const turnId = timelineRowTurnId(row);
    return {
        key: turnId ? `agent:${turnId}` : `agent:standalone:${row.key}`,
        kind: 'agent',
        avatarSource: {
            kind: 'agent',
            author: timelineRowAgentAuthor(row),
            showsRunningDino: false,
        },
    };
};

const exactAgentAuthor = (
    author: TurnAuthorSnapshot | null | undefined,
): TurnAuthorSnapshot | null => (author?.actor.kind === 'agent_execution' ? author : null);

const timelineRowAgentAuthor = (row: TimelineRow): TurnAuthorSnapshot | null =>
    row.type === 'user-message' ? null : exactAgentAuthor(row.author);

const timelineRowTurnId = (row: Exclude<TimelineRow, { type: 'user-message' }>): string | null => {
    if (!('turnId' in row)) return null;

    const turnId = row.turnId?.trim();
    return turnId || null;
};

const timelineAvatarGroupBottomInsetUnits = (row: TimelineRow): number => {
    switch (row.type) {
        case 'user-message':
            return TIMELINE_GROUP_VERTICAL_PADDING_UNITS;
        case 'assistant-message':
            if (row.taskTimeline) return TIMELINE_AGENT_TASK_VERTICAL_PADDING_UNITS;
            return TIMELINE_AGENT_MESSAGE_VERTICAL_PADDING_UNITS;
        case 'reasoning':
        case 'system-event':
        case 'command-execution':
        case 'file-change':
        case 'tool-call':
        case 'work-group':
        case 'tool-group':
            return TIMELINE_TECHNICAL_ROW_VERTICAL_PADDING_UNITS;
        case 'running':
            return TIMELINE_RUNNING_ROW_BOTTOM_PADDING_UNITS;
        case 'artifact':
        case 'unknown':
            return TIMELINE_CARD_VERTICAL_MARGIN_UNITS;
        case 'task-anchor':
        case 'pending-request':
            return 0;
    }
};
