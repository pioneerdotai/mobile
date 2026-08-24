const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');

/** @type {import('expo/metro-config').MetroConfig} */
let config = getSentryExpoConfig(__dirname);

config.resolver.sourceExts.push('sql');
config = getBundleModeMetroConfig(config);

module.exports = config;
