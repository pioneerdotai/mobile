import { Bell } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { BaseIconButton } from './base-icon-button';
import { Text } from '@/components/primitives/text';
import { useTaskInbox } from '@/client/task-inbox';
import { useInboxScope } from '@/services/tasks/inbox-scope';

export const InboxButton = () => {
    const scope = useInboxScope();
    const inbox = useTaskInbox(scope.enabled ? scope.workspaceId : null);
    const path = usePathname();
    const { t } = useTranslation('common');
    if (!scope.enabled) return null;
    const count = inbox?.unread_count ?? 0;
    return <View>
        <BaseIconButton Icon={Bell} variant="secondary"
            accessibilityLabel={t('inboxOpen', { count })}
            onPressHandler={() => router.push({ pathname: '/inbox', params: { returnTo: path } })} />
        {count > 0 ? <View pointerEvents="none" style={styles.badge}>
            <Text style={styles.count}>{count > 99 ? '99+' : count}</Text>
        </View> : null}
    </View>;
};
const styles = StyleSheet.create((theme) => ({
    badge: { position: 'absolute', right: -4, top: -2, borderRadius: theme.radius.full,
        backgroundColor: theme.colors.foreground, paddingHorizontal: 4, minWidth: 16, alignItems: 'center' },
    count: { color: theme.colors.background, fontSize: 10, lineHeight: 16 },
}));
