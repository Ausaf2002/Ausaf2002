const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro bundler configuration.
 *
 * The defaults already resolve `.jsx`, which this project uses for every file
 * containing JSX.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
