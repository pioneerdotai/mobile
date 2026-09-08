import { useLayoutEffect, useMemo, type RefObject } from 'react';
import type { LegendListRef } from '@legendapp/list/react-native';
import type { TimelineRow } from '@/services/threads/conversation/timeline';

export const TIMELINE_SCROLL_BEHAVIOR = {
    alignItemsAtEnd: true,
    initialScrollAtEnd: true,
    maintainVisibleContentPosition: {
        data: true,
        scroll: true,
        // Older work is inserted below this header. Anchor the work item that
        // was being read, otherwise the stable header hides the prepend offset.
        shouldRestorePosition: (row: TimelineRow) => row.type !== 'work-group',
    },
    maintainScrollAtEnd: {
        animated: false,
        on: { dataChange: true, itemLayout: true, layout: true },
    },
    maintainScrollAtEndThreshold: 0.12,
} as const;

type ExpansionAnchor = {
    key: string;
    afterKey: string | null;
    boundaryPosition: number | null;
    scrollOffset: number;
};

class TimelineScrollController {
    private previousRows: readonly TimelineRow[] = [];
    private generation = 0;
    private expansion: ExpansionAnchor | null = null;

    constructor(readonly identity: string) {}

    private synchronizeRows(nextRows: readonly TimelineRow[]) {
        if (nextRows === this.previousRows) return;
        this.previousRows = nextRows;
    }

    markScrollIntent = () => {
        this.expansion = null;
        this.generation += 1;
    };

    scrollGeneration = () => this.generation;

    prepareExpansion(
        row: TimelineRow,
        expanded: boolean,
        currentRows: readonly TimelineRow[],
        list: LegendListRef | null,
    ) {
        this.expansion = null;
        if (row.type !== 'work-group' || !expanded) return;
        const index = currentRows.findIndex((item) => item.key === row.key);
        if (index < 0) return;
        const state = list?.getState();
        const position = state?.positionByKey(row.key);
        const size = state?.sizeAtIndex(index);
        this.expansion = {
            key: row.key,
            afterKey: currentRows[index + 1]?.key ?? null,
            boundaryPosition:
                position !== undefined && size !== undefined && Number.isFinite(position + size)
                    ? position + size
                    : null,
            scrollOffset: state?.scroll ?? 0,
        };
    }

    restore(nextRows: readonly TimelineRow[], list: LegendListRef | null) {
        this.synchronizeRows(nextRows);
        const anchor = this.expansion;
        if (!anchor || !list) return;
        const index = nextRows.findIndex((row) => row.key === anchor.key);
        const afterIndex = anchor.afterKey
            ? nextRows.findIndex((row) => row.key === anchor.afterKey)
            : nextRows.length;
        // An expanded header can be published before its first work page.
        if (index < 0 || afterIndex <= index + 1) return;
        const state = list.getState();
        const boundary =
            afterIndex < nextRows.length
                ? state.positionAtIndex(afterIndex)
                : state.positionAtIndex(afterIndex - 1) + state.sizeAtIndex(afterIndex - 1);
        this.expansion = null;
        if (anchor.boundaryPosition !== null && Number.isFinite(boundary)) {
            // Use a content-coordinate delta: header/padding/keyboard insets must
            // not be added a second time by scroll-to-item alignment.
            void list.scrollToOffset({
                animated: false,
                offset: anchor.scrollOffset + boundary - anchor.boundaryPosition,
            });
        } else {
            void list.scrollToIndex({ animated: false, index: afterIndex - 1, viewPosition: 1 });
        }
    }
}

// The mounted timeline owns geometry and gestures; the shared client owns pages.
export function useTimelineScroll(
    identity: string,
    rows: readonly TimelineRow[],
    listRef: RefObject<LegendListRef | null>,
) {
    const scroll = useMemo(() => new TimelineScrollController(identity), [identity]);
    useLayoutEffect(() => {
        scroll.restore(rows, listRef.current);
    }, [listRef, rows, scroll]);
    return scroll;
}
