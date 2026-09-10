import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const mobileAuthInstallation = (installationId: string) => ({
    installation_id: installationId,
    display_name: Device.deviceName?.trim() || Device.modelName?.trim() || 'Pioneer App',
    client_kind: 'mobile' as const,
    platform: Platform.OS,
    client_version: Application.nativeApplicationVersion ?? null,
});
