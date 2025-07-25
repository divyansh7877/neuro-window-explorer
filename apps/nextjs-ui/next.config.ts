import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Ensure WASM files are properly handled
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    return config;
  },
  // Disable server-side rendering for pages that use WebAssembly
  serverExternalPackages: ['parquet-wasm'],
  // Set TypeScript target to support async/await
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
