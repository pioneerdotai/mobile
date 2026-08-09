type TimelineTextMetrics = {
    fontSize: number;
    lineHeight: number;
};

/**
 * Pulls the row edge back from the line box to the visible bottom of its last text line.
 * The extra point matches the native renderer's pixel-rounded glyph bounds.
 */
export const timelineTextBottomMargin = ({ fontSize, lineHeight }: TimelineTextMetrics): number =>
    -(Math.max(0, lineHeight - fontSize) / 2 + 1);
