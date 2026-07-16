import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ChevronRight } from 'lucide-react-native';

import type { ProviderModelInfo, ReasoningEffortRow } from '@/client';
import Spinner from '@/components/feedback/spinner';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Input } from '@/components/primitives/input';
import { Pressable } from '@/components/primitives/pressable';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import {
    useProviderDisplayName,
    useProviderModelDisplayName,
} from '@/hooks/use-provider-model-display-name';
import {
    filterModelRows,
    filterProviderRows,
    listProviderModels,
    listProviders,
    modelRowDisplayName,
    modelRowSecondaryText,
    reasoningEffortRowsForModel,
    resolveSelectedProviderModel,
    type ModelSelectorProvider,
} from '@/services/providers/model-selector';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useWorkspaceStore } from '@/stores/workspace';
import { stableOutlineWidth } from '@/helpers/styles';
import { cliRuntimeMcpReadinessTranslationKey } from '@/services/providers/cli-runtime';

type LoadState = {
    loading: boolean;
    error: string | null;
};

type SelectedProviderModelState = {
    workspaceId: string | null;
    provider: string | null;
    models: ProviderModelInfo[];
    error: string | null;
};

type ReasoningEffortOption = {
    effort: string | null;
    label: string;
    selected: boolean;
};

const selectedLabel = (value: string | null, fallback: string): string => {
    return value?.trim() || fallback;
};

const goBackToModelSelector = () => {
    if (router.canGoBack()) {
        router.back();
    } else {
        router.replace({ pathname: '/model-selector' });
    }
};

const providerKeyExtractor = (provider: ModelSelectorProvider): string => provider.id;

const modelKeyExtractor = (model: ProviderModelInfo): string => model.id;

const MODEL_SELECTOR_REASONING_EFFORT_ROUTE = '/model-selector/reasoning-effort' as Parameters<
    typeof router.push
>[0];

const reasoningEffortKeyExtractor = (row: ReasoningEffortOption): string =>
    row.effort ?? '__default__';

const reasoningEffortOptionFromRow = (row: ReasoningEffortRow): ReasoningEffortOption => ({
    effort: row.effort,
    label: row.label,
    selected: row.selected,
});

const useSelectedProviderModel = (
    workspaceId: string | null,
    provider: string | null,
    model: string | null,
) => {
    const [state, setState] = useState<SelectedProviderModelState>({
        workspaceId: null,
        provider: null,
        models: [],
        error: null,
    });

    useEffect(() => {
        let cancelled = false;

        if (!workspaceId || !provider || !model) {
            return;
        }

        void listProviderModels(workspaceId, provider)
            .then((response) => {
                if (!cancelled) {
                    setState({
                        workspaceId,
                        provider,
                        models: response.models,
                        error: null,
                    });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setState({
                        workspaceId,
                        provider,
                        models: [],
                        error: 'load_failed',
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [model, provider, workspaceId]);

    const stateMatchesSelection = state.workspaceId === workspaceId && state.provider === provider;
    const hasLookupTarget = Boolean(workspaceId && provider && model);

    const selectedModel = useMemo(() => {
        if (!stateMatchesSelection) {
            return null;
        }

        return resolveSelectedProviderModel(state.models, provider, model);
    }, [model, provider, state.models, stateMatchesSelection]);

    return {
        selectedModel,
        loading: hasLookupTarget && !stateMatchesSelection,
        error: stateMatchesSelection ? state.error : null,
    };
};

export const ModelSelectorHomeScreen = () => {
    const { t } = useTranslation('threads');

    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

    const {
        composerSelectedProvider,
        composerSelectedModel,
        composerSelectedReasoningEffort,
        defaultComposerSelectionLoading,
    } = useActiveThreadStore(
        useShallow((state) => ({
            composerSelectedProvider: state.composerSelectedProvider,
            composerSelectedModel: state.composerSelectedModel,
            composerSelectedReasoningEffort: state.composerSelectedReasoningEffort,
            defaultComposerSelectionLoading: state.defaultComposerSelectionLoading,
        })),
    );
    const { label: selectedModelDisplayName, loading: selectedModelDisplayNameLoading } =
        useProviderModelDisplayName(
            activeWorkspaceId,
            composerSelectedProvider,
            composerSelectedModel,
        );
    const { label: selectedProviderDisplayName, loading: selectedProviderDisplayNameLoading } =
        useProviderDisplayName(activeWorkspaceId, composerSelectedProvider);

    const { selectedModel } = useSelectedProviderModel(
        activeWorkspaceId,
        composerSelectedProvider,
        composerSelectedModel,
    );
    const reasoningRows = useMemo(
        () => reasoningEffortRowsForModel(selectedModel, composerSelectedReasoningEffort),
        [composerSelectedReasoningEffort, selectedModel],
    );
    const selectedReasoningEffortRow = reasoningRows.find((row) => row.selected) ?? null;
    const selectedReasoningEffortLabel =
        selectedReasoningEffortRow?.label ?? t('modelSelectorReasoningDefault');
    const showReasoningEffortRow = reasoningRows.length > 0;

    return (
        <ScreenScroll>
            <VStack style={styles.card}>
                <SelectorRow
                    label={t('modelSelectorProviderLabel')}
                    value={selectedLabel(
                        selectedProviderDisplayName,
                        t('modelSelectorSelectProvider'),
                    )}
                    loading={selectedProviderDisplayNameLoading}
                    selected={Boolean(composerSelectedProvider)}
                    onPress={() => router.push({ pathname: '/model-selector/provider' })}
                />
                <Box style={styles.separator} />
                <SelectorRow
                    label={t('modelSelectorModelLabel')}
                    value={selectedLabel(selectedModelDisplayName, t('modelSelectorSelectModel'))}
                    loading={
                        selectedModelDisplayNameLoading ||
                        (!composerSelectedModel && defaultComposerSelectionLoading)
                    }
                    selected={Boolean(composerSelectedModel)}
                    onPress={() => router.push({ pathname: '/model-selector/model' })}
                />
                {showReasoningEffortRow ? (
                    <>
                        <Box style={styles.separator} />
                        <SelectorRow
                            label={t('modelSelectorReasoningLabel')}
                            value={selectedReasoningEffortLabel}
                            selected={Boolean(selectedReasoningEffortRow)}
                            onPress={() => router.push(MODEL_SELECTOR_REASONING_EFFORT_ROUTE)}
                        />
                    </>
                ) : null}
            </VStack>
        </ScreenScroll>
    );
};

export const ModelSelectorProviderScreen = () => {
    const { t } = useTranslation('threads');

    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

    const { composerSelectedProvider, setComposerModelSelectionFromUser } = useActiveThreadStore(
        useShallow((state) => ({
            composerSelectedProvider: state.composerSelectedProvider,
            setComposerModelSelectionFromUser: state.setComposerModelSelectionFromUser,
        })),
    );

    const [query, setQuery] = useState('');
    const [providers, setProviders] = useState<ModelSelectorProvider[]>([]);
    const [state, setState] = useState<LoadState>({ loading: false, error: null });

    useEffect(() => {
        let cancelled = false;

        const timeout = setTimeout(() => {
            if (!activeWorkspaceId) {
                setProviders([]);
                setState({ loading: false, error: t('modelSelectorNoWorkspace') });
                return;
            }

            setState({ loading: true, error: null });

            void listProviders(activeWorkspaceId)
                .then((response) => {
                    if (!cancelled) {
                        setProviders(response);
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setProviders([]);
                        setState({ loading: false, error: t('modelSelectorProvidersFailed') });
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
    }, [activeWorkspaceId, t]);

    const rows = useMemo(() => filterProviderRows(providers, query), [providers, query]);

    const selectProvider = useCallback(
        (provider: ModelSelectorProvider) => {
            setComposerModelSelectionFromUser(
                provider.id,
                null,
                provider.capabilityTarget,
                t('composerCapabilitiesRemovedForProvider'),
            );
            goBackToModelSelector();
        },
        [setComposerModelSelectionFromUser, t],
    );

    const renderProvider = useCallback<ListRenderItem<ModelSelectorProvider>>(
        ({ item, index }) => (
            <Box
                style={[
                    styles.listRowCard,
                    index === 0 ? styles.listRowCardFirst : null,
                    index === rows.length - 1 ? styles.listRowCardLast : null,
                ]}
            >
                <ProviderRow
                    provider={item}
                    selected={composerSelectedProvider === item.id}
                    onPress={() => selectProvider(item)}
                />
                {index < rows.length - 1 ? <Box style={styles.listRowSeparator} /> : null}
            </Box>
        ),
        [composerSelectedProvider, rows.length, selectProvider],
    );

    return (
        <FlashList
            alwaysBounceVertical={false}
            contentContainerStyle={styles.listContent}
            data={rows}
            keyExtractor={providerKeyExtractor}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
                <ListState
                    loading={state.loading}
                    loadingLabel={t('modelSelectorLoadingProviders')}
                    error={state.error}
                    empty={!state.loading && !state.error && rows.length === 0}
                    emptyLabel={t('modelSelectorNoProviders')}
                />
            }
            ListHeaderComponent={
                <ListHeader>
                    <SearchInput
                        value={query}
                        placeholder={t('modelSelectorSearchProviders')}
                        onChangeText={setQuery}
                    />
                </ListHeader>
            }
            maintainVisibleContentPosition={{
                disabled: true,
            }}
            renderItem={renderProvider}
            showsVerticalScrollIndicator={false}
            style={styles.screen}
        />
    );
};

export const ModelSelectorModelScreen = () => {
    const { t } = useTranslation('threads');
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const { composerSelectedProvider, composerSelectedModel, setComposerModelSelectionFromUser } =
        useActiveThreadStore(
            useShallow((state) => ({
                composerSelectedProvider: state.composerSelectedProvider,
                composerSelectedModel: state.composerSelectedModel,
                setComposerModelSelectionFromUser: state.setComposerModelSelectionFromUser,
            })),
        );
    const [query, setQuery] = useState('');
    const [models, setModels] = useState<ProviderModelInfo[]>([]);
    const [state, setState] = useState<LoadState>({ loading: false, error: null });

    useEffect(() => {
        let cancelled = false;

        const timeout = setTimeout(() => {
            if (!activeWorkspaceId) {
                setModels([]);
                setState({ loading: false, error: t('modelSelectorNoWorkspace') });
                return;
            }

            if (!composerSelectedProvider) {
                setModels([]);
                setState({ loading: false, error: null });
                return;
            }

            setState({ loading: true, error: null });

            void listProviderModels(activeWorkspaceId, composerSelectedProvider)
                .then((response) => {
                    if (!cancelled) {
                        setModels(response.models);
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setModels([]);
                        setState({ loading: false, error: t('modelSelectorModelsFailed') });
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
    }, [activeWorkspaceId, composerSelectedProvider, t]);

    const rows = useMemo(() => filterModelRows(models, query), [models, query]);
    const selectModel = useCallback(
        (model: ProviderModelInfo) => {
            if (!composerSelectedProvider) {
                return;
            }

            setComposerModelSelectionFromUser(composerSelectedProvider, model.id);
            goBackToModelSelector();
        },
        [composerSelectedProvider, setComposerModelSelectionFromUser],
    );

    const renderModel = useCallback<ListRenderItem<ProviderModelInfo>>(
        ({ item, index }) => (
            <Box
                style={[
                    styles.listRowCard,
                    index === 0 ? styles.listRowCardFirst : null,
                    index === rows.length - 1 ? styles.listRowCardLast : null,
                ]}
            >
                <ModelRow
                    model={item}
                    selected={composerSelectedModel === item.id}
                    onPress={() => selectModel(item)}
                />
                {index < rows.length - 1 ? <Box style={styles.listRowSeparator} /> : null}
            </Box>
        ),
        [composerSelectedModel, rows.length, selectModel],
    );

    return (
        <FlashList
            alwaysBounceVertical={false}
            contentContainerStyle={styles.listContent}
            data={rows}
            keyExtractor={modelKeyExtractor}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
                <ListState
                    loading={state.loading}
                    loadingLabel={t('modelSelectorLoadingModels')}
                    error={state.error}
                    empty={
                        !composerSelectedProvider ||
                        (!state.loading && !state.error && rows.length === 0)
                    }
                    emptyLabel={
                        composerSelectedProvider
                            ? t('modelSelectorNoModels')
                            : t('modelSelectorProviderRequired')
                    }
                />
            }
            ListHeaderComponent={
                <ListHeader>
                    <SearchInput
                        value={query}
                        placeholder={t('modelSelectorSearchModels')}
                        onChangeText={setQuery}
                    />
                </ListHeader>
            }
            maintainVisibleContentPosition={{
                disabled: true,
            }}
            renderItem={renderModel}
            showsVerticalScrollIndicator={false}
            style={styles.screen}
        />
    );
};

export const ModelSelectorReasoningEffortScreen = () => {
    const { t } = useTranslation('threads');
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
    const {
        composerSelectedProvider,
        composerSelectedModel,
        composerSelectedReasoningEffort,
        setComposerReasoningEffortFromUser,
    } = useActiveThreadStore(
        useShallow((state) => ({
            composerSelectedProvider: state.composerSelectedProvider,
            composerSelectedModel: state.composerSelectedModel,
            composerSelectedReasoningEffort: state.composerSelectedReasoningEffort,
            setComposerReasoningEffortFromUser: state.setComposerReasoningEffortFromUser,
        })),
    );

    const {
        selectedModel,
        loading: selectedModelLoading,
        error: selectedModelError,
    } = useSelectedProviderModel(
        activeWorkspaceId,
        composerSelectedProvider,
        composerSelectedModel,
    );
    const effortRows = useMemo(
        () => reasoningEffortRowsForModel(selectedModel, composerSelectedReasoningEffort),
        [composerSelectedReasoningEffort, selectedModel],
    );
    const rows = useMemo<ReasoningEffortOption[]>(() => {
        if (effortRows.length === 0) {
            return [];
        }

        return [
            {
                effort: null,
                label: t('modelSelectorReasoningDefault'),
                selected: !effortRows.some((row) => row.selected),
            },
            ...effortRows.map(reasoningEffortOptionFromRow),
        ];
    }, [effortRows, t]);

    useEffect(() => {
        if (!composerSelectedReasoningEffort || selectedModelLoading) {
            return;
        }

        if (!selectedModel || effortRows.length === 0 || !effortRows.some((row) => row.selected)) {
            setComposerReasoningEffortFromUser(null);
        }
    }, [
        composerSelectedReasoningEffort,
        effortRows,
        selectedModel,
        selectedModelLoading,
        setComposerReasoningEffortFromUser,
    ]);

    const selectEffort = useCallback(
        (row: ReasoningEffortOption) => {
            setComposerReasoningEffortFromUser(row.effort);
            goBackToModelSelector();
        },
        [setComposerReasoningEffortFromUser],
    );

    const renderReasoningEffort = useCallback<ListRenderItem<ReasoningEffortOption>>(
        ({ item, index }) => (
            <Box
                style={[
                    styles.listRowCard,
                    index === 0 ? styles.listRowCardFirst : null,
                    index === rows.length - 1 ? styles.listRowCardLast : null,
                ]}
            >
                <ReasoningEffortOptionRow
                    row={item}
                    selected={item.selected}
                    onPress={() => selectEffort(item)}
                />
                {index < rows.length - 1 ? <Box style={styles.listRowSeparator} /> : null}
            </Box>
        ),
        [rows.length, selectEffort],
    );

    const missingModel = !composerSelectedProvider || !composerSelectedModel;

    return (
        <FlashList
            alwaysBounceVertical={false}
            contentContainerStyle={styles.listContent}
            data={rows}
            keyExtractor={reasoningEffortKeyExtractor}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
                <ListState
                    loading={!missingModel && selectedModelLoading}
                    loadingLabel={t('modelSelectorLoadingReasoning')}
                    error={selectedModelError ? t('modelSelectorModelsFailed') : null}
                    empty={missingModel || (!selectedModelLoading && !selectedModelError)}
                    emptyLabel={
                        missingModel
                            ? t('modelSelectorReasoningModelRequired')
                            : t('modelSelectorNoReasoningEfforts')
                    }
                />
            }
            maintainVisibleContentPosition={{
                disabled: true,
            }}
            renderItem={renderReasoningEffort}
            showsVerticalScrollIndicator={false}
            style={styles.screen}
        />
    );
};

const ScreenScroll = ({ children }: { children: ReactNode }) => {
    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            {children}
        </ScrollView>
    );
};

const ListHeader = ({ children }: { children: ReactNode }) => {
    return <VStack style={styles.listHeader}>{children}</VStack>;
};

type SelectorRowProps = {
    label: string;
    value: string;
    loading?: boolean;
    selected: boolean;
    onPress: () => void;
};

const SelectorRow = ({ label, value, loading = false, selected, onPress }: SelectorRowProps) => {
    const { theme } = useUnistyles();

    return (
        <Pressable accessibilityRole="button" onPress={onPress}>
            <HStack style={styles.selectorRow}>
                <Text style={styles.selectorLabel}>{label}</Text>
                <HStack style={styles.selectorValueWrap}>
                    {loading ? (
                        <Spinner size={theme.space(4)} color={theme.colors.textMuted} />
                    ) : (
                        <Text
                            numberOfLines={1}
                            style={[styles.selectorValue, selected ? null : styles.placeholderText]}
                        >
                            {value}
                        </Text>
                    )}
                    <ChevronRight size={theme.space(4.5)} color={theme.colors.typography} />
                </HStack>
            </HStack>
        </Pressable>
    );
};

const SearchInput = ({
    value,
    placeholder,
    onChangeText,
}: {
    value: string;
    placeholder: string;
    onChangeText: (value: string) => void;
}) => {
    const { theme } = useUnistyles();

    return (
        <Input
            value={value}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textMuted}
            onChangeText={onChangeText}
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.searchInput}
        />
    );
};

const ListState = ({
    loading,
    loadingLabel,
    error,
    empty,
    emptyLabel,
}: {
    loading: boolean;
    loadingLabel: string;
    error: string | null;
    empty: boolean;
    emptyLabel: string;
}) => {
    const { theme } = useUnistyles();

    if (loading) {
        return (
            <HStack style={styles.listState}>
                <Spinner size={theme.space(4)} color={theme.colors.typography} />
                <Text style={styles.listStateText}>{loadingLabel}</Text>
            </HStack>
        );
    }

    if (error) {
        return <Text style={styles.errorText}>{error}</Text>;
    }

    if (empty) {
        return <Text style={styles.listStateText}>{emptyLabel}</Text>;
    }

    return null;
};

const ProviderRow = ({
    provider,
    selected,
    onPress,
}: {
    provider: ModelSelectorProvider;
    selected: boolean;
    onPress: () => void;
}) => {
    const { t } = useTranslation('threads');
    const readinessKey = providerMcpReadinessTranslationKey(provider);
    const mcpReadinessLabel = readinessKey ? t(readinessKey) : null;

    return (
        <Pressable accessibilityRole="button" onPress={onPress}>
            <HStack style={styles.listRow}>
                <VStack style={styles.modelLabelWrap}>
                    <Text numberOfLines={1} style={styles.listRowTitle}>
                        {provider.label}
                    </Text>
                    {mcpReadinessLabel ? (
                        <Text numberOfLines={2} style={styles.modelDescription}>
                            {`MCP: ${mcpReadinessLabel}`}
                        </Text>
                    ) : null}
                </VStack>
                {selected ? <Check /> : null}
            </HStack>
        </Pressable>
    );
};

export const providerMcpReadinessTranslationKey = (
    provider: ModelSelectorProvider,
): ReturnType<typeof cliRuntimeMcpReadinessTranslationKey> | null =>
    provider.mcpReadinessReason
        ? cliRuntimeMcpReadinessTranslationKey(provider.mcpReadinessReason)
        : null;

const Check = () => <Box style={styles.checkContainer}></Box>;

const ModelRow = ({
    model,
    selected,
    onPress,
}: {
    model: ProviderModelInfo;
    selected: boolean;
    onPress: () => void;
}) => {
    const displayName = modelRowDisplayName(model);
    const secondaryText = modelRowSecondaryText(model);

    return (
        <Pressable accessibilityRole="button" onPress={onPress}>
            <HStack style={styles.listRow}>
                <VStack style={styles.modelLabelWrap}>
                    <Text numberOfLines={1} style={styles.listRowTitle}>
                        {displayName}
                    </Text>
                    {secondaryText ? (
                        <Text numberOfLines={2} style={styles.modelDescription}>
                            {secondaryText}
                        </Text>
                    ) : null}
                </VStack>
                {selected ? <Check /> : null}
            </HStack>
        </Pressable>
    );
};

const ReasoningEffortOptionRow = ({
    row,
    selected,
    onPress,
}: {
    row: ReasoningEffortOption;
    selected: boolean;
    onPress: () => void;
}) => {
    return (
        <Pressable accessibilityRole="button" onPress={onPress}>
            <HStack style={styles.listRow}>
                <Text numberOfLines={1} style={styles.listRowTitle}>
                    {row.label}
                </Text>
                {selected ? <Check /> : null}
            </HStack>
        </Pressable>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    checkContainer: {
        height: theme.space(5),
        width: theme.space(5),
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.foreground,
    },
    screen: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        paddingHorizontal: rt.insets.left + theme.space(4),
        paddingTop: theme.screenContentPadding('editor').paddingTop,
        paddingRight: rt.insets.right + theme.space(4),
        paddingBottom: rt.insets.bottom + theme.space(5),
        gap: theme.space(4),
    },
    listContent: {
        paddingHorizontal: rt.insets.left + theme.space(4),
        paddingTop: theme.screenContentPadding('editor').paddingTop,
        paddingRight: rt.insets.right + theme.space(4),
        paddingBottom: rt.insets.bottom + theme.space(5),
    },
    listHeader: {
        paddingBottom: theme.space(4),
    },
    card: {
        overflow: 'hidden',
        borderRadius: theme.radius['3xl'],
        backgroundColor: theme.colors.muted,
    },
    selectorRow: {
        minHeight: theme.space(12),
        paddingHorizontal: theme.space(5),
        paddingVertical: theme.space(4),
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(4),
    },
    selectorLabel: {
        flexShrink: 0,
        color: theme.colors.typography,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    selectorValueWrap: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: theme.space(0.5),
    },
    selectorValue: {
        minWidth: 0,
        flexShrink: 1,
        color: theme.colors.typography,
        textAlign: 'right',
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
    },
    placeholderText: {
        color: theme.colors.textMuted,
    },
    separator: {
        height: stableOutlineWidth,
        marginHorizontal: theme.space(4),
        backgroundColor: theme.colors.border,
    },
    searchInput: {
        minHeight: theme.space(12),
        borderRadius: theme.radius['2xl'],
        backgroundColor: theme.colors.muted,
        color: theme.colors.typography,
        paddingHorizontal: theme.space(4),
        fontSize: theme.fontSize.default.fontSize,
    },
    listState: {
        minHeight: theme.space(12),
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(2),
    },
    listStateText: {
        color: theme.colors.textMuted,
        textAlign: 'center',
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
    },
    errorText: {
        color: theme.colors.dangerText,
        textAlign: 'center',
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    listRow: {
        minHeight: theme.space(12),
        paddingHorizontal: theme.space(4),
        paddingVertical: theme.space(2.5),
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
    },
    listRowCard: {
        backgroundColor: theme.colors.muted,
    },
    listRowCardFirst: {
        borderTopLeftRadius: theme.radius['3xl'],
        borderTopRightRadius: theme.radius['3xl'],
        overflow: 'hidden',
    },
    listRowCardLast: {
        borderBottomLeftRadius: theme.radius['3xl'],
        borderBottomRightRadius: theme.radius['3xl'],
        overflow: 'hidden',
    },
    listRowSeparator: {
        height: stableOutlineWidth,
        marginHorizontal: theme.space(4),
        backgroundColor: theme.colors.border,
    },
    listRowTitle: {
        flexShrink: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    modelLabelWrap: {
        flex: 1,
        minWidth: 0,
        gap: theme.space(1),
    },
    modelDescription: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
}));
