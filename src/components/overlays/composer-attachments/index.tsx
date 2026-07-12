import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { File, Image, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useShallow } from 'zustand/react/shallow';

import { pioneerClient } from '@/client';
import type { ComposerAttachment } from '@/client';
import { McpIcon } from '@/components/icons/mcp-icon';
import { Backdrop } from '@/components/overlays/components/backdrop';
import { Handle } from '@/components/overlays/components/handle';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import {
    pickComposerFileAttachments,
    pickComposerMediaAttachments,
} from '@/services/threads/composer-attachments';
import {
    composerCapabilityTargetForProvider,
    isCliRuntimeProvider,
    type ComposerCapabilityTarget,
} from '@/services/providers/cli-runtime';
import { useActiveThreadStore } from '@/stores/active-thread';
import { useWorkspaceStore } from '@/stores/workspace';

const ComposerAttachmentMenuSheet = () => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const { t } = useTranslation('threads');
    const { theme, rt } = useUnistyles();
    const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

    const {
        showComposerAttachmentMenu,
        composerSelectedProvider,
        setComposerAttachmentMenuOpen,
        setComposerAttachments,
        setComposerError,
        syncComposerModelSelection,
    } = useActiveThreadStore(
        useShallow((state) => ({
            showComposerAttachmentMenu: state.showComposerAttachmentMenu,
            composerSelectedProvider: state.composerSelectedProvider,
            setComposerAttachmentMenuOpen: state.setComposerAttachmentMenuOpen,
            setComposerAttachments: state.setComposerAttachments,
            setComposerError: state.setComposerError,
            syncComposerModelSelection: state.syncComposerModelSelection,
        })),
    );

    const cliRuntimeSelected = isCliRuntimeProvider(composerSelectedProvider);
    const [runtimeTarget, setRuntimeTarget] = useState<{
        provider: string | null;
        workspaceId: string | null;
        target: ComposerCapabilityTarget;
    } | null>(null);
    const capabilityTarget =
        runtimeTarget?.provider === composerSelectedProvider &&
        runtimeTarget.workspaceId === activeWorkspaceId
            ? runtimeTarget.target
            : cliRuntimeSelected
              ? 'unsupportedCli'
              : 'native';

    useEffect(() => {
        let cancelled = false;

        if (!cliRuntimeSelected || !showComposerAttachmentMenu) {
            return () => {
                cancelled = true;
            };
        }

        if (!activeWorkspaceId) {
            const storeState = useActiveThreadStore.getState();
            syncComposerModelSelection(
                composerSelectedProvider,
                storeState.composerSelectedModel,
                storeState.composerSelectedReasoningEffort,
                'unsupportedCli',
                t('composerCapabilitiesRemovedForProvider'),
            );
            return () => {
                cancelled = true;
            };
        }

        void pioneerClient
            .cliRuntimeList({ workspace_id: activeWorkspaceId })
            .then((response) => {
                if (!cancelled) {
                    const target = composerCapabilityTargetForProvider(
                        composerSelectedProvider,
                        response.runtimes,
                    );
                    setRuntimeTarget({
                        provider: composerSelectedProvider,
                        workspaceId: activeWorkspaceId,
                        target,
                    });
                    const storeState = useActiveThreadStore.getState();
                    syncComposerModelSelection(
                        composerSelectedProvider,
                        storeState.composerSelectedModel,
                        storeState.composerSelectedReasoningEffort,
                        target,
                        t('composerCapabilitiesRemovedForProvider'),
                    );
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setRuntimeTarget({
                        provider: composerSelectedProvider,
                        workspaceId: activeWorkspaceId,
                        target: 'unsupportedCli',
                    });
                    const storeState = useActiveThreadStore.getState();
                    syncComposerModelSelection(
                        composerSelectedProvider,
                        storeState.composerSelectedModel,
                        storeState.composerSelectedReasoningEffort,
                        'unsupportedCli',
                        t('composerCapabilitiesRemovedForProvider'),
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        activeWorkspaceId,
        cliRuntimeSelected,
        composerSelectedProvider,
        showComposerAttachmentMenu,
        syncComposerModelSelection,
        t,
    ]);

    useEffect(() => {
        if (bottomSheetRef.current) {
            if (showComposerAttachmentMenu) {
                bottomSheetRef.current.present();
            } else {
                bottomSheetRef.current.close();
            }
        }
    }, [showComposerAttachmentMenu]);

    const close = useCallback(() => {
        setComposerAttachmentMenuOpen(false);
    }, [setComposerAttachmentMenuOpen]);

    const handleSheetChanges = useCallback(
        (index: number) => {
            if (index === -1 && showComposerAttachmentMenu) {
                setComposerAttachmentMenuOpen(false);
            }
        },
        [setComposerAttachmentMenuOpen, showComposerAttachmentMenu],
    );

    const addAttachments = useCallback(
        (attachments: ComposerAttachment[]) => {
            if (attachments.length === 0) {
                return;
            }

            let next = useActiveThreadStore.getState().composerAttachments;
            for (const attachment of attachments) {
                next = pioneerClient.composerAttachmentsUpdate({
                    attachments: next,
                    action: { Add: { attachment } },
                });
            }
            setComposerAttachments(next);
        },
        [setComposerAttachments],
    );

    const errorMessage = useCallback(
        (error: unknown, fallback: string) => {
            if (error instanceof Error && error.message === 'media-library-permission-required') {
                return t('composerMediaPermissionRequired');
            }
            if (error instanceof Error && error.message.trim()) {
                return error.message;
            }
            return fallback;
        },
        [t],
    );

    const pickMedia = useCallback(() => {
        close();
        void pickComposerMediaAttachments()
            .then(addAttachments)
            .catch((error) => {
                setComposerError(errorMessage(error, t('composerPickMediaFailed')));
            });
    }, [addAttachments, close, errorMessage, setComposerError, t]);

    const pickFiles = useCallback(() => {
        close();
        void pickComposerFileAttachments()
            .then(addAttachments)
            .catch((error) => {
                setComposerError(errorMessage(error, t('composerPickFileFailed')));
            });
    }, [addAttachments, close, errorMessage, setComposerError, t]);

    const openSkills = useCallback(() => {
        close();
        router.push({ pathname: '/composer-capabilities/skills' });
    }, [close]);

    const openMcp = useCallback(() => {
        close();
        router.push({ pathname: '/composer-capabilities/mcp' });
    }, [close]);

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            backdropComponent={(props) => <Backdrop {...props} pressBehavior="close" />}
            handleComponent={(props) => (
                <Handle handleClose={close} compact closeButton {...props} />
            )}
            onChange={handleSheetChanges}
            stackBehavior="push"
            topInset={rt.insets.top + theme.space(5)}
            backgroundStyle={styles.backgroundStyle}
            handleStyle={styles.sheetHandle}
            handleIndicatorStyle={styles.sheetHandleIndicator}
        >
            <BottomSheetScrollView
                style={styles.sheetContainer}
                contentContainerStyle={styles.sheetContent}
            >
                <VStack style={styles.menuGrid}>
                    <HStack style={styles.menuRow}>
                        <MenuItem
                            icon={<Image size={theme.space(5)} color={theme.colors.typography} />}
                            label={t('composerMedia')}
                            onPress={pickMedia}
                        />
                        <MenuItem
                            icon={<File size={theme.space(5)} color={theme.colors.typography} />}
                            label={t('composerFiles')}
                            onPress={pickFiles}
                        />
                    </HStack>
                    {capabilityTarget !== 'unsupportedCli' ? (
                        <HStack style={styles.menuRow}>
                            <MenuItem
                                icon={<Zap size={theme.space(5)} color={theme.colors.typography} />}
                                label={t('composerSkills')}
                                onPress={openSkills}
                            />
                            {capabilityTarget === 'native' ? (
                                <MenuItem
                                    icon={
                                        <McpIcon
                                            size={theme.space(5)}
                                            color={theme.colors.typography}
                                        />
                                    }
                                    label={t('composerMcp')}
                                    onPress={openMcp}
                                />
                            ) : null}
                        </HStack>
                    ) : null}
                </VStack>
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
};

const MenuItem = ({
    icon,
    label,
    onPress,
}: {
    icon: ReactNode;
    label: string;
    onPress: () => void;
}) => {
    return (
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.menuItem}>
            {({ pressed }) => (
                <VStack style={[styles.menuContent, pressed ? styles.menuContentPressed : null]}>
                    <Box style={styles.menuIcon}>{icon}</Box>
                    <Text numberOfLines={2} style={styles.menuLabel}>
                        {label}
                    </Text>
                </VStack>
            )}
        </Pressable>
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
    sheetContent: {
        paddingHorizontal: theme.space(5),
        paddingTop: theme.space(10),
        paddingBottom: rt.insets.bottom + theme.space(5),
    },
    menuGrid: {
        gap: theme.space(4),
    },
    menuRow: {
        gap: theme.space(4),
    },
    menuItem: {
        flex: 1,
    },
    menuContent: {
        minHeight: theme.space(10),
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(2),
        paddingHorizontal: theme.space(4),
        paddingVertical: theme.space(4),
        borderRadius: theme.radius['3xl'],
        backgroundColor: theme.colors.muted,
    },
    menuContentPressed: {
        opacity: 0.72,
    },
    menuIcon: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: {
        color: theme.colors.typography,
        textAlign: 'center',
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
}));

export default ComposerAttachmentMenuSheet;
