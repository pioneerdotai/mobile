import {
    pioneerClient,
    type ThreadTimelinePageResponse,
    type TimelinePageAnchor,
    type TurnWorkItemsGetParams,
    type TurnWorkItemsGetResponse,
    type TurnWorkPageResponse,
} from '@/client';

type ThreadTimelinePageRequest = {
    threadId: string;
    anchor: TimelinePageAnchor;
    limit: number | null;
};

type TurnWorkPageRequest = ThreadTimelinePageRequest & {
    turnId: string;
};

type TurnWorkItemsRequest = {
    threadId: string;
    turnId: string;
    workItemIds: readonly string[];
};

type TurnWorkItemsRequestRunner = (
    params: TurnWorkItemsGetParams,
) => Promise<TurnWorkItemsGetResponse>;

type TurnWorkItemsRequestWaiter = {
    resolve: (responses: TurnWorkItemsGetResponse[]) => void;
    reject: (error: unknown) => void;
};

type TurnWorkItemsRequestState = {
    pendingIds: Set<string>;
    pendingWaiters: TurnWorkItemsRequestWaiter[];
};

const MAX_EXACT_WORK_ITEM_IDS = 200;

export const requestThreadTimelinePage = ({
    threadId,
    anchor,
    limit,
}: ThreadTimelinePageRequest): Promise<ThreadTimelinePageResponse> => {
    return pioneerClient.threadTimelinePage({ threadId, anchor, limit });
};

export const requestTurnWorkPage = ({
    threadId,
    turnId,
    anchor,
    limit,
}: TurnWorkPageRequest): Promise<TurnWorkPageResponse> => {
    return pioneerClient.turnWorkPage({ threadId, turnId, anchor, limit });
};

export const createTurnWorkItemsRequestCoordinator = (runner: TurnWorkItemsRequestRunner) => {
    const states = new Map<string, TurnWorkItemsRequestState>();

    const run = async (
        key: string,
        request: Omit<TurnWorkItemsRequest, 'workItemIds'>,
        state: TurnWorkItemsRequestState,
        workItemIds: string[],
        waiters: TurnWorkItemsRequestWaiter[],
    ) => {
        try {
            const responses: TurnWorkItemsGetResponse[] = [];
            for (let offset = 0; offset < workItemIds.length; offset += MAX_EXACT_WORK_ITEM_IDS) {
                responses.push(
                    await runner({
                        threadId: request.threadId,
                        turnId: request.turnId,
                        workItemIds: workItemIds.slice(offset, offset + MAX_EXACT_WORK_ITEM_IDS),
                    }),
                );
            }
            for (const waiter of waiters) {
                waiter.resolve(responses);
            }
        } catch (error) {
            for (const waiter of waiters) {
                waiter.reject(error);
            }
        } finally {
            if (states.get(key) !== state) {
                return;
            }

            const pendingIds = Array.from(state.pendingIds);
            const pendingWaiters = state.pendingWaiters.splice(0);
            state.pendingIds.clear();
            if (pendingIds.length > 0) {
                void run(key, request, state, pendingIds, pendingWaiters);
            } else {
                states.delete(key);
            }
        }
    };

    return ({ threadId, turnId, workItemIds }: TurnWorkItemsRequest) => {
        const normalizedIds = Array.from(
            new Set(workItemIds.filter((workItemId) => workItemId.length > 0)),
        );
        if (normalizedIds.length === 0) {
            return Promise.resolve<TurnWorkItemsGetResponse[]>([]);
        }

        const key = JSON.stringify([threadId, turnId]);
        return new Promise<TurnWorkItemsGetResponse[]>((resolve, reject) => {
            const waiter = { resolve, reject };
            const state = states.get(key);
            if (state) {
                for (const workItemId of normalizedIds) {
                    state.pendingIds.add(workItemId);
                }
                state.pendingWaiters.push(waiter);
                return;
            }

            const nextState: TurnWorkItemsRequestState = {
                pendingIds: new Set(),
                pendingWaiters: [],
            };
            states.set(key, nextState);
            void run(key, { threadId, turnId }, nextState, normalizedIds, [waiter]);
        });
    };
};

export const requestTurnWorkItemsGet = createTurnWorkItemsRequestCoordinator((params) =>
    pioneerClient.turnWorkItemsGet(params),
);
