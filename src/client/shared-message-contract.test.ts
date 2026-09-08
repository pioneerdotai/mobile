import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getPioneerClientNitro } from '@pioneer/client-nitro';

import { pioneerClient } from './index';

jest.mock('@pioneer/client-nitro', () => ({
    getPioneerClientNitro: jest.fn(),
}));

const ok = (value: unknown): string => JSON.stringify({ status: 'ok', value });

describe('Turn-centric shared message Nitro contract', () => {
    const nitro = {
        threadReadJson: jest.fn<(input: string) => Promise<string>>(),
    };

    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(getPioneerClientNitro).mockReturnValue(nitro as never);
    });

    it('delegates read as secret-free typed JSON', async () => {
        nitro.threadReadJson.mockResolvedValue(
            ok({
                workspace_id: 'workspace_a',
                thread_id: 'thread_a',
                cursor: { through_turn_id: 'turn_a', sort_key: '0001' },
                unread_count: 0,
            }),
        );

        await pioneerClient.threadRead({
            thread_id: 'thread_a',
            through_turn_id: 'turn_a',
        });

        const payloads = [nitro.threadReadJson].map(
            (mock) => JSON.parse(mock.mock.calls[0][0]) as Record<string, unknown>,
        );
        expect(payloads).toEqual([{ thread_id: 'thread_a', through_turn_id: 'turn_a' }]);
        for (const payload of payloads) {
            expect(payload).not.toHaveProperty('bearer');
            expect(payload).not.toHaveProperty('bytes');
            expect(payload).not.toHaveProperty('source_message_id');
        }
    });
});
