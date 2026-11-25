import { useCallback, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import { pioneerClient } from '@/client';
import { composerSnapshot, useComposerPublication } from '@/client/composer';
import { dispatchComposerCatalog, useComposerPicker } from '@/client/composer-catalog';
import type { PluginPickerRow } from '@/client/generated/plugin_shell_response';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useWorkspaceStore } from '@/stores/workspace';
import { useAdministrationCapabilities } from '@/hooks/use-administration-capabilities';

import {
    CapabilityCard,
    CapabilitySelectionRow,
    ListHeader,
    ListState,
    styles,
    type LoadState,
} from '../shared';

const EMPTY_ROWS: PluginPickerRow[] = [];

export const ComposerPackageCapabilitiesScreen = ({ kind = 'plugins' }: { kind?: 'apps' | 'plugins' }) => {
    const { t } = useTranslation('threads');
    const [target] = useState(() => {
        const thread = useActiveThreadStore.getState().activeComposerThreadId;
        return { thread, draft: composerSnapshot(thread)?.draft_id ?? null };
    });
    const activeThread = useActiveThreadStore((state) => state.activeComposerThreadId);
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const capabilities = useAdministrationCapabilities();
    const enabled =
        capabilities.data?.can_use_skills === true &&
        (kind === 'apps' || capabilities.data?.can_use_mcp === true) &&
        activeThread === target.thread;
    const { input, identity } = useComposerPicker(target.thread, target.draft, kind, enabled);
    const composer = useComposerPublication(target.thread);
    const [query, setQuery] = useState('');
    const rows = useMemo(
        () =>
            input && composer?.draft_id === target.draft && target.thread && target.draft !== null
                ? pioneerClient.pluginShell({
                      kind: kind === 'apps' ? 'app_composer_picker' : 'composer_picker',
                      thread_id: target.thread,
                      draft_id: target.draft,
                      query,
                  }).picker
                : EMPTY_ROWS,
        [input, target.thread, target.draft, query, composer, kind],
    );
    const descriptions = useMemo(
        () =>
            new Map<string, string | null>(
                (kind === 'apps' ? input?.apps : input?.plugins)?.map((plugin): [string, string | null] => [
                    plugin.id,
                    typeof plugin.description === 'string' ? plugin.description : null,
                ]) ?? [],
            ),
        [input, kind],
    );
    const state: LoadState = {
        loading:
            capabilities.isPending ||
            (enabled && (!input || (kind === 'apps' ? input.app_request : input.plugin_request).state.kind === 'loading')),
        error: !activeWorkspaceId
            ? t('modelSelectorNoWorkspace')
            : !enabled && !capabilities.isPending
              ? t('settings:plugins.readOnly')
              : (kind === 'apps' ? input?.app_request : input?.plugin_request)?.state.kind === 'failed'
                ? t(kind === 'apps' ? 'composerAppsFailed' : 'composerPluginsFailed')
                : null,
    };

    const togglePlugin = useCallback(
        (row: PluginPickerRow) => {
            if (identity && (row.selected || row.selectable)) {
                dispatchComposerCatalog({
                    ...(kind === 'apps' ? { kind: 'toggle_app' as const, app_id: row.plugin_id } : { kind: 'toggle_plugin' as const, plugin_id: row.plugin_id }),
                    identity,
                });
            }
        },
        [identity, kind],
    );
    const renderPlugin = useCallback<ListRenderItem<PluginPickerRow>>(
        ({ item, index }) => (
            <CapabilityCard
                first={index === 0}
                last={index === rows.length - 1}
                separator={index < rows.length - 1}
            >
                <CapabilitySelectionRow
                    label={item.label}
                    description={
                        item.stale || !item.selectable
                            ? t(
                                  item.stale
                                      ? 'settings:plugins.staleSelection'
                                      : 'settings:plugins.unavailable',
                              )
                            : descriptions.get(item.plugin_id)
                    }
                    selected={item.selected}
                    disabled={!identity || (!item.selected && !item.selectable)}
                    onPress={() => togglePlugin(item)}
                />
            </CapabilityCard>
        ),
        [rows.length, descriptions, identity, t, togglePlugin],
    );

    return (
        <FlashList
            alwaysBounceVertical={false}
            contentContainerStyle={styles.listContent}
            data={rows}
            extraData={identity}
            keyExtractor={(row) => row.key}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
                <ListState
                    loading={state.loading}
                    loadingLabel={t(kind === 'apps' ? 'composerLoadingApps' : 'composerLoadingPlugins')}
                    error={state.error}
                    empty={!state.loading && !state.error && rows.length === 0}
                    emptyLabel={t(kind === 'apps' ? 'composerNoApps' : 'composerNoPlugins')}
                />
            }
            ListHeaderComponent={
                <ListHeader
                    value={query}
                    placeholder={t(kind === 'apps' ? 'composerSearchApps' : 'composerSearchPlugins')}
                    onChangeText={setQuery}
                />
            }
            maintainVisibleContentPosition={{ disabled: true }}
            renderItem={renderPlugin}
            showsVerticalScrollIndicator={false}
            style={styles.screen}
        />
    );
};
