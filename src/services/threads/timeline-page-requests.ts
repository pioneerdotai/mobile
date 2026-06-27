import {
    pioneerClient,
    type ThreadTimelinePageResponse,
    type TimelinePageAnchor,
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

const inFlightThreadTimelinePages = new Map<string, Promise<ThreadTimelinePageResponse>>();
const inFlightTurnWorkPages = new Map<string, Promise<TurnWorkPageResponse>>();

export const requestThreadTimelinePage = ({
    threadId,
    anchor,
    limit,
}: ThreadTimelinePageRequest): Promise<ThreadTimelinePageResponse> => {
    const key = timelinePageRequestKey('thread/timeline/page', threadId, null, anchor, limit);
    const existing = inFlightThreadTimelinePages.get(key);
    if (existing) {
        return existing;
    }

    const promise = pioneerClient
        .threadTimelinePage({ threadId, anchor, limit })
        .finally(() => {
            if (inFlightThreadTimelinePages.get(key) === promise) {
                inFlightThreadTimelinePages.delete(key);
            }
        });

    inFlightThreadTimelinePages.set(key, promise);
    return promise;
};

export const requestTurnWorkPage = ({
    threadId,
    turnId,
    anchor,
    limit,
}: TurnWorkPageRequest): Promise<TurnWorkPageResponse> => {
    const key = timelinePageRequestKey('turn/work/page', threadId, turnId, anchor, limit);
    const existing = inFlightTurnWorkPages.get(key);
    if (existing) {
        return existing;
    }

    const promise = pioneerClient
        .turnWorkPage({ threadId, turnId, anchor, limit })
        .finally(() => {
            if (inFlightTurnWorkPages.get(key) === promise) {
                inFlightTurnWorkPages.delete(key);
            }
        });

    inFlightTurnWorkPages.set(key, promise);
    return promise;
};

const timelinePageRequestKey = (
    method: 'thread/timeline/page' | 'turn/work/page',
    threadId: string,
    turnId: string | null,
    anchor: TimelinePageAnchor,
    limit: number | null,
) => JSON.stringify([method, threadId, turnId, timelineAnchorKey(anchor), limit ?? null]);

const timelineAnchorKey = (anchor: TimelinePageAnchor) => {
    if (anchor.kind === 'newest' || anchor.kind === 'oldest') {
        return anchor.kind;
    }

    return `${anchor.kind}:${anchor.cursor.value}`;
};
