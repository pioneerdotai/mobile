import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { MobileStartupRecordRequest } from '@/client';

const mockRecord = jest.fn<(request: MobileStartupRecordRequest) => { recorded: boolean }>(() => ({
    recorded: true,
}));
jest.mock('@/client', () => ({
    pioneerClient: {
        mobileStartupRecord: (request: MobileStartupRecordRequest) => mockRecord(request),
    },
}));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
jest.mock('expo-application', () => ({ nativeApplicationVersion: '1' }));

let frames: FrameRequestCallback[];
const originalRaf = global.requestAnimationFrame;
beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    Object.defineProperty(performance, 'rnStartupTiming', { value: undefined, configurable: true });
    mockRecord.mockClear();
    frames = [];
    global.requestAnimationFrame = (callback) => {
        frames.push(callback);
        return frames.length;
    };
});
afterEach(() => {
    global.requestAnimationFrame = originalRaf;
    jest.useRealTimers();
});
const load = () =>
    jest.requireActual<typeof import('./mobile-startup')>('./mobile-startup').mobileStartup;
const reveal = async (timeline: ReturnType<typeof load>, hide: () => void) => {
    timeline.revealAfterShellFrame(hide);
    frames.shift()!(0);
    frames.shift()!(0);
    await Promise.resolve();
};

describe('shell and operational startup are independent', () => {
    it('hides splash on the original two frames and keeps recording until tree ready', async () => {
        const timeline = load();
        const hide = jest.fn();
        await reveal(timeline, hide);
        expect(hide).toHaveBeenCalledTimes(1);
        expect(mockRecord).not.toHaveBeenCalled();
        timeline.begin('thread_tree.load');
        jest.advanceTimersByTime(50);
        timeline.succeed('thread_tree.load');
        timeline.complete('ready');
        jest.advanceTimersByTime(0);
        expect(mockRecord).toHaveBeenCalledTimes(1);
        const report = mockRecord.mock.calls[0][0];
        expect(report.stages.map((stage) => stage.name)).toEqual([
            'ui.shell_frame',
            'splash.hide',
            'thread_tree.load',
        ]);
        expect(report.outcome).toBe('ready');
        timeline.complete('degraded');
        timeline.begin('composer.prepare');
        jest.advanceTimersByTime(0);
        expect(mockRecord).toHaveBeenCalledTimes(1);
    });
    it('omits native/runtime measurements when native timestamps are unavailable', async () => {
        const timeline = load();
        await reveal(timeline, () => {});
        timeline.complete('setup_required');
        jest.advanceTimersByTime(0);
        expect(
            mockRecord.mock.calls[0][0].stages.some((stage) =>
                ['native.launch', 'javascript.runtime'].includes(stage.name),
            ),
        ).toBe(false);
    });
    it('invalidates pending Ready when cancelled before the original two frames', async () => {
        const timeline = load();
        const hide = jest.fn<() => void>();
        timeline.revealAfterShellFrame(hide);
        timeline.complete('ready');
        timeline.complete('cancelled');
        timeline.complete('ready');
        expect(hide).not.toHaveBeenCalled();
        expect(mockRecord).not.toHaveBeenCalled();
        frames.shift()!(0);
        expect(hide).not.toHaveBeenCalled();
        frames.shift()!(0);
        await Promise.resolve();
        jest.advanceTimersByTime(0);
        expect(hide).toHaveBeenCalledTimes(1);
        expect(mockRecord).toHaveBeenCalledTimes(1);
        expect(mockRecord.mock.calls[0][0].outcome).toBe('cancelled');
        timeline.complete('ready');
        timeline.complete('cancelled');
        jest.advanceTimersByTime(590_000);
        expect(mockRecord).toHaveBeenCalledTimes(1);
    });
    it('invalidates pending Ready while the original splash hide promise is unresolved', async () => {
        const timeline = load();
        let finishHide!: () => void;
        const hide = jest.fn(
            () =>
                new Promise<void>((resolve) => {
                    finishHide = resolve;
                }),
        );
        await reveal(timeline, hide);
        timeline.complete('ready');
        timeline.complete('cancelled');
        timeline.complete('ready');
        timeline.complete('cancelled');
        expect(mockRecord).not.toHaveBeenCalled();
        finishHide();
        await Promise.resolve();
        jest.advanceTimersByTime(0);
        expect(hide).toHaveBeenCalledTimes(1);
        expect(mockRecord).toHaveBeenCalledTimes(1);
        expect(mockRecord.mock.calls[0][0].outcome).toBe('cancelled');
        timeline.complete('ready');
        jest.advanceTimersByTime(590_000);
        expect(mockRecord).toHaveBeenCalledTimes(1);
    });
    it('does not let an expired telemetry deadline prevent splash hiding', async () => {
        const timeline = load();
        jest.advanceTimersByTime(590_000);
        const hide = jest.fn();
        await reveal(timeline, hide);
        expect(hide).toHaveBeenCalledTimes(1);
        expect(timeline.isFinalized()).toBe(true);
    });
});
