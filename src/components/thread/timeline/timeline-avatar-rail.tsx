import {
    memo,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
    useSyncExternalStore,
    type RefObject,
} from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import type { LegendListRef } from '@legendapp/list/react-native';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import { MemberAvatar } from '@/components/member-avatar';
import { Box } from '@/components/primitives/box';
import {
    AGENT_AVATAR_REVISIONS,
    resolveAgentAvatarRepresentation,
    type ResolvedAgentAvatar,
} from '@/services/members/resolve-agent-avatar';

import {
    TIMELINE_AVATAR_BOTTOM_STOP_OFFSET_UNITS,
    TIMELINE_AVATAR_SIZE_UNITS,
    TIMELINE_AVATAR_STICKY_BOTTOM_GAP_UNITS,
    TIMELINE_GROUP_VERTICAL_PADDING_UNITS,
    type TimelineAvatarGroup,
    type TimelineGroupingIndex,
} from './timeline-grouping';
import { timelineAgentDefaultAvatar } from './timeline-author-label';
import { calculateTimelineEndAlignmentPadding } from './timeline-avatar-rail-layout';

const DINO_DARK = require('../../../../assets/images/dino-dark.webp');
const DINO_LIGHT = require('../../../../assets/images/dino-light.webp');

type VisibleAvatarGroupsSnapshot = {
    timelineIdentityKey: string;
    keys: readonly string[];
};

const EMPTY_VISIBLE_GROUPS: VisibleAvatarGroupsSnapshot = {
    timelineIdentityKey: '',
    keys: [],
};
const EMPTY_AGENT_AVATARS: Readonly<Record<string, ResolvedAgentAvatar>> = {};

export class TimelineAvatarRailController {
    private readonly synchronizers = new Map<string, () => void>();
    private readonly visibleGroupsListeners = new Set<() => void>();
    private visibleGroupsSnapshot: VisibleAvatarGroupsSnapshot = EMPTY_VISIBLE_GROUPS;

    register(groupKey: string, synchronize: () => void): () => void {
        this.synchronizers.set(groupKey, synchronize);
        return () => {
            if (this.synchronizers.get(groupKey) === synchronize) {
                this.synchronizers.delete(groupKey);
            }
        };
    }

    synchronizeVisibleGroups(): void {
        for (const synchronize of this.synchronizers.values()) {
            synchronize();
        }
    }

    synchronizeGroup(groupKey: string): void {
        this.synchronizers.get(groupKey)?.();
    }

    setVisibleGroups(timelineIdentityKey: string, keys: readonly string[]): void {
        if (
            this.visibleGroupsSnapshot.timelineIdentityKey === timelineIdentityKey &&
            stringArraysEqual(this.visibleGroupsSnapshot.keys, keys)
        ) {
            return;
        }

        this.visibleGroupsSnapshot = { timelineIdentityKey, keys: [...keys] };
        for (const listener of this.visibleGroupsListeners) {
            listener();
        }
    }

    readonly getVisibleGroupsSnapshot = (): VisibleAvatarGroupsSnapshot =>
        this.visibleGroupsSnapshot;

    readonly subscribeToVisibleGroups = (listener: () => void): (() => void) => {
        this.visibleGroupsListeners.add(listener);
        return () => this.visibleGroupsListeners.delete(listener);
    };
}

type TimelineAvatarRailProps = {
    controller: TimelineAvatarRailController;
    contentInsetEndAdjustment: SharedValue<number>;
    contentTopInset: number;
    connected: boolean;
    grouping: TimelineGroupingIndex;
    listRef: RefObject<LegendListRef | null>;
    scrollOffset: SharedValue<number>;
    timelineIdentityKey: string;
    viewportTopInset: number;
};

export const TimelineAvatarRail = ({
    controller,
    contentInsetEndAdjustment,
    contentTopInset,
    connected,
    grouping,
    listRef,
    scrollOffset,
    timelineIdentityKey,
    viewportTopInset,
}: TimelineAvatarRailProps) => {
    const visibleGroupsSnapshot = useSyncExternalStore(
        controller.subscribeToVisibleGroups,
        controller.getVisibleGroupsSnapshot,
        controller.getVisibleGroupsSnapshot,
    );
    const groups = useMemo(
        () =>
            (visibleGroupsSnapshot.timelineIdentityKey === timelineIdentityKey
                ? visibleGroupsSnapshot.keys
                : []
            ).flatMap((key) => {
                const group = grouping.avatarGroup(key);
                return group ? [group] : [];
            }),
        [grouping, timelineIdentityKey, visibleGroupsSnapshot],
    );
    const contentOriginOffset = contentTopInset - viewportTopInset;
    const endAlignmentPadding = useSharedValue(0);
    const viewportHeight = useSharedValue(0);
    const [agentAvatars, setAgentAvatars] = useState<Readonly<Record<string, ResolvedAgentAvatar>>>(
        {},
    );
    const handleViewportLayout = useCallback(
        (event: LayoutChangeEvent) => {
            viewportHeight.set(event.nativeEvent.layout.height);
        },
        [viewportHeight],
    );

    useEffect(() => {
        if (!connected) {
            return undefined;
        }

        let cancelled = false;
        for (const revision of Object.values(AGENT_AVATAR_REVISIONS)) {
            void resolveAgentAvatarRepresentation(revision)
                .then((avatar) => {
                    if (!cancelled && avatar) {
                        setAgentAvatars((current) => ({
                            ...current,
                            [avatar.avatarRevision]: avatar,
                        }));
                    }
                })
                .catch(() => undefined);
        }
        return () => {
            cancelled = true;
        };
    }, [connected]);

    useLayoutEffect(() => {
        const state = listRef.current?.getState();
        endAlignmentPadding.set(0);
        if (!state) return;

        let receivedExactPadding = false;
        const synchronizeFallback = () => {
            if (receivedExactPadding) return;

            const currentState = listRef.current?.getState();
            if (!currentState || currentState.data.length === 0) return;

            const lastIndex = currentState.data.length - 1;
            const lastPosition = currentState.positionAtIndex(lastIndex);
            const lastSize = currentState.sizeAtIndex(lastIndex);
            const itemsEnd = lastPosition + lastSize;
            if (!Number.isFinite(itemsEnd)) return;

            endAlignmentPadding.set(
                calculateTimelineEndAlignmentPadding({
                    contentEndInset: contentInsetEndAdjustment.get(),
                    contentTopInset,
                    itemsEnd,
                    scrollLength: currentState.scrollLength,
                }),
            );
        };
        const applyExactPadding = (padding: number) => {
            receivedExactPadding = true;
            endAlignmentPadding.set(Math.max(0, padding));
        };

        // LegendList owns this spacer and updates it only during layout/content changes. Its
        // runtime state exposes the signal although the public listener union omits this one
        // internal layout metric. Keep the compatibility cast isolated here.
        const unsubscribePadding = (
            state.listen as unknown as (
                signal: 'alignItemsAtEndPadding',
                callback: (padding: number) => void,
            ) => () => void
        )('alignItemsAtEndPadding', applyExactPadding);
        const unsubscribeTotalSize = state.listen('totalSize', synchronizeFallback);

        synchronizeFallback();
        return () => {
            unsubscribePadding();
            unsubscribeTotalSize();
        };
    }, [
        contentInsetEndAdjustment,
        contentTopInset,
        endAlignmentPadding,
        listRef,
        timelineIdentityKey,
    ]);

    return (
        <Reanimated.View
            pointerEvents="none"
            onLayout={handleViewportLayout}
            style={[styles.viewport, { top: viewportTopInset }]}
        >
            {groups.map((group) => (
                <TimelineAvatarRailItem
                    key={group.key}
                    controller={controller}
                    agentAvatars={connected ? agentAvatars : EMPTY_AGENT_AVATARS}
                    contentInsetEndAdjustment={contentInsetEndAdjustment}
                    contentOriginOffset={contentOriginOffset}
                    endAlignmentPadding={endAlignmentPadding}
                    group={group}
                    listRef={listRef}
                    scrollOffset={scrollOffset}
                    viewportHeight={viewportHeight}
                />
            ))}
        </Reanimated.View>
    );
};

const TimelineAvatarRailItem = memo(
    ({
        controller,
        agentAvatars,
        contentInsetEndAdjustment,
        contentOriginOffset,
        endAlignmentPadding,
        group,
        listRef,
        scrollOffset,
        viewportHeight,
    }: {
        controller: TimelineAvatarRailController;
        agentAvatars: Readonly<Record<string, ResolvedAgentAvatar>>;
        contentInsetEndAdjustment: SharedValue<number>;
        contentOriginOffset: number;
        endAlignmentPadding: SharedValue<number>;
        group: TimelineAvatarGroup;
        listRef: RefObject<LegendListRef | null>;
        scrollOffset: SharedValue<number>;
        viewportHeight: SharedValue<number>;
    }) => {
        const { rt, theme } = useUnistyles();
        const { t } = useTranslation('threads');
        const avatarSize = theme.space(TIMELINE_AVATAR_SIZE_UNITS);
        const dinoSource = rt.themeName === 'dark' ? DINO_DARK : DINO_LIGHT;
        const stickyBottomGap = theme.space(TIMELINE_AVATAR_STICKY_BOTTOM_GAP_UNITS);
        const bottomStopOffset = theme.space(TIMELINE_AVATAR_BOTTOM_STOP_OFFSET_UNITS);
        const groupBottomInset = theme.space(group.bottomInsetUnits);
        const naturalOffset = theme.space(TIMELINE_GROUP_VERTICAL_PADDING_UNITS);
        const groupStart = useSharedValue(0);
        const groupEnd = useSharedValue(0);
        const geometryReady = useSharedValue(0);
        const agentAuthor = timelineAvatarSourceAgentAuthor(group.source);
        const agentPresentation = agentAuthor ? agentAvatarPresentation(group.source) : null;
        const agentDisplayName =
            agentPresentation && agentAuthor ? agentAuthor.display_name.trim() : '';
        const defaultAvatar = timelineAgentDefaultAvatar(agentAuthor);
        const defaultAvatarRevision = defaultAvatar ? AGENT_AVATAR_REVISIONS[defaultAvatar] : null;

        const synchronizeGeometry = useCallback(() => {
            const state = listRef.current?.getState();
            if (!state) return;

            const start = state.positionByKey(group.startKey);
            const endPosition = state.positionByKey(group.endKey);
            const endSize = state.sizeAtIndex(group.endIndex);
            if (start === undefined || endPosition === undefined) return;

            const end = endPosition + endSize;
            if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;

            groupStart.set(start);
            groupEnd.set(end);
            geometryReady.set(1);
        }, [
            geometryReady,
            group.endIndex,
            group.endKey,
            group.startKey,
            groupEnd,
            groupStart,
            listRef,
        ]);

        useEffect(() => {
            const unregisterController = controller.register(group.key, synchronizeGeometry);
            const state = listRef.current?.getState();
            const unsubscribeStart = state?.listenToPosition(group.startKey, synchronizeGeometry);
            const unsubscribeEnd =
                group.endKey === group.startKey
                    ? undefined
                    : state?.listenToPosition(group.endKey, synchronizeGeometry);

            synchronizeGeometry();
            return () => {
                unregisterController();
                unsubscribeStart?.();
                unsubscribeEnd?.();
            };
        }, [controller, group.endKey, group.key, group.startKey, listRef, synchronizeGeometry]);

        const animatedStyle = useAnimatedStyle(() => {
            const railHeight = viewportHeight.get();
            if (geometryReady.get() === 0 || railHeight <= 0) {
                return { opacity: 0, transform: [{ translateY: 0 }] };
            }

            // LegendList positions exclude both contentContainerStyle.paddingTop and the spacer
            // used to bottom-align a short list. Restore both in the rail's local coordinates.
            const naturalTop =
                contentOriginOffset +
                endAlignmentPadding.get() +
                groupStart.get() +
                naturalOffset -
                scrollOffset.get();
            const groupBottom =
                contentOriginOffset +
                endAlignmentPadding.get() +
                groupEnd.get() -
                scrollOffset.get();
            const naturalBottomTop = groupBottom - avatarSize - groupBottomInset - bottomStopOffset;
            const visibleBottom = Math.max(
                0,
                railHeight - Math.max(0, contentInsetEndAdjustment.get()),
            );
            const stickyBottomTop = visibleBottom - avatarSize - stickyBottomGap;
            const translateY = Math.max(naturalTop, Math.min(naturalBottomTop, stickyBottomTop));

            return {
                opacity: 1,
                transform: [{ translateY }],
            };
        }, [
            avatarSize,
            bottomStopOffset,
            contentInsetEndAdjustment,
            contentOriginOffset,
            endAlignmentPadding,
            groupBottomInset,
            naturalOffset,
            stickyBottomGap,
            viewportHeight,
        ]);

        return (
            <Reanimated.View pointerEvents="none" style={[styles.avatarPosition, animatedStyle]}>
                {group.source.kind === 'historical-user' && !agentAuthor ? (
                    <MemberAvatar
                        displayName={group.source.author?.display_name ?? ''}
                        principalId={
                            group.source.author?.actor.kind === 'principal'
                                ? group.source.author.actor.id
                                : null
                        }
                        avatarRevision={group.source.author?.avatar_revision}
                        size={avatarSize}
                        borderColor={theme.colors.border}
                    />
                ) : group.source.kind === 'agent' && group.source.showsRunningDino ? (
                    <Image
                        accessible={false}
                        autoplay
                        contentFit="contain"
                        source={dinoSource}
                        style={styles.runningDino(avatarSize)}
                    />
                ) : agentAuthor && agentDisplayName ? (
                    <MemberAvatar
                        displayName={agentDisplayName}
                        size={avatarSize}
                        imageUri={
                            defaultAvatarRevision
                                ? (agentAvatars[defaultAvatarRevision]?.uri ?? null)
                                : null
                        }
                        borderColor={theme.colors.border}
                    />
                ) : agentAuthor || group.source.kind === 'agent' ? (
                    <MemberAvatar
                        displayName={t('modeAgentLabel')}
                        size={avatarSize}
                        imageUri={agentAvatars[AGENT_AVATAR_REVISIONS.pioneer]?.uri ?? null}
                        borderColor={theme.colors.border}
                    />
                ) : (
                    <Box style={styles.absentAvatar(avatarSize)} />
                )}
            </Reanimated.View>
        );
    },
);

TimelineAvatarRailItem.displayName = 'TimelineAvatarRailItem';

const timelineAvatarSourceAgentAuthor = (
    source: TimelineAvatarGroup['source'],
): Extract<TimelineAvatarGroup['source'], { kind: 'agent' }>['author'] => {
    const author = source.author;
    return author?.actor.kind === 'agent_execution' ? author : null;
};

const agentAvatarPresentation = (source: TimelineAvatarGroup['source']) => {
    const author = timelineAvatarSourceAgentAuthor(source);
    if (!author || author.agent?.agent_execution_id !== author.actor.id) return null;
    return author.agent;
};

const stringArraysEqual = (left: readonly string[], right: readonly string[]): boolean =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const styles = StyleSheet.create((theme) => ({
    viewport: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        left: 0,
        overflow: 'visible',
        zIndex: 2,
    },
    avatarPosition: {
        position: 'absolute',
        top: 0,
        left: theme.space(2),
    },
    absentAvatar: (size: number) => ({
        width: size,
        height: size,
    }),
    runningDino: (size: number) => ({
        width: size,
        height: size,
    }),
}));
