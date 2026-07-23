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

const workItem = (index: number, overrides: Partial<TurnWorkItem> = {}): TurnWorkItem =>
    ({
        workItemId: `work_${index.toString().padStart(3, '0')}`,
        itemId: `item_${index.toString().padStart(3, '0')}`,
        turnId: 'turn_a',
        orderKey: index.toString().padStart(3, '0'),
        status: 'completed',
        sourceSequence: index,
        sourceUpdatedAtUnixMicros: index,
        ...overrides,
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

    it('does not let a late stale page regress terminal work to running', () => {
        const completed = workItem(1, {
            status: 'completed',
            sourceSequence: 10,
            sourceUpdatedAtUnixMicros: 20,
        });
        const staleRunning = workItem(1, {
            status: 'running',
            sourceSequence: 9,
            sourceUpdatedAtUnixMicros: 10,
        });

        expect(
            flattenTurnWorkItems([workPage([completed]), workPage([staleRunning])])[0]?.status,
        ).toBe('completed');
    });

    it('keeps terminal work monotonic even when a running payload has a newer transport revision', () => {
        const completed = workItem(1, {
            status: 'completed',
            sourceSequence: 10,
            sourceUpdatedAtUnixMicros: 20,
        });
        const invalidRunningRegression = workItem(1, {
            status: 'running',
            sourceSequence: 11,
            sourceUpdatedAtUnixMicros: 30,
        });

        expect(
            flattenTurnWorkItems([workPage([completed]), workPage([invalidRunningRegression])])[0]
                ?.status,
        ).toBe('completed');
    });
});
