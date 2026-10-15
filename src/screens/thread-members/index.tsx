import { useCallback, useEffect, useRef, useState } from 'react';
import { LegendList, type LegendListRenderItemProps } from '@legendapp/list/react-native';
import { dispatchThreadMember, useThreadMembers } from '@/client/thread-members';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trash } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { ComposerMentionCandidate, ThreadScopePresentation } from '@/client';
import { MemberAvatar } from '@/components/member-avatar';
import { ActionsSheet } from '@/components/overlays/actions';
import { MenuItem } from '@/components/overlays/actions/menu-item';
import { ComposerMentionSheet } from '@/components/overlays/composer-mentions';
import Spinner from '@/components/feedback/spinner';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { useActiveThreadSnapshotQuery } from '@/hooks/use-active-thread-snapshot-query';
import { useThreadTreeStore } from '@/stores/thread-tree';

type ThreadMembersScreenProps = {
    threadId: string;
    pickerOpen: boolean;
    onPickerClose: () => void;
    onCanAddMemberChange?: (canAdd: boolean) => void;
};

type ThreadParticipantRow = ThreadScopePresentation['participants'][number];

const EMPTY_MEMBERS: ThreadParticipantRow[] = [];
const EMPTY_CANDIDATES: ComposerMentionCandidate[] = [];
const memberKeyExtractor = (member: ThreadParticipantRow) => member.principal_id;
const MemberSeparator = () => <Box style={styles.separator} />;

const ThreadMembersScreen = ({
    threadId,
    pickerOpen,
    onPickerClose,
    onCanAddMemberChange,
}: ThreadMembersScreenProps) => {
    const { t } = useTranslation('threads');
    const { theme } = useUnistyles();
    const treeSnapshot = useThreadTreeStore((state) => state.snapshot);
    const cachedSnapshot = useActiveThreadSnapshotQuery(threadId).data;
    const thread = treeSnapshot?.threads_by_id[threadId] ?? cachedSnapshot?.thread ?? null;
    const publication = useThreadMembers(threadId, true, thread?.workspace_id ?? null);
    const presentation = publication?.presentation;
    const [selection, setSelection] = useState<{ threadId: string; principalId: string } | null>(
        null,
    );
    const selectedMember =
        selection?.threadId === threadId
            ? (presentation?.participants.find(
                  (member) => member.principal_id === selection.principalId,
              ) ?? null)
            : null;
    const [refreshGeneration, setRefreshGeneration] = useState<number | null>(null);
    const requestedAction = useRef<number | null>(null);
    const mutationPending =
        publication?.request.kind === 'loading' &&
        publication.request.action.kind !== 'list_participants';
    const manualRefreshing =
        publication?.generation === refreshGeneration && publication?.request.kind === 'loading';
    const initialLoading =
        !publication ||
        (publication.request.kind === 'loading' &&
            publication.request.action.kind === 'list_participants' &&
            (!presentation ||
                (presentation.participants.length === 0 &&
                    (publication.workspace_request.kind === 'loading' ||
                        publication.participants_request.kind === 'loading'))));
    const loadFailed = publication?.request.kind === 'failed';
    useEffect(() => {
        if (
            publication?.generation !== requestedAction.current ||
            publication?.request.kind !== 'failed'
        )
            return;
        requestedAction.current = null;
        Alert.alert(t('members.actionFailed'));
    }, [publication, t]);
    const refreshMembers = useCallback(() => {
        setRefreshGeneration(
            dispatchThreadMember({ kind: 'retry', thread_id: threadId }) ??
                publication?.generation ??
                null,
        );
    }, [threadId, publication?.generation]);
    const addMember = useCallback(
        (member: ComposerMentionCandidate) => {
            if (mutationPending || !presentation?.capabilities.can_manage_private_participants)
                return;
            requestedAction.current = dispatchThreadMember({
                kind: 'perform',
                thread_id: threadId,
                action: { kind: 'add_participant', principal_id: member.principal_id },
            });
        },
        [mutationPending, presentation?.capabilities.can_manage_private_participants, threadId],
    );
    const deleteSelectedMember = useCallback(() => {
        if (!selectedMember?.can_remove || mutationPending) return;
        requestedAction.current = dispatchThreadMember({
            kind: 'perform',
            thread_id: threadId,
            action: { kind: 'remove_participant', principal_id: selectedMember.principal_id },
        });
        setSelection(null);
    }, [mutationPending, selectedMember, threadId]);

    const renderMember = useCallback(
        ({ item }: LegendListRenderItemProps<ThreadParticipantRow>) => (
            <Pressable
                accessibilityLabel={`${item.display_name}, @${item.nickname}`}
                delayLongPress={350}
                onLongPress={
                    item.can_remove
                        ? () => setSelection({ threadId, principalId: item.principal_id })
                        : undefined
                }
            >
                {({ pressed }) => (
                    <HStack style={styles.member}>
                        <MemberAvatar
                            displayName={item.display_name}
                            principalId={item.principal_id}
                            avatarRevision={item.avatar_revision}
                            size={theme.space(10)}
                        />
                        <VStack style={styles.memberText}>
                            <Text numberOfLines={1} style={styles.memberName}>
                                {item.display_name}
                            </Text>
                            <Text numberOfLines={1} style={styles.memberNickname}>
                                @{item.nickname}
                            </Text>
                        </VStack>
                    </HStack>
                )}
            </Pressable>
        ),
        [theme, threadId],
    );

    const canAddMember = presentation?.capabilities.can_manage_private_participants ?? false;
    useEffect(() => {
        onCanAddMemberChange?.(canAddMember);
        return () => onCanAddMemberChange?.(false);
    }, [canAddMember, onCanAddMemberChange]);
    const members = presentation?.participants ?? EMPTY_MEMBERS;
    const candidates = presentation?.candidate_members ?? EMPTY_CANDIDATES;

    return (
        <Box style={styles.container}>
            <LegendList<ThreadParticipantRow>
                data={members}
                estimatedItemSize={theme.space(15)}
                keyExtractor={memberKeyExtractor}
                renderItem={renderMember}
                recycleItems
                ItemSeparatorComponent={MemberSeparator}
                contentContainerStyle={styles.content}
                refreshing={manualRefreshing}
                onRefresh={() => void refreshMembers()}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <VStack style={styles.state}>
                        {initialLoading ? (
                            <>
                                <Spinner color={theme.colors.typography} />
                                <Text style={styles.stateText}>{t('members.loading')}</Text>
                            </>
                        ) : (
                            <Text
                                accessibilityRole={loadFailed ? 'alert' : undefined}
                                style={loadFailed ? styles.error : styles.stateText}
                            >
                                {loadFailed ? t('members.loadFailed') : t('members.empty')}
                            </Text>
                        )}
                    </VStack>
                }
            />
            <ComposerMentionSheet
                open={pickerOpen}
                candidates={candidates}
                emptyLabel={t('members.noCandidates')}
                searchPlaceholder={t('composerMentionSearch')}
                searchDismissText={t('composerMentionSearchDismiss')}
                onClose={onPickerClose}
                onSelect={addMember}
            />
            <ActionsSheet open={selectedMember !== null} onClose={() => setSelection(null)}>
                <VStack>
                    <MenuItem
                        Icon={Trash}
                        title={t('members.delete')}
                        variant="destructive"
                        disabled={mutationPending}
                        last
                        onPress={deleteSelectedMember}
                    />
                </VStack>
            </ActionsSheet>
        </Box>
    );
};

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        paddingTop: theme.screenContentPadding('child').paddingTop,
        paddingHorizontal: theme.space(4),
        paddingBottom: rt.insets.bottom + theme.space(5),
    },
    member: {
        minHeight: theme.space(15),
        alignItems: 'center',
        gap: theme.space(3),
        paddingVertical: theme.space(2),
    },
    memberText: {
        flex: 1,
        minWidth: 0,
        gap: theme.space(0.5),
    },
    memberName: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    memberNickname: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        opacity: 0.6,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border,
        opacity: 0.6,
    },
    state: {
        minHeight: theme.space(40),
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(2),
    },
    stateText: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        textAlign: 'center',
        opacity: 0.65,
    },
    error: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        textAlign: 'center',
    },
}));

export default ThreadMembersScreen;
