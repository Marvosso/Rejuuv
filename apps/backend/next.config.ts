import type { NextConfig } from "next";
import path from "path";
import { existsSync } from "fs";

// Resolve tailwindcss so Turbopack finds it (it may look in "apps" not "apps/backend")
const cwd = process.cwd();
const inBackend = path.resolve(cwd, "node_modules/tailwindcss");
const inRoot = path.resolve(cwd, "../../node_modules/tailwindcss");
const tailwindResolve = existsSync(inBackend) ? inBackend : inRoot;

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  turbopack: {
    resolveAlias: {
      tailwindcss: tailwindResolve,
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      tailwindcss: tailwindResolve,
    };
    return config;
  },
};

export default nextConfig;
