// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the workspace root (two levels up from this file)
const workspaceRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: keep Expo's default watch folders (workspace packages + root node_modules) and include repo root
const defaultWatch = config.watchFolders ?? [];
config.watchFolders = [...new Set([...defaultWatch, workspaceRoot])];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
