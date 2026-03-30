import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  experimental: {
    // Allow importing ES module packages from the CLI lib
    esmExternals: 'loose',
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Allow requiring/importing from parent CLI source (ES modules)
      config.resolve.alias = {
        ...config.resolve.alias,
        '@cli': path.resolve(__dirname, '../src'),
      };
    }
    return config;
  },
};

export default nextConfig;
