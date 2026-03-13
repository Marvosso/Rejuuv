// Set app root for Expo Router so web bundle's require.context gets a string (fixes 500 / MIME type error)
const path = require('path');
process.env.EXPO_ROUTER_APP_ROOT = path.resolve(__dirname, 'app');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
