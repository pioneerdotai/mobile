export const composerTargetThreadIsActive = (
    targetThreadId: string | null,
    activeThreadId: string | null,
): boolean => targetThreadId !== null && targetThreadId === activeThreadId;
