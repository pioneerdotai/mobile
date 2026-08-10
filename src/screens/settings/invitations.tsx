import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import {
    pioneerClient,
    type ClientInvitationPresentationResult,
    type InvitationListResponse,
    type InvitationListRow,
} from '@/client';
import { Button } from '@/components/buttons/base';
import { CreateButton } from '@/components/buttons/create';
import { CredentialPresentation } from '@/components/credential-presentation';
import Spinner from '@/components/feedback/spinner';
import { WorkspaceToggleSelector } from '@/components/forms/workspace-toggle-selector';
import { ActionsSheet } from '@/components/overlays/actions';
import { MenuItem } from '@/components/overlays/actions/menu-item';
import { Backdrop } from '@/components/overlays/components/backdrop';
import { Handle } from '@/components/overlays/components/handle';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Pressable } from '@/components/primitives/pressable';
import { ScrollView } from '@/components/primitives/scrollview';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import {
    useAdministrationCapabilities,
    useAdministrationPrincipal,
} from '@/hooks/use-administration-capabilities';
import {
    createInvitationPresentation,
    loadInvitationPage,
    revokeInvitation,
} from '@/services/administration/invitations';
import {
    administrationConflictRefetch,
    administrationMutationKey,
    administrationQueryKeys,
    invalidateAdministrationTargets,
} from '@/services/administration/query';
import { useWorkspaceStore } from '@/stores/workspace';

type Invitation = InvitationListResponse['invitations'][number];
type PresentedInvitation = {
    invitation: Invitation;
    row: InvitationListRow;
};

const EMPTY_INVITATIONS: PresentedInvitation[] = [];

const InvitationsSettingsScreen = () => {
    const { t } = useTranslation(['settings', 'common', 'gateway']);
    const { theme, rt } = useUnistyles();
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const capabilities = useAdministrationCapabilities();
    const principal = useAdministrationPrincipal();
    const workspaces = useWorkspaceStore((state) => state.workspaces);
    const creationSheetRef = useRef<BottomSheetModal>(null);
    const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<ReadonlySet<string>>(
        () => new Set(),
    );
    const [presentation, setPresentation] = useState<ClientInvitationPresentationResult | null>(
        null,
    );
    const [selectedInvitation, setSelectedInvitation] = useState<PresentedInvitation | null>(null);
    const [manualRefreshing, setManualRefreshing] = useState(false);

    const invitationsQuery = useInfiniteQuery({
        queryKey: administrationQueryKeys.invitations(),
        queryFn: ({ pageParam }) => loadInvitationPage(pageParam),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
        enabled: capabilities.data?.can_view_invitations === true,
        refetchOnMount: 'always',
        refetchOnReconnect: true,
    });
    const invitations = useMemo(() => {
        const seen = new Set<string>();
        return (invitationsQuery.data?.pages ?? []).flatMap((page) =>
            page.invitations.filter((invitation) => {
                if (seen.has(invitation.invitation_id)) return false;
                seen.add(invitation.invitation_id);
                return true;
            }),
        );
    }, [invitationsQuery.data?.pages]);
    const rows = useMemo(() => {
        if (!principal.data) return EMPTY_INVITATIONS;
        return invitations.map((invitation) => ({
            invitation,
            row: pioneerClient.invitationListRow({
                auth: principal.data,
                invitation,
            }),
        }));
    }, [invitations, principal.data]);

    const createMutation = useMutation({
        mutationKey: administrationMutationKey,
        mutationFn: (workspaceIds: string[]) => createInvitationPresentation(workspaceIds),
        onSuccess: (result) => {
            setPresentation(result);
            setSelectedWorkspaceIds(new Set());
            void queryClient.invalidateQueries({
                queryKey: administrationQueryKeys.invitations(),
            });
        },
        onError: async () => {
            const targets = administrationConflictRefetch({ kind: 'create_invitation' });
            await invalidateAdministrationTargets(queryClient, targets);
        },
    });
    const revokeMutation = useMutation({
        mutationKey: administrationMutationKey,
        mutationFn: (invitationId: string) => revokeInvitation(invitationId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: administrationQueryKeys.invitations(),
            });
        },
        onError: async (_error, invitationId) => {
            const targets = administrationConflictRefetch({
                kind: 'revoke_invitation',
                invitation_id: invitationId,
            });
            await invalidateAdministrationTargets(queryClient, targets);
            Alert.alert(t('invitations.actionFailed'));
        },
    });
    const {
        isError: createError,
        isPending: createPending,
        mutate: mutateCreate,
        reset: resetCreate,
    } = createMutation;
    const { isPending: revokePending, mutate: mutateRevoke } = revokeMutation;
    const refetchInvitations = invitationsQuery.refetch;

    const openCreation = useCallback(() => {
        if (createPending) return;
        resetCreate();
        setPresentation(null);
        setSelectedWorkspaceIds(new Set());
        creationSheetRef.current?.present();
    }, [createPending, resetCreate]);

    useLayoutEffect(() => {
        const canCreate = capabilities.data?.can_create_invitation === true;
        navigation.setOptions({
            headerRight: canCreate
                ? () => (
                      <CreateButton
                          accessibilityLabel={t('invitations.create')}
                          onPressHandler={openCreation}
                      />
                  )
                : () => null,
        });
    }, [capabilities.data?.can_create_invitation, navigation, openCreation, t]);

    const refreshInvitations = useCallback(async () => {
        if (manualRefreshing) return;
        setManualRefreshing(true);
        try {
            await refetchInvitations();
        } finally {
            setManualRefreshing(false);
        }
    }, [manualRefreshing, refetchInvitations]);

    const toggleWorkspace = useCallback((workspaceId: string) => {
        setSelectedWorkspaceIds((current) => {
            const next = new Set(current);
            if (!next.delete(workspaceId)) next.add(workspaceId);
            return next;
        });
    }, []);
    const createInvitation = useCallback(() => {
        if (selectedWorkspaceIds.size === 0 || createPending) return;
        mutateCreate([...selectedWorkspaceIds]);
    }, [createPending, mutateCreate, selectedWorkspaceIds]);

    const confirmRevoke = useCallback(() => {
        if (!selectedInvitation || revokePending) return;
        const invitationId = selectedInvitation.row.invitation_id;
        setSelectedInvitation(null);
        Alert.alert(t('invitations.revokeTitle'), t('invitations.revokeDescription'), [
            { text: t('cancel', { ns: 'common' }), style: 'cancel' },
            {
                text: t('invitations.revoke'),
                style: 'destructive',
                onPress: () => mutateRevoke(invitationId),
            },
        ]);
    }, [mutateRevoke, revokePending, selectedInvitation, t]);

    const renderInvitation = useCallback(
        (item: PresentedInvitation, index: number) => (
            <VStack key={item.row.invitation_id}>
                {index > 0 ? <Box style={styles.divider} /> : null}
                <Pressable
                    accessibilityLabel={`${item.row.workspace_names.join(', ')}, ${t(`invitations.status.${item.row.status}`)}`}
                    delayLongPress={350}
                    onLongPress={
                        item.row.can_revoke ? () => setSelectedInvitation(item) : undefined
                    }
                >
                    <VStack
                        style={[styles.invitationRow, index > 0 ? styles.rowWithDivider : null]}
                    >
                        <HStack style={styles.badges}>
                            {item.row.workspace_names.map((name) => (
                                <Box key={name} style={styles.badge}>
                                    <Text numberOfLines={1} style={styles.badgeText}>
                                        {name}
                                    </Text>
                                </Box>
                            ))}
                        </HStack>
                        <Text
                            style={[
                                styles.invitationMeta,
                                item.row.status === 'accepted'
                                    ? styles.statusAccepted
                                    : item.row.status === 'pending'
                                      ? styles.statusPending
                                      : item.row.status === 'revoked' ||
                                          item.row.status === 'expired'
                                        ? styles.statusTerminal
                                        : null,
                            ]}
                        >
                            {t(`invitations.status.${item.row.status}`)}
                        </Text>
                        <Text style={styles.invitationMeta}>
                            {new Date(item.row.created_at_unix * 1000).toLocaleString()} —{' '}
                            {new Date(item.row.expires_at_unix * 1000).toLocaleString()}
                        </Text>
                    </VStack>
                </Pressable>
            </VStack>
        ),
        [t],
    );

    const dismissCreation = useCallback(() => {
        setPresentation(null);
        setSelectedWorkspaceIds(new Set());
        resetCreate();
    }, [resetCreate]);

    if (!capabilities.isPending && !principal.isPending) {
        if (!capabilities.data?.can_view_invitations || !principal.data) {
            return <ScreenFeedback label={t('invitations.forbidden')} />;
        }
    }

    const initialLoading =
        capabilities.isPending || principal.isPending || invitationsQuery.isPending;
    const visibleRows = invitationsQuery.isError ? EMPTY_INVITATIONS : rows;

    return (
        <Box style={styles.container}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={manualRefreshing}
                        tintColor={theme.colors.typography}
                        onRefresh={() => void refreshInvitations()}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {visibleRows.length > 0 ? (
                    <VStack testID="invitations-list" style={styles.listCard}>
                        {visibleRows.map(renderInvitation)}
                    </VStack>
                ) : (
                    <VStack style={styles.state}>
                        {initialLoading ? (
                            <>
                                <Spinner color={theme.colors.typography} />
                                <Text style={styles.stateText}>{t('invitations.loading')}</Text>
                            </>
                        ) : (
                            <Text
                                accessibilityRole={invitationsQuery.isError ? 'alert' : undefined}
                                style={invitationsQuery.isError ? styles.error : styles.stateText}
                            >
                                {invitationsQuery.isError
                                    ? t('invitations.loadFailed')
                                    : t('invitations.empty')}
                            </Text>
                        )}
                    </VStack>
                )}
                {invitationsQuery.hasNextPage ? (
                    <Box style={styles.footer}>
                        <Button
                            type="link"
                            title={t('invitations.loadMore')}
                            loading={invitationsQuery.isFetchingNextPage}
                            onPress={() => void invitationsQuery.fetchNextPage()}
                        />
                    </Box>
                ) : null}
            </ScrollView>

            <ActionsSheet
                open={selectedInvitation !== null}
                onClose={() => setSelectedInvitation(null)}
            >
                <VStack>
                    <MenuItem
                        Icon={Trash2}
                        title={t('invitations.revoke')}
                        variant="destructive"
                        disabled={revokePending}
                        last
                        onPress={confirmRevoke}
                    />
                </VStack>
            </ActionsSheet>

            <BottomSheetModal
                ref={creationSheetRef}
                backdropComponent={(props) => (
                    <Backdrop {...props} pressBehavior={createPending ? 'none' : 'close'} />
                )}
                handleComponent={(props) => (
                    <Handle
                        {...props}
                        title={
                            presentation
                                ? t('invitations.presentationTitle')
                                : t('invitations.create')
                        }
                        closeButton={!createPending}
                        closeButtonType="ghost"
                        handleClose={() => creationSheetRef.current?.dismiss()}
                    />
                )}
                onDismiss={dismissCreation}
                enablePanDownToClose={!createPending}
                stackBehavior="push"
                topInset={rt.insets.top + theme.space(5)}
                backgroundStyle={styles.sheetBackground}
                handleStyle={styles.sheetHandle}
                handleIndicatorStyle={styles.sheetHandleIndicator}
            >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
                    {presentation ? (
                        <VStack style={styles.presentation}>
                            <CredentialPresentation
                                qrModules={presentation.qr_modules}
                                qrWidth={presentation.qr_width}
                                qrAccessibilityLabel={t('invitations.qrLabel')}
                                description={t('invitations.presentationDescription')}
                                link={{
                                    value: presentation.canonical_uri,
                                    label: t('devices.linkLabel', { ns: 'gateway' }),
                                    copyAccessibilityLabel: t('invitations.copyLink'),
                                    copiedAccessibilityLabel: t('invitations.copied'),
                                    kind: 'link',
                                }}
                            />
                            <Button
                                title={t('invitations.done')}
                                onPress={() => creationSheetRef.current?.dismiss()}
                            />
                        </VStack>
                    ) : (
                        <VStack style={styles.creation}>
                            <WorkspaceToggleSelector
                                label={t('invitations.workspaces')}
                                workspaces={workspaces}
                                selectedWorkspaceIds={selectedWorkspaceIds}
                                disabled={createPending}
                                onToggle={toggleWorkspace}
                            />
                            {createError ? (
                                <Text accessibilityRole="alert" style={styles.error}>
                                    {t('invitations.actionFailed')}
                                </Text>
                            ) : null}
                            <Button
                                title={t('invitations.create')}
                                disabled={selectedWorkspaceIds.size === 0 || createPending}
                                loading={createPending}
                                onPress={createInvitation}
                            />
                        </VStack>
                    )}
                </BottomSheetScrollView>
            </BottomSheetModal>
        </Box>
    );
};

const ScreenFeedback = ({ label }: { label: string }) => (
    <Box style={styles.container}>
        <VStack style={styles.state}>
            <Text style={styles.stateText}>{label}</Text>
        </VStack>
    </Box>
);

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        ...theme.screenContentPadding('child'),
        paddingHorizontal: rt.insets.left + theme.space(4),
        paddingRight: rt.insets.right + theme.space(4),
        gap: theme.space(5),
    },
    listCard: {
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(5),
        gap: theme.space(3),
    },
    invitationRow: {
        gap: theme.space(2),
    },
    rowWithDivider: {
        paddingTop: theme.space(3),
    },
    badges: {
        flexWrap: 'wrap',
        gap: theme.space(1),
    },
    badge: {
        minHeight: theme.space(7),
        maxWidth: '100%',
        justifyContent: 'center',
        paddingHorizontal: theme.space(2.5),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.full,
    },
    badgeText: {
        color: theme.colors.typography,
        ...theme.fontSize['2xs'],
        opacity: 0.8,
    },
    invitationMeta: {
        color: theme.colors.typography,
        ...theme.fontSize.xs,
        opacity: 0.6,
    },
    statusAccepted: {
        color: theme.colors.lime[400],
        opacity: 1,
    },
    statusPending: {
        color: theme.colors.warningText,
        opacity: 1,
    },
    statusTerminal: {
        color: theme.colors.dangerText,
        opacity: 1,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border,
    },
    state: {
        minHeight: theme.space(40),
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(2),
        paddingHorizontal: theme.space(4),
    },
    stateText: {
        color: theme.colors.typography,
        ...theme.fontSize.sm,
        textAlign: 'center',
        opacity: 0.65,
    },
    error: {
        color: theme.colors.dangerText,
        ...theme.fontSize.sm,
        textAlign: 'center',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: theme.space(4),
    },
    sheetBackground: {
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
    sheetContent: {
        paddingHorizontal: theme.space(5),
        paddingTop: theme.sheetHeaderHeight(),
        paddingBottom: rt.insets.bottom + theme.space(5),
    },
    creation: {
        gap: theme.space(1.5),
    },
    presentation: {
        gap: theme.space(5),
    },
}));

export default InvitationsSettingsScreen;
