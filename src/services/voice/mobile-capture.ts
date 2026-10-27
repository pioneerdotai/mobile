import { composerOperationPlan } from '@/client/composer';
import type { ComposerOperationIdentity } from '@/client/generated/composer_publication';
import { AudioManager, AudioRecorder, type AudioEventSubscription } from 'react-native-audio-api';

import {
    pioneerClient,
    type VoiceAudioFormat,
    type VoiceSessionStartContext,
    type VoiceTurnContext,
} from '@/client';
import { acquireGatewayTransportLease } from '@/services/gateway/transport-coordinator';

const VOICE_SAMPLE_RATE_HZ = 16_000;
const VOICE_CHANNELS = 1;
const VOICE_CHUNK_SAMPLES = 320;
// Bound synchronous bridge work; Rust independently splits wire packets at 1600 samples.
const VOICE_MAX_SOURCE_SAMPLES = 4_096;
const LEVEL_UPDATE_INTERVAL_MS = 80;
const ROUTE_CHANGE_RESTART_DELAY_MS = 150;
const ROUTE_CHANGE_RESTART_REASONS: ReadonlySet<string> = new Set([
    'NewDeviceAvailable',
    'OldDeviceUnavailable',
    'ConfigurationChange',
    'NoSuitableRouteForCategory',
]);

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
    operation: ComposerOperationIdentity;
    callbacks?: MobileVoiceCaptureCallbacks;
};

export const startMobileVoiceCapture = async ({
    operation,
    callbacks,
}: StartMobileVoiceCaptureParams): Promise<MobileVoiceCaptureSession> => {
    const releaseTransportLease = await acquireGatewayTransportLease();
    let sessionOwnsTransportLease = false;
    try {
        let plan;
        try {
            plan = await pioneerClient.composerVoiceCapturePlan(operation);
        } catch (error) {
            throw new MobileVoiceCaptureError(
                'voice_not_ready',
                errorMessage(error),
                errorOptions(error),
            );
        }
        const startContext = plan.voice_start;
        if (!startContext)
            throw new MobileVoiceCaptureError(
                'session_start_failed',
                'Voice requires an opened thread',
            );

        await ensureRecordingPermission();
        await ensureInputDevice();
        if (!composerOperationPlan(operation)) {
            throw new MobileVoiceCaptureError('session_start_failed', 'Voice operation cancelled');
        }
        await activateRecordingSession(operation);

        let sessionId: string;
        try {
            const response = await pioneerClient.voiceSessionStart({
                operation,
                audio_format: MOBILE_VOICE_AUDIO_FORMAT,
            });
            sessionId = response.session_id;
        } catch (error) {
            await deactivateRecordingSession(operation);
            throw new MobileVoiceCaptureError(
                'session_start_failed',
                errorMessage(error),
                errorOptions(error),
            );
        }

        const session = new MobileVoiceCaptureSession(
            sessionId,
            startContext,
            releaseTransportLease,
            operation,
            callbacks,
        );
        sessionOwnsTransportLease = true;
        try {
            await session.start();
        } catch (error) {
            const captureError =
                error instanceof MobileVoiceCaptureError
                    ? error
                    : new MobileVoiceCaptureError(
                          'recorder_start_failed',
                          errorMessage(error),
                          errorOptions(error),
                      );
            callbacks?.onError?.(captureError);
            await session.cancel('mobile_capture_start_failed').catch(() => null);
            throw captureError;
        }

        return session;
    } finally {
        if (!sessionOwnsTransportLease) {
            await deactivateRecordingSession(operation);
            releaseTransportLease();
        }
    }
};

export class MobileVoiceCaptureSession {
    readonly sessionId: string;
    readonly operation: ComposerOperationIdentity;
    readonly startContext: VoiceSessionStartContext;
    readonly turnId: string;
    private readonly releaseTransportLease: () => void;
    private readonly callbacks?: MobileVoiceCaptureCallbacks;
    private recorder: AudioRecorder | null = null;
    private routeChangeSubscription: AudioEventSubscription | null = null;
    private routeChangeRestartTimer: ReturnType<typeof setTimeout> | null = null;
    private recorderTransition: Promise<void> = Promise.resolve();
    private currentInputRouteKey: string | null = null;
    private recorderGeneration = 0;
    private ending = false;
    private endingTask: Promise<void> | null = null;
    private chunkError: MobileVoiceCaptureError | null = null;
    private lastLevelUpdateUnixMs = 0;

    constructor(
        sessionId: string,
        startContext: VoiceSessionStartContext,
        releaseTransportLease: () => void,
        operation: ComposerOperationIdentity,
        callbacks?: MobileVoiceCaptureCallbacks,
    ) {
        this.sessionId = sessionId;
        this.operation = operation;
        this.startContext = { ...startContext };
        this.turnId = startContext.turn_id;
        this.releaseTransportLease = releaseTransportLease;
        this.callbacks = callbacks;
    }

    async start(): Promise<void> {
        await this.startRecorder();
        if (this.ending) return;
        this.currentInputRouteKey = await getCurrentInputRouteKey();
        if (this.ending) return;
        this.routeChangeSubscription = AudioManager.addSystemEventListener(
            'routeChange',
            (event) => {
                if (!ROUTE_CHANGE_RESTART_REASONS.has(event.reason)) {
                    return;
                }
                this.scheduleRecorderRestart();
            },
        );
    }

    private async startRecorder(): Promise<void> {
        const recorder = new AudioRecorder();
        this.recorder = recorder;
        const generation = ++this.recorderGeneration;

        recorder.onError((event) => {
            if (this.recorder !== recorder || this.recorderGeneration !== generation || this.ending) {
                return;
            }
            const error = new MobileVoiceCaptureError(
                'recorder_start_failed',
                event.message || 'Microphone recording failed.',
            );
            this.callbacks?.onError?.(error);
            void this.cancel('mobile_recorder_error').catch(() => null);
        });

        const callbackResult = recorder.onAudioReady(
            {
                sampleRate: VOICE_SAMPLE_RATE_HZ,
                bufferLength: VOICE_CHUNK_SAMPLES,
                channelCount: VOICE_CHANNELS,
            },
            (event) => {
                // JS callbacks and bridge calls are synchronous. Revoke admission before any
                // await in stop: late queued callbacks cannot read or send an old buffer.
                if (
                    this.ending ||
                    this.recorder !== recorder ||
                    this.recorderGeneration !== generation ||
                    !composerOperationPlan(this.operation)
                ) return;
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
        if (this.ending || this.recorder !== recorder || this.recorderGeneration !== generation) {
            recorder.clearOnAudioReady();
            recorder.clearOnError();
            if (recorder.isRecording()) await recorder.stop().catch(() => null);
            return;
        }
        if (startResult.status === 'error') {
            throw new MobileVoiceCaptureError('recorder_start_failed', startResult.message);
        }
    }

    private scheduleRecorderRestart(): void {
        if (this.ending) {
            return;
        }

        if (this.routeChangeRestartTimer) {
            clearTimeout(this.routeChangeRestartTimer);
        }

        // A Bluetooth switch emits several route notifications; restart once after the route settles.
        this.routeChangeRestartTimer = setTimeout(() => {
            this.routeChangeRestartTimer = null;
            this.recorderTransition = this.recorderTransition
                .then(() => this.restartRecorderIfInputRouteChanged());
            // Observe failure without replacing the transition awaited by stopRecorder:
            // an ending Commit must still reject if this route's native stop fails.
            void this.recorderTransition.catch((error) => {
                if (this.ending) {
                    return;
                }
                const captureError = new MobileVoiceCaptureError(
                    'recorder_start_failed',
                    errorMessage(error),
                    errorOptions(error),
                );
                this.callbacks?.onError?.(captureError);
                void this.cancel('mobile_audio_route_change_failed').catch(() => null);
            });
        }, ROUTE_CHANGE_RESTART_DELAY_MS);
    }

    private async restartRecorderIfInputRouteChanged(): Promise<void> {
        if (this.ending || !composerOperationPlan(this.operation)) {
            return;
        }

        const nextInputRouteKey = await getCurrentInputRouteKey();
        if (nextInputRouteKey !== null && nextInputRouteKey === this.currentInputRouteKey) {
            return;
        }

        await this.stopCurrentRecorder();
        if (this.ending || !composerOperationPlan(this.operation)) {
            return;
        }

        // A route is a physical stream boundary. Drain only admitted samples, then
        // discard the old filter before a new recorder can deliver callbacks.
        this.flushCapture('segment');
        await deactivateRecordingSession(this.operation);
        // Deactivation may finish after cancellation or another capture's activation.
        // Only this still-current operation can reclaim the now-unowned audio session.
        if (
            this.ending ||
            !composerOperationPlan(this.operation) ||
            recordingSessionOwner !== null
        ) {
            return;
        }
        await activateRecordingSession(this.operation);
        if (this.ending) {
            return;
        }

        await this.startRecorder();
        this.currentInputRouteKey = await getCurrentInputRouteKey();
    }

    commit(prepareContext: () => Promise<VoiceTurnContext>): Promise<void> {
        if (this.ending) return this.endingTask ?? Promise.resolve();
        this.ending = true;
        this.endingTask = this.commitEnding(prepareContext);
        return this.endingTask;
    }

    private async commitEnding(prepareContext: () => Promise<VoiceTurnContext>): Promise<void> {
        try {
            await this.stopRecorder();
            this.callbacks?.onLevel?.(0);
            if (!this.chunkError) this.flushCapture('finish');
            // Flush itself can fail. Read the current latch after it, retaining ending=true.
            if (this.chunkError) throw this.chunkError;
            await prepareContext();
            try {
                await pioneerClient.voiceSessionFinalize({ operation: this.operation });
            } catch (error) {
                throw new MobileVoiceCaptureError(
                    'finalize_failed', errorMessage(error), errorOptions(error),
                );
            }
        } catch (error) {
            await this.cancelGatewaySession('mobile_commit_failed').catch(() => null);
            throw error;
        } finally {
            try {
                await deactivateRecordingSession(this.operation);
            } finally {
                this.releaseTransportLease();
            }
        }
    }

    cancel(reason = 'mobile_release_cancel'): Promise<void> {
        if (this.ending) return this.endingTask ?? Promise.resolve();
        this.ending = true;
        this.endingTask = this.cancelEnding(reason);
        return this.endingTask;
    }

    private async cancelEnding(reason: string): Promise<void> {
        try {
            try {
                await this.stopRecorder();
            } finally {
                this.callbacks?.onLevel?.(0);
                // Cancel also destroys the exact-operation DSP state, even if native stop failed.
                await this.cancelGatewaySession(reason);
            }
        } finally {
            try {
                await deactivateRecordingSession(this.operation);
            } finally {
                this.releaseTransportLease();
            }
        }
    }

    private sendAudioReadyEvent(
        samples: Float32Array,
        numFrames: number,
        sampleRate: number,
    ): void {
        if (this.ending || this.chunkError) return;
        try {
            if (!Number.isInteger(sampleRate) || sampleRate <= 0 || sampleRate > 0xffff_ffff) {
                throw new Error('Microphone reported an invalid sample rate.');
            }
            if (!Number.isInteger(numFrames) || numFrames < 0) {
                throw new Error('Microphone reported an invalid frame count.');
            }
            const sampleCount = Math.min(samples.length, numFrames);
            for (let offset = 0; offset < sampleCount; offset += VOICE_MAX_SOURCE_SAMPLES) {
                const count = Math.min(VOICE_MAX_SOURCE_SAMPLES, sampleCount - offset);
                // Own the exact view while crossing the synchronous binary bridge. No callback
                // buffer or PCM payload returns through JS; Rust sends converted chunks directly.
                const source = samples.slice(offset, offset + count);
                pioneerClient.voiceAudioChunk({
                    operation: this.operation,
                    session_id: this.sessionId,
                    action: 'process',
                    input_sample_rate_hz: sampleRate,
                    captured_at_unix_ms: Date.now(),
                }, source.buffer as ArrayBuffer);
            }
            if (sampleCount > 0) this.updateLevel(samples, 0, sampleCount);
        } catch (error) {
            this.recordChunkError(error);
            void this.cancel('mobile_chunk_send_failed').catch(() => null);
        }
    }

    private flushCapture(action: 'segment' | 'finish'): void {
        if (this.chunkError) throw this.chunkError;
        try {
            // Explicit control path is allowed behind the ending fence; ordinary callbacks stay fenced.
            pioneerClient.voiceAudioChunk({
                operation: this.operation,
                session_id: this.sessionId,
                action,
            }, new ArrayBuffer(0));
        } catch (error) {
            this.recordChunkError(error);
            throw this.chunkError;
        }
    }

    private recordChunkError(error: unknown): void {
        if (this.chunkError) return;
        this.chunkError = new MobileVoiceCaptureError(
            'chunk_send_failed', errorMessage(error), errorOptions(error),
        );
        this.callbacks?.onError?.(this.chunkError);
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
        this.routeChangeSubscription?.remove();
        this.routeChangeSubscription = null;
        if (this.routeChangeRestartTimer) {
            clearTimeout(this.routeChangeRestartTimer);
            this.routeChangeRestartTimer = null;
        }
        try {
            await this.recorderTransition;
        } finally {
            // A failed restart can still own a recorder that needs native cleanup.
            await this.stopCurrentRecorder();
        }
    }

    private async stopCurrentRecorder(): Promise<void> {
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

        const result = await recorder.stop();
        if (result.status === 'error') {
            throw new MobileVoiceCaptureError('recorder_start_failed', result.message);
        }
    }

    private async cancelGatewaySession(reason: string): Promise<void> {
        try {
            await pioneerClient.voiceSessionCancel({
                operation: this.operation,
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

const getCurrentInputRouteKey = async (): Promise<string | null> => {
    const devices = await AudioManager.getDevicesInfo().catch(() => null);
    if (!devices) {
        return null;
    }

    return devices.currentInputs
        .map((device) => device.id)
        .sort((left, right) => left.localeCompare(right))
        .join('|');
};

let recordingSessionOwner: ComposerOperationIdentity | null = null;

const activateRecordingSession = async (operation: ComposerOperationIdentity): Promise<void> => {
    recordingSessionOwner = operation;
    AudioManager.setAudioSessionOptions({
        iosCategory: 'record',
        iosMode: 'default',
        iosOptions: ['allowBluetoothHFP', 'bluetoothHighQualityRecording'],
    });
    await AudioManager.setAudioSessionActivity(true);
};

const deactivateRecordingSession = async (operation: ComposerOperationIdentity): Promise<void> => {
    if (
        recordingSessionOwner?.thread_id !== operation.thread_id ||
        recordingSessionOwner.draft_id !== operation.draft_id ||
        recordingSessionOwner.generation !== operation.generation
    )
        return;
    recordingSessionOwner = null;
    await AudioManager.setAudioSessionActivity(false).catch(() => null);
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
