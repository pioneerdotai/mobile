import { describe, it, expect, jest } from '@jest/globals';
import {
    beginTurnStartup,
    configureTurnStartupRecorder,
    observeTurnStartupPresentation,
    turnStartupBackgrounded,
    observeTurnStartupReceived,
} from './turn-startup';
import type { ComposerOperationIdentity } from '@/client/composer';

const identity = (generation: number): ComposerOperationIdentity => ({
    thread_id: 'thread',
    draft_id: 1,
    generation,
});

describe('turn startup presentation', () => {
    it('follows the parent-to-child alias without resetting the click clock', () => {
        turnStartupBackgrounded();
        const clock = jest.spyOn(performance, 'now').mockReturnValue(100);
        let turn = 'parent';
        const reports: { duration_ms?: number }[] = [];
        configureTurnStartupRecorder((input) => {
            reports.push(input);
            return { recorded: true, turn_id: turn };
        });
        beginTurnStartup(identity(42), 90);
        observeTurnStartupPresentation('unrelated', true);
        turn = 'child';
        clock.mockReturnValue(180);
        observeTurnStartupPresentation('child', true);
        expect(reports.filter(r => r.duration_ms !== undefined)).toEqual([
            expect.objectContaining({duration_ms: 90, text: true})
        ]);
        clock.mockRestore();
    });

    it('waits for native content and observes receipt independently from React commit', () => {
        const clock = jest.spyOn(performance, 'now').mockReturnValue(100);
        let ready = false;
        const reports: { key: string; receive?: boolean; duration_ms?: number; text?: boolean }[] =
            [];
        configureTurnStartupRecorder((input) => {
            reports.push(input);
            return { recorded: ready, turn_id: 't' };
        });
        beginTurnStartup(identity(10), 90);
        observeTurnStartupReceived();
        ready = true;
        clock.mockReturnValue(130);
        observeTurnStartupReceived();
        const count = reports.length;
        observeTurnStartupReceived();
        expect(reports.length).toBe(count);
        expect(reports.filter((r) => r.receive && r.duration_ms === 40)).toHaveLength(2);
        clock.mockReturnValue(150);
        observeTurnStartupPresentation('t', true);
        expect(reports.at(-1)).toMatchObject({ duration_ms: 60, text: true });
        clock.mockRestore();
    });

    it('keeps the original click clock, ignores another turn, and records text only once', () => {
        const clock = jest.spyOn(performance, 'now').mockReturnValue(100);
        const recorder = jest.fn((input: { key: string; duration_ms?: number }) => ({
            recorded: true,
            turn_id: 'live-turn',
        }));
        configureTurnStartupRecorder(recorder);
        beginTurnStartup(identity(1), 90);
        beginTurnStartup(identity(1), 99);
        observeTurnStartupPresentation('other-turn', true);
        expect(
            recorder.mock.calls.filter(([input]) => input.duration_ms !== undefined),
        ).toHaveLength(0);
        observeTurnStartupPresentation('live-turn', false);
        clock.mockReturnValue(120);
        observeTurnStartupPresentation('live-turn', true);
        observeTurnStartupPresentation('live-turn', true);
        expect(
            recorder.mock.calls
                .filter(([input]) => input.duration_ms !== undefined)
                .map(([input]) => input.duration_ms),
        ).toEqual([10, 30]);
        clock.mockRestore();
    });

    it('expires lost observations and never propagates a bridge error to rendering', () => {
        const clock = jest.spyOn(performance, 'now').mockReturnValue(100);
        configureTurnStartupRecorder(() => {
            throw new Error('bridge unavailable');
        });
        beginTurnStartup(identity(2), 100);
        expect(() => observeTurnStartupPresentation('turn', true)).not.toThrow();
        clock.mockReturnValue(1_000_000);
        const recorder = jest.fn(() => ({ recorded: true, turn_id: 'turn' }));
        configureTurnStartupRecorder(recorder);
        observeTurnStartupPresentation('turn', true);
        expect(recorder).toHaveBeenCalledWith({ key: 'composer:thread:1:2', loss: 'expired' });
        beginTurnStartup(identity(3), 1_000_000);
        turnStartupBackgrounded();
        expect(recorder).toHaveBeenCalledWith({ key: 'composer:thread:1:3', loss: 'background' });
        clock.mockRestore();
    });
});
