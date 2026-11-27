import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';

// videocall-rs bea64063, call.css audio-indicator and glow-overlay.
const attack = 120;
const release = 1400;
const micHold = 1000;
const micRelease = 4900;
const speechEasing = () => cubicBezier(0.4, 0, 0.2, 1);
const hasInsetShadow = Platform.OS !== 'android' || Number(Platform.Version) >= 29;
const green = (opacity: number) => `rgba(48, 209, 88, ${opacity})`;

export function SpeakerGlow({ level, radius }: { level: number; radius: number }) {
    const reduced = useReducedMotion();
    const easing = useMemo(speechEasing, []);
    const active = level > 0;
    const glowColor = green(active ? 0.25 + 0.4 * level : 0);
    const duration = reduced ? 0 : active ? attack : release;

    return (
        <>
            {!reduced && !hasInsetShadow && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            borderRadius: radius,
                            borderWidth: 6 + 10 * level,
                            borderColor: green(active ? 0.08 + 0.1 * level : 0),
                            transitionProperty: ['borderWidth', 'borderColor'],
                            transitionDuration: duration,
                            transitionTimingFunction: easing,
                        },
                    ]}
                />
            )}
            <Animated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFill,
                    {
                        borderRadius: radius,
                        borderWidth: 2,
                        borderColor: green(active ? (reduced ? 1 : 0.4 + 0.6 * level) : 0),
                        boxShadow:
                            !reduced && hasInsetShadow
                                ? [
                                      {
                                          offsetX: 0,
                                          offsetY: 0,
                                          blurRadius: 12 + 20 * level,
                                          spreadDistance: 4 + 8 * level,
                                          color: glowColor,
                                          inset: true,
                                      },
                                  ]
                                : undefined,
                        transitionProperty: ['borderColor', 'boxShadow'],
                        transitionDuration: duration,
                        transitionTimingFunction: easing,
                    },
                ]}
            />
        </>
    );
}

export function SpeakerMicrophone({
    icon: Icon,
    enabled,
    level,
}: {
    icon: LucideIcon;
    enabled: boolean;
    level: number;
}) {
    const reduced = useReducedMotion();
    const easing = useMemo(speechEasing, []);
    const speaking = enabled && level > 0;
    const [held, setHeld] = useState(false);
    useEffect(() => {
        if (!enabled || speaking) {
            setHeld(speaking);
            return;
        }
        if (!held) return;
        const timer = setTimeout(() => setHeld(false), micHold);
        return () => clearTimeout(timer);
    }, [enabled, speaking, held]);
    const tinted = speaking || (enabled && held);

    return (
        <View style={styles.glyph}>
            {!reduced && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFill,
                        styles.halo,
                        {
                            boxShadow: [
                                {
                                    offsetX: 0,
                                    offsetY: 0,
                                    blurRadius: 4 + 12 * level,
                                    color: green(Math.min(1, 100 * level) * (0.6 + 0.4 * level)),
                                },
                            ],
                            transitionProperty: 'boxShadow',
                            transitionDuration: speaking ? attack : release,
                            transitionTimingFunction: easing,
                        },
                    ]}
                />
            )}
            <Icon size={18} color="#ffffff" />
            <Animated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFill,
                    {
                        opacity: tinted ? 1 : 0,
                        transitionProperty: 'opacity',
                        transitionDuration: !enabled || reduced ? 0 : tinted ? attack : micRelease,
                        transitionTimingFunction: easing,
                    },
                ]}
            >
                <Icon size={18} color="#30d158" />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    glyph: { width: 18, height: 18 },
    halo: { borderRadius: 9 },
});
