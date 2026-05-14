const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Si estamos compilando para la WEB
if (process.env.EXPO_PUBLIC_PLATFORM === 'web' || process.env.npm_lifecycle_event?.includes('web')) {
  config.resolver.alias = {
    'react-native-maps': path.resolve(__dirname, 'mocks/react-native-maps.js'),
  };
}

module.exports = config;