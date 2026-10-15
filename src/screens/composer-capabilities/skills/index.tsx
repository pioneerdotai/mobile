import { useCallback, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import {
    pioneerClient,
    type ComposerSkillPickerProjection,
    type ComposerSkillSelection,
    type SelectablePackedSkillCapability,
    type SelectableSkillCapability,
    type SelectableSkillPackCapability,
} from '@/client';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { composerSnapshot, useComposerPublication } from '@/client/composer';
import { dispatchComposerCatalog, useComposerPicker } from '@/client/composer-catalog';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useWorkspaceStore } from '@/stores/workspace';
import { useAdministrationCapabilities } from '@/hooks/use-administration-capabilities';

import { CapabilityCard, Check, ListHeader, ListState, styles, type LoadState } from '../shared';

type SkillDisplayRow =
    | { type: 'pack'; pack: SelectableSkillPackCapability }
    | { type: 'packed_skill'; child: SelectablePackedSkillCapability }
    | { type: 'standalone_skill'; skill: SelectableSkillCapability };

const EMPTY_SELECTIONS: ComposerSkillSelection[] = [];
const EMPTY_PICKER: ComposerSkillPickerProjection = { packs: [], standalone: [] };

export const composerSkillSelectionKey = (selection: ComposerSkillSelection): string =>
    selection.kind === 'skill_pack'
        ? `skill_pack:${selection.pack_id}`
        : `skill:${selection.skill_id}`;

export const buildComposerSkillDisplayRows = (
    picker: ComposerSkillPickerProjection,
    expandedPackIds: ReadonlySet<string>,
    searching: boolean,
): SkillDisplayRow[] => {
    const rows: SkillDisplayRow[] = [];

    for (const pack of picker.packs) {
        rows.push({ type: 'pack', pack });
        if (searching || expandedPackIds.has(pack.pack_id)) {
            rows.push(...pack.children.map((child) => ({ type: 'packed_skill' as const, child })));
        }
    }

    rows.push(...picker.standalone.map((skill) => ({ type: 'standalone_skill' as const, skill })));
    return rows;
};

const skillDisplayKey = (row: SkillDisplayRow): string => {
    switch (row.type) {
        case 'pack':
            return `pack:${row.pack.pack_id}`;
        case 'packed_skill':
            return `packed:${row.child.pack_id}:${row.child.skill.skill_id}`;
        case 'standalone_skill':
            return `standalone:${row.skill.skill_id}`;
    }
};

const selectionForDisplayRow = (row: SkillDisplayRow): ComposerSkillSelection => {
    switch (row.type) {
        case 'pack':
            return { kind: 'skill_pack', pack_id: row.pack.pack_id };
        case 'packed_skill':
            return {
                kind: 'skill',
                skill_id: row.child.skill.skill_id,
                pack_id: row.child.pack_id,
            };
        case 'standalone_skill':
            return { kind: 'skill', skill_id: row.skill.skill_id, pack_id: null };
    }
};

export const ComposerSkillCapabilitiesScreen = () => {
    const { t } = useTranslation('threads');
    const [target] = useState(() => {
        const thread = useActiveThreadStore.getState().activeComposerThreadId;
        return { thread, draft: composerSnapshot(thread)?.draft_id ?? null };
    });
    const activeThread = useActiveThreadStore((state) => state.activeComposerThreadId);
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const capabilities = useAdministrationCapabilities();
    const enabled = capabilities.data?.can_use_skills === true && target.thread === activeThread;
    const { input, identity } = useComposerPicker(target.thread, target.draft, 'skills', enabled);
    const composer = useComposerPublication(target.thread);
    const composerSkillSelections = composer?.draft.domain.skill_selections ?? EMPTY_SELECTIONS;
    const [query, setQuery] = useState('');
    const [expandedPackIds, setExpandedPackIds] = useState<Set<string>>(new Set());
    const picker = useMemo(
        () =>
            input
                ? pioneerClient.composerSkillPackPicker({
                      thread_id: input.thread_id,
                      draft_id: input.draft_id,
                      query,
                  })
                : EMPTY_PICKER,
        [input, query],
    );
    const state: LoadState = {
        loading:
            capabilities.isPending ||
            (enabled && (!input || input.skill_request.state.kind === 'loading')),
        error: !activeWorkspaceId
            ? t('modelSelectorNoWorkspace')
            : input?.skill_request.state.kind === 'failed'
              ? t('composerSkillsFailed')
              : null,
    };

    const searching = query.trim().length > 0;
    const displayRows = useMemo(
        () => buildComposerSkillDisplayRows(picker, expandedPackIds, searching),
        [expandedPackIds, picker, searching],
    );
    const selectedKeys = useMemo(
        () => new Set(composerSkillSelections.map(composerSkillSelectionKey)),
        [composerSkillSelections],
    );

    const toggleSelection = useCallback(
        (row: SkillDisplayRow) => {
            if (identity)
                dispatchComposerCatalog({
                    kind: 'toggle_skill',
                    identity,
                    selection: selectionForDisplayRow(row),
                });
        },
        [identity],
    );

    const togglePackExpanded = useCallback((packId: string) => {
        setExpandedPackIds((current) => {
            const next = new Set(current);
            if (next.has(packId)) {
                next.delete(packId);
            } else {
                next.add(packId);
            }
            return next;
        });
    }, []);

    const renderSkill = useCallback<ListRenderItem<SkillDisplayRow>>(
        ({ item, index }) => (
            <CapabilityCard
                first={index === 0}
                last={index === displayRows.length - 1}
                separator={index < displayRows.length - 1}
            >
                <SkillRow
                    item={item}
                    selected={selectedKeys.has(
                        composerSkillSelectionKey(selectionForDisplayRow(item)),
                    )}
                    expanded={item.type === 'pack' && expandedPackIds.has(item.pack.pack_id)}
                    searching={searching}
                    onPress={() => toggleSelection(item)}
                    onToggleChildren={() => {
                        if (item.type === 'pack') {
                            togglePackExpanded(item.pack.pack_id);
                        }
                    }}
                />
            </CapabilityCard>
        ),
        [
            displayRows.length,
            expandedPackIds,
            searching,
            selectedKeys,
            togglePackExpanded,
            toggleSelection,
        ],
    );

    return (
        <FlashList
            alwaysBounceVertical={false}
            contentContainerStyle={styles.listContent}
            data={displayRows}
            extraData={`${searching}:${[...expandedPackIds].join('|')}:${[...selectedKeys].join('|')}`}
            keyExtractor={skillDisplayKey}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
                <ListState
                    loading={state.loading}
                    loadingLabel={t('composerLoadingSkills')}
                    error={state.error}
                    empty={!state.loading && !state.error && displayRows.length === 0}
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
    item,
    selected,
    expanded,
    searching,
    onPress,
    onToggleChildren,
}: {
    item: SkillDisplayRow;
    selected: boolean;
    expanded: boolean;
    searching: boolean;
    onPress: () => void;
    onToggleChildren: () => void;
}) => {
    const { theme } = useUnistyles();
    const isPack = item.type === 'pack';
    const skill =
        item.type === 'pack' ? null : item.type === 'packed_skill' ? item.child.skill : item.skill;
    const selectable = item.type === 'pack' ? item.pack.selectable : (skill?.selectable ?? false);
    const label = item.type === 'pack' ? item.pack.label : (skill?.label ?? '');
    const isPackedSkill = item.type === 'packed_skill';
    const showChevron = isPack && !searching && item.pack.children.length > 0;
    const Chevron = expanded ? ChevronUp : ChevronDown;

    return (
        <HStack
            style={[
                styles.listRow,
                isPackedSkill && !searching ? styles.toolRow : null,
                !selectable ? styles.disabledRow : null,
            ]}
        >
            <Pressable
                accessibilityRole="button"
                disabled={!selectable}
                onPress={onPress}
                style={styles.rowMainButton}
            >
                <VStack style={styles.rowTextWrap}>
                    <Text numberOfLines={1} style={styles.listRowTitle}>
                        {label}
                    </Text>
                    {skill?.description.trim() ? (
                        <Text numberOfLines={3} style={styles.listRowDescription}>
                            {skill.description}
                        </Text>
                    ) : null}
                </VStack>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={!selectable} onPress={onPress}>
                {selected ? <Check /> : null}
            </Pressable>
            {showChevron ? (
                <Pressable
                    accessibilityRole="button"
                    onPress={onToggleChildren}
                    style={styles.toolsButton}
                >
                    <Chevron size={theme.space(5)} color={theme.colors.typography} />
                </Pressable>
            ) : null}
        </HStack>
    );
};
