import type { ComposerOperationIdentity } from '@/client/composer';

export type TurnStartupReport = {
    key: string;
    duration_ms?: number;
    text?: boolean;
    receive?: boolean;
    bridge_ms?: number;
    loss?: 'background' | 'expired' | 'registry_full';
};
type Recorder = (input: TurnStartupReport) => { recorded: boolean; turn_id?: string };
let recorder: Recorder | undefined;
export const configureTurnStartupRecorder = (value: Recorder): void => {
    recorder = value;
};

const pending = new Map<
    string,
    {
        started: number;
        turnId?: string;
        first: boolean;
        text: boolean;
        received: boolean;
        receivedText: boolean;
    }
>();
const ttl = 15 * 60 * 1000;
const keyFor = (id: ComposerOperationIdentity) =>
    `composer:${id.thread_id}:${id.draft_id}:${id.generation}`;

/** Capture the JS clock before dispatching the Send / CommitVoice intent. */
export const beginTurnStartup = (identity: ComposerOperationIdentity, started: number): void => {
    const now = performance.now();
    for (const [key, value] of pending)
        if (now - value.started > ttl) {
            reportLoss(key, 'expired');
            pending.delete(key);
        }
    const key = keyFor(identity);
    if (pending.size >= 128 && !pending.has(key)) {
        const oldest = pending.keys().next().value;
        if (oldest) {
            reportLoss(oldest, 'registry_full');
            pending.delete(oldest);
        }
    }
    if (!pending.has(key)) {
        pending.set(key, {
            started,
            first: false,
            text: false,
            received: false,
            receivedText: false,
        });
        try {
            recorder?.({ key, bridge_ms: now - started });
        } catch {
            /* Never affect dispatch. */
        }
    }
};

/** React commit is an explicit presentation proxy, not proof of painted pixels. */
export const observeTurnStartupPresentation = (turnId: string, text: boolean): void => {
    if (!recorder) return;
    const now = performance.now();
    for (const [key, value] of pending) {
        if (now - value.started > ttl) {
            reportLoss(key, 'expired');
            pending.delete(key);
            continue;
        }
        try {
            value.turnId = recorder({ key }).turn_id;
            if (value.turnId !== turnId || (value.first && (!text || value.text))) continue;
            const result = recorder({ key, duration_ms: now - value.started, text });
            if (result.recorded) {
                value.first = true;
                value.text ||= text;
            }
            if (value.first && value.text) pending.delete(key);
        } catch {
            /* Telemetry is best effort and must never affect rendering. */
        }
    }
};

const reportLoss = (key: string, loss: TurnStartupReport['loss']): void => {
    try {
        recorder?.({ key, loss });
    } catch {
        /* Observations never interrupt the app. */
    }
};

export const turnStartupBackgrounded = (): void => {
    for (const key of pending.keys()) reportLoss(key, 'background');
    pending.clear();
};

/** Called at JS publication, before React subscribers run; not a wire-arrival timestamp. */
export const observeTurnStartupReceived = (): void => {
    if (!recorder) return;
    const now = performance.now();
    for (const [key, value] of pending) {
        if (now - value.started > ttl) {
            reportLoss(key, 'expired');
            pending.delete(key);
            continue;
        }
        try {
            if (!value.received)
                value.received = recorder({
                    key,
                    receive: true,
                    text: false,
                    duration_ms: now - value.started,
                }).recorded;
            if (value.received && !value.receivedText)
                value.receivedText = recorder({
                    key,
                    receive: true,
                    text: true,
                    duration_ms: now - value.started,
                }).recorded;
        } catch {
            /* The bridge must never interrupt state publication. */
        }
    }
};
