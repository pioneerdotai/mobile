import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useShallow } from 'zustand/react/shallow';

import type { TurnPermissionMode } from '@/client';
import { Backdrop } from '@/components/overlays/components/backdrop';
import { Handle } from '@/components/overlays/components/handle';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { stableOutlineWidth } from '@/helpers/styles';
import { useAuthorizationCapabilitySnapshot } from '@/hooks/use-administration-capabilities';
import { useActiveThreadStore } from '@/stores/active-thread';
import { reconcileComposerPermissionMode } from '@/services/threads/permission-modes';

const permissionModeIcon = (mode: TurnPermissionMode) => {
    switch (mode) {
        case 'supervised':
            return ShieldX;
        case 'auto_accept_edits':
            return ShieldAlert;
        case 'full_access':
            return ShieldCheck;
    }
};

const ThreadPermissionModeSwitcherSheet = () => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const { theme, rt } = useUnistyles();
    const capabilitySnapshot = useAuthorizationCapabilitySnapshot();
    const options = useMemo(
        () =>
            (capabilitySnapshot.data?.workspace?.capabilities.agent_permission_options ?? []).map(
                (option) => ({
                    mode: option.mode,
                    label: option.label,
                    description: option.description,
                }),
            ),
        [capabilitySnapshot.data?.workspace?.capabilities.agent_permission_options],
    );

    const { selectedMode, showPermissionModeSwitcher, setMode, setPermissionModeSwitcherOpen } =
        useActiveThreadStore(
            useShallow((state) => ({
                selectedMode: state.composerSelectedPermissionMode,
                showPermissionModeSwitcher: state.showComposerPermissionModeSwitcher,
                setMode: state.setComposerPermissionMode,
                setPermissionModeSwitcherOpen: state.setComposerPermissionModeSwitcherOpen,
            })),
        );

    useEffect(() => {
        const reconciledMode = reconcileComposerPermissionMode(selectedMode, options);
        if (reconciledMode && reconciledMode !== selectedMode) {
            setMode(reconciledMode);
        }
    }, [options, selectedMode, setMode]);

    useEffect(() => {
        if (bottomSheetRef.current) {
            if (showPermissionModeSwitcher) {
                bottomSheetRef.current.present();
            } else {
                bottomSheetRef.current.close();
            }
        }
    }, [showPermissionModeSwitcher]);

    const close = useCallback(() => {
        setPermissionModeSwitcherOpen(false);
    }, [setPermissionModeSwitcherOpen]);

    const handleSheetChanges = useCallback(
        (index: number) => {
            if (index === -1 && showPermissionModeSwitcher) {
                setPermissionModeSwitcherOpen(false);
            }
        },
        [setPermissionModeSwitcherOpen, showPermissionModeSwitcher],
    );

    const selectMode = useCallback(
        (mode: TurnPermissionMode) => {
            setMode(mode);
            setPermissionModeSwitcherOpen(false);
        },
        [setMode, setPermissionModeSwitcherOpen],
    );

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
                <VStack style={styles.permissionList}>
                    {options.map((option) => {
                        const active = selectedMode === option.mode;
                        const Icon = permissionModeIcon(option.mode);

                        return (
                            <Pressable
                                key={option.mode}
                                accessibilityRole="button"
                                accessibilityLabel={option.label}
                                disabled={active}
                                onPress={() => selectMode(option.mode)}
                            >
                                {({ pressed }) => (
                                    <HStack
                                        style={[
                                            styles.permissionContainer,
                                            pressed && !active
                                                ? styles.permissionContainerPressed
                                                : null,
                                        ]}
                                    >
                                        <Box
                                            style={[
                                                styles.permissionContainerBackground,
                                                active
                                                    ? styles.activePermissionContainerBackground
                                                    : null,
                                            ]}
                                        />
                                        <Icon
                                            size={theme.space(5)}
                                            color={theme.colors.typography}
                                        />
                                        <VStack style={styles.permissionTextContainer}>
                                            <Text style={styles.permissionName}>
                                                {option.label}
                                            </Text>
                                            <Text
                                                numberOfLines={2}
                                                style={styles.permissionDescription}
                                            >
                                                {option.description}
                                            </Text>
                                        </VStack>
                                    </HStack>
                                )}
                            </Pressable>
                        );
                    })}
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
    sheetContent: {
        paddingHorizontal: theme.space(5),
        paddingTop: theme.space(10),
        paddingBottom: rt.insets.bottom + theme.space(5),
    },
    permissionList: {
        gap: theme.space(1.5),
    },
    permissionContainer: {
        paddingLeft: theme.space(5),
        paddingRight: theme.space(3),
        paddingVertical: theme.space(4),
        borderWidth: stableOutlineWidth,
        borderColor: theme.colors.border,
        borderRadius: theme.radius['2xl'],
        alignItems: 'center',
        gap: theme.space(4),
        overflow: 'hidden',
    },
    permissionContainerPressed: {
        opacity: 0.74,
    },
    permissionContainerBackground: {
        position: 'absolute',
        inset: 0,
        opacity: 0.04,
    },
    activePermissionContainerBackground: {
        backgroundColor: theme.colors.foreground,
    },
    permissionIconContainer: {
        width: theme.space(8),
        height: theme.space(8),
        borderRadius: theme.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceMuted,
        flexShrink: 0,
    },
    permissionTextContainer: {
        flex: 1,
        minWidth: 0,
        gap: theme.space(1.5),
    },
    permissionName: {
        flexShrink: 1,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.fontSize,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    permissionDescription: {
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        color: theme.colors.typography,
        opacity: 0.6,
    },
    activeIconContainer: {
        width: theme.space(8),
        height: theme.space(8),
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
}));

export default ThreadPermissionModeSwitcherSheet;
