export const taskUserNotificationTargetsInbox = (
    notification: { workspaceId: string; recipientPrincipalId: string },
    workspaceId: string | null,
    principalId: string | null,
): boolean =>
    workspaceId !== null &&
    principalId !== null &&
    notification.workspaceId === workspaceId &&
    notification.recipientPrincipalId === principalId;
