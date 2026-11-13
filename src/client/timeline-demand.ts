import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { mobileClientBinding } from './mobile-client-binding';
import type { TimelineSnapshot } from './generated/timeline_snapshot';

/** RN owns viewability and AppState; request decisions belong to Client. */
export function useTimelineDemand(snapshot: TimelineSnapshot | null | undefined, enabled: boolean) {
    const consumer = useId();
    const generation = useRef(1);
    const foreground = useRef(AppState.currentState === 'active');
    const lease = useRef<{ threadId: string; generation: number } | null>(null);
    const [appState, setAppState] = useState(AppState.currentState);
    const visible = useRef({
        threadId: snapshot?.thread_id,
        rowIds: [] as string[],
        viewedRowIds: [] as string[],
        rowOrder: [] as string[],
        latest: null as string | null,
        viewed: null as string | null,
        scrollGeneration: 0,
    });
    const active = enabled && appState === 'active';
    const release = useCallback(() => {
        const acquired = lease.current;
        if (!acquired) return;
        lease.current = null;
        mobileClientBinding.dispatch({
            schema_version: 1,
            intent: {
                kind: 'timeline',
                intent: {
                    kind: 'exit',
                    thread_id: acquired.threadId,
                    consumer_id: consumer,
                    generation: acquired.generation,
                },
            },
        });
        generation.current = acquired.generation + 1;
    }, [consumer]);
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            foreground.current = state === 'active';
            if (!foreground.current) release();
            setAppState(state);
        });
        return () => subscription.remove();
    }, [release]);
    const publish = useCallback(() => {
        if (
            !active ||
            !foreground.current ||
            !snapshot ||
            lease.current?.threadId !== snapshot.thread_id
        )
            return;
        const input = visible.current;
        if (input.threadId !== snapshot.thread_id) return;
        // Completion can move a late answer behind newer Turns. Old geometry
        // cannot acknowledge it until the list reports viewability again.
        const rowOrder = snapshot.rows?.map((row) => row.id) ?? [];
        const lastViewedIndex = input.viewedRowIds.reduce(
            (last, id) => Math.max(last, input.rowOrder.indexOf(id)),
            -1,
        );
        const viewabilityIsCurrent = input.rowOrder
            .slice(0, lastViewedIndex + 1)
            .every((id, index) => id === rowOrder[index]);
        mobileClientBinding.dispatch({
            schema_version: 1,
            intent: {
                kind: 'timeline',
                intent: {
                    kind: 'update',
                    demand: {
                        thread_id: snapshot.thread_id,
                        consumer_id: consumer,
                        generation: generation.current,
                        source_revision: snapshot.source_revision,
                        row_ids: input.rowIds,
                        viewed_row_ids: viewabilityIsCurrent ? input.viewedRowIds : [],
                        threshold: 6,
                        before: true,
                        after: true,
                        work: true,
                        presented_rows: true,
                        scroll_generation: input.scrollGeneration,
                        latest_user_turn_id: input.latest,
                        viewed_through_turn_id: viewabilityIsCurrent ? input.viewed : null,
                        read_requires_unread: false,
                        prefetch_on_visibility: false,
                        boundary_request_limit: 4294967295,
                    },
                },
            },
        });
    }, [active, snapshot, consumer]);
    const threadId = snapshot?.thread_id;
    useEffect(() => {
        if (!active || !threadId) return;
        lease.current = { threadId, generation: generation.current };
        return release;
    }, [active, threadId, release]);
    useEffect(() => {
        publish();
    }, [publish]);
    const update = useCallback(
        (
            rowIds: string[],
            latest: string | null,
            viewed: string | null,
            scrollGeneration: number,
            viewedRowIds: string[] = rowIds,
        ) => {
            visible.current = {
                threadId: snapshot?.thread_id,
                rowIds,
                viewedRowIds,
                rowOrder: snapshot?.rows?.map((row) => row.id) ?? [],
                latest,
                viewed,
                scrollGeneration,
            };
            publish();
        },
        [publish, snapshot?.thread_id, snapshot?.rows],
    );
    const consumeScroll = useCallback(
        (scrollGeneration: number) => {
            if (!active || !foreground.current || !threadId || lease.current?.threadId !== threadId)
                return;
            mobileClientBinding.dispatch({
                schema_version: 1,
                intent: {
                    kind: 'timeline',
                    intent: {
                        kind: 'consume_scroll',
                        thread_id: threadId,
                        consumer_id: consumer,
                        generation: generation.current,
                        scroll_generation: scrollGeneration,
                    },
                },
            });
        },
        [active, threadId, consumer],
    );
    return { update, consumeScroll };
}
