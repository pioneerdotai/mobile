import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';

import { pioneerClient, type TaskUserNotification } from '@/client';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import {
    administrationAuthorizationQueryRetry,
    administrationAuthorizationQueryRetryDelay,
} from '@/services/administration/query';
import {
    useAdministrationPrincipal,
    useAuthorizationCapabilitySnapshot,
} from '@/hooks/use-administration-capabilities';
import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';
import { taskUserNotificationAuthorLabel } from './task-notification-presentation';
import { taskUserNotificationTargetsInbox } from './user-notification-targeting';

const taskUserNotificationKeys = {
    all: ['task-user-notifications'] as const,
    inbox: (gatewayId: string, connectionId: number, principalId: string, workspaceId: string) =>
        [
            ...taskUserNotificationKeys.all,
            { gatewayId, connectionId, principalId, workspaceId },
        ] as const,
};

export const TaskUserNotificationController = () => {
    const queryClient = useQueryClient();
    const { t } = useTranslation('common');
    const principal = useAdministrationPrincipal();
    const capabilities = useAuthorizationCapabilitySnapshot();
    const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const gatewayId = useGatewayStore((state) => state.connectionGatewayId);
    const connectionId = useGatewayStore((state) => state.connectionId);
    const connected = useGatewayStore((state) => state.connectionState === 'Connected');
    const principalId = principal.data?.principal.id ?? null;
    const canRead = capabilities.data?.workspace?.capabilities.can_read_own_notifications === true;
    const canAcknowledge =
        capabilities.data?.workspace?.capabilities.can_acknowledge_own_notifications === true;
    const enabled =
        connected &&
        canRead &&
        gatewayId !== null &&
        connectionId !== null &&
        principalId !== null &&
        workspaceId !== null;
    const queryKey = useMemo(
        () =>
            enabled
                ? taskUserNotificationKeys.inbox(gatewayId, connectionId, principalId, workspaceId)
                : taskUserNotificationKeys.all,
        [connectionId, enabled, gatewayId, principalId, workspaceId],
    );
    const inbox = useQuery({
        queryKey,
        queryFn: () =>
            pioneerClient.taskUserNotificationList({
                workspaceId: workspaceId!,
                limit: 100,
            }),
        enabled,
        retry: administrationAuthorizationQueryRetry,
        retryDelay: administrationAuthorizationQueryRetryDelay,
        staleTime: 30_000,
    });
    const acknowledge = useMutation({
        mutationFn: (notificationId: string) =>
            pioneerClient.taskUserNotificationAcknowledge({
                workspaceId: workspaceId!,
                notificationId,
            }),
        onSuccess: ({ notification }) => {
            queryClient.setQueryData(queryKey, (current: typeof inbox.data) => {
                if (!current) return current;
                return {
                    ...current,
                    notifications: (current.notifications ?? []).map((item) =>
                        item.notificationId === notification.notificationId ? notification : item,
                    ),
                };
            });
        },
    });

    useEffect(() => {
        if (!enabled) return;
        return useGatewayStore.subscribe((state, previous) => {
            if (state.lastEventSerial === previous.lastEventSerial) return;
            const event = state.lastEvent;
            if (!event || !('GatewayNotification' in event)) return;
            const notification = event.GatewayNotification;
            if (
                notification.kind !== 'task_user_notification_delivered' ||
                !taskUserNotificationTargetsInbox(notification.params, workspaceId, principalId)
            ) {
                return;
            }
            void queryClient.invalidateQueries({ queryKey, exact: true });
        });
    }, [enabled, principalId, queryClient, queryKey, workspaceId]);

    const notification = inbox.data?.notifications?.find(
        (item) => item.acknowledgedAt === undefined || item.acknowledgedAt === null,
    );
    if (!enabled || !notification) return null;

    return (
        <VStack pointerEvents="box-none" style={styles.overlay}>
            <VStack style={styles.card}>
                <Text style={styles.eyebrow}>{t('taskNotificationTitle')}</Text>
                <Text numberOfLines={1} style={styles.author}>
                    {taskUserNotificationAuthorLabel(notification, {
                        agent: t('taskNotificationAgent'),
                        system: t('taskNotificationSystem'),
                        unknown: t('taskNotificationUnknownHistoricalActor'),
                    })}
                </Text>
                <Text numberOfLines={3} style={styles.message}>
                    {taskUserNotificationSummary(notification, t('taskNotificationCompleted'))}
                </Text>
                <Pressable
                    accessibilityRole="button"
                    disabled={!canAcknowledge || acknowledge.isPending}
                    onPress={() => acknowledge.mutate(notification.notificationId)}
                    style={({ pressed }) => [
                        styles.action,
                        pressed ? styles.actionPressed : null,
                        !canAcknowledge || acknowledge.isPending ? styles.actionDisabled : null,
                    ]}
                >
                    <Text style={styles.actionText}>{t('taskNotificationMarkRead')}</Text>
                </Pressable>
            </VStack>
        </VStack>
    );
};

const taskUserNotificationSummary = (
    notification: TaskUserNotification,
    fallback: string,
): string =>
    notification.result?.summary?.trim() || notification.error?.error.message.trim() || fallback;

const styles = StyleSheet.create((theme) => ({
    overlay: {
        position: 'absolute',
        top: theme.space(4),
        left: theme.space(4),
        right: theme.space(4),
        zIndex: 1000,
        alignItems: 'center',
    },
    card: {
        width: '100%',
        maxWidth: 520,
        gap: theme.space(2),
        borderRadius: theme.radius['2xl'],
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        padding: theme.space(3),
    },
    eyebrow: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
        textTransform: 'uppercase',
    },
    author: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    message: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    action: {
        alignSelf: 'flex-end',
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.foreground,
        paddingHorizontal: theme.space(3),
        paddingVertical: theme.space(2),
    },
    actionPressed: {
        opacity: 0.8,
    },
    actionDisabled: {
        opacity: 0.45,
    },
    actionText: {
        color: theme.colors.background,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
}));
