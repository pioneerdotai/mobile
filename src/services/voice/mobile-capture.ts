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
// Bound the source copy/admission call; DSP and wire packet preparation run on Rust worker.
const VOICE_MAX_SOURCE_SAMPLES = 4_096;
const LEVEL_UPDATE_INTERVAL_MS = 80;
const CAPTURE_START_TIMEOUT_MS = 10_000;
const CAPTURE_DRAIN_TIMEOUT_MS = 10_000;
const CAPTURE_STATUS_INTERVAL_MS = 20;
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

class CaptureStartupCancelled extends MobileVoiceCaptureError {
    constructor() {
        super('recorder_start_failed', 'Voice operation cancelled');
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
            session.reportError(captureError);
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
    private captureReady = false;
    private failureReported = false;
    private endingTask: Promise<void> | null = null;
    private chunkError: MobileVoiceCaptureError | null = null;
    private lastLevelUpdateUnixMs = 0;
    private firstAudio: { generation: number; resolve: () => void; reject: (error: Error) => void } | null = null;
    private recorderStartTask: Promise<unknown> | null = null;
    private readonly stoppedRecorders = new WeakMap<AudioRecorder, Promise<void>>();

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
        this.captureReady = false;
        const recorder = new AudioRecorder();
        this.recorder = recorder;
        const generation = ++this.recorderGeneration;
        let startupTimer: ReturnType<typeof setTimeout> | null = null;
        let authorityTimer: ReturnType<typeof setInterval> | null = null;
        const firstAudio = new Promise<void>((resolve, reject) => {
            this.firstAudio = { generation, resolve, reject };
        });
        const startupFailure = new Promise<never>((_resolve, reject) => {
            startupTimer = setTimeout(() => reject(new MobileVoiceCaptureError(
                'recorder_start_failed', 'Microphone did not deliver audio in time.',
            )), CAPTURE_START_TIMEOUT_MS);
            authorityTimer = setInterval(() => {
                if (!composerOperationPlan(this.operation) || this.ending) {
                    reject(new CaptureStartupCancelled());
                }
            }, CAPTURE_STATUS_INTERVAL_MS);
        });
        // Observe rejection even if native setup throws before the combined wait.
        void firstAudio.catch(() => undefined);
        void startupFailure.catch(() => undefined);

        try {
            recorder.onError((event) => {
                if (this.recorder !== recorder || this.recorderGeneration !== generation || this.ending) {
                    return;
                }
                const error = new MobileVoiceCaptureError(
                    'recorder_start_failed',
                    event.message || 'Microphone recording failed.',
                );
                this.rejectFirstAudio(error);
                this.reportError(error);
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
                    try {
                        if (this.sendAudioReadyEvent(
                            event.buffer.getChannelData(0),
                            event.numFrames,
                            event.buffer.sampleRate,
                        ) && this.firstAudio?.generation === generation) {
                            this.firstAudio.resolve();
                            this.firstAudio = null;
                        }
                    } catch (error) {
                        this.recordChunkError(error);
                        this.rejectFirstAudio(this.chunkError!);
                        void this.cancel('mobile_chunk_send_failed').catch(() => null);
                    }
                },
            );
            if (callbackResult.status === 'error') {
                throw new MobileVoiceCaptureError('recorder_start_failed', callbackResult.message);
            }

            if (this.ending || this.recorder !== recorder || this.recorderGeneration !== generation || !composerOperationPlan(this.operation)) {
                throw new CaptureStartupCancelled();
            }
            const startTask = Promise.resolve(recorder.start());
            this.recorderStartTask = startTask;
            const started = startTask.then((result) => {
                if (result.status === 'error') {
                    throw new MobileVoiceCaptureError('recorder_start_failed', result.message);
                }
            });
            await Promise.race([Promise.all([started, firstAudio]), startupFailure]);
            if (this.ending || this.recorder !== recorder || this.recorderGeneration !== generation || !composerOperationPlan(this.operation)) {
                throw new CaptureStartupCancelled();
            }
            this.captureReady = true;
        } finally {
            if (startupTimer !== null) clearTimeout(startupTimer);
            if (authorityTimer !== null) clearInterval(authorityTimer);
            if (this.firstAudio?.generation === generation) this.firstAudio = null;
        }
    }

    private rejectFirstAudio(error: Error): void {
        this.firstAudio?.reject(error);
        this.firstAudio = null;
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
                this.reportError(captureError);
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
        await this.flushCapture('segment');
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

        try {
            await this.startRecorder();
        } catch (error) {
            if (this.ending && error instanceof CaptureStartupCancelled) return;
            throw error;
        }
        this.currentInputRouteKey = await getCurrentInputRouteKey();
    }

    commit(prepareContext: () => Promise<VoiceTurnContext>): Promise<void> {
        if (this.ending) return this.endingTask ?? Promise.resolve();
        this.ending = true;
        this.rejectFirstAudio(new CaptureStartupCancelled());
        this.endingTask = this.commitEnding(prepareContext);
        return this.endingTask;
    }

    private async commitEnding(prepareContext: () => Promise<VoiceTurnContext>): Promise<void> {
        try {
            await this.stopRecorder();
            if (!this.captureReady) throw new MobileVoiceCaptureError('recorder_start_failed', 'Voice capture stopped before audio');
            this.callbacks?.onLevel?.(0);
            if (!this.chunkError) await this.flushCapture('finish');
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
        this.rejectFirstAudio(new CaptureStartupCancelled());
        this.endingTask = this.cancelEnding(reason);
        return this.endingTask;
    }

    private async cancelEnding(reason: string): Promise<void> {
        let failure: unknown;
        try {
            try { await this.stopRecorder(); } catch (error) { failure = error; }
            this.callbacks?.onLevel?.(0);
            try { await this.cancelGatewaySession(reason); } catch (error) { failure ??= error; }
            if (failure) throw failure;
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
    ): boolean {
        if (this.ending || this.chunkError) return false;
        try {
            if (!Number.isInteger(sampleRate) || sampleRate < 8_000 || sampleRate > 384_000) {
                throw new Error('Microphone reported an invalid sample rate.');
            }
            if (!Number.isInteger(numFrames) || numFrames < 0) {
                throw new Error('Microphone reported an invalid frame count.');
            }
            if (numFrames > samples.length) throw new Error('Microphone buffer is shorter than its frame count.');
            // A malformed source must fail before confirming first audio.
            const sampleCount = numFrames;
            if (sampleCount > VOICE_MAX_SOURCE_SAMPLES) throw new Error('Microphone source buffer exceeds capacity.');
            for (let index = 0; index < sampleCount; index += 1) {
                if (!Number.isFinite(samples[index])) throw new Error('Microphone reported an invalid sample.');
            }
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
            return sampleCount > 0;
        } catch (error) {
            this.recordChunkError(error);
            throw this.chunkError;
        }
    }

    private async flushCapture(action: 'segment' | 'finish'): Promise<void> {
        if (this.chunkError) throw this.chunkError;
        try {
            // Explicit control path is allowed behind the ending fence; ordinary callbacks stay fenced.
            const result = pioneerClient.voiceAudioChunk({
                operation: this.operation,
                session_id: this.sessionId,
                action,
            }, new ArrayBuffer(0));
            // Old native peers cannot establish this contract. Fail before finalize.
            if (typeof result.drained !== 'boolean') throw new Error('Native voice worker drain is unsupported.');
            if (action === 'finish') {
                const deadline = Date.now() + CAPTURE_DRAIN_TIMEOUT_MS;
                let drained = result.drained;
                while (!drained) {
                    if (Date.now() >= deadline) throw new Error('Voice capture worker did not drain in time.');
                    await new Promise<void>((resolve) => setTimeout(resolve, CAPTURE_STATUS_INTERVAL_MS));
                    const status = pioneerClient.voiceAudioChunk({
                        operation: this.operation, session_id: this.sessionId, action: 'status',
                    }, new ArrayBuffer(0));
                    if (typeof status.drained !== 'boolean') throw new Error('Native voice worker drain is unsupported.');
                    drained = status.drained;
                }
            }
        } catch (error) {
            this.recordChunkError(error);
            throw this.chunkError;
        }
    }

    /** Shared by the start helper and terminal paths: publish failure once. */
    reportError(error: MobileVoiceCaptureError): void {
        if (this.failureReported) return;
        this.failureReported = true;
        this.callbacks?.onError?.(error);
    }

    private recordChunkError(error: unknown): void {
        if (this.chunkError) return;
        this.chunkError = new MobileVoiceCaptureError(
            'chunk_send_failed', errorMessage(error), errorOptions(error),
        );
        this.reportError(this.chunkError);
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
        let failure: unknown;
        try { await this.recorderTransition; } catch (error) { failure = error; }
        try { await this.stopCurrentRecorder(); } catch (error) { failure ??= error; }
        if (failure) throw failure;
    }

    private async stopCurrentRecorder(): Promise<void> {
        const recorder = this.recorder;
        const startTask = this.recorderStartTask;
        this.recorder = null;
        this.recorderStartTask = null;
        ++this.recorderGeneration;
        if (!recorder) {
            return;
        }

        recorder.clearOnAudioReady();
        recorder.clearOnError();
        const existing = this.stoppedRecorders.get(recorder);
        if (existing) return existing;
        const stop = async () => {
            if (!recorder.isRecording()) return;
            const result = await recorder.stop();
            if (result.status === 'error') throw new MobileVoiceCaptureError('recorder_start_failed', result.message);
        };
        // Native start can resolve after startup timeout/cancel. Fence immediately
        // and retain exact-recorder cleanup without blocking JS on native start.
        if (startTask) {
            let settled = false;
            void startTask.then(() => { settled = true; }, () => { settled = true; });
            await Promise.resolve();
            if (!settled) {
                const cleanup = startTask.then(stop, stop);
                this.stoppedRecorders.set(recorder, cleanup);
                void cleanup.catch((error) => this.recordChunkError(error));
                if (this.captureReady) throw new MobileVoiceCaptureError('recorder_start_failed', 'Native voice start is still pending');
                return;
            }
        }
        const cleanup = stop();
        this.stoppedRecorders.set(recorder, cleanup);
        await cleanup;
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
