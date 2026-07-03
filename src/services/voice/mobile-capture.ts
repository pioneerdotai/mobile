import { AudioManager, AudioRecorder } from 'react-native-audio-api';

import {
    pioneerClient,
    type VoiceAudioFormat,
    type VoiceStatus,
    type VoiceTurnContext,
} from '@/client';

const VOICE_SAMPLE_RATE_HZ = 16_000;
const VOICE_CHANNELS = 1;
const VOICE_CHUNK_SAMPLES = 320;
const VOICE_MAX_CHUNK_SAMPLES = 1_600;
const VOICE_CHUNK_DURATION_MS = 20;
const LEVEL_UPDATE_INTERVAL_MS = 80;

export const MOBILE_VOICE_AUDIO_FORMAT: VoiceAudioFormat = {
    sample_rate_hz: VOICE_SAMPLE_RATE_HZ,
    channels: VOICE_CHANNELS,
    encoding: 'pcm_s16_le',
};

export type MobileVoiceCaptureErrorCode =
    | 'voice_not_ready'
    | 'permission_denied'
    | 'device_unavailable'
    | 'session_start_failed'
    | 'recorder_start_failed'
    | 'chunk_send_failed'
    | 'finalize_failed'
    | 'cancel_failed';

export class MobileVoiceCaptureError extends Error {
    readonly code: MobileVoiceCaptureErrorCode;

    constructor(code: MobileVoiceCaptureErrorCode, message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = 'MobileVoiceCaptureError';
        this.code = code;
    }
}

export type MobileVoiceCaptureCallbacks = {
    onLevel?: (level: number) => void;
    onError?: (error: MobileVoiceCaptureError) => void;
};

export type StartMobileVoiceCaptureParams = {
    workspaceId: string;
    prepareContext: () => Promise<VoiceTurnContext>;
    callbacks?: MobileVoiceCaptureCallbacks;
};

export const canUseVoiceStatus = (status: VoiceStatus | null | undefined): boolean =>
    status === 'ready';

export const voiceStatusUnavailableMessage = (status: VoiceStatus | null | undefined): string => {
    switch (status) {
        case 'model_downloading':
            return 'Voice model is still downloading.';
        case 'model_loading':
            return 'Voice model is still loading.';
        case 'busy':
        case 'recording':
        case 'transcribing':
            return 'Voice input is busy.';
        case 'error':
            return 'Voice input is unavailable.';
        case 'unavailable':
            return 'Voice input is unavailable.';
        case 'ready':
            return '';
        default:
            return 'Voice input is not ready.';
    }
};

export const startMobileVoiceCapture = async ({
    workspaceId,
    prepareContext,
    callbacks,
}: StartMobileVoiceCaptureParams): Promise<MobileVoiceCaptureSession> => {
    const status = await pioneerClient.voiceStatus({ workspace_id: workspaceId });
    if (!canUseVoiceStatus(status.status)) {
        throw new MobileVoiceCaptureError(
            'voice_not_ready',
            status.error?.message || voiceStatusUnavailableMessage(status.status),
        );
    }

    await ensureRecordingPermission();
    await ensureInputDevice();
    await activateRecordingSession();

    let context: VoiceTurnContext;
    try {
        context = await prepareContext();
    } catch (error) {
        await deactivateRecordingSession();
        throw error;
    }

    let sessionId: string;
    try {
        const response = await pioneerClient.voiceSessionStart({
            context,
            audio_format: MOBILE_VOICE_AUDIO_FORMAT,
        });
        sessionId = response.session_id;
    } catch (error) {
        await deactivateRecordingSession();
        throw new MobileVoiceCaptureError(
            'session_start_failed',
            errorMessage(error),
            errorOptions(error),
        );
    }

    const session = new MobileVoiceCaptureSession(sessionId, context.turn_id, callbacks);
    try {
        await session.start();
    } catch (error) {
        await session.cancel('mobile_capture_start_failed').catch(() => null);
        throw error;
    }

    return session;
};

export class MobileVoiceCaptureSession {
    readonly sessionId: string;
    readonly turnId: string;
    private readonly callbacks?: MobileVoiceCaptureCallbacks;
    private recorder: AudioRecorder | null = null;
    private sequence = 0;
    private ending = false;
    private chunkError: MobileVoiceCaptureError | null = null;
    private lastLevelUpdateUnixMs = 0;

    constructor(sessionId: string, turnId: string, callbacks?: MobileVoiceCaptureCallbacks) {
        this.sessionId = sessionId;
        this.turnId = turnId;
        this.callbacks = callbacks;
    }

    async start(): Promise<void> {
        const recorder = new AudioRecorder();
        this.recorder = recorder;

        recorder.onError((event) => {
            const error = new MobileVoiceCaptureError(
                'recorder_start_failed',
                event.message || 'Microphone recording failed.',
            );
            this.callbacks?.onError?.(error);
            void this.cancel('mobile_recorder_error');
        });

        const callbackResult = recorder.onAudioReady(
            {
                sampleRate: VOICE_SAMPLE_RATE_HZ,
                bufferLength: VOICE_CHUNK_SAMPLES,
                channelCount: VOICE_CHANNELS,
            },
            (event) => {
                this.sendAudioReadyEvent(
                    event.buffer.getChannelData(0),
                    event.numFrames,
                    event.buffer.sampleRate,
                );
            },
        );
        if (callbackResult.status === 'error') {
            throw new MobileVoiceCaptureError('recorder_start_failed', callbackResult.message);
        }

        const startResult = await recorder.start();
        if (startResult.status === 'error') {
            throw new MobileVoiceCaptureError('recorder_start_failed', startResult.message);
        }
    }

    async commit(): Promise<void> {
        if (this.ending) {
            return;
        }
        this.ending = true;

        const chunkError = this.chunkError;
        await this.stopRecorder();
        this.callbacks?.onLevel?.(0);

        if (chunkError) {
            await this.cancelGatewaySession('mobile_chunk_send_failed');
            throw chunkError;
        }

        try {
            await pioneerClient.voiceSessionFinalize({ session_id: this.sessionId });
        } catch (error) {
            throw new MobileVoiceCaptureError(
                'finalize_failed',
                errorMessage(error),
                errorOptions(error),
            );
        } finally {
            await deactivateRecordingSession();
        }
    }

    async cancel(reason = 'mobile_release_cancel'): Promise<void> {
        if (this.ending) {
            return;
        }
        this.ending = true;

        await this.stopRecorder();
        this.callbacks?.onLevel?.(0);
        try {
            await this.cancelGatewaySession(reason);
        } finally {
            await deactivateRecordingSession();
        }
    }

    private sendAudioReadyEvent(
        samples: Float32Array,
        numFrames: number,
        sampleRate: number,
    ): void {
        if (this.ending || this.chunkError || numFrames <= 0) {
            return;
        }

        const { samples: voiceSamples, sampleCount } = voiceSamplesFromRecorderEvent(
            samples,
            numFrames,
            sampleRate,
        );
        if (sampleCount <= 0) {
            return;
        }

        for (
            let sampleOffset = 0;
            sampleOffset < sampleCount && !this.chunkError;
            sampleOffset += VOICE_MAX_CHUNK_SAMPLES
        ) {
            const chunkSampleCount = Math.min(VOICE_MAX_CHUNK_SAMPLES, sampleCount - sampleOffset);
            this.sendVoiceChunk(voiceSamples, sampleOffset, chunkSampleCount);
        }
    }

    private sendVoiceChunk(samples: Float32Array, sampleOffset: number, sampleCount: number): void {
        const sequence = this.sequence;
        this.sequence += 1;
        const pcmChunk = pcmS16LeFromFloat32(samples, sampleOffset, sampleCount);
        const durationMs = Math.max(
            1,
            Math.round((sampleCount / VOICE_SAMPLE_RATE_HZ) * 1000) || VOICE_CHUNK_DURATION_MS,
        );

        try {
            pioneerClient.voiceAudioChunk(
                {
                    session_id: this.sessionId,
                    sequence,
                    audio_format: MOBILE_VOICE_AUDIO_FORMAT,
                    captured_at_unix_ms: Date.now(),
                    duration_ms: durationMs,
                },
                pcmChunk,
            );
            this.updateLevel(samples, sampleOffset, sampleCount);
        } catch (error) {
            const captureError = new MobileVoiceCaptureError(
                'chunk_send_failed',
                errorMessage(error),
                errorOptions(error),
            );
            this.chunkError = captureError;
            this.callbacks?.onError?.(captureError);
            void this.cancel('mobile_chunk_send_failed');
        }
    }

    private updateLevel(samples: Float32Array, sampleOffset: number, sampleCount: number): void {
        const now = Date.now();
        if (now - this.lastLevelUpdateUnixMs < LEVEL_UPDATE_INTERVAL_MS) {
            return;
        }
        this.lastLevelUpdateUnixMs = now;

        let sum = 0;
        for (let index = 0; index < sampleCount; index += 1) {
            const sample = samples[sampleOffset + index] ?? 0;
            sum += sample * sample;
        }

        this.callbacks?.onLevel?.(Math.min(1, Math.sqrt(sum / sampleCount) * 4));
    }

    private async stopRecorder(): Promise<void> {
        const recorder = this.recorder;
        this.recorder = null;
        if (!recorder) {
            return;
        }

        recorder.clearOnAudioReady();
        recorder.clearOnError();
        if (!recorder.isRecording()) {
            return;
        }

        await recorder.stop().catch(() => null);
    }

    private async cancelGatewaySession(reason: string): Promise<void> {
        try {
            await pioneerClient.voiceSessionCancel({
                session_id: this.sessionId,
                reason,
            });
        } catch (error) {
            throw new MobileVoiceCaptureError(
                'cancel_failed',
                errorMessage(error),
                errorOptions(error),
            );
        }
    }
}

const ensureRecordingPermission = async (): Promise<void> => {
    const initial = await AudioManager.checkRecordingPermissions();
    if (initial === 'Granted') {
        return;
    }

    const requested =
        initial === 'Undetermined' ? await AudioManager.requestRecordingPermissions() : initial;
    if (requested !== 'Granted') {
        throw new MobileVoiceCaptureError(
            'permission_denied',
            'Microphone access is required for voice input.',
        );
    }
};

const ensureInputDevice = async (): Promise<void> => {
    const devices = await AudioManager.getDevicesInfo().catch(() => null);
    if (!devices) {
        return;
    }

    if (devices.currentInputs.length > 0 || devices.availableInputs.length > 0) {
        return;
    }

    throw new MobileVoiceCaptureError(
        'device_unavailable',
        'No microphone input device is available.',
    );
};

const activateRecordingSession = async (): Promise<void> => {
    AudioManager.setAudioSessionOptions({
        iosCategory: 'record',
        iosMode: 'measurement',
        iosOptions: ['allowBluetoothHFP', 'bluetoothHighQualityRecording'],
    });
    await AudioManager.setAudioSessionActivity(true);
};

const deactivateRecordingSession = async (): Promise<void> => {
    await AudioManager.setAudioSessionActivity(false).catch(() => null);
};

const voiceSamplesFromRecorderEvent = (
    samples: Float32Array,
    numFrames: number,
    sampleRate: number,
): { samples: Float32Array; sampleCount: number } => {
    const sourceSampleCount = Math.min(samples.length, numFrames);
    if (sourceSampleCount <= 0) {
        return { samples, sampleCount: 0 };
    }

    if (!Number.isFinite(sampleRate) || sampleRate <= 0 || sampleRate === VOICE_SAMPLE_RATE_HZ) {
        return { samples, sampleCount: sourceSampleCount };
    }

    const targetSampleCount = Math.max(
        1,
        Math.round((sourceSampleCount * VOICE_SAMPLE_RATE_HZ) / sampleRate),
    );
    const target = new Float32Array(targetSampleCount);
    const sourceStep = sampleRate / VOICE_SAMPLE_RATE_HZ;

    for (let targetIndex = 0; targetIndex < targetSampleCount; targetIndex += 1) {
        const sourceIndex = targetIndex * sourceStep;
        const lowerIndex = Math.floor(sourceIndex);
        const upperIndex = Math.min(sourceSampleCount - 1, lowerIndex + 1);
        const fraction = sourceIndex - lowerIndex;
        const lowerSample = samples[lowerIndex] ?? 0;
        const upperSample = samples[upperIndex] ?? lowerSample;
        target[targetIndex] = lowerSample + (upperSample - lowerSample) * fraction;
    }

    return { samples: target, sampleCount: targetSampleCount };
};

const pcmS16LeFromFloat32 = (
    samples: Float32Array,
    sampleOffset: number,
    sampleCount: number,
): ArrayBuffer => {
    const buffer = new ArrayBuffer(sampleCount * 2);
    const view = new DataView(buffer);

    for (let index = 0; index < sampleCount; index += 1) {
        const sample = Math.max(-1, Math.min(1, samples[sampleOffset + index] ?? 0));
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(index * 2, value, true);
    }

    return buffer;
};

const errorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return 'Voice input failed.';
};

const errorOptions = (error: unknown): ErrorOptions | undefined =>
    error instanceof Error ? { cause: error } : undefined;
