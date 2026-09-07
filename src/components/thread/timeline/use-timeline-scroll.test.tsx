import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, jest } from '@jest/globals';
import type { LegendListRef } from '@legendapp/list/react-native';
import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { useTimelineScroll } from './use-timeline-scroll';

const item = (key: string): TimelineRow =>
    ({ type: 'reasoning', key, turnId: 'turn' }) as TimelineRow;
const worked = {
    type: 'work-group',
    key: 'worked',
    turnId: 'turn',
    expanded: false,
} as TimelineRow;

async function mount() {
    let rows = [item('message'), worked, item('answer'), item('next')];
    let scrollOffset = 0;
    const scrollToIndex = jest.fn(async (params: { index: number; viewOffset?: number }) => {
        scrollOffset = (params.index + 1) * 40 - 120 - (params.viewOffset ?? 0);
    });
    const scrollToOffset = jest.fn(async ({ offset }: { offset: number }) => {
        scrollOffset = offset;
    });
    const ref = {
        current: {
            getState: () => ({
                scroll: scrollOffset,
                scrollLength: 120,
                positionByKey: (key: string) => rows.findIndex((row) => row.key === key) * 40,
                sizeAtIndex: () => 40,
                positionAtIndex: (index: number) => index * 40,
            }),
            scrollToIndex,
            scrollToOffset,
        } as unknown as LegendListRef,
    };
    let scroll!: ReturnType<typeof useTimelineScroll>;
    function Probe({ identity = 'a' }: { identity?: string }) {
        scroll = useTimelineScroll(identity, rows, ref);
        return null;
    }
    let tree!: ReactTestRenderer;
    await act(async () => {
        tree = renderer.create(<Probe />);
    });
    return {
        get scroll() {
            return scroll;
        },
        get rows() {
            return rows;
        },
        get offset() {
            return scrollOffset;
        },
        ref,
        scrollToIndex,
        scrollToOffset,
        async publish(next: TimelineRow[], identity = 'a') {
            rows = next;
            await act(async () => {
                tree.update(<Probe identity={identity} />);
            });
        },
        async unmount() {
            await act(async () => {
                tree.unmount();
            });
        },
    };
}

describe('mobile timeline scroll coordination', () => {
    it('waits for work items and preserves the end of the expanded group', async () => {
        const view = await mount();
        view.scroll.markScrollIntent();
        view.scroll.prepareExpansion(worked, true, view.rows, view.ref.current);
        expect(view.scroll.consumeViewportScrollIntent(view.rows)).toBe(false);
        await view.publish(
            view.rows.map((row) =>
                row.key === worked.key ? ({ ...worked, expanded: true } as TimelineRow) : row,
            ),
        );
        expect(view.scrollToIndex).not.toHaveBeenCalled();
        expect(view.scrollToOffset).not.toHaveBeenCalled();
        await view.publish([
            item('message'),
            worked,
            item('work-1'),
            item('work-2'),
            item('work-3'),
            item('answer'),
            item('next'),
        ]);
        expect(view.scrollToOffset).toHaveBeenCalledTimes(1);
        expect(view.offset).toBe(120);
        expect(5 * 40 - view.offset).toBe(80); // The answer stays at the same viewport position.
        await view.publish([...view.rows]);
        expect(view.scrollToOffset).toHaveBeenCalledTimes(1);
        expect(view.scroll.consumeViewportScrollIntent(view.rows)).toBe(false);
        await view.unmount();
    });

    it('does not turn a gesture received during loading into another page request', async () => {
        const view = await mount();
        view.scroll.markScrollIntent();
        expect(view.scroll.consumeViewportScrollIntent(view.rows)).toBe(true);
        view.scroll.markScrollIntent();
        const next = [item('older'), ...view.rows];
        // LegendList can report viewability before the parent's layout effect.
        expect(view.scroll.consumeViewportScrollIntent(next)).toBe(false);
        await view.publish(next);
        for (let i = 0; i < 3; i++) {
            expect(view.scroll.consumeViewportScrollIntent(next)).toBe(false);
        }
        view.scroll.markScrollIntent();
        expect(view.scroll.consumeViewportScrollIntent(next)).toBe(true);
        expect(view.scrollToIndex).not.toHaveBeenCalled();
        expect(view.scrollToOffset).not.toHaveBeenCalled();
        await view.unmount();
    });

    it('respects a new user gesture while the first work page is loading', async () => {
        const view = await mount();
        view.scroll.prepareExpansion(worked, true, view.rows, view.ref.current);
        view.scroll.markScrollIntent();
        await view.publish([item('message'), worked, item('work-1'), item('answer'), item('next')]);
        expect(view.scrollToIndex).not.toHaveBeenCalled();
        expect(view.scrollToOffset).not.toHaveBeenCalled();
        await view.unmount();
    });

    it('does not carry pending expansion or scroll intent into another thread', async () => {
        const view = await mount();
        view.scroll.markScrollIntent();
        view.scroll.prepareExpansion(worked, true, view.rows, view.ref.current);
        await view.publish([item('message'), worked, item('work-1'), item('answer')], 'b');
        expect(view.scrollToIndex).not.toHaveBeenCalled();
        expect(view.scrollToOffset).not.toHaveBeenCalled();
        expect(view.scroll.consumeViewportScrollIntent(view.rows)).toBe(false);
        await view.unmount();
    });
});
