const cleanEnv = (value) => {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

const appName = cleanEnv(process.env.APP_NAME) || 'Pioneer';
const appVersion = cleanEnv(process.env.APP_VERSION) || '1.0';
const appBuildNumber = cleanEnv(process.env.APP_BUILD_NUMBER) || '1';
const appBundleIdentifier = cleanEnv(process.env.APP_BUNDLE_IDENTIFIER) || '';
const appVariant = cleanEnv(process.env.APP_VARIANT);
const appAppleTeamId = cleanEnv(process.env.APP_APPLE_TEAM_ID) || '';
const appEasProjectId = cleanEnv(process.env.APP_EAS_PROJECT_ID);

const sentryDsn = cleanEnv(process.env.SENTRY_DSN);
const sentryEnvironment = cleanEnv(process.env.SENTRY_ENVIRONMENT) || appVariant;
const sentryRelease =
    cleanEnv(process.env.SENTRY_RELEASE) ||
    (appBundleIdentifier ? `${appBundleIdentifier}@${appVersion}+${appBuildNumber}` : undefined);
const sentryOrg = cleanEnv(process.env.SENTRY_ORG);
const sentryProject = cleanEnv(process.env.SENTRY_PROJECT);

const sentryOptions = sentryDsn
    ? {
          dsn: sentryDsn,
          ...(sentryEnvironment ? { environment: sentryEnvironment } : {}),
          ...(sentryRelease ? { release: sentryRelease } : {}),
      }
    : {};

const sentryPluginOptions = {
    ...(sentryOrg ? { organization: sentryOrg } : {}),
    ...(sentryProject ? { project: sentryProject } : {}),
    useNativeInit: !!sentryDsn,
    ...(Object.keys(sentryOptions).length > 0 ? { options: sentryOptions } : {}),
};

const sentryExtra = sentryDsn
    ? {
          dsn: sentryDsn,
          ...(sentryEnvironment ? { environment: sentryEnvironment } : {}),
          ...(sentryRelease ? { release: sentryRelease } : {}),
      }
    : {};

module.exports = {
    name: appName,
    version: appVersion,
    owner: 'pioneerdotai',
    slug: 'pioneer',
    orientation: 'portrait',
    scheme: 'pioneer',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    experiments: {
        typedRoutes: true,
        reactCompiler: true,
    },
    android: {
        versionCode: Number(appBuildNumber) || 1,
        package: appBundleIdentifier,
        softwareKeyboardLayoutMode: 'pan',
        adaptiveIcon: {
            foregroundImage: './assets/images/adaptive-icon.png',
            backgroundColor: '#1071FF',
        },
    },
    ios: {
        buildNumber: appBuildNumber,
        appleTeamId: appAppleTeamId,
        bundleIdentifier: appBundleIdentifier,
        supportsTablet: false,
        config: {
            usesNonExemptEncryption: false,
        },
        infoPlist: {
            CFBundleAllowMixedLocalizations: true,
            UIBackgroundModes: ['remote-notification'],
            NSSupportsLiveActivities: true,
            NSSupportsLiveActivitiesFrequentUpdates: true,
        },
    },
    locales: {
        en: './src/locale/translations/meta/en.json',
        es: './src/locale/translations/meta/es.json',
        hi: './src/locale/translations/meta/hi.json',
        ru: './src/locale/translations/meta/ru.json',
        zh: './src/locale/translations/meta/zh.json',
        de: './src/locale/translations/meta/de.json',
        fr: './src/locale/translations/meta/fr.json',
        ja: './src/locale/translations/meta/ja.json',
    },
    icon:
        appVariant === 'development' ? './assets/images/icon-dev.png' : './assets/images/icon.png',
    plugins: [
        'expo-asset',
        'expo-secure-store',
        'expo-document-picker',
        'expo-file-system',
        'expo-image',
        [
            'expo-image-picker',
            {
                photosPermission: 'Allow Pioneer to attach images from your library.',
            },
        ],
        [
            'expo-build-properties',
            {
                android: {
                    compileSdkVersion: 36,
                    targetSdkVersion: 35,
                    minSdkVersion: 26,
                },
            },
        ],
        [
            'react-native-edge-to-edge',
            {
                android: {
                    enforceNavigationBarContrast: false,
                },
            },
        ],
        [
            'expo-router',
            {
                root: './src/routes',
            },
        ],
        [
            'expo-localization',
            {
                supportedLocales: {
                    ios: ['en', 'ru', 'zh', 'hi', 'es', 'de', 'fr', 'ja'],
                    android: ['en', 'ru', 'zh', 'hi', 'es', 'de', 'fr', 'ja'],
                },
            },
        ],
        'expo-background-task',
        [
            'expo-notifications',
            {
                enableBackgroundRemoteNotifications: true,
            },
        ],
        [
            'react-native-permissions',
            {
                iosPermissions: ['Notifications'],
            },
        ],
        [
            'expo-font',
            {
                fonts: [
                    './assets/fonts/Inter-Black.ttf',
                    './assets/fonts/Inter-Bold.ttf',
                    './assets/fonts/Inter-ExtraBold.ttf',
                    './assets/fonts/Inter-Medium.ttf',
                    './assets/fonts/Inter-Regular.ttf',
                    './assets/fonts/Inter-SemiBold.ttf',
                ],
            },
        ],
        [
            'expo-splash-screen',
            {
                image: './assets/images/splash-icon.png',
                imageWidth: 125,
                resizeMode: 'contain',
                backgroundColor: '#1071FF',
            },
        ],
        ['@sentry/react-native/expo', sentryPluginOptions],
    ],
    runtimeVersion: {
        policy: 'appVersion',
    },
    extra: {
        sentry: sentryExtra,
        eas: {
            projectId: appEasProjectId,
        },
    },
    updates: {
        url: `https://u.expo.dev/${appEasProjectId}`,
        enableBsdiffPatchSupport: false,
    },
};
