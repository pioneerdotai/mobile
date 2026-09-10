import { storage } from '@/storage';
const bindingPrefix = 'pioneer.gateway.device-activation-commit.v1.';
/** Raw, credential-free native records; validation and recovery belong to Client. */
export const readGatewayBindingJournals = (): { gateway_id: string; document: string }[] => {
    let keys: string[];
    try {
        keys = storage.getAllKeys();
    } catch {
        return [];
    }
    return keys
        .filter((key) => key.startsWith(bindingPrefix))
        .flatMap((key) => {
            try {
                const document = storage.getString(key);
                return document ? [{ gateway_id: key.slice(bindingPrefix.length), document }] : [];
            } catch {
                return [];
            }
        });
};
export const removeGatewayBindingJournal = (gatewayId: string): void => {
    storage.remove(`${bindingPrefix}${gatewayId}`);
};
