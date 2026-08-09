import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { pioneerClient, PioneerClientNativeError } from '@/client';
import Spinner from '@/components/feedback/spinner';
import { Notification } from '@/components/overlays/notification';
import { Box } from '@/components/primitives/box';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import type { TimelineRow } from '@/services/threads/conversation/timeline';

export type MessageMutationTarget = {
    kind: 'delete';
    threadId: string;
    row: Extract<TimelineRow, { type: 'user-message' }>;
};

type MessageMutationModalProps = {
    target: MessageMutationTarget;
    onClose: () => void;
    onAuthoritativeRefresh: () => Promise<void>;
};

const REVISION_CONFLICT_CODE = 'pioneer_turn_message_revision_conflict';

export const MessageMutationModal = ({
    target,
    onClose,
    onAuthoritativeRefresh,
}: MessageMutationModalProps) => {
    const { t } = useTranslation('threads');
    const { theme } = useUnistyles();
    const [pending, setPending] = useState(false);
    const pendingRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [conflicted, setConflicted] = useState(false);
    const canSubmit = !pending && !conflicted;

    const submit = async () => {
        if (!canSubmit || pendingRef.current) return;
        pendingRef.current = true;
        setPending(true);
        setError(null);
        try {
            await pioneerClient.turnMessageDelete({
                thread_id: target.threadId,
                turn_id: target.row.turnId,
                expected_revision: target.row.revision,
            });
            await onAuthoritativeRefresh().catch(() => undefined);
            onClose();
        } catch (mutationError) {
            const conflict =
                mutationError instanceof PioneerClientNativeError &&
                mutationError.code === REVISION_CONFLICT_CODE;
            if (conflict) {
                setConflicted(true);
                await onAuthoritativeRefresh().catch(() => undefined);
            }
            setError(
                conflict ? t('timelineMessageMutationConflict') : t('timelineMessageDeleteFailed'),
            );
        } finally {
            pendingRef.current = false;
            setPending(false);
        }
    };

    return (
        <Notification
            buttonDisabled={pending}
            buttonTitle={t('cancel')}
            dismissible={!pending}
            handleClose={onClose}
            onButtonPress={onClose}
            type="lightning"
            visible
        >
            <Box style={styles.content}>
                <VStack style={styles.message}>
                    <Text accessibilityRole="header" style={styles.title}>
                        {t('timelineMessageDeleteTitle')}
                    </Text>
                    <Text style={styles.description}>{t('timelineMessageDeleteDescription')}</Text>
                    {error ? (
                        <Text accessibilityRole="alert" style={styles.error}>
                            {error}
                        </Text>
                    ) : null}
                </VStack>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('timelineMessageDeleteConfirm')}
                    disabled={!canSubmit}
                    onPress={() => void submit()}
                    style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && styles.deleteButtonPressed,
                        !canSubmit && styles.disabled,
                    ]}
                >
                    {pending ? (
                        <Spinner color={theme.colors.dangerText} />
                    ) : (
                        <Text style={styles.primaryText}>{t('timelineMessageDeleteConfirm')}</Text>
                    )}
                </Pressable>
            </Box>
        </Notification>
    );
};

const styles = StyleSheet.create((theme) => ({
    content: {
        marginBottom: theme.space(4),
    },
    message: {
        gap: theme.space(2),
        marginBottom: theme.space(10),
    },
    title: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        fontWeight: theme.fontWeight.bold.fontWeight,
        textAlign: 'center',
    },
    description: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        textAlign: 'center',
    },
    error: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        textAlign: 'center',
        marginTop: theme.space(2),
    },
    deleteButton: {
        width: '100%',
        height: theme.space(14),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.muted,
    },
    deleteButtonPressed: {
        opacity: 0.82,
    },
    primaryText: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    disabled: {
        opacity: 0.5,
    },
}));
