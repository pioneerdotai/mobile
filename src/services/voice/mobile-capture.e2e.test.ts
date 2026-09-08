import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AudioManager, AudioRecorder } from 'react-native-audio-api';

import { pioneerClient, type VoiceSessionStartContext, type VoiceTurnContext } from '@/client';
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

jest.mock('@/client', () => ({
    pioneerClient: {
        gatewayTransportReserve: jest.fn(() => 'lease'),
        gatewayTransportWait: jest.fn(async () => true),
        gatewayTransportRelease: jest.fn(),
        gatewaySettingsUpdate: jest.fn(),
        providerListTranscriptionModels: jest.fn(),
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
        expect(pioneerClient.providerListTranscriptionModels).not.toHaveBeenCalled();
        expect(pioneerClient.gatewaySettingsUpdate).not.toHaveBeenCalled();
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
});
