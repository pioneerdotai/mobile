import * as Clipboard from 'expo-clipboard';
import { mobileClientBinding } from '@/client/mobile-client-binding';
import type { ClientIntent } from '@/client/generated/client_intent';
import type { AdministrationOperationPublication } from '@/client/generated/administration_operation_publication';

type Command = Extract<ClientIntent, { kind: 'administration_command' }>['command'];
const scope = { kind: 'administration_operation' as const };
const binding = () => mobileClientBinding.scope(scope);
const snapshot = () =>
    binding().getSnapshot()?.payload as AdministrationOperationPublication | null;

export const prepareAdministrationCommand = (command: Command): number => {
    const before = snapshot()?.generation ?? 0;
    const transition = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'administration_command', command },
    });
    mobileClientBinding.drain(scope);
    const current = snapshot();
    if (transition.outcome === 'rejected' || !current || current.generation <= before) {
        throw new Error('administration_action_unavailable');
    }
    return current.generation;
};

export const performAdministrationCommand = (command: Command): Promise<void> =>
    new Promise((resolve, reject) => {
        let generation: number | null = null;
        let unsubscribe = () => {};
        const changed = () => {
            if (generation === null) return;
            const current = snapshot();
            if (current?.generation === generation && current.request.kind === 'loading') return;
            unsubscribe();
            if (current?.generation === generation && current.request.kind === 'ready') resolve();
            else reject(new Error('administration_action_unavailable'));
        };
        unsubscribe = binding().subscribe(changed);
        try {
            generation = prepareAdministrationCommand(command);
            changed();
        } catch (error) {
            unsubscribe();
            reject(error);
        }
    });

export const copyAdministrationActivation = async (
    generation: number,
    value: string,
): Promise<void> => {
    const transition = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: {
            kind: 'administration_presentation',
            intent: { kind: 'copy_activation', generation },
        },
    });
    const plan = transition.effects.find(
        (plan) =>
            typeof plan.effect === 'object' &&
            'kind' in plan.effect &&
            plan.effect.kind === 'copy_administration_activation',
    );
    if (!plan) throw new Error('administration_activation_unavailable');
    try {
        await Clipboard.setStringAsync(value);
        mobileClientBinding.completeEffect({
            schema_version: 1,
            completion: {
                operation_id: plan.operation_id,
                generation: plan.generation,
                result: { kind: 'completed' },
            },
        });
    } catch (error) {
        mobileClientBinding.completeEffect({
            schema_version: 1,
            completion: {
                operation_id: plan.operation_id,
                generation: plan.generation,
                result: { kind: 'failed', code: 'clipboard_unavailable' },
            },
        });
        throw error;
    }
};

export const dismissAdministrationActivation = (generation: number): void => {
    mobileClientBinding.dispatch({
        schema_version: 1,
        intent: {
            kind: 'administration_presentation',
            intent: { kind: 'dismiss_activation', generation },
        },
    });
};
