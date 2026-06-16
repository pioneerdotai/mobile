import { NitroModules } from 'react-native-nitro-modules';

import type { PioneerClient } from './PioneerClient.nitro';

let pioneerClientNitro: PioneerClient | null = null;

export const getPioneerClientNitro = (): PioneerClient => {
    pioneerClientNitro ??= NitroModules.createHybridObject<PioneerClient>('PioneerClient');
    return pioneerClientNitro;
};

export type { PioneerClient };
