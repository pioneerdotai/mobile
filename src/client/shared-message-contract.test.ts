import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getPioneerClientNitro } from '@pioneer/client-nitro';

import { pioneerClient, PioneerClientNativeError } from './index';

jest.mock('@pioneer/client-nitro', () => ({
    getPioneerClientNitro: jest.fn(),
}));

const ok = (value: unknown): string => JSON.stringify({ status: 'ok', value });

describe('Turn-centric shared message Nitro contract', () => {
    const nitro = {
        turnMessageEditJson: jest.fn<(input: string) => Promise<string>>(),
        turnMessageDeleteJson: jest.fn<(input: string) => Promise<string>>(),
        turnMessageRevisionsPageJson: jest.fn<(input: string) => Promise<string>>(),
        threadReadJson: jest.fn<(input: string) => Promise<string>>(),
    };

    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(getPioneerClientNitro).mockReturnValue(nitro as never);
    });

    it('delegates edit/delete/revisions/read as secret-free typed JSON', async () => {
        nitro.turnMessageEditJson.mockResolvedValue(ok({ turn: { id: 'turn_a' } }));
        nitro.turnMessageDeleteJson.mockResolvedValue(ok({ turn: { id: 'turn_a' } }));
        nitro.turnMessageRevisionsPageJson.mockResolvedValue(
            ok({
                workspace_id: 'workspace_a',
                thread_id: 'thread_a',
                turn_id: 'turn_a',
                revisions: [],
            }),
        );
        nitro.threadReadJson.mockResolvedValue(
            ok({
                workspace_id: 'workspace_a',
                thread_id: 'thread_a',
                cursor: { through_turn_id: 'turn_a', sort_key: '0001' },
                unread_count: 0,
            }),
        );

        await pioneerClient.turnMessageEdit({
            thread_id: 'thread_a',
            turn_id: 'turn_a',
            expected_revision: 1,
            input: [{ type: 'text', text: 'edited', text_elements: [] }],
            mentioned_principal_ids: [],
        });
        await pioneerClient.turnMessageDelete({
            thread_id: 'thread_a',
            turn_id: 'turn_a',
            expected_revision: 2,
        });
        await pioneerClient.turnMessageRevisionsPage({
            thread_id: 'thread_a',
            turn_id: 'turn_a',
            limit: 25,
        });
        await pioneerClient.threadRead({
            thread_id: 'thread_a',
            through_turn_id: 'turn_a',
        });

        const payloads = [
            nitro.turnMessageEditJson,
            nitro.turnMessageDeleteJson,
            nitro.turnMessageRevisionsPageJson,
            nitro.threadReadJson,
        ].map((mock) => JSON.parse(mock.mock.calls[0][0]) as Record<string, unknown>);
        expect(payloads).toEqual([
            {
                thread_id: 'thread_a',
                turn_id: 'turn_a',
                expected_revision: 1,
                input: [{ type: 'text', text: 'edited', text_elements: [] }],
                mentioned_principal_ids: [],
            },
            { thread_id: 'thread_a', turn_id: 'turn_a', expected_revision: 2 },
            { thread_id: 'thread_a', turn_id: 'turn_a', limit: 25 },
            { thread_id: 'thread_a', through_turn_id: 'turn_a' },
        ]);
        for (const payload of payloads) {
            expect(payload).not.toHaveProperty('bearer');
            expect(payload).not.toHaveProperty('bytes');
            expect(payload).not.toHaveProperty('source_message_id');
        }
    });

    it('preserves the stable revision-conflict code for authoritative refetch', async () => {
        nitro.turnMessageEditJson.mockResolvedValue(
            JSON.stringify({
                status: 'error',
                message: 'message revision conflict',
                code: 'pioneer_turn_message_revision_conflict',
            }),
        );

        const operation = pioneerClient.turnMessageEdit({
            thread_id: 'thread_a',
            turn_id: 'turn_a',
            expected_revision: 1,
            input: [{ type: 'text', text: 'edited', text_elements: [] }],
            mentioned_principal_ids: [],
        });

        await expect(operation).rejects.toMatchObject({
            name: PioneerClientNativeError.name,
            code: 'pioneer_turn_message_revision_conflict',
        });
    });
});
