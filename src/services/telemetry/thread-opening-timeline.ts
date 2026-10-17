import type { MobileStartupOutcome } from './mobile-startup';
import { sameStartupScope, type StartupTreeScope } from './mobile-startup-readiness';

export type ThreadOpeningSample = {
    kind: 'thread_open';
    started_at_unix_ms: number;
    duration_ms: number;
    outcome: MobileStartupOutcome;
    stages: [];
};
type Attempt = {
    token: number;
    target: string;
    scope: StartupTreeScope;
    started: number;
    wall: number;
    claimed: boolean;
};

// One in-flight navigation, no retained history and no feature demand.
export class ThreadOpeningTimeline {
    private sequence = 0;
    private current: Attempt | null = null;
    private deadline: ReturnType<typeof setTimeout> | null = null;
    constructor(
        private readonly record: (sample: ThreadOpeningSample) => void,
        private readonly now = () => performance.now(),
        private readonly wall = () => Date.now(),
    ) {}

    begin(target: string, scope: StartupTreeScope): number {
        if (this.current) this.finish(this.current.token, 'cancelled');
        const token = ++this.sequence;
        this.current = {
            token,
            target,
            scope,
            started: this.now(),
            wall: this.wall(),
            claimed: false,
        };
        this.deadline = setTimeout(() => this.finish(token, 'cancelled'), 590_000);
        return token;
    }
    claim(target: string, scope: StartupTreeScope): number {
        const pending = this.current;
        const token =
            pending &&
            !pending.claimed &&
            pending.target === target &&
            sameStartupScope(pending.scope, scope)
                ? pending.token
                : this.begin(target, scope);
        this.current!.claimed = true;
        return token;
    }
    observe(token: number, scope: StartupTreeScope, outcome: MobileStartupOutcome | null): void {
        if (this.current?.token !== token) return;
        if (!sameStartupScope(this.current.scope, scope)) this.finish(token, 'cancelled');
        else if (outcome) this.finish(token, outcome);
    }
    finish(token: number, outcome: MobileStartupOutcome): void {
        const attempt = this.current;
        if (!attempt || attempt.token !== token) return;
        this.current = null;
        if (this.deadline !== null) clearTimeout(this.deadline);
        this.deadline = null;
        if (this.now() - attempt.started > 590_000) outcome = 'cancelled';
        this.record({
            kind: 'thread_open',
            started_at_unix_ms: attempt.wall,
            duration_ms: Math.min(590_000, Math.max(0, this.now() - attempt.started)),
            outcome,
            stages: [],
        });
    }
}
