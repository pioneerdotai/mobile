import { describe, expect, it } from '@jest/globals';

import { selectedReasoningEffortRequestFields } from './reasoning-effort';

describe('selectedReasoningEffortRequestFields', () => {
    it('omits the send field when effort is absent', () => {
        expect(selectedReasoningEffortRequestFields(null)).toEqual({});
        expect(selectedReasoningEffortRequestFields(undefined)).toEqual({});
        expect(selectedReasoningEffortRequestFields('   ')).toEqual({});
    });

    it('trims and includes explicit effort overrides', () => {
        expect(selectedReasoningEffortRequestFields(' high ')).toEqual({
            selected_reasoning_effort: 'high',
        });
    });
});
