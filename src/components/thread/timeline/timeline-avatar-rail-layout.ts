type TimelineEndAlignmentMetrics = {
    contentEndInset: number;
    contentTopInset: number;
    itemsEnd: number;
    scrollLength: number;
};

/**
 * LegendList item positions do not include the spacer inserted by `alignItemsAtEnd`.
 * This is the public-metrics fallback used before LegendList publishes that spacer.
 */
export const calculateTimelineEndAlignmentPadding = ({
    contentEndInset,
    contentTopInset,
    itemsEnd,
    scrollLength,
}: TimelineEndAlignmentMetrics): number => {
    if (
        !Number.isFinite(contentEndInset) ||
        !Number.isFinite(contentTopInset) ||
        !Number.isFinite(itemsEnd) ||
        !Number.isFinite(scrollLength) ||
        scrollLength <= 0 ||
        itemsEnd < 0
    ) {
        return 0;
    }

    return Math.max(
        0,
        scrollLength - itemsEnd - Math.max(0, contentTopInset) - Math.max(0, contentEndInset),
    );
};
