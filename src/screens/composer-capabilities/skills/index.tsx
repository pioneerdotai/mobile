import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { pioneerClient, type SelectableSkillCapability } from '@/client';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import {
    composerCapabilityTargetForProvider,
    filterSkillRowsForComposerTarget,
    isCliRuntimeProvider,
} from '@/services/providers/cli-runtime';
import { refreshCliRuntimeSummaries } from '@/services/providers/cli-runtime-live';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useWorkspaceStore } from '@/stores/workspace';

import {
    CapabilityCard,
    Check,
    ListHeader,
    ListState,
    selectedCapabilityKeys,
    styles,
    type LoadState,
} from '../shared';

const skillKeyExtractor = (row: SelectableSkillCapability): string => row.key;

export const ComposerSkillCapabilitiesScreen = () => {
    const { t } = useTranslation('threads');

    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

    const {
        composerCapabilities,
        composerSelectedProvider,
        setComposerCapabilities,
        syncComposerModelSelection,
    } = useActiveThreadStore(
        useShallow((state) => ({
            composerCapabilities: state.composerCapabilities,
            composerSelectedProvider: state.composerSelectedProvider,
            setComposerCapabilities: state.setComposerCapabilities,
            syncComposerModelSelection: state.syncComposerModelSelection,
        })),
    );

    const [query, setQuery] = useState('');
    const [rows, setRows] = useState<SelectableSkillCapability[]>([]);
    const [state, setState] = useState<LoadState>({ loading: false, error: null });

    useEffect(() => {
        let cancelled = false;
        const timeout = setTimeout(() => {
            if (!activeWorkspaceId) {
                setRows([]);
                setState({ loading: false, error: t('modelSelectorNoWorkspace') });
                return;
            }

            setState({ loading: true, error: null });

            const runtimeRequest = isCliRuntimeProvider(composerSelectedProvider)
                ? refreshCliRuntimeSummaries(activeWorkspaceId).catch(() => [])
                : Promise.resolve([]);

            void Promise.all([
                pioneerClient.composerSkillPickerRows({
                    workspace_id: activeWorkspaceId,
                    query: '',
                }),
                runtimeRequest,
            ])
                .then(([nextRows, runtimes]) => {
                    if (!cancelled) {
                        const target = composerCapabilityTargetForProvider(
                            composerSelectedProvider,
                            runtimes,
                        );
                        const storeState = useActiveThreadStore.getState();
                        syncComposerModelSelection(
                            composerSelectedProvider,
                            storeState.composerSelectedModel,
                            storeState.composerSelectedReasoningEffort,
                            target,
                            t('composerCapabilitiesRemovedForProvider'),
                        );
                        setRows(filterSkillRowsForComposerTarget(nextRows, target));
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setRows([]);
                        setState({ loading: false, error: t('composerSkillsFailed') });
                    }
                })
                .finally(() => {
                    if (!cancelled) {
                        setState((current) => ({ ...current, loading: false }));
                    }
                });
        }, 0);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [activeWorkspaceId, composerSelectedProvider, syncComposerModelSelection, t]);

    const filteredRows = useMemo(
        () => pioneerClient.composerFilterSkillRows({ rows, query }),
        [query, rows],
    );

    const selectedKeys = useMemo(
        () => new Set(selectedCapabilityKeys(composerCapabilities)),
        [composerCapabilities],
    );

    const toggleRow = useCallback(
        (row: SelectableSkillCapability) => {
            if (!row.selectable) {
                return;
            }

            const action = selectedKeys.has(row.key)
                ? { Remove: { id: row.key } }
                : { Add: { capability: pioneerClient.composerSkillCapabilityFromRow({ row }) } };

            setComposerCapabilities(
                pioneerClient.composerCapabilitiesUpdate({
                    capabilities: useActiveThreadStore.getState().composerCapabilities,
                    action,
                }),
            );
        },
        [selectedKeys, setComposerCapabilities],
    );

    const renderSkill = useCallback<ListRenderItem<SelectableSkillCapability>>(
        ({ item, index }) => (
            <CapabilityCard
                first={index === 0}
                last={index === filteredRows.length - 1}
                separator={index < filteredRows.length - 1}
            >
                <SkillRow
                    row={item}
                    selected={selectedKeys.has(item.key)}
                    onPress={() => toggleRow(item)}
                />
            </CapabilityCard>
        ),
        [filteredRows.length, selectedKeys, toggleRow],
    );

    return (
        <FlashList
            alwaysBounceVertical={false}
            contentContainerStyle={styles.listContent}
            data={filteredRows}
            keyExtractor={skillKeyExtractor}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
                <ListState
                    loading={state.loading}
                    loadingLabel={t('composerLoadingSkills')}
                    error={state.error}
                    empty={!state.loading && !state.error && filteredRows.length === 0}
                    emptyLabel={t('composerNoSkills')}
                />
            }
            ListHeaderComponent={
                <ListHeader
                    value={query}
                    placeholder={t('composerSearchSkills')}
                    onChangeText={setQuery}
                />
            }
            maintainVisibleContentPosition={{ disabled: true }}
            renderItem={renderSkill}
            showsVerticalScrollIndicator={false}
            style={styles.screen}
        />
    );
};

const SkillRow = ({
    row,
    selected,
    onPress,
}: {
    row: SelectableSkillCapability;
    selected: boolean;
    onPress: () => void;
}) => {
    return (
        <Pressable accessibilityRole="button" disabled={!row.selectable} onPress={onPress}>
            <HStack style={[styles.listRow, !row.selectable ? styles.disabledRow : null]}>
                <VStack style={styles.rowTextWrap}>
                    <Text numberOfLines={1} style={styles.listRowTitle}>
                        {row.label}
                    </Text>
                    {row.description.trim() ? (
                        <Text numberOfLines={3} style={styles.listRowDescription}>
                            {row.description}
                        </Text>
                    ) : null}
                </VStack>
                {selected ? <Check /> : null}
            </HStack>
        </Pressable>
    );
};
