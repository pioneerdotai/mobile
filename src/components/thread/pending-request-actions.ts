import type { PendingRequestAvailableAction, PendingRequestUserInputQuestion } from '@/client';

export const pendingRequestQuestionInputSecurity = (
    question: Pick<PendingRequestUserInputQuestion, 'is_secret'>,
) =>
    question.is_secret
        ? ({
              secureTextEntry: true,
              autoCapitalize: 'none' as const,
              autoCorrect: false,
              spellCheck: false,
          } as const)
        : ({ secureTextEntry: false } as const);

export const pendingRequestActionLabel = (action: PendingRequestAvailableAction) => {
    switch (action.kind) {
        case 'cancel_turn':
            return 'Cancel turn';
        case 'deny':
            return 'Deny';
        case 'allow':
            return 'Allow';
        case 'allow_for_turn':
            return 'Allow for turn';
        case 'allow_for_session':
            return 'Allow for session';
        case 'answer':
            return 'Answer';
    }
};

export const pendingRequestActionVariant = (
    action: PendingRequestAvailableAction,
): 'danger' | 'primary' | 'secondary' => {
    switch (action.kind) {
        case 'cancel_turn':
            return 'danger';
        case 'allow':
        case 'answer':
            return 'primary';
        case 'deny':
        case 'allow_for_turn':
        case 'allow_for_session':
            return 'secondary';
    }
};
