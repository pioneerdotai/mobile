import { useCallback, useEffect, useMemo, useState } from 'react';
import { LegendList, type LegendListRenderItemProps } from '@legendapp/list/react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trash } from 'lucide-react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type {
    ClientActiveThreadSnapshot,
    ComposerMentionCandidate,
    ThreadScopePresentation,
} from '@/client';
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
import { useAdministrationPrincipal } from '@/hooks/use-administration-capabilities';
import {
    addThreadParticipant,
    loadThreadScopePresentation,
    removeThreadParticipant,
    threadScopeQueryKeys,
} from '@/services/threads/scope';
import { timelineQueryKeys } from '@/services/threads/timeline-query';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';

type ThreadMembersScreenProps = {
    threadId: string;
    pickerOpen: boolean;
    onPickerClose: () => void;
    onCanAddMemberChange?: (canAdd: boolean) => void;
};

type MemberMutation = {
    kind: 'add' | 'remove';
    principalId: string;
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
    const queryClient = useQueryClient();
    const auth = useAdministrationPrincipal();
    const treeSnapshot = useThreadTreeStore((state) => state.snapshot);
    const connectionId = useGatewayStore((state) => state.connectionId);
    const connected = useGatewayStore((state) => state.connectionState === 'Connected');
    const cachedSnapshot = queryClient.getQueryData<ClientActiveThreadSnapshot>(
        timelineQueryKeys.threadSnapshot(threadId),
    );
    const thread = treeSnapshot?.threads_by_id[threadId] ?? cachedSnapshot?.thread ?? null;
    const [selectedMember, setSelectedMember] = useState<ThreadParticipantRow | null>(null);
    const [manualRefreshing, setManualRefreshing] = useState(false);
    const queryKey = useMemo(
        () => [...threadScopeQueryKeys.detail(threadId), connectionId] as const,
        [connectionId, threadId],
    );
    // connectionId is the authorization epoch; the thread-scoped prefix is
    // intentionally stable so participant events can invalidate it exactly.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    const membersQuery = useQuery({
        queryKey,
        queryFn: async () => {
            if (!auth.data || !thread) throw new Error('thread_members_unavailable');
            return loadThreadScopePresentation(auth.data, thread);
        },
        enabled: connected && Boolean(auth.data && thread),
        refetchOnMount: 'always',
        refetchOnReconnect: true,
    });
    const mutation = useMutation({
        mutationFn: (input: MemberMutation) => {
            if (!thread) return Promise.reject(new Error('thread_members_unavailable'));
            return input.kind === 'add'
                ? addThreadParticipant(thread.workspace_id, thread.id, input.principalId)
                : removeThreadParticipant(thread.workspace_id, thread.id, input.principalId);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey });
        },
        onError: () => {
            Alert.alert(t('members.actionFailed'));
        },
    });
    const mutationPending = mutation.isPending;
    const mutateMember = mutation.mutate;
    const refetchMembers = membersQuery.refetch;

    const refreshMembers = useCallback(async () => {
        if (manualRefreshing) return;
        setManualRefreshing(true);
        try {
            await refetchMembers();
        } finally {
            setManualRefreshing(false);
        }
    }, [manualRefreshing, refetchMembers]);

    const addMember = useCallback(
        (member: ComposerMentionCandidate) => {
            if (mutationPending || !membersQuery.data?.capabilities.can_manage_private_participants)
                return;
            mutateMember({ kind: 'add', principalId: member.principal_id });
        },
        [
            membersQuery.data?.capabilities.can_manage_private_participants,
            mutateMember,
            mutationPending,
        ],
    );
    const deleteSelectedMember = useCallback(() => {
        if (!selectedMember?.can_remove || mutationPending) return;
        const principalId = selectedMember.principal_id;
        setSelectedMember(null);
        mutateMember({ kind: 'remove', principalId });
    }, [mutateMember, mutationPending, selectedMember]);

    const renderMember = useCallback(
        ({ item }: LegendListRenderItemProps<ThreadParticipantRow>) => (
            <Pressable
                accessibilityLabel={`${item.display_name}, @${item.nickname}`}
                delayLongPress={350}
                onLongPress={item.can_remove ? () => setSelectedMember(item) : undefined}
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
        [theme],
    );

    const presentation = membersQuery.data;
    const canAddMember = presentation?.capabilities.can_manage_private_participants ?? false;
    useEffect(() => {
        onCanAddMemberChange?.(canAddMember);
        return () => onCanAddMemberChange?.(false);
    }, [canAddMember, onCanAddMemberChange]);
    const members = presentation?.participants ?? EMPTY_MEMBERS;
    const candidates = presentation?.candidate_members ?? EMPTY_CANDIDATES;
    const initialLoading = auth.isPending || membersQuery.isPending;

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
                                accessibilityRole={membersQuery.isError ? 'alert' : undefined}
                                style={membersQuery.isError ? styles.error : styles.stateText}
                            >
                                {membersQuery.isError
                                    ? t('members.loadFailed')
                                    : t('members.empty')}
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
            <ActionsSheet open={selectedMember !== null} onClose={() => setSelectedMember(null)}>
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
