import type {
    ComposerPublication,
    ComposerPermissionModeOption,
} from '@/client/generated/composer_publication';

// Structural subset of the existing thread capability publication. Permission
// options are the same projection used by Client's reconciliation, not a new rule.
type Authorization = {
    thread_id: string;
    workspace_id: string;
    snapshot?: {
        workspace?: {
            workspace_id: string;
            execution_draft_policy: { fingerprint: string };
            capabilities: {
                agent_permission_options: Pick<
                    ComposerPermissionModeOption,
                    'mode' | 'label' | 'description'
                >[];
            };
        } | null;
    } | null;
};
export const threadOpeningPolicyApplied = (
    composer: ComposerPublication | null,
    authorization: Authorization | null,
    workspaceId: string | null,
    messageMode: boolean,
): boolean => {
    if (
        !composer ||
        !authorization ||
        composer.thread_id !== authorization.thread_id ||
        authorization.workspace_id !== workspaceId
    )
        return false;
    // Message uses its current can_write/can_create_thread authorization. Agent
    // execution policy and permission-mode reconciliation are not prerequisites.
    if (messageMode) return true;
    const workspace = authorization.snapshot?.workspace;
    const fingerprint = workspace?.execution_draft_policy.fingerprint;
    if (
        !workspace ||
        workspace.workspace_id !== workspaceId ||
        !fingerprint ||
        composer.authorization_fingerprint !== fingerprint ||
        composer.reconciliation?.draft.policy_fingerprint !== fingerprint
    )
        return false;
    const expected = workspace.capabilities.agent_permission_options;
    if (
        composer.permission_options.length !== expected.length ||
        !expected.every((option, index) => {
            const actual = composer.permission_options[index];
            return (
                actual.mode === option.mode &&
                actual.label === option.label &&
                actual.description === option.description
            );
        })
    )
        return false;
    const mode = composer.draft.domain.selected_permission_mode ?? 'full_access';
    return (
        composer.selected_permission_mode_allowed ===
        expected.some((option) => option.mode === mode)
    );
};

// model_display is optional presentation metadata and deliberately absent here.
export const threadOpeningSelectionPending = (
    composer: ComposerPublication | null,
    useDraftSelection: boolean,
    defaultSelectionLoading: boolean,
): boolean =>
    Boolean(
        useDraftSelection &&
        defaultSelectionLoading &&
        (!composer?.draft.domain.selected_provider || !composer?.draft.domain.selected_model),
    );
