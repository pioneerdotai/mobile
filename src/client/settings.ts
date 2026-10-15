import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { router, useFocusEffect } from 'expo-router';
import type {
    ProfileIntent,
    ProfileEditorSection,
    SettingsIntent,
} from './generated/client_intent';
import type { ProfilePublication } from './generated/profile_publication';
import type { AuthSessionsStore } from './generated/auth_sessions_store';
import type { DeviceActivationPublication } from './generated/device_activation_publication';
import { mobileClientBinding } from './mobile-client-binding';

export const dispatchProfile = (intent: ProfileIntent) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'profile', intent },
    });
    mobileClientBinding.drain({ kind: 'profile' });
    return result;
};
export const dispatchSettings = (intent: SettingsIntent) => {
    const result = mobileClientBinding.dispatch({
        schema_version: 1,
        intent: { kind: 'settings', intent },
    });
    mobileClientBinding.drain({ kind: 'auth_sessions' });
    mobileClientBinding.drain({ kind: 'device_activation' });
    return result;
};
export const useProfile = () => {
    const store = mobileClientBinding.scope({ kind: 'profile' });
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return (snapshot?.payload as ProfilePublication | null) ?? null;
};
export const useProfileEditor = (section: ProfileEditorSection) => {
    const profile = useProfile();
    const closed = useRef(false);
    const owner = useRef<number | null>(null);
    const focused = useRef(false);
    const saved = useRef<number | null>(null);
    useFocusEffect(
        useCallback(() => {
            closed.current = false;
            focused.current = true;
            dispatchProfile({ kind: 'open', section });
            const snapshot = mobileClientBinding.scope({ kind: 'profile' }).getSnapshot();
            const value = snapshot?.payload as ProfilePublication | null;
            owner.current = value?.owner_generation ?? null;
            saved.current = value?.saved_revision ?? 0;
            return () => {
                focused.current = false;
            };
        }, [section]),
    );
    useEffect(() => {
        if (
            profile &&
            focused.current &&
            profile.section === section &&
            profile.owner_generation !== owner.current
        ) {
            owner.current = profile.owner_generation;
            saved.current = profile.saved_revision;
        }
        if (
            !profile ||
            profile.owner_generation !== owner.current ||
            profile.section !== section ||
            closed.current ||
            saved.current === null
        )
            return;
        if (
            profile.saved_revision > saved.current &&
            profile.saved_revision === profile.edit_revision
        ) {
            closed.current = true;
            router.back();
        }
    }, [profile, section]);
    useEffect(
        () => () => {
            if (owner.current !== null)
                dispatchProfile({
                    kind: 'close_for_owner',
                    expected_owner: owner.current,
                    section,
                });
        },
        [section],
    );
    return profile;
};
export const useAuthSessions = () => {
    const store = mobileClientBinding.scope({ kind: 'auth_sessions' });
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return (snapshot?.payload as AuthSessionsStore | null) ?? null;
};
export const useDeviceActivation = () => {
    const store = mobileClientBinding.scope({ kind: 'device_activation' });
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return (snapshot?.payload as DeviceActivationPublication | null) ?? null;
};
