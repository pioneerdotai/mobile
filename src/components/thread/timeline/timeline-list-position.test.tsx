import React, { useRef } from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { StyleSheet, View } from 'react-native';
import { LegendList, type LegendListRef } from '@legendapp/list/react-native';
import type { TimelineRow } from '@/services/threads/conversation/timeline';
import { TIMELINE_SCROLL_BEHAVIOR, useTimelineScroll } from './use-timeline-scroll';

const item = (key: string): TimelineRow =>
    ({ type: 'reasoning', key, turnId: 'turn' }) as TimelineRow;
const page = (count = 20) => Array.from({ length: count }, (_, i) => item(`row-${i}`));

async function mount(initialRows: TimelineRow[], topInset = 0) {
    let rows = initialRows;
    let identity = 'a';
    const onLoad = jest.fn();
    let list!: LegendListRef;
    let scroll!: ReturnType<typeof useTimelineScroll>;
    function Content() {
        const ref = useRef<LegendListRef | null>(null);
        scroll = useTimelineScroll(identity, rows, ref);
        return (
            <LegendList
                {...TIMELINE_SCROLL_BEHAVIOR}
                ref={(value) => {
                    ref.current = value;
                    list = value!;
                }}
                onLoad={onLoad}
                data={rows}
                contentContainerStyle={{ paddingTop: topInset }}
                recycleItems
                estimatedListSize={{ width: 200, height: 120 }}
                estimatedItemSize={40}
                keyExtractor={(row) => row.key}
                renderItem={({ item }) => <View testID={item.key} style={{ height: 40 }} />}
                onScrollBeginDrag={scroll.markScrollIntent}
            />
        );
    }
    let tree!: ReactTestRenderer;
    await act(async () => {
        tree = renderer.create(<Content key={identity} />);
    });
    async function layout() {
        await act(async () => {
            for (const node of tree.root.findAll(
                (node) =>
                    typeof node.type === 'string' && typeof node.props.onLayout === 'function',
            )) {
                node.props.onLayout({
                    nativeEvent: {
                        layout: {
                            x: 0,
                            y: 0,
                            width: 200,
                            height: typeof node.props.onScroll === 'function' ? 120 : 40,
                        },
                    },
                });
            }
            for (const row of rows) list.setItemSize(row.key, { width: 200, height: 40 });
        });
        for (let i = 0; i < 3; i++)
            await act(async () => {
                jest.advanceTimersByTime(100);
            });
    }
    await layout();
    return {
        onLoad,
        get list() {
            return list;
        },
        get scroll() {
            return scroll;
        },
        get rows() {
            return rows;
        },
        async publish(next: TimelineRow[], nextIdentity = identity) {
            rows = next;
            identity = nextIdentity;
            await act(async () => {
                tree.update(<Content key={identity} />);
            });
            await layout();
        },
        nativeAdjustment() {
            const anchor = tree.root.findAll((node) => {
                const style = StyleSheet.flatten(node.props.style);
                return (
                    typeof node.type === 'string' &&
                    style?.height === 0 &&
                    style?.width === 0 &&
                    style?.top > 1_000_000
                );
            })[0];
            return StyleSheet.flatten(anchor.props.style).top as number;
        },
        nativeItem(key: string) {
            let node = tree.root.findAll(
                (node) => typeof node.type === 'string' && node.props.testID === key,
            )[0];
            while (node) {
                const style = StyleSheet.flatten(node.props.style);
                if (style?.position === 'absolute' && typeof style.top === 'number') {
                    return { node, top: style.top };
                }
                node = node.parent!;
            }
            throw new Error(`Missing native container for ${key}`);
        },
        nativeScrollProps() {
            return tree.root.findAll(
                (node) =>
                    typeof node.type === 'string' && typeof node.props.onScroll === 'function',
            )[0].props;
        },
        async userScroll(y: number, userGesture = true) {
            await act(async () => {
                const node = tree.root.findAll(
                    (node) =>
                        typeof node.type === 'string' && typeof node.props.onScroll === 'function',
                )[0];
                if (userGesture) node.props.onScrollBeginDrag?.({ nativeEvent: {} });
                node.props.onScroll({
                    timeStamp: Date.now(),
                    nativeEvent: {
                        contentOffset: { x: 0, y },
                        layoutMeasurement: { width: 200, height: 120 },
                        contentSize: { width: 200, height: rows.length * 40 },
                        contentInset: { top: 0, bottom: 0, left: 0, right: 0 },
                        velocity: { x: 0, y: 0 },
                    },
                });
            });
            await act(async () => {
                jest.advanceTimersByTime(100);
            });
        },
        async unmount() {
            await act(async () => {
                tree.unmount();
            });
        },
    };
}

beforeEach(() => {
    jest.useFakeTimers();
});
afterEach(() => {
    jest.useRealTimers();
});

describe('timeline with the installed LegendList', () => {
    it('opens asynchronously loaded history and another thread at the end', async () => {
        const view = await mount([]);
        await view.publish(page());
        expect(view.list.getState().scroll).toBe(680);
        expect(view.list.getState().isAtEnd).toBe(true);
        await view.userScroll(7);
        await view.publish(page(10), 'b');
        expect(view.list.getState().scroll).toBe(280);
        expect(view.list.getState().isAtEnd).toBe(true);
        await view.unmount();
    });

    it('keeps visible messages in place after an older page is prepended', async () => {
        const view = await mount(page());
        await view.userScroll(view.list.getState().scroll, false);
        await view.userScroll(7);
        const before = view.list.getState();
        const rowOffset = before.positionByKey('row-0')! - before.scroll;
        const nativeAnchor = view.nativeItem('row-0');
        const adjustment = view.nativeAdjustment();
        expect(view.nativeScrollProps().maintainVisibleContentPosition).toEqual({
            minIndexForVisible: 0,
        });
        await view.publish([item('older-2'), item('older-1'), ...view.rows]);
        // Jest has no native MVCP. Verify the adjustment requested by the real
        // list, then report the anchor displacement as native ScrollView does.
        expect(view.onLoad).toHaveBeenCalled();
        expect(view.nativeAdjustment() - adjustment).toBe(80);
        const nextNativeAnchor = view.nativeItem('row-0');
        expect(nextNativeAnchor.node).toBe(nativeAnchor.node);
        const correction = nextNativeAnchor.top - nativeAnchor.top;
        expect(correction).toBe(80);
        await view.userScroll(before.scroll + correction, false);
        const after = view.list.getState();
        expect(after.positionByKey('row-0')! - after.scroll).toBe(rowOffset);
        await view.unmount();
    });

    it('preserves the end of Worked after its first page arrives with a content inset', async () => {
        const worked = {
            type: 'work-group',
            key: 'worked',
            turnId: 'turn',
            expanded: false,
        } as TimelineRow;
        const view = await mount([item('message'), worked, item('answer'), ...page()], 24);
        await view.userScroll(0);
        view.scroll.prepareExpansion(worked, true, view.rows, view.list);
        await view.publish([...view.rows]);
        await view.publish([
            item('message'),
            worked,
            item('work-1'),
            item('work-2'),
            item('work-3'),
            item('answer'),
            ...page(),
        ]);
        const state = view.list.getState();
        expect(state.positionByKey('answer')! - state.scroll).toBe(80);
        await view.unmount();
    });

    it('anchors existing work items when an older work page arrives below the visible header', async () => {
        const worked = {
            type: 'work-group',
            key: 'worked',
            turnId: 'turn',
            expanded: true,
        } as TimelineRow;
        const view = await mount([
            item('message'),
            worked,
            item('work-3'),
            item('work-4'),
            item('answer'),
            ...page(),
        ]);
        await view.userScroll(view.list.getState().scroll, false);
        await view.userScroll(45);
        const oldOffset = view.list.getState().scroll;
        const oldTop = view.nativeItem('work-3').top - oldOffset;
        const oldAdjustment = view.nativeAdjustment();
        await view.publish([
            item('message'),
            worked,
            item('work-1'),
            item('work-2'),
            item('work-3'),
            item('work-4'),
            item('answer'),
            ...page(),
        ]);
        const correction = view.nativeAdjustment() - oldAdjustment;
        expect(correction).toBe(80);
        await view.userScroll(oldOffset + correction, false);
        expect(view.nativeItem('work-3').top - view.list.getState().scroll).toBe(oldTop);
        await view.unmount();
    });
});
