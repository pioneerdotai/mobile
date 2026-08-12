import type { TaskWaitReviewDisplay } from '@/client/generated/task_wait_review_display';
import type { TaskWaitReviewDisplayItem } from '@/client/generated/task_wait_review_display_item';

type JsonRecord = Record<string, unknown>;

export const taskWaitReviewDisplay = (
    toolName: string,
    display: unknown,
): TaskWaitReviewDisplay | null => {
    if (toolName !== 'task_wait') return null;

    const displayRecord = record(display);
    if (displayRecord.kind !== 'summary') return null;

    const metadata = record(displayRecord.metadata);
    const sanitizedResult = toolMetadataValueToJson(metadata.sanitizedResult);
    const result = record(sanitizedResult);
    const reviewRequired = Array.isArray(result.reviewRequired) ? result.reviewRequired : [];
    const items = reviewRequired
        .map(taskWaitReviewDisplayItem)
        .filter((item): item is TaskWaitReviewDisplayItem => item !== null);
    if (items.length === 0) return null;

    return {
        review_required_count: integer(result.reviewRequiredCount) ?? items.length,
        mode: string(result.mode),
        items,
    };
};

export const taskReviewUserControlsAllowed = (item: TaskWaitReviewDisplayItem): boolean =>
    item.user_approval_required && item.review_mode === 'user_approval';

export const canManageTaskReviewItem = ({
    item,
    currentPrincipalId,
    canManageAllThreads,
    canRespondToAgentRequests,
}: {
    item: TaskWaitReviewDisplayItem;
    currentPrincipalId: string | null | undefined;
    canManageAllThreads: boolean;
    canRespondToAgentRequests: boolean;
}): boolean =>
    canManageAllThreads ||
    (canRespondToAgentRequests &&
        !!currentPrincipalId &&
        item.owner_principal_id === currentPrincipalId);

const taskWaitReviewDisplayItem = (value: unknown): TaskWaitReviewDisplayItem | null => {
    const item = record(value);
    const taskId = string(item.taskId);
    const candidateId = string(item.candidateId);
    if (!taskId || !candidateId) return null;

    return {
        task_id: taskId,
        owner_principal_id: string(item.ownerPrincipalId),
        run_id: string(item.runId),
        title: string(item.title),
        status: string(item.status),
        candidate_id: candidateId,
        candidate_status: string(item.candidateStatus),
        review_mode: string(item.reviewMode),
        permission_mode: string(item.permissionMode),
        permission_source: string(item.permissionSource),
        user_approval_required: boolean(item.userApprovalRequired) ?? false,
        round: integer(item.round),
        summary: string(item.summary),
        result_preview: string(item.resultPreview),
        extraction_error_preview: string(item.extractionErrorPreview),
        diagnostics: stringArray(item.diagnostics),
        max_revision_rounds: integer(item.maxRevisionRounds),
        remaining_revision_rounds: integer(item.remainingRevisionRounds),
        allowed_actions: stringArray(item.allowedActions),
        revision_blocked_reason: string(item.revisionBlockedReason),
    };
};

const toolMetadataValueToJson = (value: unknown): unknown => {
    const metadata = record(value);
    switch (metadata.kind) {
        case 'null':
            return null;
        case 'bool':
            return boolean(metadata.value);
        case 'number': {
            if (typeof metadata.value !== 'string') return null;
            const parsed = Number(metadata.value);
            return Number.isFinite(parsed) ? parsed : null;
        }
        case 'string':
            return string(metadata.value);
        case 'array':
            return Array.isArray(metadata.values)
                ? metadata.values.map(toolMetadataValueToJson)
                : [];
        case 'object':
            return Object.fromEntries(
                Object.entries(record(metadata.fields)).map(([key, field]) => [
                    key,
                    toolMetadataValueToJson(field),
                ]),
            );
        default:
            return null;
    }
};

const record = (value: unknown): JsonRecord =>
    value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};

const string = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const boolean = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);

const integer = (value: unknown): number | null =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

const stringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
