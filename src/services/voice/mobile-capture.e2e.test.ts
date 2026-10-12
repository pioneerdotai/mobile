import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AudioManager, AudioRecorder } from 'react-native-audio-api';

import { pioneerClient, type VoiceSessionStartContext, type VoiceTurnContext } from '@/client';
import { composerOperationPlan } from '@/client/composer';
import { MOBILE_VOICE_AUDIO_FORMAT, startMobileVoiceCapture } from './mobile-capture';

jest.mock('react-native-audio-api', () => ({
    AudioManager: {
        addSystemEventListener: jest.fn(),
        checkRecordingPermissions: jest.fn(),
        getDevicesInfo: jest.fn(),
        requestRecordingPermissions: jest.fn(),
        setAudioSessionActivity: jest.fn(),
        setAudioSessionOptions: jest.fn(),
    },
    AudioRecorder: jest.fn(),
}));

jest.mock('@/client/composer', () => ({
    composerOperationPlan: jest.fn((identity: unknown) => ({ identity })),
}));

jest.mock('@/client', () => ({
    pioneerClient: {
        gatewayTransportReserve: jest.fn(() => 'lease'),
        gatewayTransportWait: jest.fn(async () => true),
        gatewayTransportRelease: jest.fn(),
        voiceAudioChunk: jest.fn(),
        voiceSessionCancel: jest.fn(),
        voiceSessionFinalize: jest.fn(),
        voiceSessionStart: jest.fn(),
        composerVoiceCapturePlan: jest.fn(),
    },
}));

type AudioReadyCallback = (event: {
    buffer: {
        getChannelData: (channel: number) => Float32Array;
        sampleRate: number;
    };
    numFrames: number;
}) => void;

describe('mobile voice capture with fake native and Client ports', () => {
    let emitAudioReady: AudioReadyCallback | null;
    let recorder: {
        clearOnAudioReady: ReturnType<typeof jest.fn>;
        clearOnError: ReturnType<typeof jest.fn>;
        isRecording: ReturnType<typeof jest.fn>;
        onAudioReady: ReturnType<typeof jest.fn>;
        onError: ReturnType<typeof jest.fn>;
        start: ReturnType<typeof jest.fn>;
        stop: ReturnType<typeof jest.fn>;
    };
    const routeSubscription = { remove: jest.fn() };
    const startContext: VoiceSessionStartContext = {
        thread_id: 'thread-mobile-e2e',
        turn_id: 'turn-mobile-e2e',
        workspace_id: 'workspace-mobile-e2e',
    };
    const operation = { thread_id: startContext.thread_id, draft_id: 1, generation: 1 };
    const turnContext: VoiceTurnContext = {
        thread_id: startContext.thread_id,
        turn_id: startContext.turn_id,
        workspace_id: startContext.workspace_id,
        prepared_input: [],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(composerOperationPlan).mockImplementation((identity) => ({ identity } as never));
        emitAudioReady = null;
        recorder = {
            clearOnAudioReady: jest.fn(),
            clearOnError: jest.fn(),
            isRecording: jest.fn(() => true),
            onAudioReady: jest.fn((_options, callback: AudioReadyCallback) => {
                emitAudioReady = callback;
                return { status: 'success' };
            }),
            onError: jest.fn(() => ({ status: 'success' })),
            start: jest.fn(async () => ({ status: 'success' })),
            stop: jest.fn(async () => ({ status: 'success' })),
        };

        jest.mocked(AudioRecorder).mockImplementation(() => recorder as never);
        jest.mocked(AudioManager.checkRecordingPermissions).mockResolvedValue('Granted');
        jest.mocked(AudioManager.getDevicesInfo).mockResolvedValue({
            availableInputs: [],
            currentInputs: [{ id: 'built-in-microphone' }],
        } as never);
        jest.mocked(AudioManager.setAudioSessionActivity).mockResolvedValue(undefined);
        jest.mocked(AudioManager.addSystemEventListener).mockReturnValue(
            routeSubscription as never,
        );

        jest.mocked(pioneerClient.composerVoiceCapturePlan).mockResolvedValue({
            identity: operation,
            voice_start: startContext,
        } as never);
        jest.mocked(pioneerClient.voiceSessionStart).mockResolvedValue({
            session_id: 'voice-session-mobile-e2e',
            status: 'recording',
        });
        jest.mocked(pioneerClient.voiceAudioChunk).mockReturnValue({} as never);
        jest.mocked(pioneerClient.voiceSessionFinalize).mockResolvedValue({} as never);
        jest.mocked(pioneerClient.voiceSessionCancel).mockResolvedValue({} as never);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('route restart retains the capture identity and releases its audio activity', async () => {
        const session = await startMobileVoiceCapture({ operation });
        jest.useFakeTimers();
        jest.mocked(AudioManager.getDevicesInfo).mockResolvedValue({
            availableInputs: [],
            currentInputs: [{ id: 'bluetooth-microphone' }],
        } as never);
        let restarted!: () => void;
        const restarting = new Promise<void>((resolve) => { restarted = resolve; });
        recorder.start.mockImplementationOnce(async () => {
            restarted();
            return { status: 'success' };
        });
        const routeChanged = jest.mocked(AudioManager.addSystemEventListener).mock.calls[0][1];
        routeChanged({ reason: 'NewDeviceAvailable' } as never);
        jest.advanceTimersByTime(150);
        await restarting;
        expect(AudioManager.setAudioSessionActivity).toHaveBeenNthCalledWith(2, false);
        expect(AudioManager.setAudioSessionActivity).toHaveBeenNthCalledWith(3, true);
        emitAudioReady?.({
            buffer: { getChannelData: () => new Float32Array([0.5]), sampleRate: 16000 },
            numFrames: 1,
        });
        expect(pioneerClient.voiceAudioChunk).toHaveBeenLastCalledWith(
            expect.objectContaining({ operation }),
            expect.any(ArrayBuffer),
        );
        await session.cancel('route_restart_complete');
        expect(AudioManager.setAudioSessionActivity).toHaveBeenLastCalledWith(false);
        expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(1);
    });

    it.each(['cancel', 'superseded', 'new_capture'])(
        'restart awaiting deactivation cannot reactivate after %s',
        async (replacement) => {
            const session = await startMobileVoiceCapture({ operation });
            jest.useFakeTimers();
            jest.mocked(AudioManager.getDevicesInfo).mockResolvedValue({
                availableInputs: [],
                currentInputs: [{ id: 'bluetooth-microphone' }],
            } as never);
            let entered!: () => void;
            let release!: () => void;
            const deactivating = new Promise<void>((resolve) => { entered = resolve; });
            const pending = new Promise<void>((resolve) => { release = resolve; });
            jest.mocked(AudioManager.setAudioSessionActivity).mockImplementationOnce(
                async (active) => {
                    expect(active).toBe(false);
                    entered();
                    await pending;
                },
            );
            const routeChanged = jest.mocked(AudioManager.addSystemEventListener).mock.calls[0][1];
            routeChanged({ reason: 'OldDeviceUnavailable' } as never);
            jest.advanceTimersByTime(150);
            await deactivating;

            let cleanup: Promise<void> | null = null;
            let next: Awaited<ReturnType<typeof startMobileVoiceCapture>> | null = null;
            const nextRecorder = {
                ...recorder,
                start: jest.fn(async () => ({ status: 'success' })),
                stop: jest.fn(async () => ({ status: 'success' })),
            };
            if (replacement === 'cancel') {
                cleanup = session.cancel('cancel_during_deactivation');
            } else if (replacement === 'superseded') {
                jest.mocked(composerOperationPlan).mockReturnValue(null);
            } else {
                // Even a still-readable old plan must not steal a new native owner's activity.
                jest.mocked(AudioRecorder).mockImplementationOnce(() => nextRecorder as never);
                next = await startMobileVoiceCapture({ operation: { ...operation, generation: 2 } });
            }
            jest.mocked(AudioManager.setAudioSessionActivity).mockClear();
            release();
            // Let the queued restart examine ending/identity/ownership before later cleanup.
            await jest.advanceTimersByTimeAsync(0);
            await (cleanup ?? session.cancel('join_old_restart'));
            expect(AudioManager.setAudioSessionActivity).not.toHaveBeenCalledWith(true);
            expect(recorder.start).toHaveBeenCalledTimes(1);
            expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(1);
            if (next) {
                expect(nextRecorder.stop).not.toHaveBeenCalled();
                expect(AudioManager.setAudioSessionActivity).not.toHaveBeenCalledWith(false);
                await next.cancel('release_new_capture');
                expect(AudioManager.setAudioSessionActivity).toHaveBeenCalledWith(false);
                expect(nextRecorder.stop).toHaveBeenCalledTimes(1);
                expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(2);
            }
        },
    );

    it('streams PCM with captured operation identity and finalizes through Client', async () => {
        const session = await startMobileVoiceCapture({
            operation,
        });

        expect(pioneerClient.composerVoiceCapturePlan).toHaveBeenCalledWith(operation);
        expect(
            jest.mocked(pioneerClient.composerVoiceCapturePlan).mock.invocationCallOrder[0],
        ).toBeLessThan(
            jest.mocked(AudioManager.checkRecordingPermissions).mock.invocationCallOrder[0],
        );
        expect(pioneerClient.voiceSessionStart).toHaveBeenCalledWith({
            operation,
            audio_format: MOBILE_VOICE_AUDIO_FORMAT,
        });
        expect(emitAudioReady).not.toBeNull();

        emitAudioReady?.({
            buffer: {
                getChannelData: () => new Float32Array([0.25, -0.5, 0.75, -1]),
                sampleRate: MOBILE_VOICE_AUDIO_FORMAT.sample_rate_hz,
            },
            numFrames: 4,
        });

        expect(pioneerClient.voiceAudioChunk).toHaveBeenCalledTimes(1);
        const [chunkParams, pcmChunk] = jest.mocked(pioneerClient.voiceAudioChunk).mock.calls[0];
        expect(chunkParams).toMatchObject({
            operation,
            session_id: 'voice-session-mobile-e2e',
            sequence: 0,
            audio_format: MOBILE_VOICE_AUDIO_FORMAT,
        });
        expect(pcmChunk).toBeInstanceOf(ArrayBuffer);
        expect(pcmChunk.byteLength).toBe(8);
        expect(Array.from(new Uint8Array(pcmChunk)).some((byte) => byte !== 0)).toBe(true);

        await session.commit(async () => turnContext);

        expect(pioneerClient.voiceSessionFinalize).toHaveBeenCalledTimes(1);
        expect(pioneerClient.voiceSessionFinalize).toHaveBeenCalledWith({
            operation,
        });
        expect(pioneerClient.voiceSessionCancel).not.toHaveBeenCalled();
        expect(recorder.stop).toHaveBeenCalledTimes(1);
        expect(routeSubscription.remove).toHaveBeenCalledTimes(1);
        expect(AudioManager.setAudioSessionActivity).toHaveBeenLastCalledWith(false);

        // Capture transports audio only; model catalog/download ownership stays on Gateway.
    });
    it('cancels the captured session and detaches native callbacks once', async () => {
        const session = await startMobileVoiceCapture({
            operation,
        });
        const lateAudio = emitAudioReady;
        await session.cancel('route_unmounted');
        await session.cancel('duplicate');
        lateAudio?.({
            buffer: {
                getChannelData: () => new Float32Array([0.5]),
                sampleRate: MOBILE_VOICE_AUDIO_FORMAT.sample_rate_hz,
            },
            numFrames: 1,
        });
        expect(pioneerClient.voiceSessionCancel).toHaveBeenCalledTimes(1);
        expect(pioneerClient.voiceSessionCancel).toHaveBeenCalledWith({
            operation,
            session_id: 'voice-session-mobile-e2e',
            reason: 'route_unmounted',
        });
        expect(pioneerClient.voiceAudioChunk).not.toHaveBeenCalled();
        expect(recorder.stop).toHaveBeenCalledTimes(1);
        expect(routeSubscription.remove).toHaveBeenCalledTimes(1);
        expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(1);
    });

    it('preserves operation identity on preparation failure and releases native resources', async () => {
        const session = await startMobileVoiceCapture({
            operation,
        });
        await expect(
            session.commit(async () => {
                throw new Error('synthetic upload failure');
            }),
        ).rejects.toThrow('synthetic upload failure');
        expect(pioneerClient.voiceSessionFinalize).not.toHaveBeenCalled();
        expect(pioneerClient.voiceSessionCancel).toHaveBeenCalledWith(
            expect.objectContaining({ operation, session_id: 'voice-session-mobile-e2e' }),
        );
        expect(recorder.stop).toHaveBeenCalledTimes(1);
        expect(routeSubscription.remove).toHaveBeenCalledTimes(1);
        expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(1);
    });
    it('publishes recorder startup failure before cancelling its captured session', async () => {
        recorder.start.mockImplementation(async () => ({
            status: 'error',
            message: 'synthetic microphone busy',
        }));
        const onError = jest.fn();
        await expect(
            startMobileVoiceCapture({
                operation,
                callbacks: { onError },
            }),
        ).rejects.toThrow('synthetic microphone busy');
        expect(onError).toHaveBeenCalledTimes(1);
        expect(pioneerClient.voiceSessionCancel).toHaveBeenCalledTimes(1);
        expect(onError.mock.invocationCallOrder[0]).toBeLessThan(
            jest.mocked(pioneerClient.voiceSessionCancel).mock.invocationCallOrder[0],
        );
        expect(pioneerClient.voiceSessionCancel).toHaveBeenCalledWith(
            expect.objectContaining({ operation, session_id: 'voice-session-mobile-e2e' }),
        );
        expect(recorder.clearOnAudioReady).toHaveBeenCalledTimes(1);
        expect(recorder.clearOnError).toHaveBeenCalledTimes(1);
        expect(AudioManager.setAudioSessionActivity).toHaveBeenLastCalledWith(false);
    });

    it('rejects a failed Client preflight before touching permission or recorder resources', async () => {
        jest.mocked(pioneerClient.composerVoiceCapturePlan).mockRejectedValue(
            new Error('Voice input is busy.'),
        );
        await expect(startMobileVoiceCapture({ operation })).rejects.toThrow(
            'Voice input is busy.',
        );
        expect(AudioManager.checkRecordingPermissions).not.toHaveBeenCalled();
        expect(AudioManager.setAudioSessionActivity).not.toHaveBeenCalled();
        expect(AudioRecorder).not.toHaveBeenCalled();
        expect(pioneerClient.voiceSessionStart).not.toHaveBeenCalled();
        expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(1);
    });
    it.each(['cancel', 'finalize'])(
        'joins %s cleanup before releasing the exact native capture and transport lease',
        async (kind) => {
            const session = await startMobileVoiceCapture({ operation });
            const lateAudio = emitAudioReady;
            let release!: () => void;
            const pending = new Promise<void>((resolve) => { release = resolve; });
            if (kind === 'cancel') {
                jest.mocked(pioneerClient.voiceSessionCancel).mockImplementationOnce(async () => {
                    await pending;
                    return { cancelled: true };
                });
            } else {
                jest.mocked(pioneerClient.voiceSessionFinalize).mockImplementationOnce(async () => {
                    await pending;
                    throw new Error('connection closed');
                });
            }
            const ending =
                kind === 'cancel' ? session.cancel() : session.commit(async () => turnContext);
            const joined = session.cancel('composer_terminal');
            expect(joined).toBe(ending);
            expect(pioneerClient.gatewayTransportRelease).not.toHaveBeenCalled();
            release();
            if (kind === 'cancel') await ending;
            else await expect(ending).rejects.toThrow('connection closed');
            expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(1);
            expect(recorder.stop).toHaveBeenCalledTimes(1);
            expect(routeSubscription.remove).toHaveBeenCalledTimes(1);
            const next = await startMobileVoiceCapture({ operation: { ...operation, generation: 2 } });
            const calls = jest.mocked(pioneerClient.voiceAudioChunk).mock.calls.length;
            lateAudio?.({
                buffer: { getChannelData: () => new Float32Array([0.5]), sampleRate: 16000 },
                numFrames: 1,
            });
            expect(pioneerClient.voiceAudioChunk).toHaveBeenCalledTimes(calls);
            await next.cancel();
            expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(2);
        },
    );

    it('late cleanup of the old capture cannot deactivate the new native audio session', async () => {
        const old = await startMobileVoiceCapture({ operation });
        let release!: () => void;
        const pending = new Promise<void>((resolve) => { release = resolve; });
        jest.mocked(pioneerClient.voiceSessionCancel).mockImplementationOnce(async () => {
            await pending;
            return { cancelled: true };
        });
        const cleanup = old.cancel();
        const next = await startMobileVoiceCapture({ operation: { ...operation, generation: 2 } });
        jest.mocked(AudioManager.setAudioSessionActivity).mockClear();
        release();
        await cleanup;
        expect(AudioManager.setAudioSessionActivity).not.toHaveBeenCalledWith(false);
        expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(1);
        await next.cancel();
        expect(AudioManager.setAudioSessionActivity).toHaveBeenCalledWith(false);
        expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(2);
    });
    it('a cancelled native start cannot attach callbacks after its terminal cleanup', async () => {
        let entered!: () => void;
        let release!: () => void;
        const starting = new Promise<void>((resolve) => { entered = resolve; });
        const pending = new Promise<void>((resolve) => { release = resolve; });
        let fail!: (event: { message: string }) => void;
        recorder.onError.mockImplementation((callback: typeof fail) => {
            fail = callback;
            return { status: 'success' };
        });
        recorder.start.mockImplementation(async () => {
            entered();
            await pending;
            return { status: 'success' };
        });
        const capture = startMobileVoiceCapture({ operation });
        await starting;
        fail({ message: 'native connection lost' });
        release();
        const session = await capture;
        await session.cancel('test_join');
        expect(AudioManager.addSystemEventListener).not.toHaveBeenCalled();
        expect(recorder.clearOnAudioReady).toHaveBeenCalled();
        expect(recorder.clearOnError).toHaveBeenCalled();
        expect(pioneerClient.gatewayTransportRelease).toHaveBeenCalledTimes(1);
    });

});
