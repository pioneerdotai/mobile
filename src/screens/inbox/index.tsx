import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Stack } from 'expo-router/js-stack';
import { View, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { EyeOff, RefreshCw } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/primitives/text';
import Spinner from '@/components/feedback/spinner';
import { CollapseButton } from '@/components/buttons/collapse';
import { useThreadScreen } from '@/screens/thread/hooks';
import { useTaskInbox, dispatchTaskNotification, taskInboxSnapshot } from '@/client/task-inbox';
import type { TaskInboxItem } from '@/client/generated/task_inbox_publication';
import { useInboxScope } from '@/services/tasks/inbox-scope';
import { InboxInteraction, inboxBusy, formatInboxTime } from '@/services/tasks/inbox-interaction';

export default function InboxScreen() {
    const scope = useInboxScope();
    const inbox = useTaskInbox(scope.enabled ? scope.workspaceId : null);
    const focused = useIsFocused();
    const interaction = useRef(new InboxInteraction()).current;
    const [opening, setOpening] = useState(false);
    const { theme } = useUnistyles();
    const { t } = useTranslation('common');
    const { options } = useThreadScreen();
    useFocusEffect(useCallback(() => {
        // Re-entry never consumes an old confirmation.
        interaction.cancel();
        setOpening(false);
        return () => { interaction.cancel(); };
    }, [interaction, scope.key]));
    useEffect(() => {
        if (!focused || !scope.enabled) { interaction.cancel(); return; }
        const threadId = interaction.confirm(inbox?.opened);
        if (threadId) {
            setOpening(false);
            router.push({ pathname: '/inbox/thread/[threadId]', params: { threadId } });
        } else if (inbox && interaction.settled(inbox)) { setOpening(false); }
    }, [inbox, opening, focused, scope.key, scope.enabled, interaction]);
    const busy = Boolean(inbox && inboxBusy(inbox));
    const dispatch = (kind: 'read_all' | 'retry' | 'load_more') => {
        if (!focused || !scope.enabled || !scope.workspaceId || interaction.isOpening()) return;
        const current = taskInboxSnapshot(scope.workspaceId);
        if (!current || inboxBusy(current)) return;
        if (kind === 'read_all' && !scope.canAcknowledge) return;
        if (kind === 'retry') interaction.retry();
        dispatchTaskNotification({ kind, workspace_id: scope.workspaceId });
    };
    const requestPage = () => {
        if (opening || !focused || !scope.enabled || !scope.workspaceId || interaction.isOpening()) return;
        const current = taskInboxSnapshot(scope.workspaceId);
        if (!current || inboxBusy(current)) return;
        if (interaction.page(current.next_cursor, current.loading, current.error, current.items.length)) dispatch('load_more');
    };
    // A retained viewport demand can continue after a short page, shrink or successful Retry.
    useEffect(() => { requestPage(); }, [inbox, opening, focused, scope.key]);
    const open = (item: TaskInboxItem) => {
        if (!focused || !scope.enabled || !scope.workspaceId || interaction.isOpening()) return;
        const current = taskInboxSnapshot(scope.workspaceId);
        const target = current?.items.find((entry) => entry.notification.runId === item.notification.runId);
        // Guard by the shared slot, including rows removed by push. A concurrent
        // slot acquisition can still queue Open; its completion is tracked below.
        if (!current || inboxBusy(current) || !target || target.revision !== item.revision || target.dismissing) return;
        if (!interaction.begin(target.notification.runId, target.revision, current.opened, current.completed_operation_id ?? null)) return;
        setOpening(true);
        const result = dispatchTaskNotification({ kind: 'open', workspace_id: scope.workspaceId,
            notification_id: target.notification.runId, revision: target.revision });
        const after = taskInboxSnapshot(scope.workspaceId);
        // noop may mean Open was accepted behind a concurrently started shared request.
        // Keep that wait until confirmation or the authoritative drained completion.
        if (result.outcome === 'stale' || result.outcome === 'rejected' ||
            (result.outcome === 'noop' && after && !inboxBusy(after) &&
                after.completed_operation_id === current.completed_operation_id &&
                after.opened?.operation_id === current.opened?.operation_id)) {
            interaction.cancel();
            setOpening(false);
        }
    };
    const dismiss = (item: TaskInboxItem) => {
        if (!focused || !scope.enabled || !scope.canAcknowledge || !scope.workspaceId || interaction.isOpening()) return;
        const current = taskInboxSnapshot(scope.workspaceId);
        const target = current?.items.find((entry) => entry.notification.runId === item.notification.runId);
        if (!current || inboxBusy(current) || !target || target.revision !== item.revision) return;
        dispatchTaskNotification({ kind: 'dismiss', workspace_id: scope.workspaceId,
            notification_id: target.notification.runId, revision: target.revision });
    };
    const renderItem = ({ item }: { item: TaskInboxItem }) => <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={item.notification.threadTitle || item.notification.threadId}
            disabled={opening || busy} onPress={() => open(item)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.top}>
                <Text numberOfLines={1} style={styles.title}>{item.notification.threadTitle.trim() || item.notification.threadId}</Text>
                <View>
                    <Text numberOfLines={1} style={styles.small}>{item.notification.title || t('inboxTask')}</Text>
                    <Text numberOfLines={1} style={[styles.small, styles.summary]}>{item.notification.error ?? item.notification.summary ?? ''}</Text>
                </View>
            </View>
            <View style={styles.bottom}>
                {item.notification.readAt == null ? <Pressable accessibilityRole="button" accessibilityLabel={t('taskNotificationMarkRead')}
                    hitSlop={8} disabled={!scope.canAcknowledge || busy || opening}
                    onPress={(event) => { event.stopPropagation(); dismiss(item); }}
                    style={({ pressed }) => [styles.action, pressed && styles.pressed, (!scope.canAcknowledge || busy || opening) && styles.disabled]}>
                    <EyeOff size={12} color={theme.colors.typography} style={styles.faded} />
                </Pressable> : <View />}
                <Text style={[styles.small, styles.faded]}>{formatInboxTime(item.notification.completedAt)}</Text>
            </View>
        </Pressable>
    </View>;
    return <View style={styles.screen}>
        <Stack.Screen options={{ ...options, headerTransparent: false,
            headerStyle: { ...options.headerStyle, backgroundColor: theme.colors.background },
            headerTitle: t('inbox'), headerLeft: () => <CollapseButton variant="secondary" accessibilityLabel={t('inboxClose')} onPressHandler={() => { interaction.cancel(); router.back(); }} /> }} />
        {inbox?.error ? <Text accessibilityRole="alert" style={styles.state}>{t('inboxError')}</Text> : null}
        <FlashList data={inbox?.items ?? []} keyExtractor={(item) => item.notification.runId}
            renderItem={renderItem} contentContainerStyle={styles.viewport}
            onScrollBeginDrag={() => interaction.scroll()}
            onEndReachedThreshold={0.3}
            onEndReached={() => { interaction.reachedEnd(inbox?.items.length ?? 0); requestPage(); }}
            onViewableItemsChanged={({ viewableItems }) => {
                const indices = viewableItems.flatMap((token) => token.index == null ? [] : [token.index]);
                if (indices.length) interaction.range(Math.max(...indices) + 1, inbox?.items.length ?? 0);
                requestPage();
            }}
            ListEmptyComponent={inbox && !inbox.loading && !inbox.error ? <Text style={styles.state}>{t('inboxEmpty')}</Text> : null} />
        {(inbox?.loading || !inbox) ? <View accessibilityRole="progressbar" accessibilityLabel={t('inbox')} style={styles.state}><Spinner size={16} color={theme.colors.typography} /></View> : null}
        {(inbox?.items.length || inbox?.error) ? <><View style={styles.separator} /><View style={styles.footer}>
            {inbox?.items.length ? <Pressable accessibilityRole="button" accessibilityLabel={t('inboxReadAll')} hitSlop={8}
                disabled={!scope.canAcknowledge || busy || opening}
                onPress={() => dispatch('read_all')} style={({ pressed }) => [styles.action, pressed && styles.pressed, (!scope.canAcknowledge || busy || opening) && styles.disabled]}>
                <EyeOff size={12} color={theme.colors.typography} style={styles.faded} /><Text style={styles.actionText}>{t('inboxReadAll')}</Text>
            </Pressable> : null}
            {inbox?.error ? <Pressable accessibilityRole="button" disabled={busy || opening} hitSlop={8}
                onPress={() => dispatch('retry')} style={styles.action}>
                <RefreshCw size={12} color={theme.colors.typography} style={styles.faded} /><Text style={styles.actionText}>{t('retry')}</Text>
            </Pressable> : null}
        </View></> : null}
    </View>;
}
const styles = StyleSheet.create((theme, rt) => ({
    screen: { flex: 1, backgroundColor: theme.colors.background, paddingBottom: rt.insets.bottom },
    viewport: { padding: 8, paddingBottom: 0 },
    row: { height: 120, paddingBottom: 8 },
    card: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 8, justifyContent: 'space-between' },
    pressed: { backgroundColor: theme.colors.muted },
    top: { gap: 2 },
    title: { fontSize: 14, lineHeight: 23, fontWeight: '600' },
    small: { fontSize: 12, lineHeight: 19 },
    summary: { fontStyle: 'italic' },
    bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    action: { height: 20, minWidth: 20, paddingHorizontal: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
    actionText: { fontSize: 12, lineHeight: 15, opacity: 0.6 },
    faded: { opacity: 0.6 }, disabled: { opacity: 0.5 },
    state: { padding: 16, fontSize: 12, lineHeight: 19, color: theme.colors.textMuted, textAlign: 'center' },
    separator: { marginTop: 8, height: 1, backgroundColor: theme.colors.border },
    footer: { marginTop: 8, padding: 8, paddingTop: 0, gap: 8, flexDirection: 'row', alignItems: 'center' },
}));
