import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { composerSnapshot, useComposerPublication } from '@/client/composer';
import { dispatchComposerCatalog, useComposerPicker } from '@/client/composer-catalog';
import { pioneerClient } from '@/client';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useWorkspaceStore } from '@/stores/workspace';
import { useAdministrationCapabilities } from '@/hooks/use-administration-capabilities';
import { ScrollView } from '@/components/primitives/scrollview';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { CapabilityCard, Check, ListHeader, ListState } from '../shared';

const styles = StyleSheet.create((theme) => ({
    root: { flex: 1 },
    content: {
        ...theme.screenContentPadding('root'),
        paddingHorizontal: theme.space(4),
        gap: theme.space(3),
    },
    row: {
        padding: theme.space(4),
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space(3),
    },
    text: { flex: 1 },
    secondary: { opacity: 0.6, ...theme.fontSize.sm },
    disabled: { opacity: 0.5 },
}));
export const ComposerPluginCapabilitiesScreen = () => {
    const { t } = useTranslation('settings');
    const [target] = useState(() => {
        const thread = useActiveThreadStore.getState().activeComposerThreadId;
        return { thread, draft: composerSnapshot(thread)?.draft_id ?? null };
    });
    const activeThread = useActiveThreadStore((s) => s.activeComposerThreadId);
    const workspace = useWorkspaceStore((s) => s.activeWorkspaceId);
    const auth = useAdministrationCapabilities();
    const enabled =
        auth.data?.can_use_skills === true &&
        auth.data?.can_use_mcp === true &&
        activeThread === target.thread;
    const { input, identity } = useComposerPicker(target.thread, target.draft, 'plugins', enabled);
    // Subscribe to the shared draft as well: the pure picker reads current
    // parent selection, including stale/unavailable parents kept for removal.
    useComposerPublication(target.thread);
    const [query, setQuery] = useState('');
    const rows =
        input && target.thread && target.draft !== null
            ? pioneerClient.pluginShell({
                  kind: 'composer_picker',
                  thread_id: target.thread,
                  draft_id: target.draft,
                  query,
              }).picker
            : [];
    const error = !workspace
        ? t('plugins.noWorkspace')
        : !enabled && !auth.isPending
          ? t('plugins.readOnly')
          : input?.plugin_request.state.kind === 'failed'
            ? t('plugins.loadFailed')
            : null;
    return (
        <ScrollView style={styles.root} contentContainerStyle={styles.content}>
            <ListHeader value={query} onChangeText={setQuery} placeholder={t('plugins.search')} />
            <ListState
                loading={
                    auth.isPending ||
                    (enabled && (!input || input.plugin_request.state.kind === 'loading'))
                }
                loadingLabel={t('plugins.loading')}
                error={error}
                empty={rows.length === 0}
                emptyLabel={t('plugins.empty')}
            />
            <Pressable
                accessibilityRole="button"
                onPress={() => {
                    if (target.thread && target.draft !== null)
                        dispatchComposerCatalog({
                            kind: 'retry',
                            thread_id: target.thread,
                            draft_id: target.draft,
                            catalog: { kind: 'plugins' },
                        });
                }}
            >
                <Text>{t('plugins.refresh')}</Text>
            </Pressable>
            {rows.map((row, index) => (
                <CapabilityCard
                    key={row.key}
                    first={index === 0}
                    last={index === rows.length - 1}
                    separator={index !== rows.length - 1}
                >
                    <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{
                            checked: row.selected,
                            disabled: !identity || (!row.selected && !row.selectable),
                        }}
                        disabled={!identity || (!row.selected && !row.selectable)}
                        style={[
                            styles.row,
                            !row.selectable && !row.selected ? styles.disabled : null,
                        ]}
                        onPress={() => {
                            if (identity)
                                dispatchComposerCatalog({
                                    kind: 'toggle_plugin',
                                    identity,
                                    plugin_id: row.plugin_id,
                                });
                        }}
                    >
                        <VStack style={styles.text}>
                            <Text>{row.label}</Text>
                            {row.stale || !row.selectable ? (
                                <Text style={styles.secondary}>
                                    {t(
                                        row.stale
                                            ? 'plugins.staleSelection'
                                            : 'plugins.unavailable',
                                    )}
                                </Text>
                            ) : null}
                        </VStack>
                        {row.selected ? <Check /> : null}
                    </Pressable>
                </CapabilityCard>
            ))}
        </ScrollView>
    );
};
