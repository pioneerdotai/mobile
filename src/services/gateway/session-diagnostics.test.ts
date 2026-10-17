import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    subscribeMobileSessionDiagnostics,
    type MobileSessionDiagnosticEvent,
} from './session-coordinator';

let mockChanged: () => void;
let mockTiming: {
    endpoint_id: string;
    started_at_unix_ms: number;
    duration_ms: number | null;
    state: string;
};
const mockRelease = jest.fn();
jest.mock('@/client', () => ({
    mobileClientBinding: {
        scope: () => ({
            getSnapshot: () => ({
                payload: { startup: { session_diagnostics: { connect_attempt: mockTiming } } },
            }),
            subscribe: (listener: () => void) => {
                mockChanged = listener;
                return mockRelease;
            },
        }),
    },
}));

beforeEach(() => {
    mockRelease.mockClear();
    mockTiming = {
        endpoint_id: 'gateway',
        started_at_unix_ms: 1000,
        duration_ms: 25,
        state: 'cancelled',
    };
});
describe('bounded session diagnostics observations', () => {
    it('replays the snapshot, preserves cancellation and distinguishes attempts', () => {
        const events: MobileSessionDiagnosticEvent[] = [];
        const release = subscribeMobileSessionDiagnostics('gateway', (event) => events.push(event));
        mockChanged();
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({
            stage: 'gateway_session.connect_attempt',
            outcome: 'cancelled',
            timing: { started_at_unix_ms: 1000, duration_ms: 25 },
        });
        mockTiming = { ...mockTiming, started_at_unix_ms: 2000 };
        mockChanged();
        expect(events).toHaveLength(2);
        release();
        expect(mockRelease).toHaveBeenCalledTimes(1);
    });
    it('ignores other endpoints and transfers the original pending timestamp', () => {
        const events: MobileSessionDiagnosticEvent[] = [];
        mockTiming = { ...mockTiming, endpoint_id: 'other' };
        const release = subscribeMobileSessionDiagnostics('gateway', (event) => events.push(event));
        expect(events).toEqual([]);
        mockTiming = { ...mockTiming, endpoint_id: 'gateway', state: 'pending', duration_ms: null };
        mockChanged();
        expect(events).toEqual([
            { stage: 'gateway_session.connect_attempt', outcome: 'started', startedAtUnixMs: 1000 },
        ]);
        release();
    });
});
