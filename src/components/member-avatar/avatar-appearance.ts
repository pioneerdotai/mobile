const AVATAR_COLOR_COUNT = 360 / 15;
const AVATAR_HUE_STEP = 15;
const AVATAR_COLOR_SATURATION = 100;
const AVATAR_COLOR_LIGHTNESS = 53.1;
const AVATAR_BACKGROUND_OPACITY = 0.2;

export type AvatarFallbackAppearance = {
    backgroundColor: string;
    initials: string;
    textColor: string;
};

/** Matches gpui-component Avatar's initials behavior, including two letters for one-word names. */
export const avatarInitials = (displayName: string): string => {
    const normalizedName = displayName.trim();
    const initials = normalizedName
        .split(/\s+/u)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => Array.from(part)[0])
        .join('');
    const value =
        Array.from(initials).length === 1
            ? Array.from(normalizedName).slice(0, 2).join('')
            : initials;

    return value.toUpperCase() || '?';
};

const stableAvatarHash = (value: string): number => {
    let hash = 0x811c9dc5;
    for (const symbol of value) {
        hash = Math.imul(hash ^ (symbol.codePointAt(0) ?? 0), 0x01000193);
    }
    return hash >>> 0;
};

/** Mirrors gpui-component Avatar's 24 deterministic hues and 20% fallback background. */
export const avatarFallbackAppearance = (displayName: string): AvatarFallbackAppearance => {
    const initials = avatarInitials(displayName);
    const hue = (stableAvatarHash(initials) % AVATAR_COLOR_COUNT) * AVATAR_HUE_STEP;
    const textColor = `hsl(${hue}, ${AVATAR_COLOR_SATURATION}%, ${AVATAR_COLOR_LIGHTNESS}%)`;

    return {
        backgroundColor: `hsla(${hue}, ${AVATAR_COLOR_SATURATION}%, ${AVATAR_COLOR_LIGHTNESS}%, ${AVATAR_BACKGROUND_OPACITY})`,
        initials,
        textColor,
    };
};
