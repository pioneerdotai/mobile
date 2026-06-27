const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');

/** @type {import('expo/metro-config').MetroConfig} */
let config = getSentryExpoConfig(__dirname);

config.resolver.sourceExts.push('sql');

config.watchFolders.push(path.resolve(__dirname, 'node_modules/react-native-worklets/.worklets'));

const defaultResolver = config.resolver.resolveRequest;
config = getBundleModeMetroConfig(config);
const bundleModeResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.startsWith('react-native-worklets/.worklets/')) {
        return bundleModeResolver(context, moduleName, platform);
    }

    if (defaultResolver) {
        return defaultResolver(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
