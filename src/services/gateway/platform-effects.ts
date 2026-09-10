import { attachGatewayProjection } from '@/client/onboarding';
import { loadGatewayRegistry, saveGatewayRegistry } from './registry';
import { mobileAuthInstallation } from './session-grant';
import { readGatewayBindingJournals, removeGatewayBindingJournal } from './binding-journals';
import { mobileClientBinding, type MobileClientBinding } from '@/client/mobile-client-binding';
import type { ClientEffectPlan } from '@/client/generated/client_effect_plan';
import type { ClientEffectResult } from '@/client/generated/client_effect_completion_dto';
import {
    MobileGatewaySessionStorageError,
    deleteMobileGatewaySession,
    readMobileGatewaySession,
    writeMobileGatewaySession,
} from './session-storage';

/** Native resource lifetime only; session policy and completion validity belong to Rust. */
export class MobileSessionStorageAdapter {
    readonly #binding: MobileClientBinding;
    readonly #pending = new Map<string, Promise<void>>();
    readonly #completed = new Set<string>();
    readonly #results = new Map<
        string,
        { plan: Pick<ClientEffectPlan, 'operation_id' | 'generation'>; result: ClientEffectResult }
    >();
    #detach: (() => void) | null;
    #releaseGatewayProjection: (() => void) | null;

    constructor(binding: MobileClientBinding = mobileClientBinding) {
        this.#binding = binding;
        this.#releaseGatewayProjection = attachGatewayProjection(binding);
        this.#detach = binding.attachPlatformEffects(
            (plans) => this.#deliver(plans),
            () => {
                void this.close(false);
            },
        );
    }

    #deliver(plans: readonly ClientEffectPlan[]): void {
        const retained = new Set(plans.map((plan) => `${plan.operation_id}:${plan.generation}`));
        for (const key of this.#completed) {
            if (!retained.has(key)) {
                this.#completed.delete(key);
            }
        }
        for (const key of this.#results.keys()) {
            if (!retained.has(key) && !this.#pending.has(key)) {
                this.#completed.delete(key);
                this.#results.delete(key);
            }
        }
        for (const plan of plans) {
            if (
                typeof plan.effect === 'object' &&
                'kind' in plan.effect &&
                [
                    'copy_administration_activation',
                    'copy_provider_diagnostics',
                    'open_provider_path',
                ].includes(plan.effect.kind)
            )
                continue;
            const key = `${plan.operation_id}:${plan.generation}`;
            if (this.#pending.has(key) || this.#completed.has(key)) {
                continue;
            }
            const task = (async () => {
                const result = this.#results.get(key)?.result ?? (await this.#execute(plan));
                this.#results.set(key, {
                    plan: { operation_id: plan.operation_id, generation: plan.generation },
                    result,
                });
                if (this.#detach) {
                    this.#binding.completeEffect({
                        schema_version: 1,
                        completion: {
                            operation_id: plan.operation_id,
                            generation: plan.generation,
                            result,
                        },
                    });
                    this.#completed.add(key);
                    this.#results.delete(key);
                }
            })().finally(() => {
                this.#pending.delete(key);
            });
            this.#pending.set(key, task);
            // The next ordered delivery retries a completion that the bridge rejected.
            void task.catch(() => {
                this.#completed.delete(key);
            });
        }
    }

    async #execute(plan: ClientEffectPlan): Promise<ClientEffectResult> {
        try {
            const effect = plan.effect;
            if (effect === 'LoadGatewayEnvironment') {
                const registry = loadGatewayRegistry();
                const installationId = registry.installation_id;
                if (!installationId) throw new Error('gateway_installation_missing');
                const duration = (millis: number) => ({
                    secs: Math.floor(millis / 1000),
                    nanos: (millis % 1000) * 1_000_000,
                });
                return {
                    kind: 'gateway_environment_loaded',
                    environment: {
                        registry,
                        installation: mobileAuthInstallation(installationId),
                        default_remote_name: 'Remote Gateway {index}',
                        remote_connect_timeout_min: duration(5000),
                        timings: {
                            connect_timeout: duration(2500),
                            startup_timeout: duration(15000),
                            poll_interval: duration(100),
                        },
                        ws_timings: {
                            connect_timeout: duration(5000),
                            ping_interval: duration(10000),
                            pong_timeout: duration(30000),
                            reconnect_initial: duration(500),
                            reconnect_max: duration(10000),
                            reconnect_jitter_percent: 20,
                        },
                        local_provisioned: false,
                        local_install_required: false,
                        local_update_required: false,
                        binding_journals: readGatewayBindingJournals(),
                        discard_unbound_remote_candidates: true,
                    },
                };
            }
            if (
                typeof effect === 'object' &&
                !('kind' in effect) &&
                'PersistGatewayRegistry' in effect
            ) {
                saveGatewayRegistry(effect.PersistGatewayRegistry.registry);
                return { kind: 'completed' };
            }
            if (
                typeof effect === 'object' &&
                !('kind' in effect) &&
                'RemoveGatewayBindingJournal' in effect
            ) {
                removeGatewayBindingJournal(effect.RemoveGatewayBindingJournal.gateway_id);
                return { kind: 'completed' };
            }

            if (
                typeof effect === 'object' &&
                !('kind' in effect) &&
                'DeleteGatewaySession' in effect
            ) {
                const reference = effect.DeleteGatewaySession.endpoint.session_ref;
                if (reference) await deleteMobileGatewaySession(reference);
                return { kind: 'completed' };
            }
            if (
                typeof effect === 'object' &&
                !('kind' in effect) &&
                'ReadGatewaySession' in effect
            ) {
                const reference = effect.ReadGatewaySession.endpoint.session_ref;
                return {
                    kind: 'gateway_session_envelope_loaded',
                    envelope: reference ? await readMobileGatewaySession(reference) : null,
                };
            }
            if (
                typeof effect === 'object' &&
                !('kind' in effect) &&
                'PersistGatewaySession' in effect
            ) {
                const { endpoint, envelope } = effect.PersistGatewaySession;
                if (!endpoint.session_ref) {
                    throw new MobileGatewaySessionStorageError('corrupted');
                }
                if (envelope.schema_version !== 2) {
                    throw new MobileGatewaySessionStorageError('corrupted');
                }
                await writeMobileGatewaySession(endpoint.session_ref, {
                    ...envelope,
                    schema_version: 2,
                    pending_refresh_request_id: envelope.pending_refresh_request_id ?? undefined,
                });
                return { kind: 'completed' };
            }
            return { kind: 'failed', code: 'unsupported_native_effect' };
        } catch (error) {
            return {
                kind: 'failed',
                code:
                    error instanceof MobileGatewaySessionStorageError
                        ? error.code
                        : 'secure_storage_failed',
            };
        }
    }

    async close(cancel = true): Promise<void> {
        this.#releaseGatewayProjection?.();
        this.#releaseGatewayProjection = null;
        this.#detach?.();
        this.#detach = null;
        await Promise.allSettled(this.#pending.values());
        for (const { plan } of cancel ? this.#results.values() : []) {
            this.#binding.cancelEffect({
                schema_version: 1,
                cancellation: {
                    operation_id: plan.operation_id,
                    generation: plan.generation,
                },
            });
        }
        this.#results.clear();
        this.#completed.clear();
    }
}

let processStorageAdapter: MobileSessionStorageAdapter | null = null;
export const initializeMobilePlatformEffects = (): void => {
    processStorageAdapter ??= new MobileSessionStorageAdapter();
};
