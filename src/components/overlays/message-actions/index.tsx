import { useMemo } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import {
    Copy,
    Clock,
    Reply,
    RotateCcwClock,
    SquarePen,
    Trash,
    type LucideIcon,
} from 'lucide-react-native';

import { ActionsSheet } from '@/components/overlays/actions';
import { MenuItem } from '@/components/overlays/actions/menu-item';
import { VStack } from '@/components/primitives/vstack';
import type { TimelineRow } from '@/services/threads/conversation/timeline';

type UserMessageRow = Extract<TimelineRow, { type: 'user-message' }>;
type AssistantMessageRow = Extract<TimelineRow, { type: 'assistant-message' }>;
type MessageActionsRow = UserMessageRow | AssistantMessageRow;

type MessageActionsSheetProps = {
    row: MessageActionsRow | null;
    currentPrincipalId?: string | null;
    onClose: () => void;
    onOpenRevisions?: (turnId: string) => void;
    onReply?: (row: UserMessageRow) => void;
    onEdit?: (row: UserMessageRow) => void;
    onDelete?: (row: UserMessageRow) => void;
};

type MessageAction = {
    key: string;
    Icon: LucideIcon;
    title: string;
    small?: boolean;
    disabled?: boolean;
    variant?: 'destructive';
    onPress: () => void;
};

const MessageActionsSheet = ({
    row,
    currentPrincipalId,
    onClose,
    onOpenRevisions,
    onReply,
    onEdit,
    onDelete,
}: MessageActionsSheetProps) => {
    const { t } = useTranslation('threads');

    const actions = useMemo<MessageAction[]>(() => {
        if (!row) {
            return [];
        }

        const authorPrincipalId =
            row.type === 'user-message' && row.author?.actor.kind === 'principal'
                ? row.author.actor.id
                : null;
        const canMutate =
            row.type === 'user-message' &&
            authorPrincipalId !== null &&
            authorPrincipalId === currentPrincipalId &&
            row.mode === 'Message' &&
            !row.deleted;
        const items: MessageAction[] = [];
        const closeThen = (action: () => void) => () => {
            onClose();
            action();
        };

        if (row.type === 'user-message' && !row.deleted && onReply) {
            items.push({
                key: 'reply',
                Icon: Reply,
                title: t('timelineMessageReplyAction'),
                onPress: closeThen(() => onReply(row)),
            });
        }

        if (row.type !== 'user-message' || !row.deleted) {
            items.push({
                key: 'copy',
                Icon: Copy,
                title: t('timelineCopy'),
                disabled: row.text.trim().length === 0,
                onPress: closeThen(() => {
                    void Clipboard.setStringAsync(row.text).catch(() => undefined);
                }),
            });
        }

        if (canMutate && onEdit) {
            items.push({
                key: 'edit',
                Icon: SquarePen,
                title: t('timelineMessageEditAction'),
                onPress: closeThen(() => onEdit(row)),
            });
        }

        if (canMutate && onDelete) {
            items.push({
                key: 'delete',
                Icon: Trash,
                title: t('timelineMessageDeleteAction'),
                variant: 'destructive',
                onPress: closeThen(() => onDelete(row)),
            });
        }

        if (row.type === 'user-message' && row.edited && onOpenRevisions) {
            const editedAt = row.lastEditedTimestampLabel || row.timestampLabel;
            items.push({
                key: 'last-edited',
                Icon: RotateCcwClock,
                small: true,
                title: editedAt
                    ? `${t('timelineMessageLastEdited')} · ${editedAt}`
                    : t('timelineMessageLastEdited'),
                onPress: closeThen(() => onOpenRevisions(row.turnId)),
            });
        }

        if (row.timestampLabel) {
            items.push({
                key: 'timestamp',
                Icon: Clock,
                small: true,
                title: row.timestampLabel,
                onPress: closeThen(() => undefined),
            });
        }

        return items;
    }, [currentPrincipalId, onClose, onDelete, onEdit, onOpenRevisions, onReply, row, t]);

    return (
        <ActionsSheet open={row !== null && actions.length > 0} onClose={onClose}>
            <VStack>
                {actions.map((action, index) => (
                    <MenuItem
                        key={action.key}
                        Icon={action.Icon}
                        title={action.title}
                        small={action.small}
                        variant={action.variant}
                        disabled={action.disabled}
                        last={index === actions.length - 1}
                        onPress={action.onPress}
                    />
                ))}
            </VStack>
        </ActionsSheet>
    );
};

export { MessageActionsSheet };
