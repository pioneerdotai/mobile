import { describe, expect, it } from '@jest/globals';

import type { PendingRequestAvailableAction } from '@/client';

import {
    pendingRequestActionLabel,
    pendingRequestActionVariant,
    pendingRequestQuestionInputSecurity,
} from './pending-request-actions';

describe('pending request provider actions', () => {
    it('renders the provider-scoped session approval action explicitly', () => {
        const action: PendingRequestAvailableAction = {
            kind: 'allow_for_session',
            resolution: { resolution: 'allow_for_session' },
        };

        expect(pendingRequestActionLabel(action)).toBe('Allow for session');
        expect(pendingRequestActionVariant(action)).toBe('secondary');
    });

    it('uses platform secure entry only for provider questions marked secret', () => {
        expect(pendingRequestQuestionInputSecurity({ is_secret: true })).toEqual({
            secureTextEntry: true,
            autoCapitalize: 'none',
            autoCorrect: false,
            spellCheck: false,
        });
        expect(pendingRequestQuestionInputSecurity({ is_secret: false })).toEqual({
            secureTextEntry: false,
        });
    });
});
