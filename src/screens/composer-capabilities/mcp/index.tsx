import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';
import { useShallow } from 'zustand/react/shallow';

import {
    pioneerClient,
    type ClientComposerMcpToggleResult,
    type ComposerCapability,
    type SelectableMcpCapability,
} from '@/client';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { composerTargetThreadIsActive } from '@/services/threads/composer-target';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useWorkspaceStore } from '@/stores/workspace';
import { useAdministrationCapabilities } from '@/hooks/use-administration-capabilities';

import {
    CapabilityCard,
    Check,
    ListHeader,
    ListState,
    SectionHeader,
    selectedCapabilityKeys,
    styles,
    type LoadState,
} from '../shared';

type McpCapabilityDisplayRow =
    | { type: 'server'; row: SelectableMcpCapability }
    | { type: 'tool'; row: SelectableMcpCapability };

type McpDisplayRow =
    { type: 'section'; id: 'servers' | 'tools'; title: string } | McpCapabilityDisplayRow;

const mcpKeyExtractor = (row: McpDisplayRow): string =>
    row.type === 'section' ? `section:${row.id}` : `${row.type}:${row.row.key}`;

export const toggleMcpComposerCapabilitySelection = (
    capabilities: readonly ComposerCapability[],
    selectedKeys: readonly string[],
    serverRows: readonly SelectableMcpCapability[],
    toolRows: readonly SelectableMcpCapability[],
    row: SelectableMcpCapability,
): ClientComposerMcpToggleResult =>
    pioneerClient.composerMcpToggle({
        capabilities: [...capabilities],
        selected_keys: [...selectedKeys],
        server_rows: [...serverRows],
        tool_rows: [...toolRows],
        row,
    });

export const ComposerMcpCapabilitiesScreen = () => {
    const { t } = useTranslation('threads');
    const targetThreadIdRef = useRef(useActiveThreadStore.getState().activeComposerThreadId);

    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const capabilities = useAdministrationCapabilities();
    const canUseMcp = capabilities.data?.can_use_mcp === true;

    const { composerCapabilities, setComposerCapabilities } = useActiveThreadStore(
        useShallow((state) => ({
            composerCapabilities: state.composerCapabilities,
            setComposerCapabilities: state.setComposerCapabilities,
        })),
    );

    const [query, setQuery] = useState('');
    const [serverRows, setServerRows] = useState<SelectableMcpCapability[]>([]);
    const [toolRows, setToolRows] = useState<SelectableMcpCapability[]>([]);
    const [activeServerId, setActiveServerId] = useState<string | null>(null);
    const [state, setState] = useState<LoadState>({ loading: false, error: null });

    useEffect(() => {
        let cancelled = false;
        const timeout = setTimeout(() => {
            if (!canUseMcp) {
                setServerRows([]);
                setToolRows([]);
                setState({ loading: capabilities.isPending, error: null });
                return;
            }
            if (!activeWorkspaceId) {
                setServerRows([]);
                setToolRows([]);
                setState({ loading: false, error: t('modelSelectorNoWorkspace') });
                return;
            }

            setState({ loading: true, error: null });

            void pioneerClient
                .composerMcpPickerRows({
                    workspace_id: activeWorkspaceId,
                    query: '',
                })
                .then((result) => {
                    if (
                        !cancelled &&
                        composerTargetThreadIsActive(
                            targetThreadIdRef.current,
                            useActiveThreadStore.getState().activeComposerThreadId,
                        )
                    ) {
                        setServerRows(result.server_rows);
                        setToolRows(result.tool_rows);
                        setState({ loading: false, error: null });
                    }
                })
                .catch(() => {
                    if (
                        !cancelled &&
                        composerTargetThreadIsActive(
                            targetThreadIdRef.current,
                            useActiveThreadStore.getState().activeComposerThreadId,
                        )
                    ) {
                        setServerRows([]);
                        setToolRows([]);
                        setState({ loading: false, error: t('composerMcpFailed') });
                    }
                });
        }, 0);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [activeWorkspaceId, canUseMcp, capabilities.isPending, t]);

    const selectedKeys = useMemo(
        () => selectedCapabilityKeys(composerCapabilities),
        [composerCapabilities],
    );

    const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

    const filtered = useMemo(
        () =>
            pioneerClient.composerFilterMcpRows({
                server_rows: serverRows,
                tool_rows: toolRows,
                selected_keys: selectedKeys,
                active_server_id: activeServerId,
                query,
            }),
        [activeServerId, query, selectedKeys, serverRows, toolRows],
    );

    const displayRows = useMemo<McpDisplayRow[]>(() => {
        const rows: McpDisplayRow[] = [];

        if (filtered.server_rows.length > 0) {
            rows.push({ type: 'section', id: 'servers', title: t('composerMcpServers') });
        }

        if (filtered.has_query) {
            rows.push(...filtered.server_rows.map((row) => ({ type: 'server' as const, row })));

            if (filtered.tool_rows.length > 0) {
                rows.push({ type: 'section', id: 'tools', title: t('composerMcpTools') });
                rows.push(...filtered.tool_rows.map((row) => ({ type: 'tool' as const, row })));
            }

            return rows;
        }

        const toolsByServer = new Map<string, SelectableMcpCapability[]>();
        for (const row of filtered.tool_rows) {
            const rowsForServer = toolsByServer.get(row.server_id) ?? [];
            rowsForServer.push(row);
            toolsByServer.set(row.server_id, rowsForServer);
        }

        for (const server of filtered.server_rows) {
            rows.push({ type: 'server', row: server });
            if (server.server_id === activeServerId) {
                for (const tool of toolsByServer.get(server.server_id) ?? []) {
                    rows.push({ type: 'tool', row: tool });
                }
            }
        }
        return rows;
    }, [activeServerId, filtered, t]);

    const toggleCapability = useCallback(
        (row: SelectableMcpCapability) => {
            if (
                !row.selectable ||
                !composerTargetThreadIsActive(
                    targetThreadIdRef.current,
                    useActiveThreadStore.getState().activeComposerThreadId,
                )
            ) {
                return;
            }

            const currentCapabilities = useActiveThreadStore.getState().composerCapabilities;
            const result = toggleMcpComposerCapabilitySelection(
                currentCapabilities,
                selectedKeys,
                serverRows,
                toolRows,
                row,
            );
            setComposerCapabilities(result.capabilities);

            if (result.collapse_active_server) {
                setActiveServerId(null);
            }
        },
        [selectedKeys, serverRows, setComposerCapabilities, toolRows],
    );

    const toggleServerTools = useCallback((serverId: string) => {
        setActiveServerId((current) => (current === serverId ? null : serverId));
    }, []);

    const renderMcp = useCallback<ListRenderItem<McpDisplayRow>>(
        ({ item, index }) => {
            if (item.type === 'section') {
                return <SectionHeader first={index === 0} title={item.title} />;
            }

            const nextRow = displayRows[index + 1];

            return (
                <CapabilityCard
                    first={index === 0 || displayRows[index - 1]?.type === 'section'}
                    last={index === displayRows.length - 1 || nextRow?.type === 'section'}
                    separator={nextRow != null && nextRow.type !== 'section'}
                >
                    <McpRow
                        item={item}
                        selected={selectedKeySet.has(item.row.key)}
                        expanded={item.row.server_id === activeServerId}
                        searching={filtered.has_query}
                        onPress={() => toggleCapability(item.row)}
                        onToggleTools={() => toggleServerTools(item.row.server_id)}
                    />
                </CapabilityCard>
            );
        },
        [
            activeServerId,
            displayRows,
            filtered.has_query,
            selectedKeySet,
            toggleCapability,
            toggleServerTools,
        ],
    );

    return (
        <FlashList
            alwaysBounceVertical={false}
            contentContainerStyle={styles.listContent}
            data={displayRows}
            extraData={`${activeServerId ?? ''}:${filtered.has_query}:${selectedKeys.join('|')}`}
            getItemType={(item) => item.type}
            keyExtractor={mcpKeyExtractor}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
                <ListState
                    loading={state.loading}
                    loadingLabel={t('composerLoadingMcp')}
                    error={state.error}
                    empty={!state.loading && !state.error && displayRows.length === 0}
                    emptyLabel={t('composerNoMcp')}
                />
            }
            ListHeaderComponent={
                <ListHeader
                    value={query}
                    placeholder={t('composerSearchMcp')}
                    onChangeText={setQuery}
                />
            }
            maintainVisibleContentPosition={{ disabled: true }}
            renderItem={renderMcp}
            showsVerticalScrollIndicator={false}
            style={styles.screen}
        />
    );
};

const McpRow = ({
    item,
    selected,
    expanded,
    searching,
    onPress,
    onToggleTools,
}: {
    item: McpCapabilityDisplayRow;
    selected: boolean;
    expanded: boolean;
    searching: boolean;
    onPress: () => void;
    onToggleTools: () => void;
}) => {
    const { theme } = useUnistyles();
    const isTool = item.type === 'tool';
    const showToolsChevron = !isTool && !searching && item.row.selectable && !selected;
    const ToolsChevron = expanded ? ChevronUp : ChevronDown;

    return (
        <HStack
            style={[
                styles.listRow,
                isTool && !searching ? styles.toolRow : null,
                !item.row.selectable ? styles.disabledRow : null,
            ]}
        >
            <Pressable
                accessibilityRole="button"
                disabled={!item.row.selectable}
                onPress={onPress}
                style={styles.rowMainButton}
            >
                <VStack style={styles.rowTextWrap}>
                    <Text numberOfLines={1} style={styles.listRowTitle}>
                        {item.row.label}
                    </Text>
                </VStack>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={!item.row.selectable} onPress={onPress}>
                {selected ? <Check /> : null}
            </Pressable>
            {showToolsChevron ? (
                <Pressable
                    accessibilityRole="button"
                    onPress={onToggleTools}
                    style={styles.toolsButton}
                >
                    <ToolsChevron size={theme.space(5)} color={theme.colors.typography} />
                </Pressable>
            ) : null}
        </HStack>
    );
};
