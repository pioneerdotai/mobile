import { nanoid } from 'nanoid';

export type ThreadFileIntent = Readonly<{
    threadId: string;
    turnId: string;
    itemId: string;
    href: string;
}>;

type StoredIntent = {
    intent: ThreadFileIntent;
    createdAtMs: number;
};

const INTENT_TTL_MS = 5 * 60 * 1000;
const MAX_PENDING_INTENTS = 32;
const intents = new Map<string, StoredIntent>();

const pruneIntents = (nowMs: number) => {
    for (const [id, stored] of intents) {
        if (nowMs - stored.createdAtMs > INTENT_TTL_MS) {
            intents.delete(id);
        }
    }

    while (intents.size >= MAX_PENDING_INTENTS) {
        const oldestId = intents.keys().next().value as string | undefined;
        if (!oldestId) break;
        intents.delete(oldestId);
    }
};

export const isTimelineLocalFileHref = (value: string): boolean => {
    if (!value || value.trim() !== value || /[\0\r\n]/u.test(value)) {
        return false;
    }

    return (
        /^file:\/\//iu.test(value) ||
        /^\//u.test(value) ||
        /^[a-z]:[\\/]/iu.test(value) ||
        /^\\\\[^\\]+\\[^\\]+/u.test(value)
    );
};

export const registerThreadFileIntent = (
    intent: ThreadFileIntent,
    nowMs: number = Date.now(),
): string => {
    pruneIntents(nowMs);
    const id = nanoid(24);
    intents.set(id, {
        intent: Object.freeze({ ...intent }),
        createdAtMs: nowMs,
    });
    return id;
};

export const resolveThreadFileIntent = (
    id: string,
    nowMs: number = Date.now(),
): ThreadFileIntent | null => {
    const stored = intents.get(id);
    if (!stored) return null;
    if (nowMs - stored.createdAtMs > INTENT_TTL_MS) {
        intents.delete(id);
        return null;
    }
    return stored.intent;
};

export const releaseThreadFileIntent = (id: string): void => {
    intents.delete(id);
};
