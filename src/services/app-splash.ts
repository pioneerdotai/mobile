import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

let splashHidden = false;

export const preventAppSplashAutoHide = () => {
    void SplashScreen.preventAutoHideAsync().catch(() => {});
};

export const hideAppSplash = async (): Promise<void> => {
    if (splashHidden) {
        return;
    }

    splashHidden = true;
    await SplashScreen.hideAsync();
};

export const useHideAppSplash = () => {
    useEffect(() => {
        void hideAppSplash().catch(() => {});
    }, []);
};
