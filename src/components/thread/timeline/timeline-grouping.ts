import type { TimelineGroup } from '@/client/generated/timeline_snapshot';
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

const DEFAULT_ROW_LAYOUT: TimelineRowLayout = {
    groupKind: 'agent',
    compactTopSpacing: false,
    startsAvatarGroup: true,
};

export class TimelineGroupingIndex {
    readonly avatarGroups: readonly TimelineAvatarGroup[];

    private readonly rowLayouts: readonly TimelineRowLayout[];
    private readonly avatarGroupsByRow: readonly (TimelineAvatarGroup | null)[];
    private readonly avatarGroupsByKey: ReadonlyMap<string, TimelineAvatarGroup>;

    private constructor({
        avatarGroups,
        avatarGroupsByKey,
        avatarGroupsByRow,
        rowLayouts,
    }: {
        avatarGroups: TimelineAvatarGroup[];
        avatarGroupsByKey: Map<string, TimelineAvatarGroup>;
        avatarGroupsByRow: (TimelineAvatarGroup | null)[];
        rowLayouts: TimelineRowLayout[];
    }) {
        this.avatarGroups = avatarGroups;
        this.avatarGroupsByKey = avatarGroupsByKey;
        this.avatarGroupsByRow = avatarGroupsByRow;
        this.rowLayouts = rowLayouts;
    }

    static fromSnapshot(
        rows: readonly TimelineRow[],
        groups: readonly TimelineGroup[],
        _currentPrincipalId?: string | null,
        presentationContext: TimelinePresentationContext = DEFAULT_TIMELINE_PRESENTATION_CONTEXT,
    ): TimelineGroupingIndex {
        const rowLayouts = Array<TimelineRowLayout>(rows.length);
        const avatarGroupsByRow = Array<TimelineAvatarGroup | null>(rows.length).fill(null);
        const avatarGroupsByKey = new Map<string, TimelineAvatarGroup>();
        const avatarGroups: TimelineAvatarGroup[] = [];
        for (const descriptor of groups) {
            const startIndex = descriptor.first_row;
            const endIndex = descriptor.last_row;
            if (!rows[startIndex] || !rows[endIndex]) continue;
            const own = descriptor.current_principal;
            const kind = own
                ? 'current-user'
                : descriptor.user_message
                  ? 'historical-user'
                  : 'agent';
            const avatarSource: TimelineAvatarSource | null = own
                ? null
                : descriptor.user_message
                  ? { kind: 'historical-user', author: descriptor.author ?? null }
                  : {
                        kind: 'agent',
                        author: descriptor.author ?? null,
                        showsRunningDino:
                            presentationContext.taskChildThread && descriptor.has_running,
                    };
            for (let index = startIndex; index <= endIndex; index++) {
                rowLayouts[index] = {
                    groupKind: kind,
                    compactTopSpacing: index > startIndex,
                    startsAvatarGroup: avatarSource !== null && index === startIndex,
                };
            }
            if (avatarSource) {
                const group: TimelineAvatarGroup = {
                    key: `${kind}:${descriptor.id}`,
                    startIndex,
                    endIndex,
                    startKey: rows[startIndex].key,
                    endKey: rows[endIndex].key,
                    bottomInsetUnits: timelineAvatarGroupBottomInsetUnits(rows[endIndex]),
                    source: avatarSource,
                };
                avatarGroups.push(group);
                avatarGroupsByKey.set(group.key, group);
                for (let index = startIndex; index <= endIndex; index++)
                    avatarGroupsByRow[index] = group;
            }
        }
        return new TimelineGroupingIndex({
            avatarGroups,
            avatarGroupsByKey,
            avatarGroupsByRow,
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
