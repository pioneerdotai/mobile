import { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native-unistyles';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { pioneerClient, type CLIRuntimeRequestResolution } from '@/client';
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
import { useCliRuntimeStore } from '@/stores/cli-runtime';

type RequestDetail = {
    label: string;
    value: string;
    monospace?: boolean;
};

type UserInputQuestion = {
    id: string;
    header: string | null;
    question: string;
    options: string[];
    isSecret: boolean;
};

type CLIRuntimePendingRequestCardProps = {
    entry: TimelinePendingRequest;
};

export const CLIRuntimePendingRequestCard = ({ entry }: CLIRuntimePendingRequestCardProps) => {
    const queryClient = useQueryClient();
    const removePendingRequest = useCliRuntimeStore((state) => state.removePendingRequest);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [fallbackAnswer, setFallbackAnswer] = useState('');
    const [error, setError] = useState<string | null>(null);
    const respondMutation = useMutation({
        mutationFn: (resolution: CLIRuntimeRequestResolution) =>
            pioneerClient.cliRuntimeRequestRespond({
                workspace_id: entry.workspace_id,
                runtime_id: entry.runtime_id,
                request_id: entry.request_id,
                resolution,
            }),
        onSuccess: () => {
            removePendingRequest(entry.request_id);
            void invalidateTimelineQueriesForThread(queryClient, entry.thread_id);
            void invalidateTurnWorkQueries(queryClient, entry.thread_id, entry.turn_id);
        },
    });

    const title = entry.request.title?.trim() || requestKindTitle(entry.request.kind);
    const message = entry.request.message?.trim() || null;
    const details = useMemo(() => requestDetails(entry), [entry]);
    const questions = useMemo(() => userInputQuestions(entry.request.payload), [entry]);
    const userInput = entry.request.kind === 'user_input';
    const submitting = respondMutation.isPending;
    const canSubmitAnswer =
        !submitting && (questions.length > 0 || fallbackAnswer.trim().length > 0);

    const respond = useCallback(
        async (resolution: CLIRuntimeRequestResolution) => {
            setError(null);

            try {
                await respondMutation.mutateAsync(resolution);
            } catch (requestError) {
                setError(errorMessage(requestError));
            }
        },
        [respondMutation],
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
                status: 'answered',
                response: { answers: responseAnswers },
            });
            return;
        }

        void respond({ status: 'answered', response: fallbackAnswer });
    }, [answers, fallbackAnswer, questions, respond]);

    return (
        <VStack style={styles.card}>
            <VStack style={styles.heading}>
                <Text numberOfLines={1} style={styles.eyebrow}>
                    CLI request
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
            <RequestActions
                kind={entry.request.kind}
                submitting={submitting}
                canSubmitAnswer={canSubmitAnswer}
                onAllow={() => void respond({ status: 'approved' })}
                onAllowForSession={() =>
                    void respond({
                        status: 'answered',
                        response: { decision: 'allow_for_session' },
                    })
                }
                onCancel={() => void respond({ status: 'cancelled' })}
                onDeny={() => void respond({ status: 'denied', reason: null })}
                onSubmitAnswer={submitAnswer}
            />
        </VStack>
    );
};

const RequestDetailRow = ({ detail }: { detail: RequestDetail }) => (
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
    questions: UserInputQuestion[];
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
                                    key={option}
                                    label={option}
                                    disabled={submitting}
                                    onPress={() => onAnswer(question.id, option)}
                                    variant={
                                        values[question.id] === option ? 'primary' : 'secondary'
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
                    {question.isSecret ? (
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
    canSubmitAnswer,
    kind,
    submitting,
    onAllow,
    onAllowForSession,
    onCancel,
    onDeny,
    onSubmitAnswer,
}: {
    canSubmitAnswer: boolean;
    kind: TimelinePendingRequest['request']['kind'];
    submitting: boolean;
    onAllow: () => void;
    onAllowForSession: () => void;
    onCancel: () => void;
    onDeny: () => void;
    onSubmitAnswer: () => void;
}) => {
    if (kind === 'user_input') {
        return (
            <HStack style={styles.actionRow}>
                <ActionButton
                    label="Cancel turn"
                    disabled={submitting}
                    onPress={onCancel}
                    variant="danger"
                />
                <ActionButton
                    label="Answer"
                    disabled={!canSubmitAnswer}
                    onPress={onSubmitAnswer}
                    variant="primary"
                />
            </HStack>
        );
    }

    if (kind === 'other') {
        return (
            <HStack style={styles.actionRow}>
                <ActionButton
                    label="Cancel turn"
                    disabled={submitting}
                    onPress={onCancel}
                    variant="danger"
                />
                <ActionButton
                    label="Allow"
                    disabled={submitting}
                    onPress={onAllow}
                    variant="primary"
                />
            </HStack>
        );
    }

    return (
        <HStack style={styles.actionRow}>
            <ActionButton
                label="Cancel turn"
                disabled={submitting}
                onPress={onCancel}
                variant="danger"
            />
            <ActionButton label="Deny" disabled={submitting} onPress={onDeny} variant="secondary" />
            <ActionButton
                label="Allow for session"
                disabled={submitting}
                onPress={onAllowForSession}
                variant="secondary"
            />
            <ActionButton label="Allow" disabled={submitting} onPress={onAllow} variant="primary" />
        </HStack>
    );
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

const requestDetails = (entry: TimelinePendingRequest): RequestDetail[] => {
    const payload = asRecord(entry.request.payload);
    if (!payload) {
        return [];
    }

    if (entry.request.kind === 'command_approval') {
        return compactDetails([
            {
                label: 'Command',
                value: stringField(payload, 'command') ?? commandFromArgv(payload),
                monospace: true,
            },
            { label: 'Directory', value: stringField(payload, 'cwd'), monospace: true },
            { label: 'Reason', value: stringField(payload, 'reason') },
        ]);
    }

    if (entry.request.kind === 'file_change_approval') {
        return compactDetails([
            { label: 'Root', value: stringField(payload, 'grantRoot'), monospace: true },
            {
                label: 'Files',
                value: stringArrayField(payload, 'changedFiles')?.join('\n'),
                monospace: true,
            },
            { label: 'Reason', value: stringField(payload, 'reason') },
            { label: 'Diff', value: diffPreviewText(payload), monospace: true },
        ]);
    }

    return [];
};

const compactDetails = (
    details: { label: string; value?: string | null; monospace?: boolean }[],
): RequestDetail[] =>
    details.flatMap((detail) => {
        const value = detail.value?.trim();
        return value ? [{ label: detail.label, value, monospace: detail.monospace }] : [];
    });

const requestKindTitle = (kind: TimelinePendingRequest['request']['kind']) => {
    switch (kind) {
        case 'command_approval':
            return 'Command approval';
        case 'file_change_approval':
            return 'File change approval';
        case 'user_input':
            return 'Input requested';
        case 'other':
            return 'CLI runtime request';
    }
};

const userInputQuestions = (payload: unknown): UserInputQuestion[] => {
    const record = asRecord(payload);
    const questions = asArray(record?.questions);

    return questions.map((value, index) => {
        const question = asRecord(value);
        const id = stringField(question, 'id') ?? `question_${index + 1}`;
        const header = stringField(question, 'header');
        const questionText = stringField(question, 'question') ?? header ?? id;
        const options = asArray(question?.options)
            .map((option) => stringField(asRecord(option), 'label'))
            .filter((label): label is string => Boolean(label));

        return {
            id,
            header,
            question: questionText,
            options,
            isSecret: booleanField(question, 'isSecret') ?? false,
        };
    });
};

const stringField = (payload: Record<string, unknown> | null | undefined, key: string) => {
    const value = payload?.[key];

    return typeof value === 'string' && value.trim() ? value : null;
};

const booleanField = (payload: Record<string, unknown> | null | undefined, key: string) => {
    const value = payload?.[key];

    return typeof value === 'boolean' ? value : null;
};

const stringArrayField = (payload: Record<string, unknown>, key: string) => {
    const value = payload[key];

    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : null;
};

const commandFromArgv = (payload: Record<string, unknown>) => {
    const argv = payload.argv;

    if (!Array.isArray(argv)) {
        return null;
    }

    const command = argv.filter((item): item is string => typeof item === 'string').join(' ');
    return command.trim() ? command : null;
};

const diffPreviewText = (payload: Record<string, unknown>) => {
    const diffPreview = asRecord(payload.diffPreview);

    return stringField(diffPreview, 'text');
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'Failed to answer CLI request.';

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
