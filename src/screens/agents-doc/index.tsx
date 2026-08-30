import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { AppState, StyleSheet as RNStyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { pioneerClient } from '@/client';
import type { ThreadAgentsDocPayload } from '@/client';
import { Button } from '@/components/buttons/base';
import { SourceDocumentEditor } from '@/components/editor/source-document-editor';
import Spinner from '@/components/feedback/spinner';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { KeyboardAvoidingView } from '@/components/primitives/keyboard';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { Title } from '@/components/typography/title';
import type { AgentsDocHeaderState } from '@/screens/agents-doc/hooks';

const AUTOSAVE_DELAY_MS = 700;

type AgentsDocScreenProps = {
    workspaceId: string;
    folderId: string | null;
    onSaveStatusChange?: (state: AgentsDocHeaderState) => void;
};

export type AgentsDocScreenHandle = {
    close: () => void;
};

type LoadState = 'loading' | 'loaded' | 'failed';

type SaveState =
    | { kind: 'clean' }
    | { kind: 'dirty' }
    | { kind: 'saving' }
    | { kind: 'saved' }
    | { kind: 'error'; message: string }
    | { kind: 'conflict'; localContent: string; remoteDoc: ThreadAgentsDocPayload };

const errorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};

const isVersionConflictMessage = (message: string): boolean => {
    const normalized = message.toLowerCase();
    return normalized.includes('version conflict') || normalized.includes('save conflict');
};

const AgentsDocScreen = forwardRef<AgentsDocScreenHandle, AgentsDocScreenProps>(
    ({ workspaceId, folderId, onSaveStatusChange }, ref) => {
        const { t } = useTranslation('editor');
        const router = useRouter();
        const { rt, theme } = useUnistyles();
        const [loadState, setLoadState] = useState<LoadState>('loading');
        const [loadError, setLoadError] = useState<string | null>(null);
        const [saveState, setSaveState] = useState<SaveState>({ kind: 'clean' });
        const [content, setContent] = useState('');

        const contentRef = useRef('');
        const lastSavedContentRef = useRef('');
        const expectedVersionRef = useRef<number | null>(null);
        const loadStateRef = useRef<LoadState>('loading');
        const saveStateRef = useRef<SaveState>({ kind: 'clean' });
        const saveInFlightRef = useRef(false);
        const pendingSaveContentRef = useRef<string | null>(null);
        const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const mountedRef = useRef(true);
        const loadSequenceRef = useRef(0);
        const scopeGenerationRef = useRef(0);
        const closeAfterSaveRef = useRef(false);

        const setTrackedLoadState = useCallback((nextState: LoadState) => {
            loadStateRef.current = nextState;
            setLoadState(nextState);
        }, []);

        const setTrackedSaveState = useCallback((nextState: SaveState) => {
            saveStateRef.current = nextState;
            setSaveState(nextState);
        }, []);

        const clearSaveTimer = useCallback(() => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
            }
        }, []);

        const scheduleSave = useCallback(
            (save: (nextContent: string) => void, nextContent: string) => {
                clearSaveTimer();
                saveTimerRef.current = setTimeout(() => {
                    saveTimerRef.current = null;
                    save(nextContent);
                }, AUTOSAVE_DELAY_MS);
            },
            [clearSaveTimer],
        );

        const refreshConflict = useCallback(
            async (localContent: string, message: string, scopeGeneration: number) => {
                try {
                    const response = await pioneerClient.agentsDocGet({
                        workspace_id: workspaceId,
                        folder_id: folderId,
                    });
                    const remoteDoc = response.explicit ?? null;

                    if (!mountedRef.current || scopeGenerationRef.current !== scopeGeneration) {
                        return;
                    }

                    if (!remoteDoc) {
                        setTrackedSaveState({ kind: 'error', message: t('conflictMissingRemote') });
                        return;
                    }

                    expectedVersionRef.current = remoteDoc.version;
                    lastSavedContentRef.current = remoteDoc.content;
                    setTrackedSaveState({ kind: 'conflict', localContent, remoteDoc });
                } catch (error) {
                    if (mountedRef.current && scopeGenerationRef.current === scopeGeneration) {
                        setTrackedSaveState({ kind: 'error', message: errorMessage(error) });
                    }
                }
            },
            [folderId, setTrackedSaveState, t, workspaceId],
        );

        const saveNow = useCallback(
            async (nextContent: string) => {
                if (loadStateRef.current !== 'loaded') {
                    return;
                }

                const scopeGeneration = scopeGenerationRef.current;

                if (nextContent === lastSavedContentRef.current) {
                    pendingSaveContentRef.current = null;
                    if (!saveInFlightRef.current && mountedRef.current) {
                        setTrackedSaveState({ kind: 'clean' });
                    }
                    return;
                }

                if (saveInFlightRef.current) {
                    pendingSaveContentRef.current = nextContent;
                    return;
                }

                saveInFlightRef.current = true;
                pendingSaveContentRef.current = null;
                if (mountedRef.current) {
                    setTrackedSaveState({ kind: 'saving' });
                }

                try {
                    const response = await pioneerClient.agentsDocSave({
                        workspace_id: workspaceId,
                        folder_id: folderId,
                        content: nextContent,
                        expected_version: expectedVersionRef.current,
                        save_reason: 'autosave',
                    });

                    if (!mountedRef.current || scopeGenerationRef.current !== scopeGeneration) {
                        return;
                    }

                    expectedVersionRef.current = response.doc.version;
                    lastSavedContentRef.current = response.doc.content;
                    if (
                        contentRef.current === nextContent ||
                        contentRef.current === response.doc.content
                    ) {
                        pendingSaveContentRef.current = null;
                        setTrackedSaveState({ kind: 'saved' });
                    } else {
                        pendingSaveContentRef.current = contentRef.current;
                        setTrackedSaveState({ kind: 'dirty' });
                    }
                } catch (error) {
                    const message = errorMessage(error);

                    if (!mountedRef.current || scopeGenerationRef.current !== scopeGeneration) {
                        return;
                    }

                    closeAfterSaveRef.current = false;
                    if (isVersionConflictMessage(message)) {
                        await refreshConflict(contentRef.current, message, scopeGeneration);
                    } else {
                        setTrackedSaveState({ kind: 'error', message });
                    }
                } finally {
                    if (scopeGenerationRef.current !== scopeGeneration) {
                        return;
                    }

                    saveInFlightRef.current = false;
                    const pendingContent = pendingSaveContentRef.current;

                    if (
                        mountedRef.current &&
                        scopeGenerationRef.current === scopeGeneration &&
                        pendingContent &&
                        pendingContent !== lastSavedContentRef.current &&
                        !matchesConflict(saveStateRef.current)
                    ) {
                        pendingSaveContentRef.current = null;
                        setTrackedSaveState({ kind: 'dirty' });
                        if (closeAfterSaveRef.current) {
                            void saveNow(pendingContent);
                        } else {
                            scheduleSave((value) => void saveNow(value), pendingContent);
                        }
                        return;
                    }

                    if (
                        mountedRef.current &&
                        closeAfterSaveRef.current &&
                        loadStateRef.current === 'loaded' &&
                        contentRef.current === lastSavedContentRef.current &&
                        !matchesConflict(saveStateRef.current)
                    ) {
                        closeAfterSaveRef.current = false;
                        router.back();
                    }
                }
            },
            [folderId, refreshConflict, router, scheduleSave, setTrackedSaveState, workspaceId],
        );

        const load = useCallback(async () => {
            const sequence = loadSequenceRef.current + 1;
            loadSequenceRef.current = sequence;
            clearSaveTimer();
            saveInFlightRef.current = false;
            pendingSaveContentRef.current = null;
            closeAfterSaveRef.current = false;
            setTrackedLoadState('loading');
            setLoadError(null);
            setTrackedSaveState({ kind: 'clean' });

            try {
                const response = await pioneerClient.agentsDocGet({
                    workspace_id: workspaceId,
                    folder_id: folderId,
                });

                if (!mountedRef.current || loadSequenceRef.current !== sequence) {
                    return;
                }

                const explicit = response.explicit ?? null;
                const currentDoc = explicit ?? response.effective?.doc ?? null;
                const nextContent = currentDoc?.content ?? '';
                contentRef.current = nextContent;
                lastSavedContentRef.current = nextContent;
                expectedVersionRef.current = explicit?.version ?? null;
                pendingSaveContentRef.current = null;
                setContent(nextContent);
                setTrackedLoadState('loaded');
                setTrackedSaveState({ kind: 'clean' });
            } catch (error) {
                if (!mountedRef.current || loadSequenceRef.current !== sequence) {
                    return;
                }

                setLoadError(errorMessage(error));
                setTrackedLoadState('failed');
            }
        }, [clearSaveTimer, folderId, setTrackedLoadState, setTrackedSaveState, workspaceId]);

        useEffect(() => {
            let cancelled = false;
            mountedRef.current = true;
            scopeGenerationRef.current += 1;
            queueMicrotask(() => {
                if (!cancelled) {
                    void load();
                }
            });

            return () => {
                cancelled = true;
                mountedRef.current = false;
                clearSaveTimer();

                if (
                    loadStateRef.current === 'loaded' &&
                    !saveInFlightRef.current &&
                    contentRef.current !== lastSavedContentRef.current &&
                    !matchesConflict(saveStateRef.current)
                ) {
                    void pioneerClient.agentsDocSave({
                        workspace_id: workspaceId,
                        folder_id: folderId,
                        content: contentRef.current,
                        expected_version: expectedVersionRef.current,
                        save_reason: 'autosave',
                    });
                }
            };
        }, [clearSaveTimer, folderId, load, workspaceId]);

        const handleChangeText = useCallback(
            (nextContent: string) => {
                contentRef.current = nextContent;
                setContent(nextContent);

                if (loadStateRef.current !== 'loaded') {
                    return;
                }

                if (matchesConflict(saveStateRef.current)) {
                    setTrackedSaveState({
                        ...saveStateRef.current,
                        localContent: nextContent,
                    });
                    return;
                }

                if (nextContent === lastSavedContentRef.current) {
                    pendingSaveContentRef.current = null;
                    clearSaveTimer();
                    if (!saveInFlightRef.current) {
                        setTrackedSaveState({ kind: 'clean' });
                    }
                    return;
                }

                pendingSaveContentRef.current = nextContent;
                if (!saveInFlightRef.current) {
                    setTrackedSaveState({ kind: 'dirty' });
                    scheduleSave((value) => void saveNow(value), nextContent);
                }
            },
            [clearSaveTimer, saveNow, scheduleSave, setTrackedSaveState],
        );

        const flushPendingSave = useCallback(() => {
            clearSaveTimer();

            if (
                loadStateRef.current === 'loaded' &&
                contentRef.current !== lastSavedContentRef.current &&
                !matchesConflict(saveStateRef.current)
            ) {
                void saveNow(contentRef.current);
            }
        }, [clearSaveTimer, saveNow]);

        useEffect(() => {
            const subscription = AppState.addEventListener('change', (nextState) => {
                if (nextState !== 'active') {
                    flushPendingSave();
                }
            });

            return () => subscription.remove();
        }, [flushPendingSave]);

        const handleClose = useCallback(() => {
            clearSaveTimer();

            if (saveInFlightRef.current) {
                closeAfterSaveRef.current = true;
                pendingSaveContentRef.current = contentRef.current;
                return;
            }

            if (
                loadStateRef.current === 'loaded' &&
                contentRef.current !== lastSavedContentRef.current &&
                !matchesConflict(saveStateRef.current)
            ) {
                closeAfterSaveRef.current = true;
                void saveNow(contentRef.current);
                return;
            }

            router.back();
        }, [clearSaveTimer, router, saveNow]);

        useImperativeHandle(
            ref,
            () => ({
                close: handleClose,
            }),
            [handleClose],
        );

        const handleReloadRemote = useCallback(() => {
            if (!matchesConflict(saveStateRef.current)) {
                return;
            }

            const remoteDoc = saveStateRef.current.remoteDoc;
            clearSaveTimer();
            contentRef.current = remoteDoc.content;
            lastSavedContentRef.current = remoteDoc.content;
            expectedVersionRef.current = remoteDoc.version;
            pendingSaveContentRef.current = null;
            setContent(remoteDoc.content);
            setTrackedSaveState({ kind: 'clean' });
        }, [clearSaveTimer, setTrackedSaveState]);

        const handleOverwriteRemote = useCallback(() => {
            if (!matchesConflict(saveStateRef.current)) {
                return;
            }

            expectedVersionRef.current = saveStateRef.current.remoteDoc.version;
            pendingSaveContentRef.current = contentRef.current;
            setTrackedSaveState({ kind: 'dirty' });
            void saveNow(contentRef.current);
        }, [saveNow, setTrackedSaveState]);

        const saveStatus = useMemo(() => {
            switch (saveState.kind) {
                case 'clean':
                    return t('clean');
                case 'dirty':
                    return t('dirty');
                case 'saving':
                    return t('saving');
                case 'saved':
                    return t('saved');
                case 'error':
                    return t('saveFailed', { message: saveState.message });
                case 'conflict':
                    return t('conflict');
            }
        }, [saveState, t]);
        const saveStatusDanger = saveState.kind === 'error' || saveState.kind === 'conflict';
        const editorEditable = loadState === 'loaded';

        useEffect(() => {
            onSaveStatusChange?.({
                label: saveStatus,
                danger: saveStatusDanger,
            });
        }, [onSaveStatusChange, saveStatus, saveStatusDanger]);

        return (
            <KeyboardAvoidingView
                behavior="padding"
                keyboardVerticalOffset={0 - rt.insets.bottom}
                style={styles.keyboard}
            >
                <Box style={styles.container}>
                    {loadState === 'loading' ? (
                        <VStack style={styles.stateContainer}>
                            <Spinner size={theme.space(5)} color={theme.colors.typography} />
                        </VStack>
                    ) : null}

                    {loadState === 'failed' ? (
                        <VStack style={styles.stateContainer}>
                            <Text style={styles.errorTitle}>{loadError}</Text>
                            <Button
                                title={t('retry', { ns: 'common' })}
                                size="sm"
                                containerStyle={styles.retryButton}
                                onPress={() => void load()}
                            />
                        </VStack>
                    ) : null}

                    {loadState === 'loaded' ? (
                        <VStack style={styles.editorWrap}>
                            {saveState.kind === 'conflict' ? (
                                <VStack style={styles.conflictPanel}>
                                    <Title type="h6" style={styles.conflictTitle}>
                                        {t('conflictTitle')}
                                    </Title>
                                    <Text style={styles.conflictDescription}>
                                        {t('conflictDescription')}
                                    </Text>
                                    <HStack style={styles.conflictActions}>
                                        <Button
                                            title={t('reloadRemote')}
                                            size="sm"
                                            type="link"
                                            onPress={handleReloadRemote}
                                        />
                                        <Button
                                            title={t('overwriteRemote')}
                                            size="sm"
                                            type="link"
                                            onPress={handleOverwriteRemote}
                                        />
                                    </HStack>
                                    <HStack style={styles.conflictPreviews}>
                                        <ConflictPreview label={t('local')} content={content} />
                                        <ConflictPreview
                                            label={t('remote')}
                                            content={saveState.remoteDoc.content}
                                        />
                                    </HStack>
                                </VStack>
                            ) : null}
                            <SourceDocumentEditor
                                documentKey={`${workspaceId}:${folderId ?? 'root'}:AGENTS.md`}
                                editable={editorEditable}
                                fileName="AGENTS.md"
                                language="markdown"
                                lineNumbers
                                onChangeText={handleChangeText}
                                value={content}
                            />
                        </VStack>
                    ) : null}
                </Box>
            </KeyboardAvoidingView>
        );
    },
);

AgentsDocScreen.displayName = 'AgentsDocScreen';

const ConflictPreview = ({ content, label }: { content: string; label: string }) => {
    return (
        <VStack style={styles.conflictPreview}>
            <Text style={styles.conflictPreviewLabel}>{label}</Text>
            <ScrollView style={styles.conflictPreviewBody}>
                <Text style={styles.conflictPreviewText}>{content}</Text>
            </ScrollView>
        </VStack>
    );
};

const matchesConflict = (
    state: SaveState,
): state is { kind: 'conflict'; localContent: string; remoteDoc: ThreadAgentsDocPayload } => {
    return state.kind === 'conflict';
};

const styles = StyleSheet.create((theme, rt) => ({
    keyboard: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    stateContainer: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        gap: theme.space(4),
        paddingTop: theme.screenContentPadding('child').paddingTop,
        paddingHorizontal: theme.space(4),
    },
    errorTitle: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textAlign: 'center',
    },
    retryButton: {
        alignSelf: 'center',
        minWidth: theme.space(32),
        paddingHorizontal: theme.space(5),
    },
    editorWrap: {
        flex: 1,
        minHeight: 0,
        paddingTop: theme.screenContentPadding('child').paddingTop,
        paddingHorizontal: theme.space(4),
        paddingBottom: rt.insets.bottom,
    },
    conflictPanel: {
        borderColor: theme.colors.dangerBorder,
        borderRadius: theme.radius.lg,
        borderWidth: RNStyleSheet.hairlineWidth,
        backgroundColor: theme.colors.dangerSurface,
        gap: theme.space(2),
        marginBottom: theme.space(3),
        padding: theme.space(3),
    },
    conflictTitle: {
        color: theme.colors.dangerText,
    },
    conflictDescription: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.lg.fontSize,
        opacity: 0.7,
    },
    conflictActions: {
        alignItems: 'center',
        gap: theme.space(3),
    },
    conflictPreviews: {
        gap: theme.space(2),
        minHeight: theme.space(22),
    },
    conflictPreview: {
        flex: 1,
        minWidth: 0,
        gap: theme.space(1),
    },
    conflictPreviewLabel: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
        opacity: 0.65,
    },
    conflictPreviewBody: {
        maxHeight: theme.space(22),
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.background,
        padding: theme.space(2),
    },
    conflictPreviewText: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.sm.fontSize,
        opacity: 0.75,
    },
}));

export default AgentsDocScreen;
