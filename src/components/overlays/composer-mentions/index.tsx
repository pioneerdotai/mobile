import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { ComposerMentionCandidate } from '@/client';
import { MemberAvatar } from '@/components/member-avatar';
import { Backdrop } from '@/components/overlays/components/backdrop';
import { Handle } from '@/components/overlays/components/handle';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { stableOutlineWidth } from '@/helpers/styles';
import { filterComposerMentionCandidates } from './filter';
import { Search } from './search';

type ComposerMentionSheetProps = {
    open: boolean;
    candidates: ComposerMentionCandidate[];
    emptyLabel: string;
    searchPlaceholder: string;
    searchDismissText: string;
    onClose: () => void;
    onSelect: (candidate: ComposerMentionCandidate) => void;
};

const ComposerMentionSheet = ({
    open,
    candidates,
    emptyLabel,
    searchPlaceholder,
    searchDismissText,
    onClose,
    onSelect,
}: ComposerMentionSheetProps) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const [query, setQuery] = useState('');
    const { theme, rt } = useUnistyles();

    const filteredCandidates = useMemo(
        () => filterComposerMentionCandidates(candidates, query),
        [candidates, query],
    );

    useEffect(() => {
        if (!bottomSheetRef.current) {
            return;
        }

        if (open) {
            bottomSheetRef.current.present();
        } else {
            bottomSheetRef.current.close();
        }
    }, [open]);

    const close = useCallback(() => {
        setQuery('');
        onClose();
    }, [onClose]);

    const selectCandidate = useCallback(
        (candidate: ComposerMentionCandidate) => {
            onSelect(candidate);
            setQuery('');
            bottomSheetRef.current?.dismiss();
            onClose();
        },
        [onClose, onSelect],
    );

    const handleSheetChanges = useCallback(
        (index: number) => {
            if (index === -1) {
                setQuery('');
                if (open) {
                    onClose();
                }
            }
        },
        [onClose, open],
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
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
        >
            <BottomSheetFlatList
                data={filteredCandidates}
                keyExtractor={(candidate) => candidate.principal_id}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                windowSize={7}
                style={styles.sheetContainer}
                contentContainerStyle={styles.sheetContent}
                ListHeaderComponentStyle={styles.searchHeader}
                ListHeaderComponent={
                    <Search
                        value={query}
                        onChange={setQuery}
                        placeholder={searchPlaceholder}
                        dismissText={searchDismissText}
                    />
                }
                ListEmptyComponent={<Text style={styles.emptyLabel}>{emptyLabel}</Text>}
                ItemSeparatorComponent={() => <Box style={styles.separator} />}
                renderItem={({ item: candidate }) => (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${candidate.display_name}, @${candidate.nickname}`}
                        onPress={() => selectCandidate(candidate)}
                    >
                        {({ pressed }) => (
                            <HStack
                                style={[styles.candidate, pressed ? styles.candidatePressed : null]}
                            >
                                <MemberAvatar
                                    displayName={candidate.display_name}
                                    principalId={candidate.principal_id}
                                    avatarRevision={candidate.avatar_revision}
                                    size={theme.space(9)}
                                />
                                <HStack style={styles.candidateText}>
                                    <Text numberOfLines={1} style={styles.candidateName}>
                                        {candidate.display_name}
                                    </Text>
                                    <Text numberOfLines={1} style={styles.candidateNickname}>
                                        @{candidate.nickname}
                                    </Text>
                                </HStack>
                            </HStack>
                        )}
                    </Pressable>
                )}
            />
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
    searchHeader: {
        marginBottom: theme.space(2),
    },
    candidate: {
        minHeight: theme.space(13),
        paddingVertical: theme.space(2),
        alignItems: 'center',
        gap: theme.space(3),
        overflow: 'hidden',
    },
    candidatePressed: {
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: theme.radius.xl,
    },
    candidateText: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        gap: theme.space(1.5),
    },
    candidateName: {
        flexShrink: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    candidateNickname: {
        flexShrink: 1,
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        opacity: 0.6,
    },
    separator: {
        height: stableOutlineWidth,
        backgroundColor: theme.colors.border,
        opacity: 0.4,
    },
    emptyLabel: {
        paddingVertical: theme.space(8),
        color: theme.colors.typography,
        fontSize: theme.fontSize.default.fontSize,
        lineHeight: theme.fontSize.default.lineHeight,
        opacity: 0.6,
        textAlign: 'center',
    },
}));

export { ComposerMentionSheet };
