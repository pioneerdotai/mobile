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
    if (action.label) return action.label;
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

// Editable presentation only. Typed coercion and validation remain in Rust.
export const pendingRequestQuestionEditableValue = (
    question: Pick<PendingRequestUserInputQuestion, 'value_schema'>,
    explicit: string | undefined,
): string => {
    if (explicit !== undefined) return explicit;
    const value = (question.value_schema as { default?: unknown } | undefined)?.default;
    return value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
};

export const pendingRequestSelectedChoices = (value: string): string[] => {
    try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === 'string')
            : [];
    } catch {
        return [];
    }
};

export const togglePendingRequestChoice = (effective: string, choice: string): string => {
    const selected = pendingRequestSelectedChoices(effective);
    return JSON.stringify(
        selected.includes(choice)
            ? selected.filter((item) => item !== choice)
            : [...selected, choice],
    );
};
