import type { TimelineRow } from './timeline';

const hashString = (value: string, seed: number): number => {
    let hash = seed >>> 0;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
};

export const localTimelineRowRenderFingerprint = (row: TimelineRow): string => {
    const source = { ...row } as Record<string, unknown>;
    delete source.renderFingerprint;
    delete source.elapsedLabel;
    delete source.startedAtUnixMs;
    delete source.timestampLabel;
    delete source.semanticWorkItem;
    delete source.itemId;
    delete source.turnId;

    const serialized = JSON.stringify(source);
    const first = hashString(serialized, 0x811c9dc5).toString(16).padStart(8, '0');
    const second = hashString(serialized, 0x9e3779b9).toString(16).padStart(8, '0');
    return `js:${serialized.length.toString(16)}:${first}${second}`;
};

export const ensureTimelineRowRenderFingerprint = (
    row: TimelineRow,
    rustFingerprint?: string | null,
): TimelineRow => {
    const renderFingerprint = rustFingerprint
        ? `rust:${rustFingerprint}`
        : (row.renderFingerprint ?? localTimelineRowRenderFingerprint(row));

    return row.renderFingerprint === renderFingerprint ? row : { ...row, renderFingerprint };
};
