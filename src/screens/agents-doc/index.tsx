import type { AgentsDocumentAction } from '@/client/generated/client_intent';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { AppState, StyleSheet as RNStyleSheet } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dispatchAgentsDocument, useAgentsDocument } from '@/client/agents-document';
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

const EMPTY_SAVE_STATE = { kind: 'clean' } as const;

type AgentsDocScreenProps = {
    workspaceId: string;
    folderId: string | null;
    onSaveStatusChange?: (state: AgentsDocHeaderState) => void;
};

export type AgentsDocScreenHandle = {
    close: () => void;
};

const AgentsDocScreen = forwardRef<AgentsDocScreenHandle, AgentsDocScreenProps>(
    ({ workspaceId, folderId, onSaveStatusChange }, ref) => {
        const { t } = useTranslation('editor');
        const router = useRouter();
        const navigation = useNavigation();
        const pendingNavigation = useRef<NavigationAction | null>(null);
        const { rt, theme } = useUnistyles();
        const scope = useMemo(
            () =>
                folderId === null
                    ? { kind: 'root' as const, workspace_id: workspaceId }
                    : { kind: 'folder' as const, workspace_id: workspaceId, folder_id: folderId },
            [workspaceId, folderId],
        );
        const publication = useAgentsDocument(scope);
        const owner = publication?.owner_generation;
        const send = useCallback(
            (action: AgentsDocumentAction) => {
                if (owner !== undefined)
                    dispatchAgentsDocument({
                        kind: 'scoped',
                        scope,
                        expected_owner: owner,
                        action,
                    });
            },
            [scope, owner],
        );
        const loadState = publication?.load.kind ?? 'loading';
        const loadError = publication?.load.kind === 'failed' ? publication.load.value : null;
        const saveState = publication?.save ?? EMPTY_SAVE_STATE;
        const content = publication?.content ?? '';
        const closed = useRef(false);
        useEffect(() => {
            closed.current = false;
            pendingNavigation.current = null;
        }, [workspaceId, folderId]);
        useEffect(() => {
            if (publication?.close_ready && !closed.current) {
                closed.current = true;
                const action = pendingNavigation.current;
                pendingNavigation.current = null;
                if (action) navigation.dispatch(action);
                else if (router.canGoBack()) router.back();
                else router.navigate('/');
            }
        }, [publication?.close_ready, router, navigation]);
        usePreventRemove(
            Boolean(
                publication?.access &&
                !publication.close_ready &&
                ['dirty', 'saving', 'error', 'conflict'].includes(saveState.kind),
            ),
            ({ data }) => {
                pendingNavigation.current = data.action;
                send({ kind: 'close' });
            },
        );
        const handleChangeText = useCallback(
            (nextContent: string) => {
                send({ kind: 'edit', content: nextContent });
            },
            [send],
        );
        const load = useCallback(() => send({ kind: 'reload' }), [send]);
        const handleClose = useCallback(() => send({ kind: 'close' }), [send]);
        const handleReloadRemote = useCallback(() => send({ kind: 'reload_remote' }), [send]);
        const handleOverwriteRemote = useCallback(() => send({ kind: 'overwrite_remote' }), [send]);
        useEffect(() => {
            const subscription = AppState.addEventListener('change', (state) => {
                if (state !== 'active') send({ kind: 'save' });
            });
            return () => subscription.remove();
        }, [send]);
        useImperativeHandle(ref, () => ({ close: handleClose }), [handleClose]);

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
                                            content={saveState.remote_doc.content}
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
