import type { TaskNotificationPublication, TaskInboxPublication } from '@/client/generated/task_inbox_publication';

// Screen-local interaction state, never a second inbox/read-state store.
export const inboxBusy = (inbox: Readonly<TaskInboxPublication>) =>
    // Fail closed with an older native client which does not project the slot yet.
    inbox.request_busy !== false;

export class InboxInteraction {
    private pending: { run: string; revision: number; baseline: number | null; completed: number | null } | null = null;
    // One cursor and one observed range; automatic fill is bounded, never a history cache.
    private cursor: string | null = null;
    private end = 0;
    private count = 0;
    private fillPages = 0;
    private failed = false;
    private lastRange: { end: number; count: number } | null = null;

    isOpening() { return this.pending !== null; }
    begin(run: string, revision: number, opened?: TaskNotificationPublication | null, completed: number | null = null) {
        if (this.pending) return false;
        this.pending = { run, revision, baseline: opened?.operation_id ?? null, completed };
        return true;
    }
    confirm(opened?: TaskNotificationPublication | null): string | null {
        const p = this.pending;
        if (!p || !opened || opened.operation_id === p.baseline || opened.notification_id !== p.run || opened.task_revision !== p.revision) return null;
        this.pending = null;
        return opened.thread_id;
    }
    settled(inbox: Readonly<TaskInboxPublication>) {
        const pending = this.pending;
        // Only an actual terminal request watermark plus an idle drained slot can
        // release a wait without opened. Push removals/revisions are not completions.
        if (!pending || inboxBusy(inbox) || inbox.completed_operation_id == null ||
            inbox.completed_operation_id === pending.completed) return false;
        this.cancel();
        return true;
    }
    cancel() { this.pending = null; }

    scroll() { this.fillPages = 0; }
    range(end: number, count: number) {
        if (this.lastRange?.count === count && this.lastRange.end !== end) this.fillPages = 0;
        this.lastRange = { end, count };
        this.end = end;
    }
    reachedEnd(count: number) {
        this.lastRange ??= { end: count, count };
        this.end = count;
    }
    page(cursor: string | null | undefined, loading: boolean, error: unknown, count: number) {
        if (this.cursor !== cursor) { this.cursor = null; this.failed = false; }
        if (count < this.count) this.fillPages = 0;
        this.count = count;
        if (this.cursor && error) this.failed = true;
        if (!this.lastRange || !cursor || loading || error || this.failed || this.end + 3 < count || this.cursor === cursor || this.fillPages >= 3) return false;
        this.cursor = cursor;
        this.fillPages += 1;
        return true;
    }
    retry() { this.cursor = null; this.failed = false; this.fillPages = 0; }
}

export const formatInboxTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    if (!Number.isFinite(date.getTime())) return '';
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
