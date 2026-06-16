import { useCallback, useEffect, useRef } from 'react';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Infinity as InfinityIcon, MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useShallow } from 'zustand/react/shallow';

import type { ThreadMode } from '@/client';
import { Backdrop } from '@/components/overlays/components/backdrop';
import { Handle } from '@/components/overlays/components/handle';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { stableOutlineWidth } from '@/helpers/styles';
import { useActiveThreadStore } from '@/stores/active-thread';

const THREAD_MODE_OPTIONS: ThreadMode[] = ['Agent', 'Chat'];

const ThreadModeSwitcherSheet = () => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const { t } = useTranslation('threads');
    const { theme, rt } = useUnistyles();

    const { selectedMode, showModeSwitcher, setMode, setModeSwitcherOpen } = useActiveThreadStore(
        useShallow((state) => ({
            selectedMode: state.composerSelectedMode,
            showModeSwitcher: state.showComposerModeSwitcher,
            setMode: state.setComposerMode,
            setModeSwitcherOpen: state.setComposerModeSwitcherOpen,
        })),
    );

    useEffect(() => {
        if (bottomSheetRef.current) {
            if (showModeSwitcher) {
                bottomSheetRef.current.present();
            } else {
                bottomSheetRef.current.close();
            }
        }
    }, [showModeSwitcher]);

    const close = useCallback(() => {
        setModeSwitcherOpen(false);
    }, [setModeSwitcherOpen]);

    const handleSheetChanges = useCallback(
        (index: number) => {
            if (index === -1 && showModeSwitcher) {
                setModeSwitcherOpen(false);
            }
        },
        [setModeSwitcherOpen, showModeSwitcher],
    );

    const selectMode = useCallback(
        (mode: ThreadMode) => {
            setMode(mode);
            setModeSwitcherOpen(false);
        },
        [setMode, setModeSwitcherOpen],
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
                <VStack style={styles.modeList}>
                    {THREAD_MODE_OPTIONS.map((mode) => {
                        const active = selectedMode === mode;
                        const Icon = mode === 'Agent' ? InfinityIcon : MessageCircle;
                        const label = mode === 'Agent' ? t('modeAgentLabel') : t('modeChatLabel');
                        const description =
                            mode === 'Agent' ? t('modeAgentDescription') : t('modeChatDescription');

                        return (
                            <Pressable
                                key={mode}
                                accessibilityRole="button"
                                accessibilityLabel={label}
                                disabled={active}
                                onPress={() => selectMode(mode)}
                            >
                                {({ pressed }) => (
                                    <HStack
                                        style={[
                                            styles.modeContainer,
                                            pressed && !active ? styles.modeContainerPressed : null,
                                        ]}
                                    >
                                        <Box
                                            style={[
                                                styles.modeContainerBackground,
                                                active
                                                    ? styles.activeModeContainerBackground
                                                    : null,
                                            ]}
                                        />
                                        <Icon
                                            size={theme.space(5)}
                                            color={theme.colors.typography}
                                        />
                                        <VStack style={styles.modeTextContainer}>
                                            <Text style={styles.modeName}>{label}</Text>
                                            <Text numberOfLines={2} style={styles.modeDescription}>
                                                {description}
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
    modeList: {
        gap: theme.space(1.5),
    },
    modeContainer: {
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
    modeContainerPressed: {
        opacity: 0.74,
    },
    modeContainerBackground: {
        position: 'absolute',
        inset: 0,
        opacity: 0.04,
    },
    activeModeContainerBackground: {
        backgroundColor: theme.colors.foreground,
    },
    modeIconContainer: {
        width: theme.space(8),
        height: theme.space(8),
        borderRadius: theme.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceMuted,
        flexShrink: 0,
    },
    modeTextContainer: {
        flex: 1,
        minWidth: 0,
        gap: theme.space(1.5),
    },
    modeName: {
        flexShrink: 1,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.fontSize,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    modeDescription: {
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

export default ThreadModeSwitcherSheet;
