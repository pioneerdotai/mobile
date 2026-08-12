import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useInfiniteQuery, useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { Ban, KeyRound, Pencil, RotateCcw, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type {
    ClientDeviceActivationPresentationResult,
    MemberSummary,
    WorkspaceMemberListResponse,
} from '@/client';
import { Button } from '@/components/buttons/base';
import { CredentialPresentation } from '@/components/credential-presentation';
import Spinner from '@/components/feedback/spinner';
import { WorkspaceToggleSelector } from '@/components/forms/workspace-toggle-selector';
import { MemberAvatar } from '@/components/member-avatar';
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
    addWorkspaceMember,
    cancelRecoveryDevice,
    createRecoveryDevicePresentation,
    loadAllWorkspaceMembers,
    loadMemberPage,
    presentMember,
    removeMember,
    removeWorkspaceMember,
    restoreMember,
    suspendMember,
} from '@/services/administration/members';
import {
    administrationConflictRefetch,
    administrationMutationKey,
    administrationQueryKeys,
    invalidateAdministrationTargets,
} from '@/services/administration/query';
import { useGatewayStore } from '@/stores/gateway';
import { useWorkspaceStore } from '@/stores/workspace';

type MemberAction =
    | {
          kind: 'workspaces';
          member: MemberSummary;
          initial: string[];
          selected: string[];
      }
    | { kind: 'suspend'; member: MemberSummary }
    | { kind: 'restore'; member: MemberSummary }
    | { kind: 'remove'; member: MemberSummary }
    | { kind: 'recovery'; member: MemberSummary };

type WorkspaceEditor = {
    member: MemberSummary;
    initial: ReadonlySet<string>;
};

const EMPTY_MEMBERS: MemberSummary[] = [];

const MembersSettingsScreen = () => {
    const { t } = useTranslation(['settings', 'common', 'gateway']);
    const { theme, rt } = useUnistyles();
    const queryClient = useQueryClient();
    const capabilities = useAdministrationCapabilities();
    const principal = useAdministrationPrincipal();
    const workspaces = useWorkspaceStore((state) => state.workspaces);
    const registry = useGatewayStore((state) => state.registry);
    const activeEndpoint = useMemo(
        () =>
            (registry.remotes ?? []).find(
                (candidate) => candidate.id === registry.active_gateway_id,
            ) ?? null,
        [registry],
    );
    const [selectedMember, setSelectedMember] = useState<MemberSummary | null>(null);
    const [workspaceEditor, setWorkspaceEditor] = useState<WorkspaceEditor | null>(null);
    const [workspaceSelection, setWorkspaceSelection] = useState<ReadonlySet<string>>(
        () => new Set(),
    );
    const [manualRefreshing, setManualRefreshing] = useState(false);
    const workspaceSheetRef = useRef<BottomSheetModal>(null);
    const recoverySheetRef = useRef<BottomSheetModal>(null);
    const recoveryRef = useRef<ClientDeviceActivationPresentationResult | null>(null);
    const [recovery, setRecovery] = useState<ClientDeviceActivationPresentationResult | null>(null);

    const replaceRecovery = useCallback((next: ClientDeviceActivationPresentationResult | null) => {
        recoveryRef.current = next;
        setRecovery(next);
    }, []);
    const clearRecovery = useCallback(() => {
        const current = recoveryRef.current;
        replaceRecovery(null);
        if (current) void cancelRecoveryDevice(current.session_id).catch(() => {});
    }, [replaceRecovery]);

    const membersQuery = useInfiniteQuery({
        queryKey: administrationQueryKeys.members(),
        queryFn: ({ pageParam }) => loadMemberPage(pageParam),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
        enabled: capabilities.data?.can_view_member_directory === true,
        refetchOnMount: 'always',
        refetchOnReconnect: true,
    });
    const members = useMemo(() => {
        const seen = new Set<string>();
        return (membersQuery.data?.pages ?? []).flatMap((page) =>
            page.members.filter((member) => {
                if (seen.has(member.principal_id)) return false;
                seen.add(member.principal_id);
                return true;
            }),
        );
    }, [membersQuery.data?.pages]);
    const {
        membershipByPrincipal,
        membershipsLoading,
        membershipsUnavailable,
        refetchWorkspaceMembers,
    } = useQueries({
        queries: workspaces.map((workspace) => ({
            queryKey: administrationQueryKeys.workspaceMembers(workspace.id),
            queryFn: () => loadAllWorkspaceMembers(workspace.id),
            enabled: capabilities.data?.can_view_member_directory === true,
        })),
        combine: (results) => {
            const membershipByPrincipal = new Map<string, Set<string>>();
            workspaces.forEach((workspace, index) => {
                for (const member of results[index]?.data?.members ?? EMPTY_MEMBERS) {
                    const memberships =
                        membershipByPrincipal.get(member.principal_id) ?? new Set<string>();
                    memberships.add(workspace.id);
                    membershipByPrincipal.set(member.principal_id, memberships);
                }
            });
            return {
                membershipByPrincipal,
                membershipsLoading: results.some((query) => query.isPending),
                membershipsUnavailable: results.some((query) => query.isError),
                refetchWorkspaceMembers: () => Promise.all(results.map((query) => query.refetch())),
            };
        },
    });

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state !== 'active') {
                recoverySheetRef.current?.dismiss();
                clearRecovery();
            }
        });
        return () => subscription.remove();
    }, [clearRecovery]);

    useEffect(
        () =>
            useGatewayStore.subscribe((state, previous) => {
                if (
                    state.sessionTerminalReason !== null &&
                    state.sessionTerminalReason !== previous.sessionTerminalReason
                ) {
                    workspaceSheetRef.current?.dismiss();
                    recoverySheetRef.current?.dismiss();
                    clearRecovery();
                }
            }),
        [clearRecovery],
    );

    useEffect(
        () => () => {
            const current = recoveryRef.current;
            recoveryRef.current = null;
            if (current) void cancelRecoveryDevice(current.session_id).catch(() => {});
        },
        [],
    );

    const action = useMutation({
        mutationKey: administrationMutationKey,
        mutationFn: async (input: MemberAction) => {
            switch (input.kind) {
                case 'workspaces': {
                    const initial = new Set(input.initial);
                    const selected = new Set(input.selected);
                    for (const workspaceId of input.selected) {
                        if (!initial.has(workspaceId)) {
                            await addWorkspaceMember(workspaceId, input.member.principal_id);
                        }
                    }
                    for (const workspaceId of input.initial) {
                        if (!selected.has(workspaceId)) {
                            await removeWorkspaceMember(workspaceId, input.member.principal_id);
                        }
                    }
                    return null;
                }
                case 'suspend':
                    await suspendMember(input.member);
                    return null;
                case 'restore':
                    await restoreMember(input.member);
                    return null;
                case 'remove':
                    await removeMember(input.member);
                    return null;
                case 'recovery':
                    if (!activeEndpoint) throw new Error('gateway_unavailable');
                    return createRecoveryDevicePresentation(
                        activeEndpoint,
                        input.member.principal_id,
                    );
            }
        },
        onSuccess: async (presentation, input) => {
            if (input.kind === 'recovery' && presentation) {
                replaceRecovery(presentation);
                recoverySheetRef.current?.present();
            }
            if (input.kind === 'workspaces') {
                const selected = new Set(input.selected);
                for (const workspaceId of new Set([...input.initial, ...input.selected])) {
                    queryClient.setQueryData<WorkspaceMemberListResponse>(
                        administrationQueryKeys.workspaceMembers(workspaceId),
                        (current) => {
                            if (!current) return current;
                            const otherMembers = current.members.filter(
                                (member) => member.principal_id !== input.member.principal_id,
                            );
                            return {
                                ...current,
                                members: selected.has(workspaceId)
                                    ? [...otherMembers, input.member]
                                    : otherMembers,
                            };
                        },
                    );
                }
                workspaceSheetRef.current?.dismiss();
            }
            await queryClient.invalidateQueries({ queryKey: administrationQueryKeys.members() });
            if (input.kind === 'workspaces') {
                await Promise.all(
                    [...new Set([...input.initial, ...input.selected])].map((workspaceId) =>
                        queryClient.invalidateQueries({
                            queryKey: administrationQueryKeys.workspaceMembers(workspaceId),
                        }),
                    ),
                );
            } else {
                await queryClient.invalidateQueries({
                    queryKey: administrationQueryKeys.all,
                    predicate: (query) => query.queryKey[1] === 'workspace-members',
                });
            }
        },
        onError: async (_error, input) => {
            if (input.kind === 'workspaces') {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: administrationQueryKeys.members() }),
                    queryClient.invalidateQueries({
                        queryKey: administrationQueryKeys.all,
                        predicate: (query) => query.queryKey[1] === 'workspace-members',
                    }),
                ]);
                return;
            }
            const action =
                input.kind === 'suspend'
                    ? ({
                          kind: 'suspend_member',
                          principal_id: input.member.principal_id,
                      } as const)
                    : input.kind === 'restore'
                      ? ({
                            kind: 'restore_member',
                            principal_id: input.member.principal_id,
                        } as const)
                      : input.kind === 'remove'
                        ? ({
                              kind: 'remove_member',
                              principal_id: input.member.principal_id,
                          } as const)
                        : ({
                              kind: 'create_recovery_device',
                              principal_id: input.member.principal_id,
                          } as const);
            const targets = administrationConflictRefetch(action);
            await invalidateAdministrationTargets(queryClient, targets);
            Alert.alert(t('members.actionUnavailable'));
        },
    });
    const {
        isError: actionError,
        isPending: actionPending,
        mutate: mutateAction,
        variables: actionVariables,
    } = action;
    const refetchMemberDirectory = membersQuery.refetch;

    const refreshMembers = useCallback(async () => {
        if (manualRefreshing) return;
        setManualRefreshing(true);
        try {
            await Promise.all([refetchMemberDirectory(), refetchWorkspaceMembers()]);
        } finally {
            setManualRefreshing(false);
        }
    }, [manualRefreshing, refetchMemberDirectory, refetchWorkspaceMembers]);

    const memberActions = useCallback(
        (member: MemberSummary) => {
            if (!principal.data || !capabilities.capabilitySnapshot) return null;
            const lifecycle = presentMember(
                principal.data,
                capabilities.capabilitySnapshot,
                member,
                false,
            ).actions;
            const memberships = membershipByPrincipal.get(member.principal_id) ?? new Set<string>();
            const canEditWorkspaces =
                !membershipsLoading &&
                !membershipsUnavailable &&
                workspaces.some((workspace) => {
                    const isMember = memberships.has(workspace.id);
                    const actions = presentMember(
                        principal.data!,
                        capabilities.capabilitySnapshot!,
                        member,
                        isMember,
                    ).actions;
                    return isMember
                        ? actions.can_remove_from_workspace
                        : actions.can_add_to_workspace;
                });
            return { lifecycle, canEditWorkspaces };
        },
        [
            membershipByPrincipal,
            membershipsLoading,
            membershipsUnavailable,
            capabilities.capabilitySnapshot,
            principal.data,
            workspaces,
        ],
    );

    const openMemberActions = useCallback(
        (member: MemberSummary) => {
            const actions = memberActions(member);
            if (
                !actions ||
                (!actions.canEditWorkspaces &&
                    !actions.lifecycle.can_suspend &&
                    !actions.lifecycle.can_restore &&
                    !actions.lifecycle.can_create_recovery_device &&
                    !actions.lifecycle.can_remove)
            ) {
                return;
            }
            setSelectedMember(member);
        },
        [memberActions],
    );

    const renderMember = useCallback(
        (item: MemberSummary, index: number) => {
            const workspaceNames = workspaces
                .filter((workspace) =>
                    membershipByPrincipal.get(item.principal_id)?.has(workspace.id),
                )
                .map((workspace) => workspace.name);
            return (
                <VStack key={item.principal_id}>
                    {index > 0 ? <Box style={styles.divider} /> : null}
                    <Pressable
                        accessibilityLabel={`${item.display_name}, @${item.nickname}`}
                        delayLongPress={350}
                        onLongPress={() => openMemberActions(item)}
                    >
                        <VStack style={styles.memberContainer}>
                            <HStack
                                style={[styles.member, index > 0 ? styles.rowWithDivider : null]}
                            >
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
                                    <Text numberOfLines={1} style={styles.memberMeta}>
                                        @{item.nickname}
                                    </Text>
                                </VStack>
                            </HStack>
                            <HStack style={styles.memberMetaContainer}>
                                <Text numberOfLines={1} style={styles.memberMeta}>
                                    {t(`members.kind.${item.kind}`)}
                                </Text>
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.memberMeta,
                                        item.status === 'active'
                                            ? styles.memberStatusActive
                                            : item.status === 'suspended'
                                              ? styles.memberStatusSuspended
                                              : styles.memberStatusRemoved,
                                    ]}
                                >
                                    {t(`members.status.${item.status}`)}
                                </Text>
                            </HStack>
                            {workspaceNames.length > 0 ? (
                                <HStack style={styles.badges}>
                                    {workspaceNames.map((name) => (
                                        <Box key={name} style={styles.badge}>
                                            <Text numberOfLines={1} style={styles.badgeText}>
                                                {name}
                                            </Text>
                                        </Box>
                                    ))}
                                </HStack>
                            ) : null}
                        </VStack>
                    </Pressable>
                </VStack>
            );
        },
        [membershipByPrincipal, openMemberActions, t, theme, workspaces],
    );

    const openWorkspaceEditor = useCallback(() => {
        if (!selectedMember || actionPending) return;
        const initial = new Set(membershipByPrincipal.get(selectedMember.principal_id) ?? []);
        setWorkspaceEditor({ member: selectedMember, initial });
        setWorkspaceSelection(new Set(initial));
        setSelectedMember(null);
        requestAnimationFrame(() => workspaceSheetRef.current?.present());
    }, [actionPending, membershipByPrincipal, selectedMember]);

    const toggleWorkspace = useCallback((workspaceId: string) => {
        setWorkspaceSelection((current) => {
            const next = new Set(current);
            if (!next.delete(workspaceId)) next.add(workspaceId);
            return next;
        });
    }, []);

    const workspaceSelectionChanged =
        workspaceEditor !== null &&
        (workspaceSelection.size !== workspaceEditor.initial.size ||
            [...workspaceSelection].some(
                (workspaceId) => !workspaceEditor.initial.has(workspaceId),
            ));
    const disabledWorkspaceIds = useMemo(() => {
        const capabilitySnapshot = capabilities.capabilitySnapshot;
        if (!workspaceEditor || !principal.data || !capabilitySnapshot) return new Set<string>();
        return new Set(
            workspaces
                .filter((workspace) => {
                    const initiallySelected = workspaceEditor.initial.has(workspace.id);
                    const actions = presentMember(
                        principal.data,
                        capabilitySnapshot,
                        workspaceEditor.member,
                        initiallySelected,
                    ).actions;
                    return initiallySelected
                        ? !actions.can_remove_from_workspace
                        : !actions.can_add_to_workspace;
                })
                .map((workspace) => workspace.id),
        );
    }, [capabilities.capabilitySnapshot, principal.data, workspaceEditor, workspaces]);
    const saveWorkspaces = useCallback(() => {
        if (!workspaceEditor || !workspaceSelectionChanged || actionPending) return;
        mutateAction({
            kind: 'workspaces',
            member: workspaceEditor.member,
            initial: [...workspaceEditor.initial],
            selected: [...workspaceSelection],
        });
    }, [
        actionPending,
        mutateAction,
        workspaceEditor,
        workspaceSelection,
        workspaceSelectionChanged,
    ]);

    const confirmMemberAction = useCallback(
        (input: Exclude<MemberAction, { kind: 'workspaces' }>, destructive = false) => {
            setSelectedMember(null);
            const member = input.member;
            const title =
                input.kind === 'suspend'
                    ? t('members.suspendTitle')
                    : input.kind === 'restore'
                      ? t('members.restoreTitle')
                      : t('members.removeTitle');
            const description =
                input.kind === 'suspend'
                    ? t('members.suspendDescription', { member: member.display_name })
                    : input.kind === 'restore'
                      ? t('members.restoreDescription', { member: member.display_name })
                      : t('members.removeDescription', {
                            member: member.display_name,
                            principalId: member.principal_id,
                        });
            Alert.alert(title, description, [
                { text: t('cancel', { ns: 'common' }), style: 'cancel' },
                {
                    text: t('members.confirm'),
                    style: destructive ? 'destructive' : 'default',
                    onPress: () => mutateAction(input),
                },
            ]);
        },
        [mutateAction, t],
    );

    const createRecovery = useCallback(() => {
        if (!selectedMember || actionPending || !activeEndpoint) return;
        const member = selectedMember;
        setSelectedMember(null);
        mutateAction({ kind: 'recovery', member });
    }, [actionPending, activeEndpoint, mutateAction, selectedMember]);

    const selectedActions = selectedMember ? memberActions(selectedMember) : null;
    const hasSelectedActions =
        selectedActions?.canEditWorkspaces === true ||
        selectedActions?.lifecycle.can_suspend === true ||
        selectedActions?.lifecycle.can_restore === true ||
        selectedActions?.lifecycle.can_create_recovery_device === true ||
        selectedActions?.lifecycle.can_remove === true;

    if (!capabilities.isPending && !principal.isPending) {
        if (!capabilities.data?.can_view_member_directory || !principal.data) {
            return <ScreenFeedback label={t('members.forbidden')} />;
        }
    }

    const initialLoading = capabilities.isPending || principal.isPending || membersQuery.isPending;
    const rows = membersQuery.isError ? EMPTY_MEMBERS : members;

    return (
        <Box style={styles.container}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={manualRefreshing}
                        tintColor={theme.colors.typography}
                        onRefresh={() => void refreshMembers()}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {rows.length > 0 ? (
                    <VStack testID="members-list" style={styles.listCard}>
                        {rows.map(renderMember)}
                    </VStack>
                ) : (
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
                )}
                {membersQuery.hasNextPage ? (
                    <Box style={styles.footer}>
                        <Button
                            type="link"
                            title={t('members.loadMore')}
                            loading={membersQuery.isFetchingNextPage}
                            onPress={() => void membersQuery.fetchNextPage()}
                        />
                    </Box>
                ) : null}
            </ScrollView>

            <ActionsSheet
                open={selectedMember !== null && hasSelectedActions}
                onClose={() => setSelectedMember(null)}
            >
                <VStack>
                    {selectedMember && selectedActions?.canEditWorkspaces ? (
                        <MenuItem
                            Icon={Pencil}
                            title={t('members.editWorkspaces')}
                            disabled={actionPending}
                            last={
                                !selectedActions.lifecycle.can_suspend &&
                                !selectedActions.lifecycle.can_restore &&
                                !selectedActions.lifecycle.can_create_recovery_device &&
                                !selectedActions.lifecycle.can_remove
                            }
                            onPress={openWorkspaceEditor}
                        />
                    ) : null}
                    {selectedMember && selectedActions?.lifecycle.can_suspend ? (
                        <MenuItem
                            Icon={Ban}
                            title={t('members.suspend')}
                            disabled={actionPending}
                            last={
                                !selectedActions.lifecycle.can_restore &&
                                !selectedActions.lifecycle.can_create_recovery_device &&
                                !selectedActions.lifecycle.can_remove
                            }
                            onPress={() =>
                                confirmMemberAction({ kind: 'suspend', member: selectedMember })
                            }
                        />
                    ) : null}
                    {selectedMember && selectedActions?.lifecycle.can_restore ? (
                        <MenuItem
                            Icon={RotateCcw}
                            title={t('members.restore')}
                            disabled={actionPending}
                            last={
                                !selectedActions.lifecycle.can_create_recovery_device &&
                                !selectedActions.lifecycle.can_remove
                            }
                            onPress={() =>
                                confirmMemberAction({ kind: 'restore', member: selectedMember })
                            }
                        />
                    ) : null}
                    {selectedMember && selectedActions?.lifecycle.can_create_recovery_device ? (
                        <MenuItem
                            Icon={KeyRound}
                            title={t('members.recovery')}
                            disabled={actionPending || !activeEndpoint}
                            last={!selectedActions.lifecycle.can_remove}
                            onPress={createRecovery}
                        />
                    ) : null}
                    {selectedMember && selectedActions?.lifecycle.can_remove ? (
                        <MenuItem
                            Icon={Trash2}
                            title={t('members.remove')}
                            variant="destructive"
                            disabled={actionPending}
                            last
                            onPress={() =>
                                confirmMemberAction(
                                    { kind: 'remove', member: selectedMember },
                                    true,
                                )
                            }
                        />
                    ) : null}
                </VStack>
            </ActionsSheet>

            <BottomSheetModal
                ref={workspaceSheetRef}
                backdropComponent={(props) => <Backdrop {...props} pressBehavior="close" />}
                handleComponent={(props) => (
                    <Handle
                        {...props}
                        title={t('members.memberships')}
                        closeButton
                        closeButtonType="ghost"
                        handleClose={() => workspaceSheetRef.current?.dismiss()}
                    />
                )}
                onDismiss={() => {
                    setWorkspaceEditor(null);
                    setWorkspaceSelection(new Set());
                }}
                stackBehavior="push"
                topInset={rt.insets.top + theme.space(5)}
                backgroundStyle={styles.sheetBackground}
                handleStyle={styles.sheetHandle}
                handleIndicatorStyle={styles.sheetHandleIndicator}
            >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
                    {workspaceEditor && principal.data ? (
                        <VStack style={styles.workspaceEditor}>
                            <WorkspaceToggleSelector
                                workspaces={workspaces}
                                selectedWorkspaceIds={workspaceSelection}
                                disabled={actionPending}
                                disabledWorkspaceIds={disabledWorkspaceIds}
                                onToggle={toggleWorkspace}
                            />
                            {actionError && actionVariables?.kind === 'workspaces' ? (
                                <Text accessibilityRole="alert" style={styles.error}>
                                    {t('members.actionUnavailable')}
                                </Text>
                            ) : null}
                            <Button
                                title={t('save', { ns: 'common' })}
                                disabled={!workspaceSelectionChanged || actionPending}
                                loading={actionPending && actionVariables?.kind === 'workspaces'}
                                onPress={saveWorkspaces}
                            />
                        </VStack>
                    ) : null}
                </BottomSheetScrollView>
            </BottomSheetModal>

            <BottomSheetModal
                ref={recoverySheetRef}
                backdropComponent={(props) => <Backdrop {...props} pressBehavior="none" />}
                handleComponent={(props) => (
                    <Handle
                        {...props}
                        title={t('members.recoveryTitle')}
                        closeButton
                        closeButtonType="ghost"
                        handleClose={() => recoverySheetRef.current?.dismiss()}
                    />
                )}
                onDismiss={clearRecovery}
                enableDismissOnClose
                topInset={rt.insets.top + theme.space(5)}
                backgroundStyle={styles.sheetBackground}
                handleStyle={styles.sheetHandle}
                handleIndicatorStyle={styles.sheetHandleIndicator}
            >
                <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
                    {recovery ? (
                        <VStack style={styles.recoveryContent}>
                            <CredentialPresentation
                                qrModules={recovery.qr_modules}
                                qrWidth={recovery.qr_width}
                                qrAccessibilityLabel={t('members.recoveryQrLabel')}
                                description={t('members.recoveryDescription')}
                                code={{
                                    value: recovery.manual_code,
                                    label: t('devices.codeLabel', { ns: 'gateway' }),
                                    copyAccessibilityLabel: t('members.recoveryCode'),
                                    copiedAccessibilityLabel: t('members.copied'),
                                    kind: 'code',
                                }}
                                link={{
                                    value: recovery.deep_link,
                                    label: t('devices.linkLabel', { ns: 'gateway' }),
                                    copyAccessibilityLabel: t('members.recoveryLink'),
                                    copiedAccessibilityLabel: t('members.copied'),
                                    kind: 'link',
                                }}
                            />
                            <Button
                                title={t('members.done')}
                                onPress={() => recoverySheetRef.current?.dismiss()}
                            />
                        </VStack>
                    ) : null}
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
    memberContainer: {
        gap: theme.space(2.5),
    },
    member: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
    },
    rowWithDivider: {
        paddingTop: theme.space(3),
    },
    memberText: {
        flex: 1,
        minWidth: 0,
    },
    memberName: {
        color: theme.colors.typography,
        ...theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    memberMetaContainer: {
        gap: theme.space(2),
    },
    memberMeta: {
        color: theme.colors.typography,
        ...theme.fontSize.xs,
        opacity: 0.6,
    },
    memberStatusActive: {
        color: theme.colors.lime[400],
        opacity: 1,
    },
    memberStatusSuspended: {
        color: theme.colors.warningText,
        opacity: 1,
    },
    memberStatusRemoved: {
        color: theme.colors.dangerText,
        opacity: 1,
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
        paddingTop: theme.sheetHeaderHeight() + theme.space(3),
        paddingBottom: rt.insets.bottom + theme.space(5),
    },
    workspaceEditor: {
        gap: theme.space(1.5),
    },
    recoveryContent: {
        gap: theme.space(5),
    },
}));

export default MembersSettingsScreen;
