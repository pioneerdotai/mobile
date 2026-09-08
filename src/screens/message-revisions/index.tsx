import { useCallback } from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { MessageRevisionPagePresentation } from '@/client';
import { dispatchMessageRevisions, useMessageRevisions } from '@/client/message-revisions';
import Spinner from '@/components/feedback/spinner';
import { Box } from '@/components/primitives/box';
import { Pressable } from '@/components/primitives/pressable';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';

type MessageRevisionsScreenProps = {
    threadId: string;
    turnId: string;
};

type MessageRevisionPresentation = MessageRevisionPagePresentation['revisions'][number];

const formatRevisionDate = (createdAtUnix: number): string => {
    const date = new Date(createdAtUnix * 1_000);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const MessageRevisionsScreen = ({ threadId, turnId }: MessageRevisionsScreenProps) => {
    const { t } = useTranslation('threads');
    const { theme } = useUnistyles();
    const input = useMessageRevisions(threadId, turnId);
    const page = input?.page ?? null;
    const loading = !input || input.state === 'loading';
    const error = input?.state === 'failed';

    const renderRevision = useCallback<ListRenderItem<MessageRevisionPresentation>>(
        ({ item }) => (
            <VStack style={styles.revision}>
                <Text style={styles.date}>{formatRevisionDate(item.created_at)}</Text>
                {item.content_redacted ? (
                    <Text style={styles.redacted}>{t('timelineMessageHistoryRedacted')}</Text>
                ) : item.text?.trim() ? (
                    <Text selectable style={styles.body}>
                        {item.text}
                    </Text>
                ) : (
                    <Text style={styles.emptyMessage}>{t('timelineMessageHistoryEmpty')}</Text>
                )}
            </VStack>
        ),
        [t],
    );

    const revisions = page?.revisions ?? [];
    const initialLoading = loading && revisions.length === 0;
    const initialError = error && revisions.length === 0;

    return (
        <Box style={styles.container}>
            <FlashList
                alwaysBounceVertical={false}
                contentContainerStyle={styles.content}
                data={revisions}
                keyExtractor={(revision) => String(revision.revision)}
                ListEmptyComponent={
                    <VStack style={styles.state}>
                        {initialLoading ? (
                            <>
                                <Spinner color={theme.colors.typography} />
                                <Text style={styles.stateText}>
                                    {t('timelineMessageHistoryLoading')}
                                </Text>
                            </>
                        ) : (
                            <Text style={initialError ? styles.error : styles.stateText}>
                                {initialError
                                    ? t('timelineMessageHistoryFailed')
                                    : t('timelineMessageHistoryEmpty')}
                            </Text>
                        )}
                    </VStack>
                }
                ListFooterComponent={
                    revisions.length > 0 ? (
                        <VStack style={styles.footer}>
                            {error ? (
                                <Text accessibilityRole="alert" style={styles.error}>
                                    {t('timelineMessageHistoryFailed')}
                                </Text>
                            ) : null}
                            {loading ? <Spinner color={theme.colors.typography} /> : null}
                            {!loading && page?.next_cursor ? (
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => {
                                        if (input)
                                            dispatchMessageRevisions({
                                                kind: 'more',
                                                identity: input.identity,
                                            });
                                    }}
                                    style={styles.moreButton}
                                >
                                    <Text style={styles.moreText}>
                                        {t('timelineMessageHistoryMore')}
                                    </Text>
                                </Pressable>
                            ) : null}
                        </VStack>
                    ) : null
                }
                maintainVisibleContentPosition={{ disabled: true }}
                renderItem={renderRevision}
                showsVerticalScrollIndicator={false}
                style={styles.list}
            />
        </Box>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    list: {
        flex: 1,
    },
    content: {
        paddingTop: theme.screenContentPadding('child').paddingTop,
        paddingHorizontal: theme.space(4),
    },
    revision: {
        width: '100%',
        minWidth: 0,
        gap: theme.space(1),
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius['2xl'],
        padding: theme.space(3),
        marginBottom: theme.space(2),
    },
    date: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.xs.fontSize,
        lineHeight: theme.fontSize.xs.lineHeight,
        opacity: 0.6,
    },
    body: {
        width: '100%',
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    redacted: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        fontStyle: 'italic',
    },
    emptyMessage: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    state: {
        minHeight: theme.space(48),
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(2),
        paddingHorizontal: theme.space(6),
    },
    stateText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        textAlign: 'center',
    },
    error: {
        color: theme.colors.dangerText,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        textAlign: 'center',
    },
    footer: {
        minHeight: theme.space(16),
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space(2),
        paddingVertical: theme.space(3),
    },
    moreButton: {
        minHeight: theme.space(10),
        justifyContent: 'center',
        paddingHorizontal: theme.space(3),
    },
    moreText: {
        color: theme.colors.accent,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
}));

export { formatRevisionDate };
export default MessageRevisionsScreen;
