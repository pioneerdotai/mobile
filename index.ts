import 'intl-pluralrules';
import 'react-native-get-random-values';
// Configure the process bridge before router selectors run. A value import
// used later in an effect can be deferred by Metro's inlineRequires.
import './src/client';
import './src/services/dev-warnings';
import './src/services/telemetry/mobile-startup';
import 'expo-router/entry';
import './unistyles';
