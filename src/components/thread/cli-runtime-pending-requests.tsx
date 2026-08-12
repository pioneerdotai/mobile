import { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native-unistyles';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
    pioneerClient,
    type PendingRequestAvailableAction,
    type PendingRequestDetailRow,
    type PendingRequestResolution,
    type PendingRequestUserInputQuestion,
} from '@/client';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Input } from '@/components/primitives/input';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import type { TimelinePendingRequest } from '@/services/threads/conversation/timeline';
import {
    invalidateTimelineQueriesForThread,
    invalidateTurnWorkQueries,
} from '@/services/threads/timeline-query';

type PendingRequestCardProps = {
    entry: TimelinePendingRequest;
    canRespond: boolean;
};

export const PendingRequestCard = ({ entry, canRespond }: PendingRequestCardProps) => {
    const queryClient = useQueryClient();
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [fallbackAnswer, setFallbackAnswer] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { mutateAsync: respondToPendingRequest, isPending: submitting } = useMutation({
        mutationFn: async (resolution: PendingRequestResolution) => {
            const plan = pioneerClient.pendingRequestResponsePlan({
                request: entry.request,
                resolution,
            });

            switch (plan.action.target) {
                case 'cli_runtime':
                    return pioneerClient.cliRuntimeRequestRespond(plan.action.params);
                case 'native_permission_gate':
                    return pioneerClient.turnPermissionRequestRespond(plan.action.params);
            }
        },
        onSuccess: () => {
            void invalidateTimelineQueriesForThread(queryClient, entry.thread_id);
            void invalidateTurnWorkQueries(queryClient, entry.thread_id, entry.turn_id);
        },
    });

    const presentation = useMemo(
        () => pioneerClient.pendingRequestPresentation({ request: entry.request }).presentation,
        [entry.request],
    );
    const title = presentation.title.trim() || 'Approval request';
    const message = presentation.message?.trim() || null;
    const details = presentation.details;
    const questions = presentation.user_input_questions;
    const userInput = presentation.actions.some((action) => action.kind === 'answer');
    const canSubmitAnswer =
        !submitting && (questions.length > 0 || fallbackAnswer.trim().length > 0);

    const respond = useCallback(
        async (resolution: PendingRequestResolution) => {
            if (!canRespond) return;
            setError(null);

            try {
                await respondToPendingRequest(resolution);
            } catch (requestError) {
                setError(errorMessage(requestError));
            }
        },
        [canRespond, respondToPendingRequest],
    );

    const answerQuestion = useCallback((id: string, value: string) => {
        setAnswers((current) => ({ ...current, [id]: value }));
    }, []);

    const submitAnswer = useCallback(() => {
        if (questions.length > 0) {
            const responseAnswers = questions.reduce<Record<string, string>>((acc, question) => {
                acc[question.id] = answers[question.id] ?? '';
                return acc;
            }, {});

            void respond({
                resolution: 'answered',
                response: { answers: responseAnswers },
            });
            return;
        }

        void respond({ resolution: 'answered', response: fallbackAnswer });
    }, [answers, fallbackAnswer, questions, respond]);

    return (
        <VStack style={styles.card}>
            <VStack style={styles.heading}>
                <Text numberOfLines={1} style={styles.eyebrow}>
                    {presentation.origin_label}
                </Text>
                <Text numberOfLines={2} style={styles.title}>
                    {title}
                </Text>
            </VStack>

            {message ? <Text style={styles.message}>{message}</Text> : null}
            {details.map((detail) => (
                <RequestDetailRow key={detail.label} detail={detail} />
            ))}
            {userInput ? (
                <UserInputFields
                    fallbackAnswer={fallbackAnswer}
                    questions={questions}
                    submitting={submitting}
                    values={answers}
                    onAnswer={answerQuestion}
                    onFallbackAnswer={setFallbackAnswer}
                />
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {canRespond ? (
                <RequestActions
                    actions={presentation.actions}
                    submitting={submitting}
                    canSubmitAnswer={canSubmitAnswer}
                    onRespond={(resolution) => void respond(resolution)}
                    onSubmitAnswer={submitAnswer}
                />
            ) : null}
        </VStack>
    );
};

const RequestDetailRow = ({ detail }: { detail: PendingRequestDetailRow }) => (
    <VStack style={styles.detailRow}>
        <Text style={styles.detailLabel}>{detail.label}</Text>
        <Box style={styles.detailValueWrap}>
            <Text
                selectable
                style={[styles.detailValue, detail.monospace ? styles.detailValueMonospace : null]}
            >
                {detail.value}
            </Text>
        </Box>
    </VStack>
);

const UserInputFields = ({
    fallbackAnswer,
    questions,
    submitting,
    values,
    onAnswer,
    onFallbackAnswer,
}: {
    fallbackAnswer: string;
    questions: PendingRequestUserInputQuestion[];
    submitting: boolean;
    values: Record<string, string>;
    onAnswer: (id: string, value: string) => void;
    onFallbackAnswer: (value: string) => void;
}) => {
    if (questions.length === 0) {
        return (
            <Input
                value={fallbackAnswer}
                editable={!submitting}
                placeholder="Answer"
                onChangeText={onFallbackAnswer}
                style={styles.answerInput}
            />
        );
    }

    return (
        <VStack style={styles.questions}>
            {questions.map((question) => (
                <VStack key={question.id} style={styles.question}>
                    <Text style={styles.detailLabel}>{question.header ?? question.question}</Text>
                    <Text style={styles.message}>{question.question}</Text>
                    {question.options.length > 0 ? (
                        <HStack style={styles.optionRow}>
                            {question.options.map((option) => (
                                <ActionButton
                                    key={option.label}
                                    label={option.label}
                                    disabled={submitting}
                                    onPress={() => onAnswer(question.id, option.label)}
                                    variant={
                                        values[question.id] === option.label
                                            ? 'primary'
                                            : 'secondary'
                                    }
                                />
                            ))}
                        </HStack>
                    ) : null}
                    <Input
                        value={values[question.id] ?? ''}
                        editable={!submitting}
                        placeholder="Answer"
                        onChangeText={(value) => onAnswer(question.id, value)}
                        style={styles.answerInput}
                    />
                    {question.is_secret ? (
                        <Text style={styles.secretNote}>
                            This answer will be sent only to the active CLI runtime.
                        </Text>
                    ) : null}
                </VStack>
            ))}
        </VStack>
    );
};

const RequestActions = ({
    actions,
    canSubmitAnswer,
    submitting,
    onRespond,
    onSubmitAnswer,
}: {
    actions: PendingRequestAvailableAction[];
    canSubmitAnswer: boolean;
    submitting: boolean;
    onRespond: (resolution: PendingRequestResolution) => void;
    onSubmitAnswer: () => void;
}) => (
    <HStack style={styles.actionRow}>
        {actions.map((action) => (
            <ActionButton
                key={action.kind}
                label={actionLabel(action)}
                disabled={
                    action.kind === 'answer'
                        ? !canSubmitAnswer
                        : submitting || action.resolution == null
                }
                onPress={() => {
                    if (action.kind === 'answer') {
                        onSubmitAnswer();
                        return;
                    }
                    if (action.resolution) {
                        onRespond(action.resolution);
                    }
                }}
                variant={actionVariant(action)}
            />
        ))}
    </HStack>
);

const actionLabel = (action: PendingRequestAvailableAction) => {
    switch (action.kind) {
        case 'cancel_turn':
            return 'Cancel turn';
        case 'deny':
            return 'Deny';
        case 'allow':
            return 'Allow';
        case 'allow_for_turn':
            return 'Allow for turn';
        case 'answer':
            return 'Answer';
    }
};

const actionVariant = (
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
            return 'secondary';
    }
};

const ActionButton = ({
    disabled,
    label,
    onPress,
    variant,
}: {
    disabled: boolean;
    label: string;
    onPress: () => void;
    variant: 'danger' | 'primary' | 'secondary';
}) => (
    <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
            styles.actionButton,
            variant === 'primary' ? styles.actionButtonPrimary : null,
            variant === 'danger' ? styles.actionButtonDanger : null,
            disabled ? styles.actionButtonDisabled : null,
            pressed && !disabled ? styles.actionButtonPressed : null,
        ]}
    >
        <Text
            numberOfLines={1}
            style={[styles.actionButtonText, variant === 'primary' ? styles.primaryText : null]}
        >
            {label}
        </Text>
    </Pressable>
);

const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'Failed to answer request.';

const styles = StyleSheet.create((theme) => ({
    card: {
        gap: theme.space(2),
        borderRadius: theme.radius['2xl'],
        borderWidth: 1,
        borderColor: theme.colors.warningBorder,
        backgroundColor: theme.colors.warningSurface,
        padding: theme.space(3),
    },
    heading: {
        minWidth: 0,
        gap: theme.space(0.5),
    },
    eyebrow: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textTransform: 'uppercase',
    },
    title: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    message: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    detailRow: {
        gap: theme.space(1),
    },
    detailLabel: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    detailValueWrap: {
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceMuted,
        paddingHorizontal: theme.space(2.5),
        paddingVertical: theme.space(2),
    },
    detailValue: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    detailValueMonospace: {
        fontFamily: 'Menlo',
    },
    questions: {
        gap: theme.space(3),
    },
    question: {
        gap: theme.space(1.5),
    },
    optionRow: {
        flexWrap: 'wrap',
        gap: theme.space(1),
    },
    answerInput: {
        minHeight: theme.space(9),
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        paddingHorizontal: theme.space(3),
        paddingVertical: theme.space(2),
    },
    secretNote: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
    },
    actionRow: {
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: theme.space(1.5),
    },
    actionButton: {
        minHeight: theme.space(8),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.space(3),
    },
    actionButtonPrimary: {
        borderColor: theme.colors.foreground,
        backgroundColor: theme.colors.foreground,
    },
    actionButtonDanger: {
        borderColor: theme.colors.dangerBorder,
        backgroundColor: theme.colors.dangerSurface,
    },
    actionButtonDisabled: {
        opacity: 0.45,
    },
    actionButtonPressed: {
        opacity: 0.8,
    },
    actionButtonText: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    primaryText: {
        color: theme.colors.background,
    },
    error: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
}));
