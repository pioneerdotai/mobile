import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dispatchMessageDeletion, useMessageDeletion } from '@/client/message-deletion';
import type { MessageDeletionPlan } from '@/client/generated/message_deletion_publication';
import Spinner from '@/components/feedback/spinner';
import { Notification } from '@/components/overlays/notification';
import { Box } from '@/components/primitives/box';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

export type MessageMutationTarget = {
    kind: 'delete';
    plan: MessageDeletionPlan;
};

type MessageMutationModalProps = {
    target: MessageMutationTarget;
    onClose: () => void;
};

export const MessageMutationModal = ({ target, onClose }: MessageMutationModalProps) => {
    const { t } = useTranslation('threads');
    const { theme } = useUnistyles();
    const { identity } = target.plan;
    const publication = useMessageDeletion(identity.thread_id);
    const input =
        publication?.plan.identity.generation === identity.generation &&
        publication.plan.identity.thread_id === identity.thread_id
            ? publication
            : null;
    const pending = input?.state.kind === 'pending';
    const conflicted = input?.state.kind === 'failed' && input.state.conflicted;
    const canSubmit =
        input?.state.kind === 'confirming' || (input?.state.kind === 'failed' && !conflicted);
    const error =
        input?.state.kind === 'failed'
            ? t(conflicted ? 'timelineMessageMutationConflict' : 'timelineMessageDeleteFailed')
            : null;

    useEffect(() => {
        if (!input || input.state.kind === 'completed' || input.state.kind === 'cancelled') {
            onClose();
        }
    }, [publication, input, onClose]);
    useEffect(
        () => () => {
            dispatchMessageDeletion({ kind: 'cancel', identity });
        },
        [identity],
    );

    const submit = () => {
        if (canSubmit) dispatchMessageDeletion({ kind: 'confirm', identity });
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
