import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { Bolt } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Backdrop } from '../components/backdrop';
import { Handle } from '../components/handle';
import { Box } from '@/components/primitives/box';
import { CreateButton } from '@/components/buttons/create';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { stableOutlineWidth } from '@/helpers/styles';
import { useEditor } from '@/hooks/use-editor';
import { useWorkspace } from '@/hooks/use-workspace';
import { WorkspaceOperationError } from '@/services/workspace/management';
import type { WorkspaceOperationErrorCode } from '@/services/workspace/management';
import { useWorkspaceStore } from '@/stores/workspace';

const workspaceErrorTranslationKeys: Record<WorkspaceOperationErrorCode, string> = {
    gatewayNotFound: 'errors.gatewayNotFound',
    gatewayNotConnected: 'errors.gatewayNotConnected',
    bootstrapFailed: 'errors.bootstrapFailed',
    selectFailed: 'errors.selectFailed',
    createFailed: 'errors.createFailed',
    renameFailed: 'errors.renameFailed',
    emptyName: 'errors.emptyName',
    busy: 'errors.busy',
    unknownTarget: 'errors.unknownTarget',
};

const workspaceDisplayName = (name: string) => {
    return name.trim();
};

const WorkspaceSwitcherSheet = () => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const { t } = useTranslation('workspace');
    const { theme, rt } = useUnistyles();
    const { navigate } = useEditor();
    const {
        workspaces,
        activeWorkspaceId,
        loading,
        error: storeError,
        switchWorkspace,
    } = useWorkspace();
    const [actionError, setActionError] = useState<string | null>(null);

    const { showWorkspaceSwitcher, setWorkspaceSwitcherOpen } = useWorkspaceStore(
        useShallow((state) => ({
            showWorkspaceSwitcher: state.showWorkspaceSwitcher,
            setWorkspaceSwitcherOpen: state.setWorkspaceSwitcherOpen,
        })),
    );

    const activeWorkspaces = useMemo(
        () => workspaces.filter((workspace) => workspace.is_active),
        [workspaces],
    );
    const storeErrorMessage = storeError ? t(workspaceErrorTranslationKeys[storeError]) : null;

    useEffect(() => {
        if (bottomSheetRef.current) {
            if (showWorkspaceSwitcher) {
                bottomSheetRef.current.present();
            } else {
                bottomSheetRef.current.close();
            }
        }
    }, [showWorkspaceSwitcher]);

    const handleSheetChanges = useCallback(
        (index: number) => {
            if (index === -1 && showWorkspaceSwitcher) {
                setWorkspaceSwitcherOpen(false);
            }
        },
        [setWorkspaceSwitcherOpen, showWorkspaceSwitcher],
    );

    const workspaceErrorMessage = useCallback(
        (error: unknown) => {
            if (error instanceof WorkspaceOperationError) {
                return t(workspaceErrorTranslationKeys[error.code]);
            }

            return t('errors.selectFailed');
        },
        [t],
    );

    const handleWorkspaceCreate = useCallback(() => {
        setWorkspaceSwitcherOpen(false);
        navigate({ type: 'workspace__create' });
    }, [navigate, setWorkspaceSwitcherOpen]);

    const handleWorkspaceEdit = useCallback(
        (workspaceId: string) => {
            setWorkspaceSwitcherOpen(false);
            navigate({ type: 'workspace__edit', payload: { workspaceId } });
        },
        [navigate, setWorkspaceSwitcherOpen],
    );

    const handleWorkspaceSwitch = useCallback(
        async (workspaceId: string) => {
            setActionError(null);

            try {
                await switchWorkspace(workspaceId);
                setWorkspaceSwitcherOpen(false);
            } catch (error) {
                setActionError(workspaceErrorMessage(error));
            }
        },
        [setWorkspaceSwitcherOpen, switchWorkspace, workspaceErrorMessage],
    );

    const errorMessage = actionError ?? storeErrorMessage;
    const empty = !loading && activeWorkspaces.length === 0;

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            backdropComponent={(props) => <Backdrop {...props} pressBehavior="close" />}
            handleComponent={(props) => (
                <Handle
                    handleClose={() => setWorkspaceSwitcherOpen(false)}
                    title={t('manageTitle')}
                    closeButton={true}
                    closeButtonType="ghost"
                    leftButton={<CreateButton onPressHandler={handleWorkspaceCreate} />}
                    {...props}
                />
            )}
            onChange={handleSheetChanges}
            stackBehavior="push"
            topInset={rt.insets.top + 20}
            backgroundStyle={styles.backgroundStyle}
            handleStyle={styles.sheetHandle}
            handleIndicatorStyle={styles.sheetHandleIndicator}
        >
            <BottomSheetScrollView style={styles.sheetContainer}>
                <VStack style={styles.sheetContentContainer}>
                    {loading && activeWorkspaces.length === 0 ? (
                        <Text style={styles.emptyText}>{t('loading')}</Text>
                    ) : null}
                    {empty ? <Text style={styles.emptyText}>{t('emptyTitle')}</Text> : null}

                    {activeWorkspaces.map((workspace) => {
                        const active = activeWorkspaceId === workspace.id;
                        const name = workspaceDisplayName(workspace.name) || t('untitled');

                        return (
                            <Pressable
                                key={workspace.id}
                                disabled={loading || active}
                                onPress={() => void handleWorkspaceSwitch(workspace.id)}
                                accessibilityRole="button"
                                accessibilityLabel={t('selectAction')}
                            >
                                <HStack style={styles.workspaceContainer}>
                                    <Box
                                        style={[
                                            styles.workspaceContainerBackground,
                                            active
                                                ? styles.activeWorkspaceContainerBackground
                                                : null,
                                        ]}
                                    />
                                    <VStack style={styles.workspaceNameContainer}>
                                        <Text style={styles.workspaceName}>{name}</Text>
                                        <Text style={styles.workspaceId}>{workspace.id}</Text>
                                    </VStack>

                                    <HStack style={styles.workspaceActions}>
                                        <Pressable
                                            disabled={loading}
                                            onPress={() => handleWorkspaceEdit(workspace.id)}
                                            accessibilityRole="button"
                                            accessibilityLabel={t('editAction')}
                                            style={[
                                                styles.iconButton,
                                                loading ? styles.iconButtonDisabled : null,
                                            ]}
                                        >
                                            <Bolt
                                                size={theme.space(4.5)}
                                                color={theme.colors.typography}
                                            />
                                        </Pressable>
                                    </HStack>
                                </HStack>
                            </Pressable>
                        );
                    })}

                    {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
                </VStack>
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    backgroundStyle: {
        backgroundColor:
            rt.themeName === 'dark' ? theme.colors.neutral[925] : theme.colors.background,
        borderTopRightRadius: theme.radius['4xl'],
        borderTopLeftRadius: theme.radius['4xl'],
    },
    sheetHandle: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        borderTopRightRadius: theme.radius['4xl'],
        borderTopLeftRadius: theme.radius['4xl'],
    },
    sheetHandleIndicator: {
        backgroundColor: theme.colors.typography,
        opacity: 0.2,
    },
    sheetContainer: {
        borderTopRightRadius: theme.radius['4xl'],
        borderTopLeftRadius: theme.radius['4xl'],
        overflow: 'hidden',
    },
    sheetContentContainer: {
        paddingHorizontal: theme.space(5),
        paddingTop: theme.sheetHeaderHeight() + theme.space(3),
        paddingBottom: rt.insets.bottom + theme.space(5),
        gap: theme.space(1.5),
    },
    workspaceContainer: {
        paddingLeft: theme.space(5),
        paddingRight: theme.space(2.5),
        paddingVertical: theme.space(4),
        borderWidth: stableOutlineWidth,
        borderColor: theme.colors.border,
        borderRadius: theme.radius['2xl'],
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.space(3),
        overflow: 'hidden',
    },
    workspaceContainerBackground: {
        position: 'absolute',
        inset: 0,
        opacity: 0.04,
    },
    activeWorkspaceContainerBackground: {
        backgroundColor: theme.colors.foreground,
    },
    workspaceNameContainer: {
        flex: 1,
        minWidth: 0,
        gap: theme.space(1.5),
    },
    workspaceName: {
        flexShrink: 1,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.fontSize,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    workspaceId: {
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.fontSize,
        color: theme.colors.typography,
        opacity: 0.6,
    },
    workspaceActions: {
        flexShrink: 0,
        gap: theme.space(1),
    },
    iconButton: {
        width: theme.space(9),
        height: theme.space(9),
        borderRadius: theme.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconButtonDisabled: {
        opacity: 0.6,
    },
    emptyText: {
        color: theme.colors.typography,
        opacity: 0.6,
        textAlign: 'center',
        paddingVertical: theme.space(5),
    },
    error: {
        ...theme.fontSize.sm,
        color: theme.colors.dangerText,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textAlign: 'center',
    },
}));

export default WorkspaceSwitcherSheet;
