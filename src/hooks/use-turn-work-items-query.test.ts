import { describe, expect, it, jest } from '@jest/globals';

import type { TurnWorkItem, TurnWorkPageResponse } from '@/client';

import { flattenTurnWorkItems } from './use-turn-work-items-query';

jest.mock('@/client', () => ({
    PioneerClientNativeError: class PioneerClientNativeError extends Error {
        code: string | null;

        constructor(message: string, code: string | null = null) {
            super(message);
            this.code = code;
        }
    },
    pioneerClient: {
        turnWorkPage: jest.fn(),
    },
}));

const workItem = (index: number): TurnWorkItem =>
    ({
        workItemId: `work_${index.toString().padStart(3, '0')}`,
        orderKey: index.toString().padStart(3, '0'),
    }) as TurnWorkItem;

const workPage = (items: TurnWorkItem[]): TurnWorkPageResponse =>
    ({ items }) as TurnWorkPageResponse;

describe('mobile turn work page accumulation', () => {
    it('keeps loaded work items when a new newest batch arrives', () => {
        const firstBatch = Array.from({ length: 50 }, (_, index) => workItem(index));
        const secondBatch = Array.from({ length: 50 }, (_, index) => workItem(index + 50));

        const items = flattenTurnWorkItems([workPage(firstBatch), workPage(secondBatch)]);

        expect(items).toHaveLength(100);
        expect(items[0]?.workItemId).toBe('work_000');
        expect(items[99]?.workItemId).toBe('work_099');
        expect(items.slice(0, 50)).toEqual(firstBatch);
    });
});
