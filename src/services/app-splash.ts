import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

let splashHidden = false;

export const preventAppSplashAutoHide = () => {
    void SplashScreen.preventAutoHideAsync().catch(() => {});
};

export const hideAppSplash = () => {
    if (splashHidden) {
        return;
    }

    splashHidden = true;
    void SplashScreen.hideAsync().catch(() => {});
};

export const useHideAppSplash = () => {
    useEffect(() => {
        hideAppSplash();
    }, []);
};
