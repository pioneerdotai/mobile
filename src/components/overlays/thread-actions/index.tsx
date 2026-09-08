import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { dispatchThreadMember } from '@/client/thread-members';
import type { ThreadMemberPublication } from '@/client/generated/thread_member_publication';
import { Eye, EyeOff, UserCheck } from 'lucide-react-native';

import type { Thread } from '@/client';
import { ActionsSheet } from '@/components/overlays/actions';
import { MenuItem } from '@/components/overlays/actions/menu-item';
import { VStack } from '@/components/primitives/vstack';
import { nextThreadVisibility } from '@/services/threads/scope';
import { useGatewayStore } from '@/stores/gateway';

type ThreadActionsSheetProps = {
    open: boolean;
    publication: ThreadMemberPublication | null;
    thread: Thread | null;
    onClose: () => void;
    onOpenMembers?: () => void;
};

const ThreadActionsSheet = ({
    open,
    thread,
    publication,
    onClose,
    onOpenMembers,
}: ThreadActionsSheetProps) => {
    const { t } = useTranslation('threads');
    const connectionState = useGatewayStore((state) => state.connectionState);
    const requestedGeneration = useRef<number | null>(null);
    const input = publication?.thread_id === thread?.id ? publication : null;
    const canManageThread = input?.presentation?.capabilities.can_manage_thread ?? false;
    const targetVisibility = nextThreadVisibility(thread?.visibility);
    const pending = input?.request.kind === 'loading';
    useEffect(() => {
        if (input?.generation !== requestedGeneration.current || input?.request.kind !== 'failed')
            return;
        requestedGeneration.current = null;
        Alert.alert(t('scope.actionFailed'));
    }, [input, t]);

    const actionDisabled =
        !thread ||
        !targetVisibility ||
        thread.status === 'Closed' ||
        connectionState !== 'Connected' ||
        pending;
    const makePublic = targetVisibility === 'workspace';
    const Icon = makePublic ? Eye : EyeOff;
    const title = targetVisibility
        ? t(makePublic ? 'scope.makePublic' : 'scope.makePrivate')
        : t('scope.loading');

    const handleVisibilityChange = () => {
        if (!thread || !targetVisibility || actionDisabled) return;
        requestedGeneration.current = dispatchThreadMember({
            kind: 'perform',
            thread_id: thread.id,
            action: { kind: 'update_visibility', visibility: targetVisibility },
        });
        onClose();
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
                        last={!canManageThread}
                        onPress={handleOpenMembers}
                    />
                ) : null}
                {canManageThread ? (
                    <MenuItem
                        Icon={Icon}
                        disabled={actionDisabled}
                        last
                        title={title}
                        onPress={handleVisibilityChange}
                    />
                ) : null}
            </VStack>
        </ActionsSheet>
    );
};

export { ThreadActionsSheet };
