import type { ComposerPermissionModeOption, TurnPermissionMode } from '@/client';

export const reconcileComposerPermissionMode = (
    selectedMode: TurnPermissionMode,
    options: readonly ComposerPermissionModeOption[],
): TurnPermissionMode | null => {
    if (options.length === 0) {
        return null;
    }
    if (options.some((option) => option.mode === selectedMode)) {
        return selectedMode;
    }
    return options[options.length - 1]?.mode ?? null;
};

/** Keep agent submission closed during the render between receiving a new
 * role snapshot and reconciling a previously selected, now-forbidden mode. */
export const composerPermissionModeIsAllowed = (
    selectedMode: TurnPermissionMode,
    options: readonly ComposerPermissionModeOption[],
): boolean => options.some((option) => option.mode === selectedMode);
