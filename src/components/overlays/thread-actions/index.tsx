import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, UserCheck } from 'lucide-react-native';

import type { ClientActiveThreadSnapshot, Thread } from '@/client';
import { ActionsSheet } from '@/components/overlays/actions';
import { MenuItem } from '@/components/overlays/actions/menu-item';
import { VStack } from '@/components/primitives/vstack';
import { nextThreadVisibility, updateThreadVisibility } from '@/services/threads/scope';
import { timelineQueryKeys } from '@/services/threads/timeline-query';
import { applyThreadUpdatedToTreeSnapshot } from '@/services/threads/tree';
import { useGatewayStore } from '@/stores/gateway';
import { useThreadTreeStore } from '@/stores/thread-tree';

type ThreadActionsSheetProps = {
    open: boolean;
    thread: Thread | null;
    onClose: () => void;
    onOpenMembers?: () => void;
};

type VisibilityMutation = {
    workspaceId: string;
    threadId: string;
    visibility: 'private' | 'workspace';
};

const ThreadActionsSheet = ({ open, thread, onClose, onOpenMembers }: ThreadActionsSheetProps) => {
    const { t } = useTranslation('threads');
    const queryClient = useQueryClient();
    const connectionState = useGatewayStore((state) => state.connectionState);
    const targetVisibility = nextThreadVisibility(thread?.visibility);
    const mutation = useMutation({
        mutationFn: ({ workspaceId, threadId: targetThreadId, visibility }: VisibilityMutation) =>
            updateThreadVisibility(workspaceId, targetThreadId, visibility),
        onSuccess: (response) => {
            queryClient.setQueryData<ClientActiveThreadSnapshot>(
                timelineQueryKeys.threadSnapshot(response.thread.id),
                (current) => (current ? { ...current, thread: response.thread } : current),
            );
            const tree = useThreadTreeStore.getState();
            if (tree.snapshot?.workspace_id === response.thread.workspace_id) {
                tree.setSnapshot(
                    applyThreadUpdatedToTreeSnapshot(tree.snapshot, response.thread, null),
                );
            }
        },
        onError: () => {
            Alert.alert(t('scope.actionFailed'));
        },
    });

    const actionDisabled =
        !thread ||
        !targetVisibility ||
        thread.status === 'Closed' ||
        connectionState !== 'Connected' ||
        mutation.isPending;
    const makePublic = targetVisibility === 'workspace';
    const Icon = makePublic ? Eye : EyeOff;
    const title = targetVisibility
        ? t(makePublic ? 'scope.makePublic' : 'scope.makePrivate')
        : t('scope.loading');

    const handleVisibilityChange = () => {
        if (!thread || !targetVisibility || actionDisabled) return;
        onClose();
        mutation.mutate({
            workspaceId: thread.workspace_id,
            threadId: thread.id,
            visibility: targetVisibility,
        });
    };

    const handleOpenMembers = () => {
        if (!onOpenMembers) return;
        onClose();
        onOpenMembers();
    };

    return (
        <ActionsSheet open={open} onClose={onClose}>
            <VStack>
                {onOpenMembers ? (
                    <MenuItem
                        Icon={UserCheck}
                        title={t('members.title')}
                        onPress={handleOpenMembers}
                    />
                ) : null}
                <MenuItem
                    Icon={Icon}
                    disabled={actionDisabled}
                    last
                    title={title}
                    onPress={handleVisibilityChange}
                />
            </VStack>
        </ActionsSheet>
    );
};

export { ThreadActionsSheet };
